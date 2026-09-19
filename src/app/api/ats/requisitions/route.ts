import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrgContext } from "@/lib/org";
import {
  getUserRoles,
  generateReqNo,
  buildApprovalChain,
  logAudit,
  type TalentRole,
} from "@/lib/talentRoles";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Roles that may list and create requisitions.
// ---------------------------------------------------------------------------
const READER_ROLES: TalentRole[] = [
  "recruiter",
  "lead_recruiter",
  "hiring_manager",
  "hr_approver",
  "hr_ops",
  "hr_head",
  "ta_head",
  "admin",
];

const CREATOR_ROLES: TalentRole[] = [
  "recruiter",
  "lead_recruiter",
  "hiring_manager",
  "ta_head",
  "admin",
];

// ---------------------------------------------------------------------------
// GET /api/ats/requisitions
// ---------------------------------------------------------------------------
export async function GET(request: Request) {
  // 1. Authenticate via session cookie — never trust org_id from request.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const ctx = await getOrgContext(admin, user.id);
  const roles = await getUserRoles(admin, user.id);

  // Platform owner sees everything; otherwise the caller must hold at least
  // one reader role inside their own org.
  if (!ctx.isPlatformOwner && !roles.some((r) => READER_ROLES.includes(r))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const statusFilter = url.searchParams.get("status");

    // Build the base query over talent_requisitions — NEVER job_postings.
    let query = admin
      .from("talent_requisitions")
      .select(
        "id, req_no, title, department, location, employment_type, headcount, status, priority, hiring_manager, description, work_mode, comp_min, comp_max, job_level, must_have_skills: eligibility_criteria, created_by, created_at, updated_at, org_id, target_hire_date"
      )
      .order("created_at", { ascending: false });

    // Org scoping — platform owner skips this.
    if (!ctx.isPlatformOwner) {
      if (!ctx.orgId) {
        // Individual (no org) — see only their own requisitions.
        query = query.eq("created_by", user.id);
      } else {
        // Determine visibility by role.
        const isOrgAdmin = ctx.orgRole === "org_admin";
        const isLeadOrAdmin =
          isOrgAdmin ||
          roles.some((r) =>
            (["lead_recruiter", "ta_head", "hr_head", "hr_ops", "admin"] as TalentRole[]).includes(r)
          );

        if (isLeadOrAdmin) {
          // Sees the whole org.
          query = query.eq("org_id", ctx.orgId);
        } else if (roles.includes("recruiter")) {
          // Sees requisitions they created OR are explicitly assigned to.
          const { data: assignments } = await admin
            .from("talent_requisition_assignment")
            .select("requisition_id")
            .eq("recruiter_id", user.id);
          const assignedIds = (assignments ?? []).map((a) => a.requisition_id as string);
          if (assignedIds.length > 0) {
            query = query
              .eq("org_id", ctx.orgId)
              .or(`created_by.eq.${user.id},id.in.(${assignedIds.join(",")})`);
          } else {
            query = query.eq("org_id", ctx.orgId).eq("created_by", user.id);
          }
        } else if (roles.includes("hiring_manager")) {
          // Sees only their own requisitions.
          query = query.eq("org_id", ctx.orgId).eq("created_by", user.id);
        } else {
          // Any remaining reader role scoped to their org.
          query = query.eq("org_id", ctx.orgId);
        }
      }
    }

    if (statusFilter) {
      query = query.eq("status", statusFilter);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Strip internal fields that must not leak to callers.
    const safe = (data ?? []).map((r) => ({
      id: r.id,
      req_no: r.req_no,
      title: r.title,
      department: r.department,
      location: r.location,
      employment_type: r.employment_type,
      headcount: r.headcount,
      status: r.status,
      priority: r.priority,
      hiring_manager: r.hiring_manager,
      description: r.description,
      work_mode: r.work_mode,
      comp_min: r.comp_min,
      comp_max: r.comp_max,
      job_level: r.job_level,
      target_hire_date: r.target_hire_date,
      created_at: r.created_at,
      updated_at: r.updated_at,
      // org_id is intentionally omitted from the response.
    }));

    return NextResponse.json({ requisitions: safe });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list requisitions." },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/ats/requisitions — create a new requisition.
// ---------------------------------------------------------------------------
export interface AtsRequisitionInput {
  title: string;
  department?: string;
  location?: string;
  work_mode?: "on-site" | "remote" | "hybrid";
  employment_type?: string;
  headcount?: number;
  priority?: "low" | "medium" | "high" | "urgent";
  hiring_manager?: string;
  description?: string;
  job_level?: string;
  comp_min?: number | null;
  comp_max?: number | null;
  target_hire_date?: string | null;
  // eligibility_criteria stores must-have / good-to-have skills as JSON.
  eligibility_criteria?: Record<string, unknown> | null;
}

export async function POST(request: Request) {
  // 1. Session.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // 2. Org context resolved server-side — never from the request body.
  const ctx = await getOrgContext(admin, user.id);
  const roles = await getUserRoles(admin, user.id);

  if (
    !ctx.isPlatformOwner &&
    !roles.some((r) => CREATOR_ROLES.includes(r))
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 3. Parse and validate body.
  let body: AtsRequisitionInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body?.title?.trim()) {
    return NextResponse.json({ error: "title is required." }, { status: 400 });
  }

  try {
    // 4. Determine licence tier from the org plan (server-resolved, not caller-supplied).
    let orgPlan = "individual";
    if (ctx.orgId) {
      const { data: org } = await admin
        .from("organizations")
        .select("plan")
        .eq("id", ctx.orgId)
        .maybeSingle();
      orgPlan = org?.plan ?? "individual";
    }

    const isOrgLicence =
      orgPlan === "enterprise" ||
      orgPlan === "organization" ||
      orgPlan === "bulk";

    // 5. Status routing per spec:
    //   Organisation licence → pending_approval + approval steps
    //   Individual (or no org) → open, NOT published
    const initialStatus = isOrgLicence ? "pending_approval" : "open";

    // 6. Generate requisition number.
    const reqNo = await generateReqNo(admin, ctx.orgId);

    // 7. Insert into talent_requisitions (the live ATS table, NOT job_postings).
    const { data: req, error: reqErr } = await admin
      .from("talent_requisitions")
      .insert({
        req_no: reqNo,
        title: body.title.trim(),
        department: body.department?.trim() ?? null,
        location: body.location?.trim() ?? null,
        work_mode: body.work_mode ?? null,
        employment_type: body.employment_type ?? "full-time",
        headcount: typeof body.headcount === "number" ? body.headcount : 1,
        priority: body.priority ?? "medium",
        hiring_manager: body.hiring_manager?.trim() ?? null,
        description: body.description?.trim() ?? null,
        job_level: body.job_level?.trim() ?? null,
        comp_min:
          typeof body.comp_min === "number" ? body.comp_min : null,
        comp_max:
          typeof body.comp_max === "number" ? body.comp_max : null,
        target_hire_date: body.target_hire_date ?? null,
        eligibility_criteria: body.eligibility_criteria ?? null,
        status: initialStatus,
        is_published: false, // Never auto-published via this route.
        org_id: ctx.orgId ?? null,
        created_by: user.id,
      })
      .select("id, req_no, status")
      .single();

    if (reqErr) {
      return NextResponse.json({ error: reqErr.message }, { status: 500 });
    }

    // 8. For org licences: insert approval steps.
    if (isOrgLicence && req) {
      const chain = await buildApprovalChain(admin, user.id);
      if (chain.length > 0) {
        const steps = chain.map((s) => ({
          requisition_id: req.id,
          step_order: s.step_order,
          approver_role: s.approver_role,
          approver_user_id: s.approver_user_id,
          status: "pending",
        }));
        await admin.from("talent_approval_steps").insert(steps);
      }
      // Status history row.
      await admin.from("talent_requisition_status_history").insert({
        requisition_id: req.id,
        from_status: null,
        to_status: initialStatus,
        changed_by: user.id,
        note: "Requisition created; pending approval chain.",
      });
    } else if (req) {
      await admin.from("talent_requisition_status_history").insert({
        requisition_id: req.id,
        from_status: null,
        to_status: initialStatus,
        changed_by: user.id,
        note: "Requisition created under individual licence.",
      });
    }

    // 9. Audit log.
    await logAudit({
      entityType: "talent_requisitions",
      entityId: req!.id,
      actorId: user.id,
      action: "created",
      detail: { req_no: req!.req_no, status: initialStatus, orgPlan },
      orgId: ctx.orgId,
    });

    return NextResponse.json({
      ok: true,
      requisition: {
        id: req!.id,
        req_no: req!.req_no,
        status: req!.status,
      },
      message:
        isOrgLicence
          ? "Requisition created and queued for approval."
          : "Requisition created with status open.",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create requisition." },
      { status: 500 }
    );
  }
}
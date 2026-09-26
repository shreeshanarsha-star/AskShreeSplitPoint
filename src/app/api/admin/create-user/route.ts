import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/supabase/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { logAdminActivity } from "@/lib/adminActivityLog";
import {
  TALENT_ROLES,
  TALENT_ROLE_LABELS,
  RECRUITER_TEAM_ROLES,
  ROLE_IMPLIES,
  logAudit,
  type TalentRole,
} from "@/lib/talentRoles";

// Owner-only "create login credentials directly" tool -- the gap that
// /api/org/members/invite couldn't cover: that route derives orgId from
// the CALLER's own org membership, and the platform owner has none (by
// design -- see requireAdmin.ts). This route is the owner-specific path:
// either stand up a brand-new organization with this account as its first
// admin, or drop a new account straight into an existing organization,
// picking any access level (recruiter-team or org-side) and any set of
// tools to grant -- and, unlike the invite flow, the owner sets the
// password here directly rather than emailing a "set your password" link.
// That's a real security trade-off (a plaintext password now exists in
// whatever channel it's sent through -- email body, WhatsApp message) that
// was discussed and explicitly chosen; the mitigation is that the account
// can reset its own password any time via /forgot-password.
const ORG_ROLES = new Set(["member", "org_admin"]);

export async function POST(req: Request) {
  let ownerUser;
  try {
    ({ user: ownerUser } = await requireAdminUser());
  } catch (res) {
    return res as Response;
  }

  const body = await req.json().catch(() => null);
  const orgMode = body?.orgMode === "existing" ? "existing" : "new"; // default "new"
  const companyName = typeof body?.companyName === "string" ? body.companyName.trim() : "";
  const existingOrgId = typeof body?.existingOrgId === "string" ? body.existingOrgId : "";
  const orgRole = typeof body?.orgRole === "string" && ORG_ROLES.has(body.orgRole) ? body.orgRole : "member";

  const fullName = typeof body?.fullName === "string" ? body.fullName.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const contactNumber = typeof body?.contactNumber === "string" ? body.contactNumber.trim() : "";
  const accessLevel = typeof body?.accessLevel === "string" && (TALENT_ROLES as string[]).includes(body.accessLevel)
    ? (body.accessLevel as TalentRole)
    : null;
  const toolKeys: string[] = Array.isArray(body?.toolKeys) ? body.toolKeys.filter((k: unknown) => typeof k === "string") : [];

  if (!fullName) return NextResponse.json({ error: "Full name is required." }, { status: 400 });
  if (!email || !email.includes("@")) return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  if (!password || password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  if (!accessLevel) return NextResponse.json({ error: "An access level is required." }, { status: 400 });
  if (orgMode === "new" && !companyName) return NextResponse.json({ error: "Company name is required to create a new organization." }, { status: 400 });
  if (orgMode === "existing" && !existingOrgId) return NextResponse.json({ error: "Select an existing organization." }, { status: 400 });

  const admin = createAdminClient();

  const { data: existingProfile } = await admin.from("profiles").select("id").ilike("email", email).maybeSingle();
  if (existingProfile) {
    return NextResponse.json({ error: "Someone with that email already has an account." }, { status: 409 });
  }

  // 1. Resolve the organization: either create it fresh (owner-created orgs
  // are auto-approved -- there's no one else who needs to approve them)
  // or look up the existing one.
  let orgId: string;
  let orgName: string;
  if (orgMode === "new") {
    const { data: newOrg, error: orgError } = await admin
      .from("organizations")
      .insert({
        name: companyName,
        status: "approved",
        plan: "individual",
        approved_at: new Date().toISOString(),
        approved_by: ownerUser.id,
      })
      .select()
      .single();
    if (orgError || !newOrg) {
      return NextResponse.json({ error: orgError?.message || "Could not create the organization." }, { status: 500 });
    }
    orgId = newOrg.id;
    orgName = newOrg.name;
  } else {
    const { data: org, error: orgLookupError } = await admin
      .from("organizations")
      .select("id, name")
      .eq("id", existingOrgId)
      .single();
    if (orgLookupError || !org) {
      return NextResponse.json({ error: "That organization could not be found." }, { status: 404 });
    }
    orgId = org.id;
    orgName = org.name;
  }

  // 2. Create the auth user WITH the given password -- unlike the invite
  // flow, this account can sign in immediately with what's handed to it.
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (createError || !created?.user) {
    // Roll back the org if we just created it and the very next step failed --
    // otherwise the owner ends up with an orphaned empty organization.
    if (orgMode === "new") await admin.from("organizations").delete().eq("id", orgId);
    return NextResponse.json({ error: createError?.message || "Could not create the account." }, { status: 500 });
  }
  const newUserId = created.user.id;

  if (orgMode === "new") {
    // Set now that we have a user id -- mirrors the self-signup org/create
    // route's own owner_user_id assignment, so an owner-created org looks
    // no different from a self-signup one to any code that reads it.
    await admin.from("organizations").update({ owner_user_id: newUserId }).eq("id", orgId);
  }

  const isRecruiterTeam = RECRUITER_TEAM_ROLES.includes(accessLevel);
  const finalOrgRole = orgMode === "new" ? "org_admin" : orgRole;

  let { error: profileError } = await admin
    .from("profiles")
    .update({
      org_id: orgId,
      org_role: finalOrgRole,
      full_name: fullName,
      status: "active",
      persona: isRecruiterTeam ? "recruiter" : "organization",
      contact_number: contactNumber || null,
      company_name: orgName,
    })
    .eq("id", newUserId);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  // 3. Talent role tag(s), mirroring the invite route's implied-role pattern.
  await admin.from("talent_user_roles").insert({ user_id: newUserId, role: accessLevel, created_by: ownerUser.id, org_id: orgId });
  const impliedRole = ROLE_IMPLIES[accessLevel];
  if (impliedRole) {
    try {
      await admin.from("talent_user_roles").insert({ user_id: newUserId, role: impliedRole, created_by: ownerUser.id, org_id: orgId });
    } catch {
      // best-effort
    }
  }

  // 4. Explicit per-user tool grants -- this is the real access-control
  // surface the owner ticks by hand, independent of the role label above.
  if (toolKeys.length > 0) {
    const rows = toolKeys.map((featureKey) => ({ user_id: newUserId, feature_key: featureKey, granted_by: ownerUser.id }));
    try {
      await admin.from("user_feature_access").insert(rows);
    } catch {
      // best-effort if table not yet migrated
    }
  }

  await logAudit({
    entityType: "profiles",
    entityId: newUserId,
    actorId: ownerUser.id,
    action: "owner_created_user",
    detail: { email, accessLevel, orgMode, toolKeys },
    orgId,
  });
  await logAdminActivity(admin, {
    actorId: ownerUser.id,
    actorEmail: ownerUser.email,
    action: "owner_created_user",
    targetType: "profiles",
    targetId: newUserId,
    targetLabel: `${fullName} (${email})`,
    details: { orgName, accessLevel, orgMode },
  });

  // 5. Welcome email with the credentials -- real send via Resend if
  // RESEND_API_KEY is configured, otherwise it's logged server-side and
  // recorded in email_failures (see lib/email.ts) rather than silently lost.
  const loginUrl = "https://www.askshree.com/login";
  const roleLabel = TALENT_ROLE_LABELS[accessLevel];
  const emailHtml = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #111;">🎉 Congratulations, ${fullName}!</h2>
      <p>Your account on <strong>Askshree</strong> has been created for <strong>${orgName}</strong> as <strong>${roleLabel}</strong>.</p>
      <div style="background: #f6f6f6; border-radius: 10px; padding: 16px; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>Login URL:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
        <p style="margin: 4px 0;"><strong>Email:</strong> ${email}</p>
        <p style="margin: 4px 0;"><strong>Password:</strong> ${password}</p>
      </div>
      <p style="color: #555; font-size: 13px;">For your security, please sign in and change this password as soon as possible. You can reset it any time from the "Forgot password?" link on the sign-in page.</p>
      <p>Welcome aboard!</p>
    </div>
  `;
  const emailResult = await sendEmail({
    to: email,
    subject: `🎉 Welcome to Askshree — your ${orgName} account is ready`,
    html: emailHtml,
    tool: "Owner Console",
  });

  // 6. WhatsApp: no Business API provider is configured (no access token /
  // phone number ID anywhere in this codebase), so real automatic sending
  // isn't possible yet. Instead, hand back a wa.me deep link with the same
  // congratulations message pre-filled -- the owner opens it and taps send
  // from their own WhatsApp. Only returned when a contact number was given.
  let waLink: string | null = null;
  if (contactNumber) {
    const digits = contactNumber.replace(/[^\d]/g, "");
    const waText = `🎉 Congratulations ${fullName}! Your Askshree account for ${orgName} is ready.\n\nRole: ${roleLabel}\nLogin: ${loginUrl}\nEmail: ${email}\nPassword: ${password}\n\nPlease sign in and change your password as soon as possible. Welcome aboard!`;
    waLink = `https://wa.me/${digits}?text=${encodeURIComponent(waText)}`;
  }

  return NextResponse.json({
    ok: true,
    userId: newUserId,
    orgId,
    orgName,
    emailSent: emailResult.ok,
    emailError: emailResult.ok ? undefined : emailResult.error,
    waLink,
  });
}

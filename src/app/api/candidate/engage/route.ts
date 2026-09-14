import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const admin = createAdminClient();
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ ok: false, error: "Missing engagement token." }, { status: 400 });
    }

    // Lookup candidate by ID or token
    const candidateId = token.startsWith("eng-") ? token.replace("eng-", "") : token;

    const { data: candidate, error: candError } = await admin
      .from("talent_candidates")
      .select("id, name, email, current_company, current_location, stage, match_score, tags, requisition_id")
      .eq("id", candidateId)
      .maybeSingle();

    if (candError || !candidate) {
      return NextResponse.json({ ok: false, error: "Candidate record not found or link expired." }, { status: 404 });
    }

    // Lookup Requisition
    let requisition: { id: string; req_no: string; title: string; department: string; location: string; description: string | null } | null = null;
    if (candidate.requisition_id) {
      const { data: req } = await admin
        .from("talent_requisitions")
        .select("id, req_no, title, department, location, description")
        .eq("id", candidate.requisition_id)
        .maybeSingle();
      if (req) requisition = req;
    }

    return NextResponse.json({
      ok: true,
      data: {
        candidate: {
          id: candidate.id,
          name: candidate.name,
          company: candidate.current_company,
          location: candidate.current_location,
          stage: candidate.stage,
          matchScore: candidate.match_score,
          skills: candidate.tags || [],
        },
        requisition: requisition ? {
          id: requisition.id,
          reqNo: requisition.req_no,
          title: requisition.title,
          department: requisition.department,
          location: requisition.location,
          description: requisition.description,
        } : null,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

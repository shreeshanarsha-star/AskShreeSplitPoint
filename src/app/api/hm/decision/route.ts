import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const body = await req.json();
  const { candidateId, action, feedback } = body;

  if (!candidateId || !action) {
    return NextResponse.json({ error: "candidateId and action are required." }, { status: 400 });
  }

  let targetStage = "hm_review";
  if (action === "offer") targetStage = "selected";
  else if (action === "interview") targetStage = "interview_2";
  else if (action === "pass") targetStage = "rejected";

  const admin = createAdminClient();
  const { data: updated, error } = await admin
    .from("talent_candidates")
    .update({
      stage: targetStage,
      updated_at: new Date().toISOString(),
    })
    .eq("id", candidateId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, candidate: updated });
}

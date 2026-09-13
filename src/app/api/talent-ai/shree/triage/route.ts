import { NextResponse } from "next/server";
import { requireFeatureAccess } from "@/lib/supabase/requireAdmin";
import { triageRequisitionPipeline } from "@/lib/agent/shreeOrchestrator";

const FEATURE_KEY = "Talent.ai";

export async function GET(req: Request) {
  let supabase;
  try {
    ({ supabase } = await requireFeatureAccess(FEATURE_KEY));
  } catch (res) {
    return res as Response;
  }

  const { searchParams } = new URL(req.url);
  const requisitionId = searchParams.get("requisitionId");

  if (!requisitionId) {
    return NextResponse.json({ error: "requisitionId is required." }, { status: 400 });
  }

  const triage = await triageRequisitionPipeline(supabase, requisitionId);
  return NextResponse.json(triage);
}

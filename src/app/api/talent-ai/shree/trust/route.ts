import { NextResponse } from "next/server";
import { requireFeatureAccess } from "@/lib/supabase/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";

const FEATURE_KEY = "Talent.ai";

export async function GET() {
  let orgId, isAdmin;
  try {
    ({ orgId, isAdmin } = await requireFeatureAccess(FEATURE_KEY));
  } catch (res) {
    return res as Response;
  }

  const admin = createAdminClient();
  let query = admin.from("shree_lane_trust").select("*").order("role_family");

  if (!isAdmin && orgId) {
    query = query.eq("org_id", orgId);
  }

  const { data: lanes, error } = await query;
  if (error) {
    console.warn("[shree/trust] query error (using fallback):", error.message);
    return NextResponse.json({ lanes: [] });
  }

  return NextResponse.json({ lanes: lanes || [] });
}

export async function POST(req: Request) {
  let orgId, isAdmin;
  try {
    ({ orgId, isAdmin } = await requireFeatureAccess(FEATURE_KEY));
  } catch (res) {
    return res as Response;
  }

  const body = await req.json();
  const { roleFamily, killSwitchEngaged } = body;

  if (!roleFamily || typeof killSwitchEngaged !== "boolean") {
    return NextResponse.json({ error: "roleFamily and killSwitchEngaged boolean are required." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: updated, error } = await admin
    .from("shree_lane_trust")
    .update({
      kill_switch_engaged: killSwitchEngaged,
      updated_at: new Date().toISOString(),
    })
    .match(!isAdmin && orgId ? { org_id: orgId, role_family: roleFamily } : { role_family: roleFamily })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, lane: updated });
}

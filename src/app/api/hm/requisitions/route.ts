import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  try {
    const admin = createAdminClient();
    const { data: requisitions, error } = await admin
      .from("talent_requisitions")
      .select("*, talent_candidates(id, stage, name)")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ requisitions: requisitions || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load HM requisitions" }, { status: 500 });
  }
}

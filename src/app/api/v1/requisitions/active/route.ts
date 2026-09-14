import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const admin = createAdminClient();

    // 1. Check optional authenticated user session
    let orgId: string | null = null;
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await admin
          .from("profiles")
          .select("org_id, is_admin")
          .eq("id", user.id)
          .maybeSingle();
        if (profile?.org_id) {
          orgId = profile.org_id;
        }
      }
    } catch {
      // Optional session check; continue if unauthenticated or from extension
    }

    // 2. Query open/active requisitions
    let query = admin
      .from("talent_requisitions")
      .select("id, req_no, title, department, location, headcount, status, created_at")
      .in("status", ["open", "approved", "active", "published"])
      .order("created_at", { ascending: false })
      .limit(30);

    if (orgId) {
      query = query.eq("org_id", orgId);
    }

    const { data: requisitions, error } = await query;

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const formatted = (requisitions || []).map((r) => ({
      id: r.id,
      reqNo: r.req_no,
      title: r.title,
      department: r.department || "General",
      location: r.location || "Remote",
      openPositions: r.headcount || 1,
    }));

    return NextResponse.json(
      { ok: true, data: formatted },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      }
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

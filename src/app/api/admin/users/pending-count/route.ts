import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ totalPending: 0 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.is_admin) {
      return NextResponse.json({ totalPending: 0 });
    }

    // Query pending users
    const { count: pendingUsersCount } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending_approval");

    // Query pending organizations
    const { count: pendingOrgsCount } = await supabase
      .from("organizations")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");

    const total = (pendingUsersCount || 0) + (pendingOrgsCount || 0);

    return NextResponse.json({
      totalPending: total,
      pendingUsers: pendingUsersCount || 0,
      pendingOrgs: pendingOrgsCount || 0,
    });
  } catch {
    return NextResponse.json({ totalPending: 0 });
  }
}

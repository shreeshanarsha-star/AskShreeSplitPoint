import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeAccessContext } from "@/lib/accessContext";

export const dynamic = "force-dynamic";

// Single source of truth for "what can this signed-in account see and do,"
// consumed by every client component that needs to decide what to render
// (WaffleMenu, Sidebar, TopbarStatus) instead of each one independently
// re-querying profiles/talent_user_roles/feature_access and re-deriving
// its own answer. See src/lib/accessContext.ts for why this exists.
export async function GET() {
  try {
    const { user } = await requireUser();
    const admin = createAdminClient();
    const ctx = await computeAccessContext(admin, user.id, user.email ?? null);
    return NextResponse.json(ctx);
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Failed to load access context" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/supabase/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveHomeRoute } from "@/lib/homeRoute";

export const dynamic = "force-dynamic";

// Where the signed-in caller should land. Used by client-side fallbacks
// (login page, waiting room) so no client ever re-derives routing itself.
export async function GET() {
  try {
    const { user } = await requireUser();
    const home = await resolveHomeRoute(createAdminClient(), user.id, user.email ?? null);
    if (home.suspended) {
      return NextResponse.json(
        { error: "Your account is suspended. Please contact the platform owner.", suspended: true },
        { status: 403 }
      );
    }
    return NextResponse.json({ route: home.route });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Failed to resolve destination" }, { status: 500 });
  }
}

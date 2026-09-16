import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// PATCH: Org Admin or Platform Admin approves a pending requisition
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reqId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Verify user is org_admin or platform_admin
    const { data: profile } = await admin
      .from("profiles")
      .select("id, is_admin, org_role, org_id")
      .eq("id", user.id)
      .maybeSingle();

    const isAuthorized =
      profile?.is_admin ||
      profile?.org_role === "org_admin" ||
      profile?.org_role === "owner" ||
      profile?.org_role === "recruiter";

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Only Organization Admins or Platform Admins can approve requisitions." },
        { status: 403 }
      );
    }

    // Update requisition to published
    const { data: updatedReq, error } = await admin
      .from("job_postings")
      .update({
        status: "published",
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", reqId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      requisition: updatedReq,
      message: "Requisition approved and published to Guest Hub!",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Approval failed." },
      { status: 500 }
    );
  }
}

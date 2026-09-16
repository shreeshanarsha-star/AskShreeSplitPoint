import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// PATCH: Recruiter forwards a candidate application to HM Review
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; appId: string }> }
) {
  try {
    const { id: reqId, appId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const nextStatus = body.status || "hm_review"; // 'hm_review' or 'shortlisted'

    const admin = createAdminClient();

    const { data: updatedApp, error } = await admin
      .from("job_applications")
      .update({
        status: nextStatus,
        shortlisted: true,
        shortlist_sent_at: new Date().toISOString(),
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", appId)
      .eq("job_posting_id", reqId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      application: updatedApp,
      message: "Candidate application successfully forwarded to Hiring Manager Review.",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to forward candidate." },
      { status: 500 }
    );
  }
}

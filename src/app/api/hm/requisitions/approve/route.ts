import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { requisitionId, action, note } = body;

    if (!requisitionId || !action) {
      return NextResponse.json(
        { error: "requisitionId and action ('approve' | 'reject') are required." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const targetStatus = action === "approve" ? "active" : "draft";

    const { data: updated, error } = await admin
      .from("talent_requisitions")
      .update({
        status: targetStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", requisitionId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Record status history audit
    await admin.from("talent_requisition_status_history").insert({
      requisition_id: requisitionId,
      from_status: "pending_approval",
      to_status: targetStatus,
      note: note || (action === "approve" ? "Approved and published by Hiring Manager" : "Changes requested by Hiring Manager"),
    });

    // Update approval step if one exists
    await admin
      .from("talent_approval_steps")
      .update({
        decision: action === "approve" ? "approved" : "rejected",
        decided_at: new Date().toISOString(),
      })
      .eq("requisition_id", requisitionId)
      .eq("approver_role", "hiring_manager");

    return NextResponse.json({ ok: true, requisition: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to process requisition approval" }, { status: 500 });
  }
}

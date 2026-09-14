import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/supabase/requireAdmin";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, user: adminUser } = await requireAdminUser();
    const { id: targetUserId } = await params;

    const body = await request.json().catch(() => ({}));
    const { action, tools } = body; // action: 'approve' | 'save' | 'suspend' | 'reject'

    let newStatus = "active";
    if (action === "suspend") newStatus = "suspended";
    else if (action === "reject") newStatus = "rejected";
    else if (action === "approve" || action === "save") newStatus = "active";

    // 1. Update user profile status
    const { error: updateErr } = await supabase
      .from("profiles")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", targetUserId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // 2. If tools are provided and action is approve or save, update user_feature_access
    if (Array.isArray(tools) && (action === "approve" || action === "save")) {
      // First delete current grants
      await supabase
        .from("user_feature_access")
        .delete()
        .eq("user_id", targetUserId);

      // Insert new grants
      if (tools.length > 0) {
        // Gauri.ai is strictly owner-exclusive, cannot be granted to other users
        const sanitizedTools = tools.filter((t: string) => t !== "Gauri.ai");

        const rows = sanitizedTools.map((toolKey: string) => ({
          user_id: targetUserId,
          feature_key: toolKey,
          granted_by: adminUser.id,
        }));

        const { error: insertErr } = await supabase
          .from("user_feature_access")
          .insert(rows);

        if (insertErr) {
          return NextResponse.json({ error: insertErr.message }, { status: 500 });
        }
      }
    }

    return NextResponse.json({
      success: true,
      status: newStatus,
      toolsGranted: tools?.length || 0,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to update user access." },
      { status: err?.status || 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/supabase/requireAdmin";
import { sendEmail } from "@/lib/email";

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

    // 3. Send automated approval email to applicant
    if (action === "approve") {
      const { data: targetProfile } = await supabase
        .from("profiles")
        .select("email, full_name, persona")
        .eq("id", targetUserId)
        .maybeSingle();

      if (targetProfile?.email) {
        sendEmail({
          to: targetProfile.email,
          subject: "🎉 Your AskShree account and tool licenses have been approved!",
          tool: "RBAC Admin",
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
              <div style="margin-bottom: 20px;">
                <span style="background-color: #d1fae5; color: #047857; font-size: 11px; font-weight: bold; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase;">Account Approved</span>
              </div>
              <h2 style="color: #111827; font-size: 20px; margin: 0 0 12px;">Welcome to AskShree</h2>
              <p style="color: #4b5563; font-size: 13.5px; margin: 0 0 16px; line-height: 1.6;">
                Hi ${targetProfile.full_name || "there"},<br/><br/>
                Your <strong>${targetProfile.persona || "partner"}</strong> account has been officially approved by the platform owner (Shreesha). Your assigned tools and AI licenses are now active and ready.
              </p>
              
              <div style="margin: 28px 0;">
                <a href="https://www.askshree.com/login" style="background-color: #b45309; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 13.5px; font-weight: bold; display: inline-block;">
                  Sign In to Access Your Tools →
                </a>
              </div>

              <p style="color: #9ca3af; font-size: 11.5px; margin: 0; line-height: 1.5;">
                If you have questions regarding your tool licenses or need custom features, feel free to reply directly to this email.
              </p>
            </div>
          `,
        }).catch(() => {});
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

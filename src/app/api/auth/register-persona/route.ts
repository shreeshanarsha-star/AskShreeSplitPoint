import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClientIp, getClientLocation } from "@/lib/clientTelemetry";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { persona, companyName, fullName } = body;

    const selectedPersona = ["candidate", "recruiter", "organization"].includes(persona)
      ? persona
      : "candidate";

    // Candidates are instant active; Recruiters & Orgs require Owner approval
    const status = selectedPersona === "candidate" ? "active" : "pending_approval";

    const ip = getClientIp(request.headers);
    const location = getClientLocation(request.headers);
    const authProvider = user.app_metadata?.provider || "email";

    const updatePayload: Record<string, any> = {
      persona: selectedPersona,
      status,
      signup_ip: ip,
      signup_location: location,
      auth_provider: authProvider,
    };

    if (companyName) updatePayload.company_name = companyName;
    if (fullName) updatePayload.full_name = fullName;

    // Check if profile exists; update or insert
    const { error: profileError } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", user.id);

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    // Trigger instant email notification to Owner for pending requests
    if (status === "pending_approval") {
      sendEmail({
        to: "shreesha.narsha+admin@gmail.com",
        subject: `🔔 New ${selectedPersona.toUpperCase()} Access Request: ${fullName || user.email}`,
        tool: "RBAC Admin",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
            <div style="margin-bottom: 20px;">
              <span style="background-color: #fef3c7; color: #b45309; font-size: 11px; font-weight: bold; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase;">New Access Request</span>
            </div>
            <h2 style="color: #111827; font-size: 19px; margin: 0 0 8px;">A new ${selectedPersona} requires your review</h2>
            <p style="color: #4b5563; font-size: 13px; margin: 0 0 20px; line-height: 1.5;">A new user has registered and is in the pending approval queue waiting for tool licensing.</p>
            
            <table style="width: 100%; border-collapse: collapse; font-size: 12.5px; margin-bottom: 24px;">
              <tr><td style="padding: 9px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280;">Applicant Name</td><td style="padding: 9px 0; border-bottom: 1px solid #f3f4f6; font-weight: 600; color: #111827;">${fullName || "Not specified"}</td></tr>
              <tr><td style="padding: 9px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280;">Email Address</td><td style="padding: 9px 0; border-bottom: 1px solid #f3f4f6; color: #111827;">${user.email}</td></tr>
              <tr><td style="padding: 9px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280;">Requested Role</td><td style="padding: 9px 0; border-bottom: 1px solid #f3f4f6; text-transform: capitalize; font-weight: 600; color: #b45309;">${selectedPersona}</td></tr>
              <tr><td style="padding: 9px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280;">Company / Firm</td><td style="padding: 9px 0; border-bottom: 1px solid #f3f4f6; color: #111827;">${companyName || "Independent"}</td></tr>
              <tr><td style="padding: 9px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280;">IP Address</td><td style="padding: 9px 0; border-bottom: 1px solid #f3f4f6; font-family: monospace; color: #111827;">${ip}</td></tr>
              <tr><td style="padding: 9px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280;">Location</td><td style="padding: 9px 0; border-bottom: 1px solid #f3f4f6; color: #111827;">📍 ${location}</td></tr>
              <tr><td style="padding: 9px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280;">Auth Provider</td><td style="padding: 9px 0; border-bottom: 1px solid #f3f4f6; text-transform: capitalize; color: #111827;">${authProvider}</td></tr>
            </table>

            <div>
              <a href="https://www.askshree.com/admin/users" style="background-color: #b45309; color: #ffffff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 600; display: inline-block;">
                Review & Grant Tools in Admin Console →
              </a>
            </div>
          </div>
        `,
      }).catch(() => {});
    }

    const redirectUrl = selectedPersona === "candidate" ? "/candidate" : "/waiting-room";

    return NextResponse.json({
      success: true,
      status,
      persona: selectedPersona,
      redirectUrl,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to register persona" },
      { status: 500 }
    );
  }
}

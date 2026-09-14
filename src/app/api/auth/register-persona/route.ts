import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClientIp, getClientLocation } from "@/lib/clientTelemetry";

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

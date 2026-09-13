import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const amount = typeof body.amount === "number" && body.amount > 0 ? Math.min(body.amount, 100) : 25;
    const reason = typeof body.reason === "string" ? body.reason : "job_share";

    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();

    if (!authData?.user) {
      // Guest / unauthenticated candidate: credits tracked client-side
      return NextResponse.json({
        success: true,
        guest: true,
        earned: amount,
        reason,
        message: "Credits recorded locally. Sign in or create an account to persist credits across devices.",
      });
    }

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("credits")
      .eq("id", authData.user.id)
      .maybeSingle();

    const currentCredits = profile?.credits || 0;
    const newTotal = currentCredits + amount;

    await admin
      .from("profiles")
      .update({ credits: newTotal })
      .eq("id", authData.user.id);

    return NextResponse.json({
      success: true,
      guest: false,
      earned: amount,
      totalCredits: newTotal,
      reason,
    });
  } catch (err) {
    console.error("Failed to process credit earn:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

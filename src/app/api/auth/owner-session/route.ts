import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Backs the unlisted owner-only sign-in page (see
// src/app/vk3mqx7z/page.tsx for why this route exists and how it's
// meant to be reached). This is intentionally NOT the same code path
// as /api/auth/quick-login: that route signs any valid account in and
// sends them to their own normal destination, which would make this
// page silently work as a second, less-visible /login for every
// account -- not what an owner-only side door should do. Here, a
// correct password on a non-owner account is treated exactly like a
// wrong password: the session is torn down before this ever returns,
// and the response is identical either way. The page should never be
// able to tell a stranger anything about whether an email exists,
// whether a password is right, or that this door is owner-only.
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", data.user.id)
      .maybeSingle();

    if (!profile?.is_admin) {
      // Valid credentials, but not the owner -- tear the session back
      // down and respond exactly like a failed login.
      await supabase.auth.signOut();
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }
}

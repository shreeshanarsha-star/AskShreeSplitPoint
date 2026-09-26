import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, name, candidateId } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email address is required." }, { status: 400 });
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters long." }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanName = (name && typeof name === "string") ? name.trim() : "Candidate";
    const admin = createAdminClient();

    // 1. Check if user already exists in profiles
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id, email")
      .eq("email", cleanEmail)
      .maybeSingle();

    let userId: string;

    if (existingProfile) {
      userId = existingProfile.id;
      // Update password so user can sign in immediately
      const { error: updateErr } = await admin.auth.admin.updateUserById(userId, {
        password,
        user_metadata: {
          full_name: cleanName,
          role: "candidate",
        },
      });
      if (updateErr) {
        console.warn("Update existing user password warning:", updateErr.message);
      }
      // Make sure this account is flagged as an active candidate account --
      // an existing profile might predate the candidate persona (e.g. it
      // was only ever a bare auth row), so set it explicitly rather than
      // assume it's already correct.
      await admin
        .from("profiles")
        .update({ persona: "candidate", status: "active", full_name: cleanName })
        .eq("id", userId);
    } else {
      // Create confirmed user without email verification barrier
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email: cleanEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: cleanName,
          role: "candidate",
        },
      });

      if (createError || !created?.user) {
        return NextResponse.json(
          { error: createError?.message || "Could not create candidate account." },
          { status: 500 }
        );
      }

      userId = created.user.id;

      // Update the automatically created profile record. persona +
      // status mirror exactly what /api/auth/register-persona sets for a
      // candidate signup -- candidates are active immediately, no owner
      // approval needed (that's only for recruiter/org accounts).
      await admin
        .from("profiles")
        .update({
          full_name: cleanName,
          org_role: "candidate",
          persona: "candidate",
          status: "active",
        })
        .eq("id", userId);
    }

    // 2. Link candidate record if candidateId is provided
    if (candidateId) {
      try {
        await admin
          .from("talent_candidates")
          .update({ email: cleanEmail })
          .eq("id", candidateId);
      } catch (linkErr) {
        console.warn("Could not update candidate link:", linkErr);
      }
    }

    return NextResponse.json({
      ok: true,
      userId,
      email: cleanEmail,
      message: "Candidate account created and verified.",
    });
  } catch (err: any) {
    console.error("Candidate quick signup error:", err);
    return NextResponse.json(
      { error: err?.message || "An unexpected error occurred during signup." },
      { status: 500 }
    );
  }
}

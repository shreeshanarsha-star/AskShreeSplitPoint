import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  if (!id && !token && !email) {
    return NextResponse.json({ error: "Missing candidate id, token, or email." }, { status: 400 });
  }

  const admin = createAdminClient();
  let query = admin
    .from("talent_candidates")
    .select(`
      id,
      name,
      stage,
      current_designation,
      current_company,
      created_at,
      updated_at,
      talent_requisitions (
        title,
        req_no,
        location
      )
    `);

  if (id) {
    query = query.eq("id", id);
  } else if (token) {
    query = query.eq("interview_token", token);
  } else if (email) {
    query = query.eq("email", email.toLowerCase().trim()).order("created_at", { ascending: false });
  }

  const { data: candidate, error } = await query.limit(1).maybeSingle();

  if (error || !candidate) {
    return NextResponse.json({ error: "Candidate not found." }, { status: 404 });
  }

  return NextResponse.json({ candidate });
}

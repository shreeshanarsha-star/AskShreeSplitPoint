import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const admin = createAdminClient();

  // Fetch published requisitions or job postings
  const { data: reqs } = await admin
    .from("talent_requisitions")
    .select("id, req_no, title, location, description, status")
    .in("status", ["open", "active", "published", "approved"])
    .order("created_at", { ascending: false })
    .limit(20);

  const jobs = (reqs && reqs.length > 0)
    ? reqs.map((r) => ({
        id: r.id,
        title: r.title,
        department: "Engineering & Technology",
        location: r.location || "Bangalore / Remote",
        type: "Full-Time",
        description: r.description,
      }))
    : [
        {
          id: "demo-req-1",
          title: "Senior Full-Stack Engineer",
          department: "Product Engineering",
          location: "Bangalore / Remote",
          type: "Full-Time",
          description: "Build high-throughput web applications with Next.js, TypeScript, and Supabase.",
        },
        {
          id: "demo-req-2",
          title: "Enterprise Account Executive",
          department: "Sales & Partnerships",
          location: "Mumbai / Hybrid",
          type: "Full-Time",
          description: "Drive strategic enterprise B2B sales cycles with Fortune 500 accounts.",
        },
        {
          id: "demo-req-3",
          title: "Technical Talent Acquisition Partner",
          department: "Human Resources",
          location: "Remote",
          type: "Full-Time",
          description: "Partner with engineering leadership to source and calibrate top-tier distributed teams.",
        },
      ];

  return NextResponse.json({ jobs });
}

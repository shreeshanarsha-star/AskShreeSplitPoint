import { createClient } from "@/lib/supabase/server";
import Icon from "@/components/Icon";
import Link from "next/link";
import Logo from "@/components/Logo";
import TopbarStatus from "@/components/TopbarStatus";
import QuickApplyButton from "@/components/tools/QuickApplyButton";

export const dynamic = "force-dynamic";

// Public, crawlable job board — the old askshree-app repo's /jobs index,
// recreated. Anyone can browse; postings are AI-structured JDs an admin
// has approved and published (from either the free public flow at
// /jobs/post or the internal org-gated tool at /tools/job-postings-ai —
// both land in the same job_postings table and this page doesn't care
// which one a given row came from).
export default async function JobsPage() {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const { data: jobs } = await supabase
    .from("job_postings")
    .select(
      "id, title, company, location, employment_type, industry, created_at, expires_at"
    )
    .eq("status", "published")
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .order("created_at", { ascending: false });

  const openRoles = jobs ?? [];

  return (
    <div className="min-h-screen bg-page">
      <header className="border-b border-border bg-surface px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="hover:opacity-90 transition-opacity">
            <Logo height={28} showPunchline={true} />
          </Link>
          <span className="text-border text-sm select-none">/</span>
          <span className="text-[12.5px] font-semibold text-ink-muted">Job Board</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/jobs/post"
            className="bg-brand text-white text-[12.5px] font-bold px-3.5 py-1.5 rounded-sm shadow-soft-sm hover:opacity-95 transition-opacity"
          >
            Post a job — free
          </Link>
          <TopbarStatus />
        </div>
      </header>

      <main className="max-w-[1000px] mx-auto px-6 py-10">
        <h1 className="text-[26px] font-bold m-0">Open roles</h1>
        <p className="text-[13.5px] text-ink-muted mt-1.5 max-w-xl">
          Browse current openings. Click a role for full details, or head to
          Apply.ai to submit your resume.
        </p>

        {openRoles.length === 0 ? (
          <div className="border border-dashed border-border rounded-md px-4 py-8 text-center text-[13px] text-ink-muted mt-8 max-w-xl">
            <Icon name="briefcase" className="w-6 h-6 mx-auto mb-2 text-ink-muted" />
            No open roles right now. Check back soon.
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 mt-8">
            {openRoles.map((job) => (
              <div
                key={job.id}
                className="border border-border rounded-xl bg-surface shadow-soft-sm px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-brand/40 transition-all"
              >
                <Link href={`/jobs/${job.id}`} className="flex-1 group">
                  <div className="text-[15px] font-bold group-hover:text-brand transition-colors">
                    {job.title}
                  </div>
                  <div className="flex items-center gap-2 text-[12.5px] text-ink-muted mt-1">
                    {job.company && <span className="font-semibold text-ink">{job.company}</span>}
                    {job.company && <span>•</span>}
                    <span>{job.location || "Remote"}</span>
                    {job.employment_type && (
                      <>
                        <span>•</span>
                        <span className="capitalize">{job.employment_type}</span>
                      </>
                    )}
                  </div>
                </Link>

                <div className="flex items-center gap-2 shrink-0">
                  <QuickApplyButton
                    job={{
                      id: job.id,
                      title: job.title,
                      company: job.company,
                      location: job.location,
                    }}
                    variant="secondary"
                    label="Quick Apply"
                  />
                  <Link
                    href={`/jobs/${job.id}`}
                    className="border border-border hover:border-brand/40 text-ink text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors"
                  >
                    View Details →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

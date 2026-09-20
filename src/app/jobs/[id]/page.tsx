import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/Icon";
import Logo from "@/components/Logo";
import TopbarStatus from "@/components/TopbarStatus";
import JobShareButton from "@/components/JobShareButton";
import QuickApplyButton from "@/components/tools/QuickApplyButton";
import JobPostingTemplate from "@/components/JobPostingTemplate";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface AtsPosting {
  id: string;
  status: string;
  board: string;
  hide_company_name: boolean;
  content: Record<string, string> | null;
  valid_through: string | null;
  created_at: string;
  requisition_id: string;
}

interface AtsRequisition {
  id: string;
  title: string;
  department: string | null;
  location: string | null;
  work_mode: string | null;
  employment_type: string | null;
  description: string | null;
  eligibility_criteria: { must_have_skills?: string[]; good_to_have_skills?: string[] } | null;
  org_id: string | null;
}

type LegacyJob = {
  id: string; title: string; company: string | null; location: string | null;
  employment_type: string | null; description: string | null;
  ai_polished_description: string | null; must_have_skills: string[] | null;
  good_to_have_skills: string[] | null; qualification: string | null;
  min_years_experience: number | null; industry: string | null;
  created_at: string; expires_at: string | null;
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();

  let posting: AtsPosting | null = null;
  let requisition: AtsRequisition | null = null;
  let orgName: string | null = null;
  let legacyJob: LegacyJob | null = null;

  try {
    // 1. Look up talent_job_postings — id is a posting UUID since Phase 1.
    const { data: p } = await admin
      .from("talent_job_postings")
      .select("id, status, board, hide_company_name, content, valid_through, created_at, requisition_id")
      .eq("id", id)
      .eq("board", "askshree")
      .eq("status", "published")
      .maybeSingle();

    if (p) posting = p as unknown as AtsPosting;
  } catch {
    // talent_job_postings table not yet created (DRAFT migration pending) — fall through.
  }

  if (posting) {
    try {
      // 2. Fetch the requisition.
      const { data: r } = await admin
        .from("talent_requisitions")
        .select("id, title, department, location, work_mode, employment_type, description, eligibility_criteria, org_id")
        .eq("id", posting.requisition_id)
        .maybeSingle();
      if (r) requisition = r as unknown as AtsRequisition;

      // 3. Fetch org name (no logo in current schema — added in Phase 5).
      if (requisition?.org_id) {
        const { data: org } = await admin
          .from("organizations")
          .select("id, name")
          .eq("id", requisition.org_id)
          .maybeSingle();
        orgName = (org as { id: string; name: string } | null)?.name ?? null;
      }
    } catch (err) {
      console.warn("Error fetching requisition / org:", err);
    }
  }

  // Legacy fallback: id may be a legacy job_postings row (keep old links working).
  if (!posting) {
    try {
      const { data: legacy } = await admin
        .from("job_postings")
        .select("id, title, company, location, employment_type, description, ai_polished_description, must_have_skills, good_to_have_skills, qualification, min_years_experience, industry, created_at, expires_at")
        .eq("id", id)
        .maybeSingle();
      if (legacy) legacyJob = legacy as unknown as LegacyJob;
    } catch { /* ignore */ }
  }

  if (!posting && !legacyJob) notFound();

  // Render legacy layout
  if (legacyJob) return <LegacyJobDetail job={legacyJob} />;
  if (!posting || !requisition) notFound();

  // Build template data
  const content = (posting.content ?? {}) as Record<string, string>;
  const ec = requisition.eligibility_criteria ?? {};
  const coreStrengths: string[] = Array.isArray(ec.must_have_skills) ? ec.must_have_skills : [];
  const additionalStrengths: string[] = Array.isArray(ec.good_to_have_skills) ? ec.good_to_have_skills : [];

  // JSON-LD — omit entirely when hide_company_name is on (per Phase 3 spec).
  const jsonLd = posting.hide_company_name
    ? null
    : {
        "@context": "https://schema.org/",
        "@type": "JobPosting",
        title: requisition.title,
        description:
          content.what_you_will_do ||
          requisition.description ||
          `${requisition.title} at ${orgName ?? "AskShree"}`,
        datePosted: posting.created_at,
        ...(posting.valid_through ? { validThrough: posting.valid_through } : {}),
        hiringOrganization: {
          "@type": "Organization",
          name: orgName ?? "AskShree",
          sameAs: "https://www.askshree.com",
        },
        ...(requisition.employment_type
          ? { employmentType: requisition.employment_type.toUpperCase().replace(/[\s-]+/g, "_") }
          : {}),
        ...(requisition.work_mode?.toLowerCase().includes("remote")
          ? { jobLocationType: "TELECOMMUTE" }
          : requisition.location
          ? {
              jobLocation: {
                "@type": "Place",
                address: { "@type": "PostalAddress", addressLocality: requisition.location },
              },
            }
          : {}),
        url: `https://www.askshree.com/jobs/${posting.id}`,
      };

  const displayCompany = posting.hide_company_name ? "Confidential" : (orgName ?? "AskShree");

  return (
    <div className="min-h-screen bg-page text-ink flex flex-col selection:bg-brand-wash selection:text-brand">
      {/* Google-for-Jobs structured data */}
      {jsonLd && (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}

      {/* Header */}
      <header className="px-6 py-3.5 border-b border-border bg-surface shadow-soft-sm flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center hover:opacity-90 transition-opacity">
            <Logo height={28} showPunchline={true} />
          </Link>
          <span className="text-border hidden sm:inline select-none">/</span>
          <span className="font-semibold text-[13.5px] sm:text-[14.5px] text-ink-2 hidden sm:inline font-display">
            Role Specifications
          </span>
        </div>
        <div className="flex items-center gap-3.5 text-xs">
          <Link
            href="/"
            className="text-[12px] font-bold text-ink-muted hover:text-brand transition-colors flex items-center gap-1.5"
          >
            <Icon name="chevronLeft" size={13} />
            <span>Back to Open Jobs</span>
          </Link>
          <span className="w-px h-5 bg-border flex-shrink-0" />
          <TopbarStatus />
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-[900px] w-full mx-auto px-6 py-8 sm:py-10 space-y-6">
        <JobPostingTemplate
          title={requisition.title}
          department={requisition.department}
          location={requisition.location}
          workMode={requisition.work_mode}
          employmentType={requisition.employment_type}
          companyName={orgName}
          hideCompanyName={posting.hide_company_name}
          coreStrengthsList={coreStrengths}
          additionalStrengthsList={additionalStrengths}
          content={{
            who_we_are: content.who_we_are,
            success_stories: content.success_stories,
            why_join_us: content.why_join_us,
            what_you_will_do: content.what_you_will_do || requisition.description || undefined,
            core_strengths: content.core_strengths,
            additional_strengths: content.additional_strengths,
            how_you_grow: content.how_you_grow,
          }}
          isEditable={false}
        />

        {/* Action bar */}
        <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-soft flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="font-bold text-sm text-ink font-display">Interested in this position?</div>
            <div className="text-xs text-ink-muted mt-0.5">
              Consult directly with Shree or apply for an instant evaluation.
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <JobShareButton
              job={{
                id: posting.id,
                title: requisition.title,
                company: displayCompany,
                location: requisition.location ?? "Remote",
              }}
              variant="button"
            />
            <Link
              href={`/?role=${encodeURIComponent(posting.id)}`}
              className="px-4 py-2 rounded-xl text-xs font-semibold border border-border hover:border-brand/40 text-ink hover:text-brand bg-page transition-all flex items-center gap-1.5"
            >
              <Icon name="chat" size={13} />
              <span>Consult Shree</span>
            </Link>
            <QuickApplyButton
              job={{
                id: posting.id,
                title: requisition.title,
                company: displayCompany,
                location: requisition.location ?? "Remote",
                must_have_skills: coreStrengths,
              }}
              label="Quick Apply (Drop CV)"
            />
            <Link
              href={`/apply?job=${encodeURIComponent(posting.id)}`}
              className="border border-border text-ink hover:text-brand hover:border-brand/40 bg-page text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-1"
            >
              Standard Apply
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Legacy fallback (job_postings table — being retired in Phase 5)
// ---------------------------------------------------------------------------
function LegacyJobDetail({ job }: { job: LegacyJob }) {
  const desc = job.ai_polished_description || job.description || "";
  return (
    <div className="min-h-screen bg-page text-ink flex flex-col">
      <header className="px-6 py-3.5 border-b border-border bg-surface shadow-soft-sm flex items-center justify-between sticky top-0 z-30">
        <Link href="/" className="flex items-center hover:opacity-90 transition-opacity">
          <Logo height={28} showPunchline={true} />
        </Link>
        <div className="flex items-center gap-3.5">
          <Link href="/" className="text-[12px] font-bold text-ink-muted hover:text-brand transition-colors flex items-center gap-1.5">
            <Icon name="chevronLeft" size={13} /><span>Back</span>
          </Link>
          <span className="w-px h-5 bg-border" />
          <TopbarStatus />
        </div>
      </header>
      <main className="flex-1 max-w-[900px] w-full mx-auto px-6 py-8 space-y-6">
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-soft">
          <h1 className="text-2xl font-bold font-display text-ink m-0">{job.title}</h1>
          <p className="text-sm text-ink-muted mt-1">
            {[job.company ?? "AskShree", job.location, job.employment_type].filter(Boolean).join(" · ")}
          </p>
          {desc && (
            <p className="text-[14px] text-ink-2 mt-4 whitespace-pre-wrap leading-relaxed">{desc}</p>
          )}
        </div>
        <div className="bg-surface border border-border rounded-2xl p-5 shadow-soft flex flex-wrap items-center justify-between gap-4">
          <div className="font-bold text-sm text-ink font-display">Interested in this position?</div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Link href={`/?role=${encodeURIComponent(job.id)}`}
              className="px-4 py-2 rounded-xl text-xs font-semibold border border-border hover:border-brand/40 text-ink hover:text-brand bg-page transition-all flex items-center gap-1.5">
              <Icon name="chat" size={13} /><span>Consult Shree</span>
            </Link>
            <Link href={`/apply?job=${encodeURIComponent(job.id)}`}
              className="border border-border text-ink hover:text-brand hover:border-brand/40 bg-page text-xs font-bold px-4 py-2 rounded-xl transition-all">
              Standard Apply
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
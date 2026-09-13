import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/Icon";
import Logo from "@/components/Logo";
import TopbarStatus from "@/components/TopbarStatus";
import JobShareButton from "@/components/JobShareButton";
import { buildJobPostingSchema } from "@/lib/jobPostings/schema";

export const dynamic = "force-dynamic";

type NormalizedJob = {
  id: string;
  title: string;
  company: string;
  company_url?: string | null;
  location: string;
  employment_type: string;
  description: string;
  must_have_skills: string[];
  good_to_have_skills: string[];
  qualification?: string | null;
  min_years_experience?: number | null;
  industry?: string | null;
  ctc_budget?: string | null;
  created_at?: string;
  expires_at?: string | null;
};

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let job: NormalizedJob | null = null;

  try {
    const admin = createAdminClient();

    // 1. Check job_postings table
    const { data: posting } = await admin
      .from("job_postings")
      .select(
        "id, title, company, company_url, location, employment_type, description, ai_polished_description, must_have_skills, good_to_have_skills, qualification, min_years_experience, industry, ctc_budget, created_at, expires_at, status"
      )
      .eq("id", id)
      .maybeSingle();

    if (posting) {
      job = {
        id: posting.id,
        title: posting.title,
        company: posting.company || "AskShree",
        company_url: posting.company_url,
        location: posting.location || "Remote",
        employment_type: posting.employment_type || "Full-Time",
        description:
          posting.ai_polished_description ||
          posting.description ||
          "Detailed specifications for this role.",
        must_have_skills: posting.must_have_skills || [],
        good_to_have_skills: posting.good_to_have_skills || [],
        qualification: posting.qualification,
        min_years_experience: posting.min_years_experience,
        industry: posting.industry || "Engineering & Technology",
        ctc_budget: posting.ctc_budget,
        created_at: posting.created_at,
        expires_at: posting.expires_at,
      };
    }

    // 2. Check talent_requisitions table if not found in job_postings
    if (!job) {
      const { data: req } = await admin
        .from("talent_requisitions")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (req) {
        job = {
          id: req.id,
          title: req.title,
          company: "AskShree",
          location: req.location || "Bengaluru / Remote",
          employment_type: req.employment_type || req.work_mode || "Full-Time",
          description:
            req.description ||
            req.jd_source_text ||
            "Join our mission-driven team to architect and scale autonomous talent workflows. You will work directly with distributed systems and real-time AI agents.",
          must_have_skills: [
            "Domain Problem Solving",
            "High Ownership & Execution",
            "Modern Technology Stack",
          ],
          good_to_have_skills: [
            "Distributed Systems Architecture",
            "Real-time AI Workflows",
            "Cross-functional Collaboration",
          ],
          qualification: "Bachelor's or equivalent practical experience",
          min_years_experience: 3,
          industry: req.department || "Engineering & Technology",
          ctc_budget:
            req.comp_min && req.comp_max
              ? `₹${req.comp_min} - ₹${req.comp_max}`
              : "$80k - $140k",
          created_at: req.created_at,
          expires_at: null,
        };
      }
    }
  } catch (err) {
    console.warn("Database query for job details:", err);
  }

  // 3. Fallback demo mock requisitions
  if (!job && id.startsWith("demo-req")) {
    const DEMO_JOBS: Record<string, NormalizedJob> = {
      "demo-req-1": {
        id: "demo-req-1",
        title: "Senior Full-Stack Engineer",
        company: "AskShree",
        location: "Bangalore / Remote",
        employment_type: "Full-Time",
        description:
          "Join AskShree as a Senior Full-Stack Engineer to build high-throughput, agentic hiring platforms. You will architect distributed systems, high-performance web applications using Next.js 15, TypeScript, and Supabase, and integrate real-time voice and conversational AI engines.",
        must_have_skills: [
          "TypeScript",
          "Next.js / React",
          "Node.js",
          "PostgreSQL / Supabase",
          "System Design",
        ],
        good_to_have_skills: [
          "WebSockets / Realtime APIs",
          "Tailwind CSS",
          "LLM APIs & Prompt Engineering",
        ],
        qualification:
          "B.Tech / M.Tech in Computer Science or equivalent practical experience",
        min_years_experience: 5,
        industry: "Engineering & Technology",
        ctc_budget: "₹25L - ₹40L",
      },
      "demo-req-2": {
        id: "demo-req-2",
        title: "Enterprise Account Executive",
        company: "AskShree",
        location: "Mumbai / Hybrid",
        employment_type: "Full-Time",
        description:
          "Drive strategic enterprise B2B sales cycles with Fortune 500 accounts. You will partner with VP of HR and Talent Acquisition heads to demonstrate AskShree's autonomous hiring suite.",
        must_have_skills: [
          "Enterprise B2B Sales",
          "SaaS Deal Closing",
          "Executive Presentations",
          "Pipeline Management",
        ],
        good_to_have_skills: ["HR Tech Domain Knowledge", "CRM Mastery"],
        qualification: "Bachelor's degree in Business or related discipline",
        min_years_experience: 4,
        industry: "Sales & Partnerships",
        ctc_budget: "₹18L - ₹32L",
      },
      "demo-req-3": {
        id: "demo-req-3",
        title: "Technical Talent Acquisition Partner",
        company: "AskShree",
        location: "Remote",
        employment_type: "Full-Time",
        description:
          "Partner with engineering leadership to source, calibrate, and hire top-tier distributed engineers and researchers globally.",
        must_have_skills: [
          "Technical Sourcing",
          "Candidate Calibration",
          "Stakeholder Management",
          "Talent Pipelines",
        ],
        good_to_have_skills: ["AI-powered Sourcing Tools", "Engineering Rubrics"],
        qualification: "Bachelor's degree or equivalent practical experience",
        min_years_experience: 3,
        industry: "Human Resources",
        ctc_budget: "₹15L - ₹25L",
      },
    };
    job = DEMO_JOBS[id] || null;
  }

  if (!job) notFound();

  const schema = buildJobPostingSchema({
    title: job.title,
    company: job.company,
    location: job.location,
    description: job.description,
    created_at: job.created_at || new Date().toISOString(),
    expires_at: job.expires_at || null,
    employment_type: job.employment_type,
  });

  return (
    <div className="min-h-screen bg-page text-ink flex flex-col selection:bg-brand-wash selection:text-brand">
      {/* Google-for-Jobs structured data */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      {/* Global Navigation Header (Strict GEMINI.md compliance) */}
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
            <span>Back to Open Roles</span>
          </Link>
          <span className="w-px h-5 bg-border flex-shrink-0" />
          <TopbarStatus />
        </div>
      </header>

      {/* Main Detailed Specifications Viewport */}
      <main className="flex-1 max-w-[880px] w-full mx-auto px-6 py-8 sm:py-10 space-y-6">
        {/* Role Header Card */}
        <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-soft space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-brand-wash text-brand border border-brand/20 mb-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active Requisition
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold font-display text-ink tracking-tight m-0">
                {job.title}
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[13px] text-ink-muted">
                <span className="font-medium text-ink">{job.company}</span>
                <span>•</span>
                <span>{job.location}</span>
                <span>•</span>
                <span>{job.employment_type}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <JobShareButton
                job={{
                  id: job.id,
                  title: job.title,
                  company: job.company,
                  location: job.location,
                  ctc_budget: job.ctc_budget || undefined,
                }}
                variant="button"
              />
              {job.ctc_budget && (
                <span className="text-sm sm:text-base font-bold text-good-text bg-good-wash border border-good/20 px-4 py-1.5 rounded-xl shadow-soft-sm whitespace-nowrap">
                  {job.ctc_budget}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
            {job.industry && <Tag>{job.industry}</Tag>}
            {job.min_years_experience != null && (
              <Tag>{job.min_years_experience}+ yrs experience</Tag>
            )}
            {job.qualification && <Tag>{job.qualification}</Tag>}
            <Tag>Fast Track AI Screen</Tag>
          </div>
        </div>

        {/* Competencies & Skills */}
        {(job.must_have_skills.length > 0 || job.good_to_have_skills.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {job.must_have_skills.length > 0 && (
              <div className="bg-surface border border-border rounded-2xl p-5 shadow-soft-sm">
                <SkillList label="Required Competencies" skills={job.must_have_skills} isRequired />
              </div>
            )}
            {job.good_to_have_skills.length > 0 && (
              <div className="bg-surface border border-border rounded-2xl p-5 shadow-soft-sm">
                <SkillList label="Preferred Skills" skills={job.good_to_have_skills} isRequired={false} />
              </div>
            )}
          </div>
        )}

        {/* Detailed Role Description */}
        <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-soft space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted font-display">
            About this Role & Expectations
          </h2>
          <div className="text-[13.5px] sm:text-[14px] text-ink-2 whitespace-pre-wrap leading-relaxed space-y-3">
            {job.description}
          </div>
        </div>

        {/* Action Bar */}
        <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 shadow-soft flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="font-bold text-sm text-ink font-display">Interested in this position?</div>
            <div className="text-xs text-ink-muted mt-0.5">
              Consult directly with Shree or apply directly for instantaneous candidate evaluation.
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <JobShareButton
              job={{
                id: job.id,
                title: job.title,
                company: job.company,
                location: job.location,
                ctc_budget: job.ctc_budget || undefined,
              }}
              variant="button"
            />
            <Link
              href={`/?role=${encodeURIComponent(job.id)}`}
              className="px-4 py-2 rounded-xl text-xs font-semibold border border-border hover:border-brand/40 text-ink hover:text-brand bg-page transition-all flex items-center gap-1.5"
            >
              <Icon name="chat" size={13} />
              <span>Consult Shree</span>
            </Link>
            <Link
              href={`/apply?job=${encodeURIComponent(job.id)}`}
              className="bg-brand hover:bg-brand-dark text-white text-xs font-bold px-5 py-2 rounded-xl shadow-button transition-all"
            >
              Apply Now →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11.5px] font-semibold px-3 py-1 rounded-full bg-page text-ink-2 border border-border">
      {children}
    </span>
  );
}

function SkillList({
  label,
  skills,
  isRequired,
}: {
  label: string;
  skills: string[];
  isRequired: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-xs font-bold uppercase tracking-wider text-ink font-display">
          {label}
        </span>
        {isRequired && (
          <span className="text-[9.5px] font-bold text-brand bg-brand-wash px-1.5 py-0.5 rounded border border-brand/20">
            Required
          </span>
        )}
      </div>
      <ul className="text-xs text-ink-2 space-y-1.5 pl-1">
        {skills.map((s) => (
          <li key={s} className="flex items-start gap-2">
            <span className="text-brand font-bold mt-0.5">•</span>
            <span>{s}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

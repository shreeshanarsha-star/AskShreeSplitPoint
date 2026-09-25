"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/Icon";
import Logo from "@/components/Logo";

interface RequisitionDetail {
  id: string;
  req_no: string;
  title: string;
  status: string;
  department?: string | null;
  location?: string | null;
  work_mode?: string | null;
  employment_type?: string | null;
  headcount?: number | null;
  priority?: string | null;
  hiring_manager?: string | null;
  description?: string | null;
  job_level?: string | null;
  comp_min?: number | null;
  comp_max?: number | null;
  target_hire_date?: string | null;
  eligibility_criteria?: { must_have_skills?: string[]; good_to_have_skills?: string[] } | null;
  created_at?: string;
  updated_at?: string;
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    open: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    approved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    pending_approval: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
    draft: "bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400",
    closed: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
    rejected: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
  };
  const cls = map[status] || "bg-brand-wash text-brand border-brand/20";
  return <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${cls}`}>{status.replace(/_/g, " ")}</span>;
}

export default function RequisitionDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [req, setReq] = useState<RequisitionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/ats/requisitions/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load requisition.");
        setReq(data.requisition);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load requisition.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const mustHave = req?.eligibility_criteria?.must_have_skills ?? [];
  const goodToHave = req?.eligibility_criteria?.good_to_have_skills ?? [];
  const hasMoreDetails = Boolean(
    req && (req.description || req.comp_min || req.comp_max || req.job_level || req.target_hire_date || mustHave.length || goodToHave.length)
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col">
      <header className="px-6 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/recruiter"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 flex-shrink-0"
            title="Back to Recruiter Console"
          >
            <Icon name="chevronLeft" size={16} />
          </Link>
          <Link href="/" className="group flex-shrink-0">
            <Logo height={28} showPunchline={true} />
          </Link>
          <span className="text-slate-300 dark:text-slate-700 flex-shrink-0">/</span>
          <span className="font-bold text-sm tracking-tight truncate">{req?.req_no ?? "Requisition"}</span>
        </div>
        {req && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href={`/recruiter?feature=post_to_boards&req=${req.id}`}
              className="text-xs font-semibold text-brand border border-brand/30 bg-brand-wash/40 hover:bg-brand-wash px-3 py-1.5 rounded-lg transition-colors"
            >
              Post to Boards
            </Link>
            <Link
              href={`/recruiter?feature=all_applications&req=${req.id}`}
              className="text-xs font-semibold text-ink-muted border border-border bg-page hover:border-border-strong px-3 py-1.5 rounded-lg transition-colors"
            >
              Applications
            </Link>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-6 space-y-4">
        {loading && <div className="py-16 text-center text-xs text-slate-500">Loading requisition...</div>}
        {error && (
          <div className="p-4 rounded-xl border border-rose-300 bg-rose-50 dark:bg-rose-950/20 text-xs text-rose-700 dark:text-rose-300">{error}</div>
        )}

        {req && (
          <>
            {/* Primary summary — the same fields captured when the requisition was raised. */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-soft space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10.5px] font-mono text-slate-400 font-bold">{req.req_no}</span>
                    {statusBadge(req.status)}
                    {req.priority && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-brand-wash text-brand border border-brand/20 capitalize">
                        {req.priority} priority
                      </span>
                    )}
                  </div>
                  <h1 className="text-lg font-bold mt-1 font-display">{req.title}</h1>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                {[
                  { label: "Department", value: req.department },
                  { label: "Location", value: req.location },
                  { label: "Work Mode", value: req.work_mode },
                  { label: "Employment Type", value: req.employment_type },
                  { label: "Headcount", value: req.headcount != null ? String(req.headcount) : null },
                  { label: "Hiring Manager", value: req.hiring_manager },
                ]
                  .filter((f) => f.value)
                  .map((f) => (
                    <div key={f.label} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/50">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">{f.label}</span>
                      <span className="font-semibold capitalize block truncate">{f.value}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* More details — collapsed by default; down arrow reveals comp, skills, full JD. */}
            {hasMoreDetails && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-soft">
                <button
                  type="button"
                  onClick={() => setShowMore((v) => !v)}
                  className="w-full flex items-center justify-between px-5 py-3 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                >
                  <span>{showMore ? "Hide details" : "Show more details"}</span>
                  <Icon name={showMore ? "chevronUp" : "chevronDown"} size={15} />
                </button>
                {showMore && (
                  <div className="px-5 pb-5 space-y-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                    {(req.comp_min || req.comp_max || req.job_level || req.target_hire_date) && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                        {[
                          { label: "Job Level", value: req.job_level },
                          { label: "Comp Range", value: req.comp_min || req.comp_max ? `${req.comp_min ?? "?"} - ${req.comp_max ?? "?"}` : null },
                          { label: "Target Hire Date", value: req.target_hire_date },
                        ]
                          .filter((f) => f.value)
                          .map((f) => (
                            <div key={f.label} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/50">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">{f.label}</span>
                              <span className="font-semibold block">{f.value}</span>
                            </div>
                          ))}
                      </div>
                    )}
                    {(mustHave.length > 0 || goodToHave.length > 0) && (
                      <div className="space-y-2">
                        {mustHave.length > 0 && (
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Must-Have Skills</span>
                            <div className="flex flex-wrap gap-1.5">
                              {mustHave.map((s) => (
                                <span key={s} className="px-2 py-0.5 rounded text-[11px] font-semibold bg-brand-wash text-brand border border-brand/20">{s}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {goodToHave.length > 0 && (
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Good-to-Have Skills</span>
                            <div className="flex flex-wrap gap-1.5">
                              {goodToHave.map((s) => (
                                <span key={s} className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">{s}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {req.description && (
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Job Description</span>
                        <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{req.description}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

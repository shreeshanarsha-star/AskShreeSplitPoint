"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import ShreeRecruiterCockpit from "@/components/tools/ShreeRecruiterCockpit";

export default function RecruiterHomePage() {
  const [activeTab, setActiveTab] = useState<"cockpit" | "requisitions" | "pipeline">("cockpit");

  return (
    <div className="min-h-screen bg-page text-ink flex flex-col">
      {/* Top Recruiter Navigation Bar */}
      <header className="px-6 py-3.5 bg-surface border-b border-border flex items-center justify-between sticky top-0 z-30 shadow-soft-sm">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-brand text-white flex items-center justify-center font-bold text-base shadow-emblem group-hover:scale-105 transition-transform">
              S
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight text-ink font-display">
                  AskShree Recruiter Console
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-brand-wash text-brand border border-brand/20">
                  Autonomous Talent OS
                </span>
              </div>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/recruiter/requisitions/new"
            className="px-3.5 py-1.5 rounded-xl bg-brand hover:bg-brand-dark text-white text-xs font-bold shadow-button flex items-center gap-1.5 transition-all"
          >
            <span>+</span>
            <span>Create Requisition</span>
          </Link>
          <Link
            href="/schedule"
            className="px-3 py-1.5 rounded-xl border border-border text-ink-2 bg-surface hover:bg-page hover:text-ink text-xs font-semibold shadow-soft-sm flex items-center gap-1.5 transition-all"
          >
            <Icon name="calendar" size={13} />
            <span>Interviews</span>
          </Link>
          <Link
            href="/recruiter/publish"
            className="px-3 py-1.5 rounded-xl border border-brand/30 text-brand bg-brand-wash hover:bg-brand-wash/80 text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <Icon name="share" size={13} />
            <span>Publish SM</span>
          </Link>
          <Link
            href="/whatsapp"
            className="px-3 py-1.5 rounded-xl border border-emerald-300 text-emerald-800 dark:text-emerald-300 bg-emerald-50/80 hover:bg-emerald-100 text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <span className="w-2 h-2 rounded-full bg-good animate-pulse"></span>
            <span>WhatsApp Bot</span>
          </Link>
          <Link
            href="/recruiter/extension"
            className="px-3 py-1.5 rounded-xl border border-amber-300 text-amber-900 dark:text-amber-300 bg-amber-50/80 hover:bg-amber-100 text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <Icon name="zap" size={13} />
            <span>1-Click Extension</span>
          </Link>
          <Link
            href="/tools/offer-ai"
            className="px-3 py-1.5 rounded-xl border border-purple-300 text-purple-900 dark:text-purple-300 bg-purple-50/80 hover:bg-purple-100 text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <Icon name="file" size={13} />
            <span>Offer.ai</span>
          </Link>
          <div className="h-4 w-px bg-border" />
          <Link
            href="/careers"
            target="_blank"
            className="text-xs text-ink-muted hover:text-brand flex items-center gap-1 transition-colors"
          >
            <Icon name="external" size={13} />
            Public Careers
          </Link>
          <div className="h-4 w-px bg-border" />
          <Link
            href="/"
            className="w-7 h-7 rounded-full bg-brand-wash border border-border flex items-center justify-center text-xs font-bold text-brand shadow-soft-sm"
            title="Overview Home"
          >
            SC
          </Link>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Recruiter KPI Overview Tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-2xl bg-surface border border-border shadow-soft">
            <span className="text-[11px] text-ink-muted font-medium block">Active Requisitions</span>
            <span className="text-2xl font-bold mt-1 block text-ink">5</span>
            <span className="text-[10px] text-good font-medium flex items-center gap-1 mt-0.5">
              <span>↑</span> 2 added this week
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-surface border border-border shadow-soft">
            <span className="text-[11px] text-ink-muted font-medium block">Active in Pipeline</span>
            <span className="text-2xl font-bold mt-1 block text-ink">42</span>
            <span className="text-[10px] text-brand font-medium mt-0.5 block">
              12 in Interview stages
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-surface border border-border shadow-soft">
            <span className="text-[11px] text-ink-muted font-medium block">Shree Agreement Rate</span>
            <span className="text-2xl font-bold text-good mt-1 block">
              94.2%
            </span>
            <span className="text-[10px] text-ink-muted font-medium mt-0.5 block">
              Engineering lane graduated
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-surface border border-border shadow-soft">
            <span className="text-[11px] text-ink-muted font-medium block">Recruiter Hours Saved</span>
            <span className="text-2xl font-bold text-brand mt-1 block">
              38 hrs
            </span>
            <span className="text-[10px] text-ink-muted font-medium mt-0.5 block">
              Zero manual screening backlog
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <button
            onClick={() => setActiveTab("cockpit")}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === "cockpit"
                ? "bg-brand text-white shadow-button"
                : "text-ink-muted hover:text-ink hover:bg-page"
            }`}
          >
            <span>✨</span> Shree AI Cockpit &amp; Shadow Queue
          </button>
          <button
            onClick={() => setActiveTab("requisitions")}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === "requisitions"
                ? "bg-brand text-white shadow-button"
                : "text-ink-muted hover:text-ink hover:bg-page"
            }`}
          >
            <Icon name="briefcase" size={14} /> My Requisitions (5)
          </button>
          <button
            onClick={() => setActiveTab("pipeline")}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === "pipeline"
                ? "bg-brand text-white shadow-button"
                : "text-ink-muted hover:text-ink hover:bg-page"
            }`}
          >
            <Icon name="users" size={14} /> Pipeline Triage
          </button>
        </div>

        {/* TAB 1: SHREE AI COCKPIT */}
        {activeTab === "cockpit" && (
          <div className="space-y-4">
            <ShreeRecruiterCockpit />
          </div>
        )}

        {/* TAB 2: ACTIVE REQUISITIONS */}
        {activeTab === "requisitions" && (
          <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-soft">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-ink">Active Requisition Portfolio</h3>
                <span className="text-xs text-ink-muted">All 5 roles calibrated by Shree</span>
              </div>
              <Link
                href="/recruiter/requisitions/new"
                className="px-3 py-1.5 rounded-xl bg-brand hover:bg-brand-dark text-white text-xs font-bold shadow-button flex items-center gap-1.5 transition-all"
              >
                <span>+</span>
                <span>New Requisition</span>
              </Link>
            </div>
            <div className="divide-y divide-border text-xs">
              {[
                {
                  reqNo: "R-2208261",
                  title: "Senior Full-Stack Engineer",
                  dept: "Engineering",
                  status: "Graduated (Autonomous)",
                  candidates: 14,
                  stalled: 0,
                },
                {
                  reqNo: "R-2208262",
                  title: "Enterprise Account Executive",
                  dept: "Sales & Accounts",
                  status: "Shadow Mode (87.5% Agreement)",
                  candidates: 11,
                  stalled: 1,
                },
                {
                  reqNo: "R-2208263",
                  title: "Technical Talent Acquisition Partner",
                  dept: "Human Resources",
                  status: "Shadow Mode (Initial)",
                  candidates: 7,
                  stalled: 0,
                },
                {
                  reqNo: "R-2208264",
                  title: "Principal Infrastructure Architect",
                  dept: "Engineering",
                  status: "Graduated (Autonomous)",
                  candidates: 6,
                  stalled: 0,
                },
                {
                  reqNo: "R-2208265",
                  title: "Product Marketing Lead",
                  dept: "Marketing",
                  status: "Shadow Mode (Initial)",
                  candidates: 4,
                  stalled: 0,
                },
              ].map((r, i) => (
                <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-900 dark:text-white">
                        {r.title}
                      </span>
                      <span className="text-[11px] text-ink-muted">#{r.reqNo}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          r.status.startsWith("Graduated")
                            ? "bg-good-wash text-good-text border border-good/20"
                            : "bg-brand-wash text-brand border border-brand/20"
                        }`}
                      >
                        {r.status}
                      </span>
                    </div>
                    <p className="text-ink-muted mt-0.5">
                      Department: {r.dept} • {r.candidates} candidates in funnel
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/hm/demo`}
                      className="px-2.5 py-1.5 rounded-xl border border-border text-ink-2 hover:text-ink hover:bg-page transition-colors"
                    >
                      HM Portal
                    </Link>
                    <button
                      onClick={() => setActiveTab("cockpit")}
                      className="px-3 py-1.5 rounded-xl bg-brand-wash text-brand font-bold hover:bg-brand-wash/80 transition-colors"
                    >
                      Review Queue
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: PIPELINE TRIAGE */}
        {activeTab === "pipeline" && (
          <div className="bg-surface border border-border rounded-2xl p-5 shadow-soft space-y-4">
            <h3 className="text-sm font-bold text-ink">Automated Pipeline Health & Triage</h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              Shree continuously monitors all requisition funnels, identifying candidate bottlenecks, SLA breaches, and ready-to-advance applicants.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-2">
              <div className="p-4 rounded-xl bg-good-wash border border-good/20 text-xs">
                <span className="font-bold text-good-text block mb-1">
                  ✓ High-Fit Ready to Advance (8)
                </span>
                <p className="text-ink-2 leading-relaxed">
                  8 candidates with score &ge;85% have completed screening and are ready to advance to HM Review.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-brand-wash border border-brand/30 text-xs">
                <span className="font-bold text-brand block mb-1">
                  ⚠ Stalled Candidates (1)
                </span>
                <p className="text-ink-2 leading-relaxed">
                  1 candidate in Enterprise AE has been waiting &gt;48 hours in Interview 1 stage. Nudge sent to hiring manager.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface border border-border text-xs shadow-soft-sm">
                <span className="font-bold text-ink block mb-1">
                  ✨ Shadow Decisions Pending (2)
                </span>
                <p className="text-ink-2 leading-relaxed">
                  Alex Rivera and Priya Sharma await 1-click recruiter confirmation in the Shree Cockpit.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import ShreeRecruiterCockpit from "@/components/tools/ShreeRecruiterCockpit";

export default function RecruiterHomePage() {
  const [activeTab, setActiveTab] = useState<"cockpit" | "requisitions" | "pipeline">("cockpit");

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col">
      {/* Top Recruiter Navigation Bar */}
      <header className="px-6 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
            S
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight">
                AskShree Recruiter Console
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-md font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400">
                Enterprise Talent Team
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/recruiter/requisitions/new"
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <span>+</span>
            <span>Create Requisition</span>
          </Link>
          <Link
            href="/schedule"
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Icon name="calendar" size={13} />
            <span>Interviews</span>
          </Link>
          <Link
            href="/recruiter/publish"
            className="px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 bg-indigo-50/60 dark:bg-indigo-950/40 hover:bg-indigo-100 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Icon name="share" size={13} />
            <span>Publish SM</span>
          </Link>
          <Link
            href="/whatsapp"
            className="px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/40 hover:bg-emerald-100 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>WhatsApp Bot</span>
          </Link>
          <Link
            href="/recruiter/extension"
            className="px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 bg-amber-50/60 dark:bg-amber-950/40 hover:bg-amber-100 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Icon name="zap" size={13} />
            <span>1-Click Extension</span>
          </Link>
          <Link
            href="/tools/offer-ai"
            className="px-3 py-1.5 rounded-lg border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 bg-purple-50/60 dark:bg-purple-950/40 hover:bg-purple-100 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Icon name="file" size={13} />
            <span>Offer.ai</span>
          </Link>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
          <Link
            href="/careers"
            target="_blank"
            className="text-xs text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 flex items-center gap-1 transition-colors"
          >
            <Icon name="external" size={13} />
            View Public Career Site
          </Link>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-xs font-bold">
              SC
            </div>
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 hidden sm:inline">
              Sarah Chen (Lead Recruiter)
            </span>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Recruiter KPI Overview Tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-[11px] text-slate-500 font-medium block">Active Requisitions</span>
            <span className="text-2xl font-bold mt-1 block">5</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
              <span>↑</span> 2 added this week
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-[11px] text-slate-500 font-medium block">Active in Pipeline</span>
            <span className="text-2xl font-bold mt-1 block">42</span>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium mt-0.5 block">
              12 in Interview stages
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-[11px] text-slate-500 font-medium block">Shree Agreement Rate</span>
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
              94.2%
            </span>
            <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">
              Engineering lane graduated
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-[11px] text-slate-500 font-medium block">Recruiter Hours Saved</span>
            <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1 block">
              38 hrs
            </span>
            <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">
              Zero manual screening backlog
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab("cockpit")}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === "cockpit"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            <span>✨</span> Shree AI Cockpit & Shadow Queue
          </button>
          <button
            onClick={() => setActiveTab("requisitions")}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === "requisitions"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            <Icon name="briefcase" size={14} /> My Requisitions (5)
          </button>
          <button
            onClick={() => setActiveTab("pipeline")}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === "pipeline"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
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
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Active Requisition Portfolio</h3>
                <span className="text-xs text-slate-400">All 5 roles calibrated by Shree</span>
              </div>
              <Link
                href="/recruiter/requisitions/new"
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <span>+</span>
                <span>New Requisition</span>
              </Link>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
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
                      <span className="text-[11px] text-slate-400">#{r.reqNo}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          r.status.startsWith("Graduated")
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        }`}
                      >
                        {r.status}
                      </span>
                    </div>
                    <p className="text-slate-500 mt-0.5">
                      Department: {r.dept} • {r.candidates} candidates in funnel
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/hm/demo`}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      HM Portal
                    </Link>
                    <button
                      onClick={() => setActiveTab("cockpit")}
                      className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-medium hover:bg-indigo-100"
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
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-2xs space-y-4">
            <h3 className="text-sm font-semibold">Automated Pipeline Health & Triage</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Shree continuously monitors all requisition funnels, identifying candidate bottlenecks, SLA breaches, and ready-to-advance applicants.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-2">
              <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 text-xs">
                <span className="font-semibold text-emerald-800 dark:text-emerald-400 block mb-1">
                  ✓ High-Fit Ready to Advance (8)
                </span>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  8 candidates with score &ge;85% have completed screening and are ready to advance to HM Review.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-xs">
                <span className="font-semibold text-amber-800 dark:text-amber-400 block mb-1">
                  ⚠ Stalled Candidates (1)
                </span>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  1 candidate in Enterprise AE has been waiting &gt;48 hours in Interview 1 stage. Nudge sent to hiring manager.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40 text-xs">
                <span className="font-semibold text-indigo-800 dark:text-indigo-400 block mb-1">
                  ✨ Shadow Decisions Pending (2)
                </span>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
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

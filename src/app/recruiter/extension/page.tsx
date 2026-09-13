"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import Logo from "@/components/Logo";
import TopbarStatus from "@/components/TopbarStatus";

export default function RecruiterExtensionPage() {
  const [testUrl, setTestUrl] = useState("https://www.linkedin.com/in/alex-rivera-systems");
  const [simulatedProfile, setSimulatedProfile] = useState<{
    name: string;
    title: string;
    company: string;
    location: string;
    skills: string[];
  } | null>(null);
  const [syncedSuccess, setSyncedSuccess] = useState(false);

  function simulateSourcing() {
    setSimulatedProfile({
      name: "Alex Rivera",
      title: "Staff Backend & Distributed Systems Engineer",
      company: "Stripe",
      location: "San Francisco, CA",
      skills: ["Go", "Distributed Consensus", "Kubernetes", "PostgreSQL"],
    });
    setSyncedSuccess(false);
  }

  function handleSaveToReq() {
    setSyncedSuccess(true);
    setTimeout(() => setSyncedSuccess(false), 3000);
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col">
      {/* Header */}
      <header className="px-6 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center gap-3">
          <Link
            href="/recruiter"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500"
            title="Back to Recruiter Console"
          >
            <Icon name="chevronLeft" size={16} />
          </Link>
          <Link href="/" className="group">
            <Logo height={28} showPunchline={true} />
          </Link>
          <span className="text-slate-300 dark:text-slate-700">/</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight">
                1-Click Sourcing Chrome Extension
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-md font-medium bg-brand-wash text-brand border border-brand/20">
                Manifest V3 Verified
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/chrome-extension/manifest.json"
            download
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Icon name="download" size={13} />
            <span>Download Extension Folder</span>
          </a>
          <span className="w-px h-5 bg-border flex-shrink-0" />
          <TopbarStatus />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-8 space-y-8">
        
        {/* Banner */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white shadow-sm flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <span className="text-xs px-2.5 py-1 rounded-md bg-white/20 backdrop-blur-md font-semibold uppercase tracking-wider text-indigo-200">
              Zero-Copy Sourcing
            </span>
            <h1 className="text-2xl font-bold">
              Source Any Candidate from LinkedIn &amp; GitHub in 1 Second
            </h1>
            <p className="text-xs text-indigo-100 leading-relaxed">
              Never copy-paste candidate names, titles, and links into spreadsheets or ATS forms again.
              Shree extracts profile data and files candidates directly into active requisitions.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-center space-y-1">
            <span className="text-2xl font-bold block">1 Click</span>
            <span className="text-[11px] text-indigo-200 block">From Profile to ATS Pipeline</span>
            <span className="text-[10px] text-emerald-300 block font-semibold">✓ 100% LinkedIn ToS Safe</span>
          </div>
        </div>

        {/* 3-Step Installation Guide */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider text-slate-500">
            3-Step Installation (Takes 30 Seconds)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                1
              </div>
              <strong className="block text-slate-900 dark:text-white">Open Chrome Extensions</strong>
              <p className="text-slate-500 leading-relaxed">
                Open Google Chrome, type <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-[11px]">chrome://extensions</code> in your URL bar, and toggle on <strong>&ldquo;Developer mode&rdquo;</strong> in the top right.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                2
              </div>
              <strong className="block text-slate-900 dark:text-white">Load Unpacked Extension</strong>
              <p className="text-slate-500 leading-relaxed">
                Click <strong>&ldquo;Load unpacked&rdquo;</strong> and select the <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-[11px]">chrome-extension/</code> folder from this repository.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                3
              </div>
              <strong className="block text-slate-900 dark:text-white">Pin &amp; 1-Click Source</strong>
              <p className="text-slate-500 leading-relaxed">
                Browse any candidate on LinkedIn or GitHub, click the Shree extension icon, pick your requisition, and hit <strong>&ldquo;+ Add to Requisition&rdquo;</strong>!
              </p>
            </div>
          </div>
        </div>

        {/* Interactive Sandbox Simulator */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xs space-y-5">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>⚡</span>
              Interactive Extension Testing Sandbox
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Simulate how the extension popup detects and parses candidate profiles without leaving AskShree.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={testUrl}
              onChange={(e) => setTestUrl(e.target.value)}
              className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 font-mono text-slate-700 dark:text-slate-300"
            />
            <button
              onClick={simulateSourcing}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs"
            >
              Simulate 1-Click Extraction
            </button>
          </div>

          {simulatedProfile && (
            <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {simulatedProfile.name}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    {simulatedProfile.title} at <strong>{simulatedProfile.company}</strong>
                  </p>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    📍 {simulatedProfile.location}
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  92% Rubric Fit
                </span>
              </div>

              <div className="flex flex-wrap gap-1 pt-1">
                {simulatedProfile.skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>

              <div className="pt-3 border-t border-indigo-200/50 dark:border-indigo-800/50 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Target: <strong>Senior Full-Stack Engineer (#R-2208261)</strong>
                </span>
                <button
                  onClick={handleSaveToReq}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs"
                >
                  {syncedSuccess ? "✓ Added to Requisition Pipeline!" : "+ Confirm Add to Requisition"}
                </button>
              </div>
            </div>
          )}

        </div>

      </main>
    </div>
  );
}

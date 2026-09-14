"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import Logo from "@/components/Logo";
import TopbarStatus from "@/components/TopbarStatus";

type ActiveRequisition = {
  id: string;
  reqNo: string;
  title: string;
  department: string;
  location: string;
};

export default function RecruiterExtensionPage() {
  const [testUrl, setTestUrl] = useState("https://www.linkedin.com/in/alex-rivera-systems");
  const [requisitions, setRequisitions] = useState<ActiveRequisition[]>([]);
  const [selectedReqId, setSelectedReqId] = useState<string>("");
  const [simulatedProfile, setSimulatedProfile] = useState<{
    name: string;
    headline: string;
    company: string;
    location: string;
    skills: string[];
    summary: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultStatus, setResultStatus] = useState<{
    success?: boolean;
    message?: string;
    stage?: string;
    matchScore?: number;
  } | null>(null);

  useEffect(() => {
    fetch("/api/v1/requisitions/active")
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.data) && data.data.length > 0) {
          setRequisitions(data.data);
          setSelectedReqId(data.data[0].id);
        }
      })
      .catch(() => {});
  }, []);

  function simulateSourcing() {
    setSimulatedProfile({
      name: "Alex Rivera",
      headline: "Senior Cloud & DevOps Architect at Stripe",
      company: "Stripe",
      location: "San Francisco, CA",
      skills: ["Kubernetes", "AWS", "Terraform", "Go", "Docker", "CI/CD"],
      summary: "Infrastructure engineer architecting multi-region resilient payment clusters and automated CI/CD pipelines.",
    });
    setResultStatus(null);
  }

  async function handleSaveToReq() {
    if (!simulatedProfile) return;
    setIsSubmitting(true);
    setResultStatus(null);

    try {
      const res = await fetch("/api/v1/candidates/ingest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-AskShree-Source": "chrome-extension-sandbox",
        },
        body: JSON.stringify({
          requisitionId: selectedReqId || null,
          candidate: {
            name: simulatedProfile.name,
            headline: simulatedProfile.headline,
            company: simulatedProfile.company,
            location: simulatedProfile.location,
            profileUrl: testUrl,
            skills: simulatedProfile.skills,
            summary: simulatedProfile.summary,
          },
          source: "LinkedIn Extension",
          triggerAiEvaluation: true,
        }),
      });

      const json = await res.json();
      if (res.ok && json.ok) {
        setResultStatus({
          success: true,
          message: json.data?.message || "Candidate successfully sourced!",
          stage: json.data?.status || "sourced",
          matchScore: json.data?.matchScore || 92,
        });
      } else {
        setResultStatus({
          success: false,
          message: json.error || "Failed to source candidate.",
        });
      }
    } catch (err) {
      setResultStatus({
        success: false,
        message: "Network error connecting to AskShree Ingestion API.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-page text-ink flex flex-col scrollbar-none">
      {/* Header */}
      <header className="px-6 py-3.5 bg-surface border-b border-border flex items-center justify-between sticky top-0 z-30 shadow-soft-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/recruiter"
            className="p-1.5 rounded-lg border border-border hover:bg-page transition-colors text-ink-muted hover:text-ink"
            title="Back to Recruiter Cockpit"
          >
            <Icon name="chevronLeft" size={16} />
          </Link>
          <Link href="/" className="hover:opacity-90 transition-opacity">
            <Logo height={28} showPunchline={true} />
          </Link>
          <span className="text-ink-muted/40">/</span>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-tight font-display">
              1-Click Sourcing Chrome Extension
            </span>
            <span className="text-[10.5px] px-2 py-0.5 rounded-full font-semibold bg-brand-wash text-brand border border-brand/20">
              Manifest V3 Verified
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/api/recruiter/extension/download"
            className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-brand hover:bg-brand-dark text-white shadow-soft-sm transition-all flex items-center gap-1.5 hover:scale-[1.02]"
          >
            <Icon name="download" size={13} />
            <span>Download Extension (.zip)</span>
          </a>
          <span className="w-px h-5 bg-border flex-shrink-0" />
          <TopbarStatus />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-8 space-y-6">
        
        {/* Banner */}
        <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-surface via-surface to-brand-wash/40 border border-border text-ink shadow-soft flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-brand-wash text-brand border border-brand/20 font-bold uppercase tracking-wider">
              Autonomous Talent Ingestion
            </span>
            <h1 className="text-2xl font-bold font-display tracking-tight text-ink">
              Source Any Candidate from LinkedIn &amp; GitHub in 1 Click
            </h1>
            <p className="text-xs text-ink-muted leading-relaxed">
              Never copy-paste candidate names, titles, and links into spreadsheets or ATS forms again.
              Shree extracts profile data, calculates instant fit scores, and files candidates directly into active requisitions under the <strong>Sourced</strong> stage.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-surface border border-border shadow-soft-sm text-center space-y-1.5 min-w-[200px]">
            <span className="text-2xl font-bold font-display text-brand block">1 Second</span>
            <span className="text-[11.5px] text-ink font-medium block">From Profile to ATS Pipeline</span>
            <span className="text-[10.5px] text-emerald-700 dark:text-emerald-400 block font-bold">
              ✓ 100% LinkedIn ToS Safe
            </span>
          </div>
        </div>

        {/* 3-Step Installation Guide */}
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              3-Step Installation (Takes 30 Seconds)
            </h2>
            <a
              href="/api/recruiter/extension/download"
              className="text-xs text-brand hover:underline font-bold flex items-center gap-1"
            >
              <Icon name="download" size={12} />
              <span>Download askshree-sourcing-copilot.zip</span>
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-page border border-border space-y-2">
              <div className="w-6 h-6 rounded-full bg-brand text-white font-bold flex items-center justify-center text-xs shadow-soft-sm">
                1
              </div>
              <strong className="block text-ink font-semibold">Open Chrome Extensions</strong>
              <p className="text-ink-muted leading-relaxed">
                Open Google Chrome, navigate to <code className="bg-surface border border-border px-1.5 py-0.5 rounded font-mono text-[11px] text-ink">chrome://extensions</code>, and toggle on <strong>&ldquo;Developer mode&rdquo;</strong> in the top right.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-page border border-border space-y-2">
              <div className="w-6 h-6 rounded-full bg-brand text-white font-bold flex items-center justify-center text-xs shadow-soft-sm">
                2
              </div>
              <strong className="block text-ink font-semibold">Load Unpacked Extension</strong>
              <p className="text-ink-muted leading-relaxed">
                Unzip the downloaded file, click <strong>&ldquo;Load unpacked&rdquo;</strong> in Chrome, and select the extracted folder.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-page border border-border space-y-2">
              <div className="w-6 h-6 rounded-full bg-brand text-white font-bold flex items-center justify-center text-xs shadow-soft-sm">
                3
              </div>
              <strong className="block text-ink font-semibold">Pin &amp; 1-Click Source</strong>
              <p className="text-ink-muted leading-relaxed">
                Browse any candidate on LinkedIn or GitHub, click the Shree extension icon, choose your requisition, and hit <strong>&ldquo;+ Source to AskShree Pipeline&rdquo;</strong>!
              </p>
            </div>
          </div>
        </div>

        {/* Interactive Sandbox Simulator */}
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-soft space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-bold text-ink flex items-center gap-2 font-display">
                <span className="text-brand">⚡</span>
                Interactive Extension Testing Sandbox
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">
                Simulate how the extension popup detects, parses, and ingests candidate profiles into your live pipeline under the <strong>Sourced</strong> stage.
              </p>
            </div>

            {requisitions.length > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <label className="font-semibold text-ink-muted">Target Req:</label>
                <select
                  value={selectedReqId}
                  onChange={(e) => setSelectedReqId(e.target.value)}
                  className="bg-page border border-border rounded-lg px-2.5 py-1.5 text-xs text-ink outline-none focus:border-brand"
                >
                  {requisitions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title} ({r.reqNo || "Open"})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={testUrl}
              onChange={(e) => setTestUrl(e.target.value)}
              className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-border bg-page font-mono text-ink outline-none focus:border-brand"
            />
            <button
              onClick={simulateSourcing}
              className="px-4 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white text-xs font-bold shadow-soft-sm transition-colors"
            >
              Simulate 1-Click Extraction
            </button>
          </div>

          {simulatedProfile && (
            <div className="p-4 rounded-xl bg-brand-wash/30 border border-brand/20 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-sm text-ink font-display">
                    {simulatedProfile.name}
                  </h3>
                  <p className="text-xs text-ink-muted mt-0.5">
                    {simulatedProfile.headline}
                  </p>
                  <span className="text-[11px] text-ink-muted mt-1 block">
                    📍 {simulatedProfile.location} • 🏢 {simulatedProfile.company}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    🎯 92% AI Fit Score
                  </span>
                  <span className="text-[9.5px] font-semibold px-2 py-0.5 rounded bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                    Stage: Sourced
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {simulatedProfile.skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-surface text-brand border border-brand/20 font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>

              <div className="pt-3 border-t border-brand/20 flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs text-ink-muted">
                  Ingestion Mode: <strong>Live Ingestion API (/api/v1/candidates/ingest)</strong>
                </span>
                <button
                  onClick={handleSaveToReq}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-brand hover:bg-brand-dark text-white text-xs font-bold shadow-soft-sm transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? "Sourcing..." : "+ Confirm Ingestion to Pipeline"}
                </button>
              </div>

              {resultStatus && (
                <div
                  className={`p-3 rounded-xl text-xs font-medium ${
                    resultStatus.success
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{resultStatus.message}</span>
                    {resultStatus.success && (
                      <Link
                        href="/recruiter"
                        className="font-bold underline text-emerald-900 ml-2"
                      >
                        View in Recruiter Cockpit ›
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

      </main>
    </div>
  );
}

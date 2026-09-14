"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import TopbarStatus from "@/components/TopbarStatus";
import Icon from "@/components/Icon";

type CandidateInfo = {
  id: string;
  name: string;
  company: string | null;
  location: string | null;
  stage: string;
  matchScore: number | null;
  skills: string[];
};

type RequisitionInfo = {
  id: string;
  reqNo: string;
  title: string;
  department: string;
  location: string;
  description: string | null;
};

export default function CandidateEngagePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-page flex items-center justify-center text-ink-muted text-xs">
          Loading priority invitation...
        </div>
      }
    >
      <CandidateEngageContent />
    </Suspense>
  );
}

function CandidateEngageContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<CandidateInfo | null>(null);
  const [requisition, setRequisition] = useState<RequisitionInfo | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("No invitation token provided. Please verify your link.");
      setLoading(false);
      return;
    }

    fetch(`/api/candidate/engage?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.ok && json.data) {
          setCandidate(json.data.candidate);
          setRequisition(json.data.requisition);
          if (json.data.candidate.stage !== "sourced") {
            setConfirmed(true);
          }
        } else {
          setError(json.error || "Unable to retrieve invitation details.");
        }
      })
      .catch(() => setError("Network error loading invitation."))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleConfirmInterest() {
    if (!token) return;
    setConfirming(true);

    try {
      const res = await fetch("/api/candidate/engage/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        setConfirmed(true);
      } else {
        alert(json.error || "Failed to confirm application.");
      }
    } catch {
      alert("Network error confirming application.");
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="min-h-screen bg-page text-ink flex flex-col scrollbar-none">
      {/* Header */}
      <header className="px-6 py-3.5 bg-surface border-b border-border flex items-center justify-between sticky top-0 z-30 shadow-soft-sm">
        <div className="flex items-center gap-3">
          <Link href="/" className="hover:opacity-90 transition-opacity">
            <Logo height={28} showPunchline={true} />
          </Link>
          <span className="text-ink-muted/40">/</span>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-tight font-display">
              Priority Career Invitation
            </span>
            <span className="text-[10.5px] px-2 py-0.5 rounded-full font-semibold bg-brand-wash text-brand border border-brand/20">
              Verified Role Match
            </span>
          </div>
        </div>

        <TopbarStatus />
      </header>

      {/* Main Viewport */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-8 flex flex-col justify-center">
        {loading && (
          <div className="text-center py-16 text-ink-muted text-xs flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
            Loading your personalized role overview...
          </div>
        )}

        {error && (
          <div className="p-6 rounded-2xl bg-surface border border-border text-center space-y-3 shadow-soft">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center mx-auto text-sm font-bold">
              !
            </div>
            <h2 className="text-base font-bold font-display text-ink">Invitation Link Expired or Invalid</h2>
            <p className="text-xs text-ink-muted">{error}</p>
            <Link
              href="/"
              className="inline-block px-4 py-2 rounded-xl bg-brand text-white text-xs font-bold shadow-soft-sm hover:bg-brand-dark transition-colors"
            >
              Browse Open Positions ›
            </Link>
          </div>
        )}

        {!loading && !error && candidate && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Shree AI Welcome Banner */}
            <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-surface via-surface to-brand-wash/50 border border-border shadow-soft space-y-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center shadow-emblem flex-shrink-0">
                  <span className="text-xl">✨</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-brand">
                      Shree • Autonomous Hiring Partner
                    </span>
                    {candidate.matchScore && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        🎯 {candidate.matchScore}% AI Match
                      </span>
                    )}
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold font-display text-ink">
                    Hello {candidate.name.split(" ")[0]}, we’d love to connect!
                  </h1>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
                Our talent team analyzed your public contributions
                {candidate.company ? ` at ${candidate.company}` : ""}.
                We believe your experience makes you a standout fit for our open{" "}
                <strong>{requisition?.title || "Key Strategic"}</strong> position.
              </p>
            </div>

            {/* Target Requisition Spec Card */}
            {requisition && (
              <div className="p-6 rounded-2xl bg-surface border border-border shadow-soft space-y-4">
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div>
                    <span className="text-[10.5px] font-bold text-ink-muted uppercase tracking-wider">
                      Target Position • {requisition.reqNo}
                    </span>
                    <h2 className="text-lg font-bold font-display text-ink mt-0.5">
                      {requisition.title}
                    </h2>
                    <div className="flex flex-wrap gap-2 mt-2 text-xs text-ink-muted">
                      <span>🏢 {requisition.department}</span>
                      <span>•</span>
                      <span>📍 {requisition.location}</span>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                    Stage: {confirmed ? "Applied (In Review)" : "Sourced (Invited)"}
                  </span>
                </div>

                {candidate.skills && candidate.skills.length > 0 && (
                  <div>
                    <span className="text-[11px] font-bold text-ink-muted block mb-1.5">
                      Matched Competencies:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {candidate.skills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="text-[10.5px] px-2.5 py-0.5 rounded-md bg-page border border-border text-ink font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Confirm Interest Action */}
                <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-semibold text-ink block">
                      {confirmed ? "✓ Application Active" : "Ready to explore this opening?"}
                    </span>
                    <span className="text-[11px] text-ink-muted">
                      {confirmed
                        ? "Your candidacy is actively in review by the hiring manager."
                        : "One click confirms your interest and moves your profile to the Applied queue."}
                    </span>
                  </div>

                  {!confirmed ? (
                    <button
                      onClick={handleConfirmInterest}
                      disabled={confirming}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white text-xs font-bold shadow-soft-sm transition-all hover:scale-[1.02] disabled:opacity-60 whitespace-nowrap"
                    >
                      {confirming ? "Confirming..." : "✓ Yes, I'm Interested — Apply"}
                    </button>
                  ) : (
                    <Link
                      href={`/candidate/status?id=${candidate.id}`}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold shadow-soft-sm transition-colors text-center whitespace-nowrap"
                    >
                      Track Application Status ›
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Confirmed Banner */}
            {confirmed && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <span>✓</span> Application Successfully Confirmed!
                </div>
                <p className="text-emerald-700">
                  Your profile has officially moved into the <strong>Applied</strong> stage.
                  Our team and Shree AI are reviewing your credentials.
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

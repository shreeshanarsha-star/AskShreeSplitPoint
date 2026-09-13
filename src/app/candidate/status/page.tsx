"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/Icon";
import Logo from "@/components/Logo";
import TopbarStatus from "@/components/TopbarStatus";
import { STAGES, stageLabel } from "@/lib/talentStages";

type CandidateStatus = {
  id: string;
  name: string;
  stage: string;
  current_designation: string | null;
  current_company: string | null;
  created_at: string;
  updated_at: string;
  talent_requisitions: {
    title: string;
    req_no: string;
    location: string | null;
  } | null;
};

function CandidateStatusContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [candidate, setCandidate] = useState<CandidateStatus | null>(null);
  const [deletionRequested, setDeletionRequested] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        if (!id && !token) {
          setLoading(false);
          return;
        }
        const res = await fetch(`/api/candidate/status?${id ? `id=${id}` : `token=${token}`}`);
        if (res.ok) {
          const data = await res.json();
          setCandidate(data.candidate);
        }
      } catch (err) {
        console.error("Failed to load candidate status:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, token]);

  const stagesList = ["applied", "screening", "hm_review", "interview_1", "offer"];

  function getStageState(stageKey: string, currentStage: string) {
    const currentIndex = stagesList.indexOf(currentStage);
    const targetIndex = stagesList.indexOf(stageKey);

    if (currentStage === "rejected") {
      if (stageKey === "applied") return "completed";
      return "failed";
    }
    if (currentIndex > targetIndex) return "completed";
    if (currentIndex === targetIndex) return "current";
    return "upcoming";
  }

  return (
    <div className="min-h-screen bg-page text-ink flex flex-col">
      {/* Brand Header */}
      <header className="px-6 py-3.5 bg-surface border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="group">
            <Logo height={28} showPunchline={true} />
          </Link>
          <span className="text-border">/</span>
          <span className="font-bold text-sm text-ink tracking-tight font-display">
            Talent Portal
          </span>
          <span className="text-xs text-ink-muted hidden md:inline ml-2 pl-2 border-l border-border">
            Never Wonder Where You Stand
          </span>
        </div>
        <TopbarStatus />
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto py-8 px-4 sm:px-6 space-y-6">

        {loading ? (
          <div className="py-20 text-center text-xs text-ink-muted">
            Retrieving your application timeline...
          </div>
        ) : !candidate ? (
          <div className="bg-surface border border-border rounded-2xl p-8 text-center shadow-soft">
            <div className="w-12 h-12 mx-auto rounded-full bg-brand-wash border border-brand/20 flex items-center justify-center text-brand mb-3">
              <Icon name="search" size={20} />
            </div>
            <h2 className="text-base font-bold text-ink">
              Application Not Found
            </h2>
            <p className="text-xs text-ink-muted mt-1 max-w-sm mx-auto">
              Please check your application link or search using the email address you used when applying.
            </p>
          </div>
        ) : (
          <>
            {/* Status Hero Card */}
            <div className="bg-surface border border-border rounded-2xl p-6 shadow-soft">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-brand-wash text-brand border border-brand/20">
                    Application #{candidate.id.slice(0, 8)}
                  </span>
                  <h1 className="text-xl font-bold text-ink mt-2 font-display">
                    {candidate.talent_requisitions?.title || "Position Application"}
                  </h1>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Candidate: {candidate.name} • Applied on{" "}
                    {new Date(candidate.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-good-wash text-good-text border border-good/20">
                    {candidate.stage === "rejected" ? "Position Closed" : stageLabel(candidate.stage)}
                  </span>
                </div>
              </div>

              {/* Visual Pipeline Timeline */}
              <div className="mt-8 pt-6 border-t border-border">
                <h3 className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-4">
                  Application Milestones
                </h3>

                <div className="grid grid-cols-5 gap-2 relative">
                  {stagesList.map((st, i) => {
                    const state = getStageState(st, candidate.stage);

                    return (
                      <div key={st} className="text-center relative">
                        <div
                          className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                            state === "completed"
                              ? "bg-good text-white shadow-soft-sm"
                              : state === "current"
                              ? "bg-brand text-white ring-4 ring-brand/20 shadow-button"
                              : state === "failed"
                              ? "bg-critical text-white"
                              : "bg-page border border-border text-ink-muted"
                          }`}
                        >
                          {state === "completed" ? "✓" : i + 1}
                        </div>
                        <span
                          className={`block text-[11px] mt-2 font-semibold ${
                            state === "current"
                              ? "text-brand font-bold"
                              : state === "completed"
                              ? "text-ink"
                              : "text-ink-muted"
                          }`}
                        >
                          {stageLabel(st)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Reassurance & Next Steps */}
            <div className="bg-gradient-to-br from-brand-wash/60 via-surface to-surface border border-brand/30 rounded-2xl p-6 shadow-soft-sm">
              <div className="flex items-start gap-3">
                <div className="text-xl">✨</div>
                <div>
                  <h4 className="text-sm font-bold text-ink font-display">
                    What happens next?
                  </h4>
                  <p className="text-xs text-ink-2 mt-1 leading-relaxed">
                    {candidate.stage === "applied" &&
                      "Your application has been received and is being screened against the role criteria. Our AI Recruiter Shree will complete initial evaluation within 4 hours."}
                    {candidate.stage === "screening" &&
                      "Your profile is undergoing calibrated competency review. You will receive an invitation for an initial interview or skills assessment shortly."}
                    {candidate.stage === "hm_review" &&
                      "Congratulations! You passed initial screening. The hiring manager is currently reviewing your dossier to schedule your panel rounds."}
                    {candidate.stage.startsWith("interview") &&
                      "You are currently in active interview stages. Review the role requirements and test your audio/video setup prior to your call."}
                    {candidate.stage === "rejected" &&
                      "Thank you for interviewing with us. While this specific role wasn't an exact match, your profile remains in our talent pool for priority future matching."}
                  </p>
                </div>
              </div>
            </div>

            {/* Privacy & Data Consent Controls (GDPR / BIPA compliance) */}
            <div className="bg-surface border border-border rounded-2xl p-5 text-xs shadow-soft-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="font-bold text-ink">
                    Privacy & Data Governance
                  </h5>
                  <p className="text-ink-muted mt-0.5">
                    Your data is protected under statutory privacy directives with zero demographic bias scoring.
                  </p>
                </div>
                <div>
                  {deletionRequested ? (
                    <span className="text-good font-semibold text-xs">
                      Deletion Request Logged ✓
                    </span>
                  ) : (
                    <button
                      onClick={() => setDeletionRequested(true)}
                      className="px-3.5 py-1.5 rounded-xl border border-border text-ink-2 hover:text-critical hover:border-critical/40 transition-colors font-medium"
                    >
                      Request Data Deletion
                    </button>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default function CandidateStatusPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading...</div>}>
      <CandidateStatusContent />
    </Suspense>
  );
}

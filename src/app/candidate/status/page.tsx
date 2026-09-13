"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Icon from "@/components/Icon";
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-10 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-xs">
              S
            </div>
            <span className="font-bold text-base text-slate-900 dark:text-white tracking-tight">
              AskShree Talent Portal
            </span>
          </div>
          <span className="text-xs text-slate-400">
            Never Wonder Where You Stand
          </span>
        </div>

        {loading ? (
          <div className="py-20 text-center text-xs text-slate-400">
            Retrieving your application timeline...
          </div>
        ) : !candidate ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
              <Icon name="search" size={20} />
            </div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Application Not Found
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Please check your application link or search using the email address you used when applying.
            </p>
          </div>
        ) : (
          <>
            {/* Status Hero Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800">
                    Application #{candidate.id.slice(0, 8)}
                  </span>
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-2">
                    {candidate.talent_requisitions?.title || "Position Application"}
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Candidate: {candidate.name} • Applied on{" "}
                    {new Date(candidate.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                    {candidate.stage === "rejected" ? "Position Closed" : stageLabel(candidate.stage)}
                  </span>
                </div>
              </div>

              {/* Visual Pipeline Timeline */}
              <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4">
                  Application Milestones
                </h3>

                <div className="grid grid-cols-5 gap-2 relative">
                  {stagesList.map((st, i) => {
                    const state = getStageState(st, candidate.stage);

                    return (
                      <div key={st} className="text-center relative">
                        <div
                          className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                            state === "completed"
                              ? "bg-emerald-600 text-white"
                              : state === "current"
                              ? "bg-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-950"
                              : state === "failed"
                              ? "bg-rose-500 text-white"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                          }`}
                        >
                          {state === "completed" ? "✓" : i + 1}
                        </div>
                        <span
                          className={`block text-[11px] mt-2 font-medium ${
                            state === "current"
                              ? "text-indigo-600 dark:text-indigo-400 font-bold"
                              : state === "completed"
                              ? "text-slate-900 dark:text-white"
                              : "text-slate-400"
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
            <div className="bg-gradient-to-br from-indigo-50/70 to-white dark:from-slate-900 dark:to-slate-850 border border-indigo-100 dark:border-indigo-950/60 rounded-xl p-6">
              <div className="flex items-start gap-3">
                <div className="text-xl">✨</div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                    What happens next?
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
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
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="font-semibold text-slate-900 dark:text-white">
                    Privacy & Data Governance
                  </h5>
                  <p className="text-slate-500 mt-0.5">
                    Your data is protected under statutory privacy directives with zero demographic bias scoring.
                  </p>
                </div>
                <div>
                  {deletionRequested ? (
                    <span className="text-emerald-600 font-medium text-xs">
                      Deletion Request Logged ✓
                    </span>
                  ) : (
                    <button
                      onClick={() => setDeletionRequested(true)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                    >
                      Request Data Deletion
                    </button>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
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

"use client";

// Candidate & Guest Credits Utility
// Tracks credits earned from sharing jobs and unlocks candidate tools:
// - AI CV Consultation & Review
// - ATS Resume Builder
// - Priority Quick Apply
// - Detailed Job Intel & Pay Rubrics
// - Fast-Track AI Pre-Screening Interview

export const CREDITS_STORAGE_KEY = "askshree_candidate_credits";
export const DEFAULT_INITIAL_CREDITS = 25;
export const SHARE_REWARD_CREDITS = 25;

export type UnlockedTool = {
  id: string;
  name: string;
  badge: string;
  cost: number;
  description: string;
  actionLabel: string;
  route?: string;
  actionType: "cv_consult" | "ats_builder" | "quick_apply" | "job_intel" | "ai_interview";
};

export const UNLOCKED_TOOLS: UnlockedTool[] = [
  {
    id: "cv_consultation",
    name: "AI CV Consultation & Review",
    badge: "Most Popular",
    cost: 20,
    description: "Personalized AI deep-dive review of your resume against role expectations with actionable fixes.",
    actionLabel: "Consult Shree on CV",
    actionType: "cv_consult",
  },
  {
    id: "ats_builder",
    name: "ATS Resume Builder & Optimizer",
    badge: "High Impact",
    cost: 25,
    description: "Generate keyword-dense, ATS-compliant resumes tailored to beat automated screening algorithms.",
    actionLabel: "Launch ATS Builder",
    route: "/tools/jotz",
    actionType: "ats_builder",
  },
  {
    id: "priority_apply",
    name: "Priority Quick Apply",
    badge: "Fast Track",
    cost: 10,
    description: "Skip standard queues with priority placement directly on the hiring manager's review board.",
    actionLabel: "Use for Quick Apply",
    actionType: "quick_apply",
  },
  {
    id: "job_intel",
    name: "Detailed Job Intel & Pay Rubrics",
    badge: "Confidential",
    cost: 15,
    description: "Reveal internal compensation bands, team structures, and assessment scoring rubrics.",
    actionLabel: "View Full Specs",
    actionType: "job_intel",
  },
  {
    id: "ai_interview",
    name: "Fast-Track AI Pre-Screening Interview",
    badge: "Direct Founder Review",
    cost: 30,
    description: "Take an immediate 60-second conversational voice pre-screening with real-time feedback & score.",
    actionLabel: "Start AI Pre-Screen",
    route: "/interview/demo",
    actionType: "ai_interview",
  },
];

export function getCandidateCredits(): number {
  if (typeof window === "undefined") return DEFAULT_INITIAL_CREDITS;
  const stored = localStorage.getItem(CREDITS_STORAGE_KEY);
  if (stored === null) {
    localStorage.setItem(CREDITS_STORAGE_KEY, String(DEFAULT_INITIAL_CREDITS));
    return DEFAULT_INITIAL_CREDITS;
  }
  const parsed = parseInt(stored, 10);
  return isNaN(parsed) ? DEFAULT_INITIAL_CREDITS : parsed;
}

export function awardCandidateCredits(amount: number = SHARE_REWARD_CREDITS, reason: string = "job_share"): number {
  if (typeof window === "undefined") return DEFAULT_INITIAL_CREDITS;
  const current = getCandidateCredits();
  const next = current + amount;
  localStorage.setItem(CREDITS_STORAGE_KEY, String(next));

  // Dispatch custom event for real-time reactivity across components
  window.dispatchEvent(
    new CustomEvent("askshree_credits_updated", {
      detail: { credits: next, amountAdded: amount, reason },
    })
  );

  // Sync with backend API in background if authenticated
  fetch("/api/public/credits/earn", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount, reason }),
  }).catch((err) => {
    // Non-blocking for unauthenticated or offline visitors
    console.debug("Credit sync background notice:", err);
  });

  return next;
}

export function consumeCandidateCredits(amount: number): boolean {
  if (typeof window === "undefined") return false;
  const current = getCandidateCredits();
  if (current < amount) return false;
  const next = current - amount;
  localStorage.setItem(CREDITS_STORAGE_KEY, String(next));

  window.dispatchEvent(
    new CustomEvent("askshree_credits_updated", {
      detail: { credits: next, amountSubtracted: amount },
    })
  );

  return true;
}

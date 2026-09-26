"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import UniversalPlatformShell from "@/components/UniversalPlatformShell";
import Icon from "@/components/Icon";
import { createClient } from "@/lib/supabase/client";
import QuickApplyModal, { QuickApplyJobInfo } from "@/components/tools/QuickApplyModal";

// --- Real-data helpers (Track tab) -----------------------------------------
// talent_candidates.stage real values -> the 5-step display funnel below.
// hired/joined have no dedicated step in this UI yet, so they display at
// the final "Offer" position with their own status badge text.
const STAGE_INDEX: Record<string, number> = {
  applied: 0,
  screening: 1,
  hm_review: 2,
  interview: 3,
  offer: 4,
  hired: 4,
  joined: 4,
};
function stageIndexFor(stage: string) {
  return STAGE_INDEX[stage] ?? 0;
}
const STAGE_BADGE: Record<string, string> = {
  applied: "Application Received",
  screening: "AI Screening in Progress",
  hm_review: "In Hiring Manager Review",
  interview: "Interview Stage",
  offer: "Offer Extended",
  hired: "Hired",
  joined: "Joined",
  rejected: "Not Progressing",
};
function statusBadgeFor(stage: string) {
  return STAGE_BADGE[stage] || "Application Received";
}
function relativeTime(iso: string) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "recently";
  const diffMs = Math.max(0, Date.now() - then);
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}
function nextMilestoneFor(stage: string) {
  switch (stage) {
    case "applied": return "AI screening against the role\u2019s must-have skills";
    case "screening": return "Hiring manager calibration review";
    case "hm_review": return "Interview scheduling";
    case "interview": return "Interview outcome & offer calibration";
    case "offer": return "Offer acceptance & onboarding";
    case "hired":
    case "joined": return "Onboarding";
    case "rejected": return "";
    default: return "Next update from the hiring team";
  }
}
function notesFor(stage: string, matchScore: number | null, matchedSkills: string[]) {
  if (stage === "rejected") {
    return "This application will not be moving forward at this time. Thank you for applying \u2014 new roles are added regularly.";
  }
  const scoreText = typeof matchScore === "number" ? `AI match score: ${matchScore}%. ` : "";
  const skillsText = matchedSkills.length > 0 ? `Matched skills: ${matchedSkills.slice(0, 4).join(", ")}.` : "";
  return `${scoreText}${skillsText}`.trim() || "Your application is with the hiring team.";
}

interface ApiApplication {
  id: string;
  reqNo: string;
  role: string;
  department: string;
  location: string;
  company: string;
  stage: string;
  submittedAt: string;
  cvFileName: string | null;
  matchScore: number | null;
  matchedSkills: string[];
  missingSkills: string[];
}

export default function CandidatePortalPage() {
  return (
    <Suspense fallback={null}>
      <CandidatePortalInner />
    </Suspense>
  );
}

function CandidatePortalInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobIdParam = searchParams.get("job");
  const [activeTab, setActiveTab] = useState<"track" | "referrals" | "details" | "atscv" | "interview">("track");
  const [candidateName, setCandidateName] = useState("Alex Morgan");
  const [candidateEmail, setCandidateEmail] = useState("alex.morgan@example.com");

  // Multi-Application Tracking State
  const [selectedAppId, setSelectedAppId] = useState("app-1");
  const [inspectedStageIdx, setInspectedStageIdx] = useState<number>(2);

  // Real applications for the signed-in candidate -- fetched from
  // /api/candidate/my-applications, not mock data. See stageIndexFor /
  // statusBadgeFor / notesFor / nextMilestoneFor above for how the raw
  // talent_candidates.stage value drives this same 5-step display.
  const [apiApplications, setApiApplications] = useState<ApiApplication[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);

  const applications = apiApplications.map((a) => ({
    id: a.id,
    reqNo: a.reqNo,
    role: a.role,
    department: a.department,
    location: a.location,
    submittedDate: relativeTime(a.submittedAt),
    stageIdx: stageIndexFor(a.stage),
    statusBadge: statusBadgeFor(a.stage),
    hmNotes: notesFor(a.stage, a.matchScore, a.matchedSkills),
    nextMilestone: nextMilestoneFor(a.stage),
    cvFileName: a.cvFileName || "Not on file",
    isRejected: a.stage === "rejected",
  }));

  async function refetchApplications() {
    try {
      const res = await fetch("/api/candidate/my-applications");
      if (res.ok) {
        const data = await res.json();
        setApiApplications(data.applications || []);
      }
    } catch {
      // leave existing list as-is on a transient failure
    } finally {
      setApplicationsLoading(false);
    }
  }

  const stageSteps = [
    { name: "Applied", desc: "Profile & resume received into secure applicant vault", eta: "Instant" },
    { name: "Screened", desc: "Autonomous AI qualification & rubric fit analysis", eta: "12-24 hrs" },
    { name: "HM Review", desc: "Hiring Manager review & technical calibration", eta: "24-48 hrs" },
    { name: "Interview", desc: "Technical panel & collaborative system design", eta: "3-5 days" },
    { name: "Offer", desc: "Compensation calibration, equity & offer delivery", eta: "Final stage" },
  ];

  const interviewPrompts = [
    {
      category: "System Design",
      question: "Tell me about a challenging distributed systems bottleneck you diagnosed and resolved under high traffic.",
    },
    {
      category: "Behavioral / STAR",
      question: "Describe a situation where you had a strong disagreement with a technical lead or product manager. How did you handle it?",
    },
    {
      category: "Engineering Leadership",
      question: "How do you systematically balance feature delivery velocity with technical debt reduction across quarterly sprints?",
    },
  ];

  const currentApp = applications.find((a) => a.id === selectedAppId) || applications[0] || null;

  // Referral State
  const [referralEmail, setReferralEmail] = useState("");
  const [referralRole, setReferralRole] = useState("Senior Full-Stack Engineer");
  const [referralsList, setReferralsList] = useState([
    { name: "Priya Sharma", role: "Frontend Engineer", status: "Interviewing", reward: "$1,500 pending", date: "2 days ago" },
    { name: "David Chen", role: "DevOps Engineer", status: "Screening Passed", reward: "$1,500 pending", date: "Last week" },
  ]);
  const [referralSuccessNotice, setReferralSuccessNotice] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // ATS CV State
  const [atsScore, setAtsScore] = useState(88);
  const [analyzingAts, setAnalyzingAts] = useState(false);
  const [cvFileName, setCvFileName] = useState("Alex_Morgan_Senior_FullStack_2026.pdf");
  const [missingKeywords, setMissingKeywords] = useState(["Kubernetes", "GraphQL", "gRPC", "Observability"]);
  const [addedKeywords, setAddedKeywords] = useState<string[]>([]);
  const [dragOverCv, setDragOverCv] = useState(false);

  // Mock Interview State
  const [promptIdx, setPromptIdx] = useState(0);
  const [interviewAnswer, setInterviewAnswer] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [scoringAnswer, setScoringAnswer] = useState(false);
  const [interviewFeedback, setInterviewFeedback] = useState<{
    summary: string;
    starRatings: { s: number; t: number; a: number; r: number };
    coachTip: string;
  } | null>(null);

  // Details State
  const [skillsList, setSkillsList] = useState([
    "TypeScript",
    "React",
    "Next.js",
    "Node.js",
    "PostgreSQL",
    "Distributed Systems",
    "Tailwind CSS",
  ]);
  const [newSkillInput, setNewSkillInput] = useState("");
  const [targetLocation, setTargetLocation] = useState("San Francisco, CA / Hybrid / Remote");
  const [targetComp, setTargetComp] = useState("$175k - $210k + Equity");
  const [noticePeriod, setNoticePeriod] = useState("2 weeks");
  const [profileSavedToast, setProfileSavedToast] = useState(false);

  // Auth guard: this hub is for a signed-in candidate. Anyone arriving
  // signed out is bounced through the ordinary sign-in page (the same
  // one the top-right "Sign in as Candidate" quick-switcher uses), which
  // returns them right back here -- with the job they clicked, if any --
  // via ?next=.
  useEffect(() => {
    async function loadUser() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.email) {
          const target = jobIdParam ? `/candidate?job=${encodeURIComponent(jobIdParam)}` : "/candidate";
          router.replace(`/login?persona=candidate&next=${encodeURIComponent(target)}`);
          return;
        }
        setCandidateEmail(user.email);
        const derivedName = user.user_metadata?.full_name || user.email.split("@")[0];
        setCandidateName(derivedName);
        setIsSignedIn(true);
        refetchApplications();
      } catch {
        setApplicationsLoading(false);
      }
    }
    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Standard Apply lands here as /candidate?job=<posting id> -- fetch
  // that specific role so it can be applied to right inside the hub,
  // reusing the same QuickApplyModal used everywhere else on the site.
  const [applyJob, setApplyJob] = useState<QuickApplyJobInfo | null>(null);
  const [applyJobError, setApplyJobError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobIdParam || !isSignedIn) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/public/job/${encodeURIComponent(jobIdParam)}`);
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && data.job) {
          setApplyJob(data.job);
          setActiveTab("track");
        } else {
          setApplyJobError(data.error || "This role could not be loaded.");
        }
      } catch {
        if (!cancelled) setApplyJobError("Could not load this role right now.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [jobIdParam, isSignedIn]);

  function handleApplyPanelClose() {
    setApplyJob(null);
    setApplyJobError(null);
    router.replace("/candidate");
  }

  function handleSendReferral(e: React.FormEvent) {
    e.preventDefault();
    if (!referralEmail.trim()) return;
    const namePart = referralEmail.split("@")[0].replace(".", " ");
    const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
    setReferralsList((prev) => [
      {
        name: formattedName,
        role: referralRole,
        status: "Submitted",
        reward: "$1,500 pending",
        date: "Just now",
      },
      ...prev,
    ]);
    setReferralSuccessNotice(true);
    setReferralEmail("");
    setTimeout(() => setReferralSuccessNotice(false), 4000);
  }

  function handleCopyReferralLink() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(`https://www.askshree.com/apply?ref=${encodeURIComponent(candidateName.toLowerCase().replace(/\s+/g, "-"))}`);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    }
  }

  function handleAnalyzeAts() {
    setAnalyzingAts(true);
    setTimeout(() => {
      setAtsScore(95);
      setAnalyzingAts(false);
    }, 1200);
  }

  function handleAddKeywordToCv(kw: string) {
    setAddedKeywords((prev) => [...prev, kw]);
    setMissingKeywords((prev) => prev.filter((k) => k !== kw));
    setAtsScore((prev) => Math.min(99, prev + 2));
  }

  function toggleVoiceRecording() {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition ||
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice speech recognition is not supported in this browser. Please type your response directly.");
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";
      setIsRecording(true);

      recognition.onend = () => setIsRecording(false);
      recognition.onerror = () => setIsRecording(false);
      recognition.onresult = (evt: any) => {
        const transcript = evt.results?.[0]?.[0]?.transcript;
        if (transcript) {
          setInterviewAnswer((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
        setIsRecording(false);
      };
      recognition.start();
    } catch {
      setIsRecording(false);
    }
  }

  function handleEvaluateInterviewAnswer() {
    if (!interviewAnswer.trim()) return;
    setScoringAnswer(true);
    setTimeout(() => {
      setInterviewFeedback({
        summary: "Excellent structured answer utilizing the STAR format. You clearly articulated the core bottleneck (database I/O latency) and demonstrated measurable business impact.",
        starRatings: {
          s: 4.8,
          t: 4.9,
          a: 4.9,
          r: 4.7,
        },
        coachTip: "Shree Coach Tip: Quantify the telemetry tools explicitly (e.g. 'We used Prometheus and pprof to pin down GC pauses'). Mentioning cross-functional communication with SRE also boosts senior rubric scoring.",
      });
      setScoringAnswer(false);
    }, 1100);
  }

  function handleAddSkill(e: React.KeyboardEvent) {
    if (e.key === "Enter" && newSkillInput.trim()) {
      e.preventDefault();
      if (!skillsList.includes(newSkillInput.trim())) {
        setSkillsList([...skillsList, newSkillInput.trim()]);
      }
      setNewSkillInput("");
    }
  }

  function removeSkill(skill: string) {
    setSkillsList(skillsList.filter((s) => s !== skill));
  }

  function handleSaveProfile() {
    setProfileSavedToast(true);
    setTimeout(() => setProfileSavedToast(false), 3000);
  }

  return (
    <UniversalPlatformShell
      portalTitle="Candidate Hub"
      navAsMenu
      leftTitle="Candidate Hub"
      leftSubtitle="Personalized Career & Application Space"
      navItems={[
        {
          id: "track",
          label: "My Applications",
          icon: "checkCircle",
          badge: applications.length,
          badgeColor: "emerald",
          active: activeTab === "track",
          onClick: () => setActiveTab("track"),
        },
        {
          id: "atscv",
          label: "Build ATS Friendly Resume",
          icon: "fileText",
          badge: `${atsScore}%`,
          badgeColor: "amber",
          active: activeTab === "atscv",
          onClick: () => setActiveTab("atscv"),
        },
        {
          id: "interview",
          label: "Mock Interview",
          icon: "mic",
          badge: "AI Ready",
          badgeColor: "emerald",
          active: activeTab === "interview",
          onClick: () => setActiveTab("interview"),
        },
        {
          id: "referrals",
          label: "My Referrals",
          icon: "users",
          badge: referralsList.length,
          badgeColor: "purple",
          active: activeTab === "referrals",
          onClick: () => setActiveTab("referrals"),
        },
        {
          id: "details",
          label: "Set Preferences",
          icon: "user",
          badge: "95%",
          badgeColor: "blue",
          active: activeTab === "details",
          onClick: () => setActiveTab("details"),
        },
      ]}
      activeNavId={activeTab}
      onSelectNav={(id) => setActiveTab(id as any)}
      avatarConfig={{
        title: "Shree",
        subtitle: "AI powered hiring partner",
        badgeText: "Live-Interactive 24/7",
      }}
      searchPlaceholder="Ask Shree about your application status, ATS tips, or interview questions..."
      suggestedQuestions={[
        "What is the current review stage of my Senior Full-Stack role?",
        "How can I optimize my CV for high-scale distributed systems?",
        "Give me a mock interview question on system design",
        "How do candidate referral rewards work?",
      ]}
      onSearchSubmit={(q) => {
        const query = q.toLowerCase();
        if (query.includes("app") || query.includes("track") || query.includes("status")) {
          setActiveTab("track");
        } else if (query.includes("cv") || query.includes("ats") || query.includes("resume")) {
          setActiveTab("atscv");
        } else if (query.includes("interview") || query.includes("intro") || query.includes("mock")) {
          setActiveTab("interview");
        } else if (query.includes("referral")) {
          setActiveTab("referrals");
        } else {
          setActiveTab("details");
        }
      }}
    >
      {/* ================= RIGHT WORKSPACE CANVAS ================= */}

      {/* VIEW 1: TRACK MY APPLICATION */}
      {activeTab === "track" && (
        <div className="space-y-4">
          {/* Standard Apply landed here with a specific role -- apply to it
              right inside the hub using the same Quick Apply flow used
              everywhere else on the site, pre-filled with this account. */}
          {jobIdParam && (applyJob || applyJobError) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm sm:text-base font-bold text-ink font-display">
                  Apply to this role
                </h2>
                <button
                  type="button"
                  onClick={handleApplyPanelClose}
                  className="text-[11.5px] font-bold text-ink-muted hover:text-ink"
                >
                  Close
                </button>
              </div>
              {applyJobError ? (
                <div className="p-3 rounded-xl bg-critical-wash text-critical text-xs border border-critical/20">
                  {applyJobError}
                </div>
              ) : (
                <QuickApplyModal
                  isOpen={true}
                  onClose={handleApplyPanelClose}
                  job={applyJob}
                  variant="embedded"
                  badgeLabel="Standard Apply"
                  account={{ email: candidateEmail, name: candidateName }}
                  onAppliedSuccess={() => refetchApplications()}
                />
              )}
            </div>
          )}

          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-ink font-display">
                Active Application Status
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">
                Real-time stage transparency and hiring team review milestones
              </p>
            </div>
            {/* Multi-Application Selector */}
            {applications.length > 0 && (
              <div className="flex items-center gap-1.5 bg-surface border border-border p-1 rounded-xl flex-wrap">
                {applications.map((app) => (
                  <button
                    key={app.id}
                    onClick={() => {
                      setSelectedAppId(app.id);
                      setInspectedStageIdx(app.stageIdx);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      selectedAppId === app.id
                        ? "bg-brand text-white shadow-soft-sm"
                        : "text-ink-muted hover:text-ink hover:bg-page"
                    }`}
                  >
                    {app.role.split(" ")[0]} ({app.reqNo})
                  </button>
                ))}
              </div>
            )}
          </div>

          {applicationsLoading ? (
            <div className="bg-surface border border-border rounded-2xl p-6 shadow-soft text-xs text-ink-muted">
              Loading your applications…
            </div>
          ) : applications.length === 0 ? (
            <div className="bg-surface border border-border rounded-2xl p-6 shadow-soft text-center space-y-2">
              <p className="text-sm font-semibold text-ink m-0">You haven&apos;t applied to any roles yet.</p>
              <p className="text-xs text-ink-muted m-0">Once you apply, you&apos;ll be able to track every stage here.</p>
              <Link href="/jobs" className="inline-block text-xs font-bold text-brand hover:underline mt-1">
                Browse open roles →
              </Link>
            </div>
          ) : currentApp ? (
          /* Main Application Card */
          <div className="bg-surface border border-border rounded-2xl p-4 sm:p-5 shadow-soft space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
              <div>
                <span className="text-[11px] font-mono text-ink-muted font-bold">{currentApp.reqNo}</span>
                <h3 className="text-sm sm:text-base font-bold text-ink">{currentApp.role}</h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  {currentApp.department} • {currentApp.location}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border ${
                    currentApp.isRejected
                      ? "bg-critical-wash text-critical border-critical/30"
                      : currentApp.stageIdx >= 4
                      ? "bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300"
                      : "bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300"
                  }`}
                >
                  {currentApp.statusBadge}
                </span>
                <p className="text-[10.5px] text-ink-muted mt-1">Submitted {currentApp.submittedDate}</p>
              </div>
            </div>

            {/* Interactive 5-Stage Funnel */}
            <div>
              <div className="text-[11px] font-semibold text-ink-muted mb-2 flex items-center justify-between">
                <span>Application Milestones (Click any stage to view details)</span>
                {!currentApp.isRejected && (
                  <span className="text-brand font-bold">Stage {currentApp.stageIdx + 1} of 5</span>
                )}
              </div>
              <div className="grid grid-cols-5 gap-2 text-center">
                {stageSteps.map((step, idx) => {
                  const isCompleted = !currentApp.isRejected && idx < currentApp.stageIdx;
                  const isCurrent = !currentApp.isRejected && idx === currentApp.stageIdx;
                  const isSelected = inspectedStageIdx === idx;

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setInspectedStageIdx(idx)}
                      className={`group p-2 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? "border-brand bg-brand-wash/30 shadow-soft-sm"
                          : "border-border bg-page hover:border-brand/40"
                      }`}
                    >
                      <div
                        className={`h-1.5 rounded-full mb-1.5 transition-all ${
                          isCompleted
                            ? "bg-emerald-500"
                            : isCurrent
                            ? "bg-brand animate-pulse"
                            : "bg-border"
                        }`}
                      />
                      <div className="text-[11px] font-bold text-ink truncate flex items-center gap-1">
                        {isCompleted && <span className="text-emerald-500 text-[10px]">✓</span>}
                        <span>{step.name}</span>
                      </div>
                      <div className="text-[9.5px] text-ink-muted truncate mt-0.5">{step.eta}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stage Detail Inspector */}
            <div className="p-3.5 rounded-xl bg-page border border-border flex items-start gap-3 text-xs">
              <span className="text-brand text-base mt-0.5">ℹ️</span>
              <div className="space-y-1">
                <div className="font-bold text-ink">
                  Stage Details: {stageSteps[inspectedStageIdx].name} ({stageSteps[inspectedStageIdx].eta})
                </div>
                <p className="text-ink-muted leading-relaxed">
                  {stageSteps[inspectedStageIdx].desc}
                </p>
                <div className="pt-2 border-t border-border/80 mt-2 space-y-1">
                  <span className="font-semibold text-brand">Current Status:</span>
                  <p className="text-ink leading-relaxed">{currentApp.hmNotes}</p>
                  {currentApp.nextMilestone && (
                    <div className="text-[11px] font-medium text-emerald-800 dark:text-emerald-300 pt-1">
                      → Next: {currentApp.nextMilestone}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Submitted Documents & Resume Info */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface border border-border text-xs flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Icon name="fileText" size={16} className="text-brand" />
                <div>
                  <div className="font-semibold text-ink">Submitted CV Document</div>
                  <div className="text-[10.5px] text-ink-muted font-mono">{currentApp.cvFileName}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("atscv")}
                className="text-xs text-brand font-bold hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>View ATS Score ({atsScore}%)</span>
                <span>→</span>
              </button>
            </div>
          </div>
          ) : null}
        </div>
      )}

      {/* VIEW 2: PREPARE ATS CV */}
      {activeTab === "atscv" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-ink font-display">
                Shree AI ATS Resume Optimizer
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">
                Calibrate your CV against enterprise ATS parsers (Workday, Greenhouse, Lever)
              </p>
            </div>
            <button
              type="button"
              onClick={handleAnalyzeAts}
              disabled={analyzingAts}
              className="px-4 py-2 rounded-xl bg-brand text-white hover:bg-brand-dark text-xs font-semibold shadow-button cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <span>{analyzingAts ? "Scanning ATS Engine..." : "⚡ Re-Scan Resume"}</span>
            </button>
          </div>

          {/* ATS Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-surface border border-border shadow-soft-sm text-center">
              <div className="text-3xl font-bold text-brand font-display">{atsScore}%</div>
              <div className="text-xs font-semibold text-ink mt-1">Overall ATS Compatibility</div>
              <p className="text-[10.5px] text-ink-muted mt-0.5">Zero parsing traps or column errors</p>
            </div>
            <div className="p-4 rounded-xl bg-surface border border-border shadow-soft-sm text-center">
              <div className="text-3xl font-bold text-emerald-600 font-display">
                {18 + addedKeywords.length}/22
              </div>
              <div className="text-xs font-semibold text-ink mt-1">Keyword Match Score</div>
              <p className="text-[10.5px] text-ink-muted mt-0.5">High semantic relevance</p>
            </div>
            <div className="p-4 rounded-xl bg-surface border border-border shadow-soft-sm text-center">
              <div className="text-3xl font-bold text-blue-600 font-display">A+</div>
              <div className="text-xs font-semibold text-ink mt-1">Layout & Typography</div>
              <p className="text-[10.5px] text-ink-muted mt-0.5">Single-column plain text verified</p>
            </div>
          </div>

          {/* Interactive Drop / Upload Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverCv(true);
            }}
            onDragLeave={() => setDragOverCv(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOverCv(false);
              const file = e.dataTransfer.files?.[0];
              if (file) {
                setCvFileName(file.name);
                handleAnalyzeAts();
              }
            }}
            className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all ${
              dragOverCv ? "border-brand bg-brand-wash/30" : "border-border bg-surface hover:border-brand/40"
            }`}
          >
            <div className="text-2xl mb-1">📄</div>
            <div className="text-xs font-bold text-ink">Active Resume: {cvFileName}</div>
            <p className="text-[11px] text-ink-muted mt-0.5">
              Drag and drop an updated PDF or DOCX file to re-run enterprise ATS parsing
            </p>
          </div>

          {/* Missing Keywords & Suggestions */}
          <div className="p-4 rounded-xl bg-surface border border-border shadow-soft-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink">Recommended ATS Keywords</span>
              <span className="text-[11px] text-ink-muted">Click to add to CV suggestions</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {missingKeywords.map((kw) => (
                <button
                  key={kw}
                  type="button"
                  onClick={() => handleAddKeywordToCv(kw)}
                  className="px-2.5 py-1 rounded-lg bg-page border border-border text-xs font-medium text-ink hover:border-brand hover:text-brand flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>+ {kw}</span>
                </button>
              ))}
              {missingKeywords.length === 0 && (
                <span className="text-xs text-emerald-600 font-semibold">
                  ✓ All top target keywords included in your CV profile!
                </span>
              )}
            </div>

            {addedKeywords.length > 0 && (
              <div className="pt-2 border-t border-border text-[11px] text-emerald-800 dark:text-emerald-300">
                Added to suggestions: {addedKeywords.join(", ")}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 3: PREPARE FOR INTRO / MOCK INTERVIEW ROOM */}
      {activeTab === "interview" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-ink font-display">
                Shree AI Mock Interview Practice Room
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">
                Practice technical responses with AI STAR evaluation before meeting the team
              </p>
            </div>
            {/* Category Selector */}
            <div className="flex items-center gap-1.5 bg-surface border border-border p-1 rounded-xl">
              {interviewPrompts.map((p, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setPromptIdx(i);
                    setInterviewFeedback(null);
                    setInterviewAnswer("");
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    promptIdx === i
                      ? "bg-brand text-white shadow-soft-sm"
                      : "text-ink-muted hover:text-ink hover:bg-page"
                  }`}
                >
                  {p.category}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-surface border border-border rounded-2xl p-4 sm:p-5 shadow-soft space-y-3.5">
            {/* Prompt Box */}
            <div className="p-3.5 rounded-xl bg-brand-wash/30 border border-brand/20">
              <span className="text-[10px] font-bold text-brand uppercase tracking-wider">
                {interviewPrompts[promptIdx].category} Question
              </span>
              <p className="text-xs sm:text-sm font-semibold text-ink mt-1 leading-relaxed">
                &quot;{interviewPrompts[promptIdx].question}&quot;
              </p>
            </div>

            {/* Answer Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-ink">Your Spoken or Written Response</label>
                <button
                  type="button"
                  onClick={toggleVoiceRecording}
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 transition-all cursor-pointer ${
                    isRecording
                      ? "bg-red-100 text-red-700 animate-pulse border border-red-300"
                      : "bg-page border border-border text-ink-muted hover:text-ink"
                  }`}
                >
                  <span>{isRecording ? "🔴 Recording Voice..." : "🎤 Speak Answer"}</span>
                </button>
              </div>
              <textarea
                rows={4}
                value={interviewAnswer}
                onChange={(e) => setInterviewAnswer(e.target.value)}
                placeholder="Type or speak your answer using the STAR method (Situation, Task, Action, Result)..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-page border border-border text-xs text-ink outline-none focus:border-brand resize-none leading-relaxed"
              />
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setPromptIdx((prev) => (prev + 1) % interviewPrompts.length);
                  setInterviewFeedback(null);
                  setInterviewAnswer("");
                }}
                className="text-xs text-brand hover:underline font-medium cursor-pointer"
              >
                ↻ Next Practice Question
              </button>

              <button
                type="button"
                disabled={scoringAnswer || !interviewAnswer.trim()}
                onClick={handleEvaluateInterviewAnswer}
                className="px-4 py-2 rounded-xl bg-brand text-white hover:bg-brand-dark text-xs font-semibold shadow-button cursor-pointer disabled:opacity-50"
              >
                {scoringAnswer ? "Evaluating with Shree Coach..." : "Submit for Shree AI Feedback"}
              </button>
            </div>

            {/* AI Evaluation Output */}
            {interviewFeedback && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-ink space-y-2.5 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-800">Shree AI Coach Evaluation:</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-bold text-[10.5px]">
                    STAR Score: 4.8 / 5.0
                  </span>
                </div>
                <p className="text-ink leading-relaxed">{interviewFeedback.summary}</p>
                
                {/* STAR Rubric Breakdown */}
                <div className="grid grid-cols-4 gap-2 text-center pt-1 border-t border-emerald-200">
                  <div className="p-1.5 bg-white/60 rounded-lg">
                    <div className="text-[10px] text-ink-muted uppercase">Situation</div>
                    <div className="font-bold text-emerald-800">{interviewFeedback.starRatings.s}</div>
                  </div>
                  <div className="p-1.5 bg-white/60 rounded-lg">
                    <div className="text-[10px] text-ink-muted uppercase">Task</div>
                    <div className="font-bold text-emerald-800">{interviewFeedback.starRatings.t}</div>
                  </div>
                  <div className="p-1.5 bg-white/60 rounded-lg">
                    <div className="text-[10px] text-ink-muted uppercase">Action</div>
                    <div className="font-bold text-emerald-800">{interviewFeedback.starRatings.a}</div>
                  </div>
                  <div className="p-1.5 bg-white/60 rounded-lg">
                    <div className="text-[10px] text-ink-muted uppercase">Result</div>
                    <div className="font-bold text-emerald-800">{interviewFeedback.starRatings.r}</div>
                  </div>
                </div>

                <div className="pt-1 text-[11.5px] text-emerald-900 leading-relaxed font-medium">
                  {interviewFeedback.coachTip}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 4: MY REFERRALS */}
      {activeTab === "referrals" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-ink font-display">
                Candidate Referrals & Rewards
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">
                Refer talented peers to open positions and earn cash rewards upon successful hire
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopyReferralLink}
              className="px-3.5 py-1.5 rounded-xl bg-brand text-white hover:bg-brand-dark text-xs font-semibold shadow-button cursor-pointer flex items-center gap-1.5"
            >
              <span>{linkCopied ? "✓ Link Copied!" : "🔗 Copy My Referral Link"}</span>
            </button>
          </div>

          {referralSuccessNotice && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fade-in">
              <span>✓</span>
              <span>Referral invitation sent to candidate successfully! Added to your tracking list.</span>
            </div>
          )}

          {/* Quick Refer Form */}
          <form onSubmit={handleSendReferral} className="bg-surface border border-border rounded-2xl p-4 sm:p-5 shadow-soft space-y-3">
            <h3 className="text-xs font-bold text-ink uppercase tracking-wider">Refer a Colleague</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">Colleague Email *</label>
                <input
                  type="email"
                  required
                  value={referralEmail}
                  onChange={(e) => setReferralEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  className="w-full px-3 py-2 rounded-xl bg-page border border-border text-xs text-ink outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1">Target Position</label>
                <select
                  value={referralRole}
                  onChange={(e) => setReferralRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-page border border-border text-xs text-ink outline-none"
                >
                  <option>Senior Full-Stack Engineer</option>
                  <option>Lead Cloud Infrastructure Architect</option>
                  <option>Enterprise Account Executive</option>
                  <option>Technical TA Partner</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-ink-muted">
                Standard reward: <strong className="text-brand">$1,500 / hire</strong> paid on 90-day milestone.
              </span>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-brand text-white hover:bg-brand-dark text-xs font-semibold shadow-button cursor-pointer"
              >
                Send Referral Invite
              </button>
            </div>
          </form>

          {/* Prior Referrals Tracker */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-ink-muted uppercase tracking-wider">My Submissions ({referralsList.length})</h3>
            {referralsList.map((ref, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-surface border border-border flex items-center justify-between text-xs shadow-soft-sm">
                <div>
                  <div className="font-bold text-ink">{ref.name}</div>
                  <div className="text-[10.5px] text-ink-muted">{ref.role} • Submitted {ref.date}</div>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                    {ref.status}
                  </span>
                  <div className="text-[10px] text-brand font-medium mt-0.5">{ref.reward}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 5: MY DETAILS */}
      {activeTab === "details" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-ink font-display">
                Candidate Profile & Preferences
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">
                Keep your contact details, verified skills, and compensation goals up to date
              </p>
            </div>
            <button
              type="button"
              onClick={handleSaveProfile}
              className="px-4 py-2 rounded-xl bg-brand text-white hover:bg-brand-dark text-xs font-semibold shadow-button cursor-pointer"
            >
              Save Changes
            </button>
          </div>

          {profileSavedToast && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fade-in">
              <span>✓</span>
              <span>Candidate preferences saved successfully!</span>
            </div>
          )}

          <div className="bg-surface border border-border rounded-2xl p-4 sm:p-5 shadow-soft space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">Full Name</label>
                <input
                  type="text"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-page border border-border text-xs text-ink outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1">Email Address</label>
                <input
                  type="email"
                  readOnly
                  value={candidateEmail}
                  className="w-full px-3 py-2 rounded-xl bg-page/60 border border-border text-xs text-ink-muted outline-none cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">Target Location</label>
                <input
                  type="text"
                  value={targetLocation}
                  onChange={(e) => setTargetLocation(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-page border border-border text-xs text-ink outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1">Target Compensation</label>
                <input
                  type="text"
                  value={targetComp}
                  onChange={(e) => setTargetComp(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-page border border-border text-xs text-ink outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1">Notice Period</label>
                <input
                  type="text"
                  value={noticePeriod}
                  onChange={(e) => setNoticePeriod(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-page border border-border text-xs text-ink outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-ink">Verified Skill Tags</label>
                <span className="text-[11px] text-ink-muted">Type and press Enter to add</span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {skillsList.map((s, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-page border border-border text-xs font-medium text-ink flex items-center gap-1.5 shadow-soft-sm"
                  >
                    <span>{s}</span>
                    <button
                      type="button"
                      onClick={() => removeSkill(s)}
                      className="text-ink-muted hover:text-critical font-bold text-[11px] cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                placeholder="Add a new skill (e.g. Docker, GraphQL, System Design) and press Enter..."
                value={newSkillInput}
                onChange={(e) => setNewSkillInput(e.target.value)}
                onKeyDown={handleAddSkill}
                className="w-full px-3 py-2 rounded-xl bg-page border border-border text-xs text-ink outline-none focus:border-brand mt-2"
              />
            </div>
          </div>
        </div>
      )}
    </UniversalPlatformShell>
  );
}

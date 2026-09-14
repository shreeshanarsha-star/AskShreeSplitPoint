"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import UniversalPlatformShell from "@/components/UniversalPlatformShell";
import Icon from "@/components/Icon";
import { createClient } from "@/lib/supabase/client";

export default function CandidatePortalPage() {
  const [activeTab, setActiveTab] = useState<"track" | "referrals" | "details" | "atscv" | "interview">("track");
  const [candidateName, setCandidateName] = useState("Alex Morgan");
  const [referralEmail, setReferralEmail] = useState("");
  const [referralRole, setReferralRole] = useState("Senior Full-Stack Engineer");
  const [referralSent, setReferralSent] = useState(false);

  // ATS CV State
  const [atsScore, setAtsScore] = useState(88);
  const [analyzingAts, setAnalyzingAts] = useState(false);

  // Mock Interview State
  const [currentInterviewQuestion, setCurrentInterviewQuestion] = useState(
    "Tell me about a challenging distributed systems bottleneck you diagnosed and resolved."
  );
  const [interviewAnswer, setInterviewAnswer] = useState("");
  const [interviewFeedback, setInterviewFeedback] = useState<string | null>(null);
  const [scoringAnswer, setScoringAnswer] = useState(false);

  // Check Supabase user session
  useEffect(() => {
    async function loadUser() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          const derivedName = user.user_metadata?.full_name || user.email.split("@")[0];
          setCandidateName(derivedName);
        }
      } catch {
        // Fallback to sample candidate name
      }
    }
    loadUser();
  }, []);

  function handleSendReferral(e: React.FormEvent) {
    e.preventDefault();
    if (!referralEmail.trim()) return;
    setReferralSent(true);
    setReferralEmail("");
    setTimeout(() => setReferralSent(false), 4000);
  }

  function handleAnalyzeAts() {
    setAnalyzingAts(true);
    setTimeout(() => {
      setAtsScore(94);
      setAnalyzingAts(false);
    }, 1200);
  }

  function handleEvaluateInterviewAnswer() {
    if (!interviewAnswer.trim()) return;
    setScoringAnswer(true);
    setTimeout(() => {
      setInterviewFeedback(
        "Strong structure following the STAR method. You clearly identified the bottleneck (I/O latency) and articulated measurable impact (reduced P99 latency by 34%). Shree suggestion: explicitly mention which monitoring tool was used (e.g. Prometheus, Datadog)."
      );
      setScoringAnswer(false);
    }, 1000);
  }

  return (
    <UniversalPlatformShell
      portalTitle="Candidate Talent Portal"
      leftTitle="Candidate Hub"
      leftSubtitle="Personalized Career & Application Space"
      navItems={[
        {
          id: "track",
          label: "Track my application",
          icon: "checkCircle",
          badge: "Active",
          badgeColor: "emerald",
          active: activeTab === "track",
          onClick: () => setActiveTab("track"),
        },
        {
          id: "referrals",
          label: "My referrals",
          icon: "users",
          badge: 2,
          badgeColor: "purple",
          active: activeTab === "referrals",
          onClick: () => setActiveTab("referrals"),
        },
        {
          id: "details",
          label: "My details",
          icon: "user",
          badge: "95%",
          badgeColor: "blue",
          active: activeTab === "details",
          onClick: () => setActiveTab("details"),
        },
        {
          id: "atscv",
          label: "Prepare ATS cv",
          icon: "fileText",
          badge: `${atsScore}%`,
          badgeColor: "amber",
          active: activeTab === "atscv",
          onClick: () => setActiveTab("atscv"),
        },
        {
          id: "interview",
          label: "Prepare for Intro",
          icon: "mic",
          badge: "AI Ready",
          badgeColor: "emerald",
          active: activeTab === "interview",
          onClick: () => setActiveTab("interview"),
        },
      ]}
      activeNavId={activeTab}
      onSelectNav={(id) => setActiveTab(id as any)}
      avatarConfig={{
        title: "Shree AI Career Partner",
        subtitle: "Application Transparency • ATS CV Optimizer • 24/7 Interview Coach",
        badgeText: "Career Coach Online",
      }}
      searchPlaceholder="Ask Shree about your application status, ATS tips, or interview questions..."
      suggestedQuestions={[
        "What is the status of my Senior Full-Stack application?",
        "How can I optimize my CV for Cloud Architect roles?",
        "Give me a mock interview question on system design",
        "How do candidate referral bonuses work?",
      ]}
      onSearchSubmit={(q) => {
        if (q.toLowerCase().includes("track") || q.toLowerCase().includes("status")) {
          setActiveTab("track");
        } else if (q.toLowerCase().includes("referral")) {
          setActiveTab("referrals");
        } else if (q.toLowerCase().includes("cv") || q.toLowerCase().includes("ats")) {
          setActiveTab("atscv");
        } else if (q.toLowerCase().includes("interview") || q.toLowerCase().includes("intro")) {
          setActiveTab("interview");
        } else {
          setActiveTab("details");
        }
      }}
    >
      {/* ================= RIGHT WORKSPACE CANVAS ================= */}

      {/* VIEW 1: TRACK MY APPLICATION (Wireframe 2 Bottom) */}
      {activeTab === "track" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-ink font-display">
                Active Application Status
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">
                Real-time milestone transparency for your active job applications
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-wash text-brand border border-brand/30">
              In Final Review
            </span>
          </div>

          {/* Application Card with Live Timeline */}
          <div className="bg-surface border border-border rounded-2xl p-4 sm:p-5 shadow-soft space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
              <div>
                <span className="text-[11px] font-mono text-ink-muted font-bold">R-2208261</span>
                <h3 className="text-sm sm:text-base font-bold text-ink">Senior Full-Stack Engineer</h3>
                <p className="text-xs text-ink-muted mt-0.5">Engineering • San Francisco, CA / Remote</p>
              </div>
              <div className="text-right">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200 dark:bg-purple-950/50 dark:text-purple-300">
                  Stage: Hiring Manager Review
                </span>
                <p className="text-[10.5px] text-ink-muted mt-1">Submitted 4 days ago</p>
              </div>
            </div>

            {/* Stage Progress Funnel Bar */}
            <div className="grid grid-cols-5 gap-1.5 pt-1 text-center">
              {[
                { stage: "Applied", completed: true, current: false },
                { stage: "Screened", completed: true, current: false },
                { stage: "HM Review", completed: false, current: true },
                { stage: "Interview", completed: false, current: false },
                { stage: "Offer", completed: false, current: false },
              ].map((step, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      step.completed
                        ? "bg-emerald-500"
                        : step.current
                        ? "bg-brand animate-pulse"
                        : "bg-page border border-border"
                    }`}
                  />
                  <span
                    className={`text-[10px] font-semibold block ${
                      step.current ? "text-brand" : step.completed ? "text-emerald-700 dark:text-emerald-400" : "text-ink-muted"
                    }`}
                  >
                    {step.stage}
                  </span>
                </div>
              ))}
            </div>

            {/* Next Steps Notification */}
            <div className="p-3 rounded-xl bg-page border border-border flex items-start gap-2.5 text-xs">
              <span className="text-brand text-sm">💡</span>
              <div>
                <span className="font-bold text-ink">Next Up: Hiring Team Calibration</span>
                <p className="text-ink-muted mt-0.5 leading-relaxed">
                  Your resume and screening notes have passed the calibrated AI threshold (94% match) and are currently with the VP of Engineering for interview scheduling.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: MY REFERRALS (Wireframe 2 Bottom) */}
      {activeTab === "referrals" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-ink font-display">
                Candidate Referrals & Rewards
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">
                Refer talented colleagues to open requisitions and earn rewards upon hiring
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
              $1,500 Reward / Hire
            </span>
          </div>

          {referralSent && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <span>✓</span>
              <span>Referral invitation sent to candidate successfully!</span>
            </div>
          )}

          {/* Quick Refer Form */}
          <form onSubmit={handleSendReferral} className="bg-surface border border-border rounded-2xl p-4 sm:p-5 shadow-soft space-y-3">
            <h3 className="text-xs font-bold text-ink uppercase tracking-wider">Refer a Colleague</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">Colleague Email</label>
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
                <label className="block text-xs font-semibold text-ink mb-1">Target Role</label>
                <select
                  value={referralRole}
                  onChange={(e) => setReferralRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-page border border-border text-xs text-ink outline-none"
                >
                  <option>Senior Full-Stack Engineer</option>
                  <option>Enterprise Account Executive</option>
                  <option>Principal Infrastructure Architect</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-1">
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
            <h3 className="text-xs font-bold text-ink-muted uppercase tracking-wider">My Submissions</h3>
            {[
              { name: "Priya Sharma", role: "Frontend Engineer", status: "Interviewing", date: "2 days ago" },
              { name: "David Chen", role: "DevOps Engineer", status: "Screening Passed", date: "Last week" },
            ].map((ref, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-surface border border-border flex items-center justify-between text-xs shadow-soft-sm">
                <div>
                  <div className="font-bold text-ink">{ref.name}</div>
                  <div className="text-[10.5px] text-ink-muted">{ref.role} • Submitted {ref.date}</div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                  {ref.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 3: MY DETAILS (Wireframe 2 Bottom) */}
      {activeTab === "details" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-ink font-display">
              Candidate Profile & Preferences
            </h2>
            <p className="text-xs text-ink-muted mt-0.5">
              Keep your contact details, verified skills, and work preferences up to date
            </p>
          </div>

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
                <label className="block text-xs font-semibold text-ink mb-1">Target Location / Remote</label>
                <input
                  type="text"
                  defaultValue="San Francisco, CA / Hybrid / Remote"
                  className="w-full px-3 py-2 rounded-xl bg-page border border-border text-xs text-ink outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Verified Skill Tags</label>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {["TypeScript", "React", "Next.js", "Node.js", "PostgreSQL", "Tailwind CSS", "Distributed Systems"].map((s, idx) => (
                  <span key={idx} className="px-2.5 py-1 rounded-lg bg-page border border-border text-xs font-medium text-ink flex items-center gap-1.5 shadow-soft-sm">
                    <span>{s}</span>
                    <span className="text-emerald-500 font-bold">✓</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: PREPARE ATS CV (Wireframe 2 Bottom) */}
      {activeTab === "atscv" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-ink font-display">
                Shree AI ATS Resume Optimizer
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">
                Analyze your resume against top enterprise ATS parsers and target job descriptions
              </p>
            </div>
            <button
              type="button"
              onClick={handleAnalyzeAts}
              disabled={analyzingAts}
              className="px-3.5 py-1.5 rounded-xl bg-brand text-white hover:bg-brand-dark text-xs font-semibold shadow-button cursor-pointer"
            >
              {analyzingAts ? "Scanning..." : "Re-Scan Resume"}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-surface border border-border shadow-soft-sm text-center">
              <div className="text-2xl sm:text-3xl font-bold text-brand font-display">{atsScore}%</div>
              <div className="text-xs font-semibold text-ink mt-1">Overall ATS Compatibility</div>
              <p className="text-[10.5px] text-ink-muted mt-0.5">Zero parsing errors detected</p>
            </div>
            <div className="p-4 rounded-xl bg-surface border border-border shadow-soft-sm text-center">
              <div className="text-2xl sm:text-3xl font-bold text-emerald-600 font-display">18/20</div>
              <div className="text-xs font-semibold text-ink mt-1">Keyword Coverage</div>
              <p className="text-[10.5px] text-ink-muted mt-0.5">High semantic match</p>
            </div>
            <div className="p-4 rounded-xl bg-surface border border-border shadow-soft-sm text-center">
              <div className="text-2xl sm:text-3xl font-bold text-blue-600 font-display">A+</div>
              <div className="text-xs font-semibold text-ink mt-1">Layout & Typography</div>
              <p className="text-[10.5px] text-ink-muted mt-0.5">Single-column parse ready</p>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 5: PREPARE FOR INTRO / INTERVIEW (Wireframe 2 Bottom) */}
      {activeTab === "interview" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-ink font-display">
              Shree AI Mock Interview Practice Room
            </h2>
            <p className="text-xs text-ink-muted mt-0.5">
              Practice interview responses with interactive AI feedback before meeting the hiring team
            </p>
          </div>

          <div className="bg-surface border border-border rounded-2xl p-4 sm:p-5 shadow-soft space-y-3.5">
            <div className="p-3.5 rounded-xl bg-brand-wash/30 border border-brand/20">
              <span className="text-[10px] font-bold text-brand uppercase tracking-wider">Prompt Question</span>
              <p className="text-xs sm:text-sm font-semibold text-ink mt-1 leading-relaxed">
                &quot;{currentInterviewQuestion}&quot;
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Your Spoken or Written Response</label>
              <textarea
                rows={4}
                value={interviewAnswer}
                onChange={(e) => setInterviewAnswer(e.target.value)}
                placeholder="Type or speak your answer using the STAR method (Situation, Task, Action, Result)..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-page border border-border text-xs text-ink outline-none focus:border-brand resize-none leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() =>
                  setCurrentInterviewQuestion(
                    "Describe how you handle conflicting architectural priorities between speed-to-market and technical debt."
                  )
                }
                className="text-xs text-brand hover:underline font-medium cursor-pointer"
              >
                ↻ Next Question
              </button>

              <button
                type="button"
                disabled={scoringAnswer || !interviewAnswer.trim()}
                onClick={handleEvaluateInterviewAnswer}
                className="px-4 py-2 rounded-xl bg-brand text-white hover:bg-brand-dark text-xs font-semibold shadow-button cursor-pointer disabled:opacity-50"
              >
                {scoringAnswer ? "Evaluating..." : "Submit for Shree AI Feedback"}
              </button>
            </div>

            {interviewFeedback && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-ink space-y-1 animate-fade-in">
                <span className="font-bold text-emerald-800">Shree AI Coach Evaluation:</span>
                <p className="text-ink leading-relaxed">{interviewFeedback}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </UniversalPlatformShell>
  );
}

"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import Logo from "@/components/Logo";
import TopbarStatus from "@/components/TopbarStatus";
import JobShareButton from "@/components/JobShareButton";
import ShareToEarnModal from "@/components/ShareToEarnModal";
import { getCandidateCredits, awardCandidateCredits } from "@/lib/credits";
import { createClient } from "@/lib/supabase/client";

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: { [i: number]: { [j: number]: { transcript: string } } }; length?: number }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

type JobPosting = {
  id: string;
  title: string;
  department?: string;
  location?: string;
  type?: string;
  description?: string;
};

type MatchedRole = {
  jobId: string;
  title: string;
  department?: string;
  location?: string;
  description?: string;
  matchScore: number;
  matchedSkills: string[];
  missingSkills?: string[];
  reason: string;
};

type ParsedCandidateData = {
  name: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  years_experience: number | null;
  skills: string[];
};

type ChatMessage = {
  id?: string;
  role: "assistant" | "user";
  text: string;
  isCvUpload?: boolean;
  fileName?: string;
  matchedJobs?: MatchedRole[];
  showConsent?: boolean;
  candidateData?: ParsedCandidateData;
  consentGranted?: boolean | null;
};

const SUGGESTED_QUESTIONS = [
  "What are the interview stages?",
  "What skills are prioritized for this role?",
  "Tell me about AskShree team culture",
  "What is the hiring timeline & interview process?",
];

export default function HomePage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [roleFilter, setRoleFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [candidateCredits, setCandidateCredits] = useState(25);
  const [shareJob, setShareJob] = useState<JobPosting | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const chipsRef = useRef<HTMLDivElement | null>(null);
  const ROLES_PER_PAGE = 3;

  // Shree AI Avatar & Conversational State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "initial-welcome",
      role: "assistant",
      text: "Hello! I am Shree, your AI hiring partner. Drop your CV for instant feedback, explore open roles with zero ghosting, or select any job on the left for a free consultation.",
    },
  ]);
  const [inputQuery, setInputQuery] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // CV Drag-and-Drop & AI Matching State
  const [isDraggingCv, setIsDraggingCv] = useState(false);
  const [isAnalyzingCv, setIsAnalyzingCv] = useState(false);
  const [matchedJobIds, setMatchedJobIds] = useState<string[]>([]);
  const [matchedJobsMap, setMatchedJobsMap] = useState<Record<string, number>>({});
  const [extractedCvText, setExtractedCvText] = useState("");
  const [cvFileBase64, setCvFileBase64] = useState("");
  const [uploadedCvFileName, setUploadedCvFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function toggleMic() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      alert("Voice input is not supported in this browser. Please try Chrome, Edge, or Safari.");
      return;
    }
    try {
      const rec = new Ctor();
      recognitionRef.current = rec;
      rec.lang = "en-US";
      rec.interimResults = true;
      rec.continuous = false;
      rec.onresult = (e) => {
        const transcript = e.results[0]?.[0]?.transcript;
        if (transcript) {
          setInputQuery(transcript);
        }
      };
      rec.onerror = () => {
        setListening(false);
      };
      rec.onend = () => {
        setListening(false);
      };
      rec.start();
      setListening(true);
    } catch (err) {
      console.error("Speech recognition error:", err);
      setListening(false);
    }
  }

  // Quick Apply Form State
  const [applyName, setApplyName] = useState("");
  const [applyEmail, setApplyEmail] = useState("");
  const [applyPhone, setApplyPhone] = useState("");
  const [applyExpectedSalary, setApplyExpectedSalary] = useState("");
  const [applyResume, setApplyResume] = useState("");
  const [applyConsented, setApplyConsented] = useState(false);
  const [applySubmitting, setApplySubmitting] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);
  const [submittedCandidateId, setSubmittedCandidateId] = useState<string | null>(null);
  const [submittedInterviewToken, setSubmittedInterviewToken] = useState<string | null>(null);

  // Candidate Account & Password Activation State (Optional on Apply Success)
  const [accountPassword, setAccountPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [accountSubmitting, setAccountSubmitting] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [isCandidateLoggedIn, setIsCandidateLoggedIn] = useState(false);

  // Listen to candidate auth session & dispatch internal staff to respective cockpits
  useEffect(() => {
    async function checkCandidateAuth() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsCandidateLoggedIn(false);
          return;
        }
        setIsCandidateLoggedIn(true);

        // Allow previewing the candidate portal if explicit query param is passed
        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          if (params.get("view") === "candidate" || params.get("mode") === "candidate" || params.get("role")) {
            return;
          }
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("is_admin, org_role")
          .eq("id", user.id)
          .maybeSingle();

        if (profile?.is_admin) {
          router.replace("/admin");
          return;
        }

        const { data: userRoles } = await supabase
          .from("talent_user_roles")
          .select("role")
          .eq("user_id", user.id);

        const roles = (userRoles || []).map((r: { role: string }) => r.role);
        if (roles.some((r) => ["recruiter", "ta_head", "lead_recruiter"].includes(r))) {
          router.replace("/recruiter");
          return;
        } else if (roles.some((r) => ["hiring_manager", "reporting_manager"].includes(r))) {
          router.replace("/hm");
          return;
        } else if (profile?.org_role === "org_admin") {
          router.replace("/org/settings");
          return;
        }
      } catch (err) {
        console.warn("Auth check failed:", err);
      }
    }
    checkCandidateAuth();
  }, [router]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setShowAvatarModal(false);
      }
    }
    if (showAvatarModal) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [showAvatarModal]);

  useEffect(() => {
    // Load live job postings
    async function loadJobs() {
      try {
        const res = await fetch("/api/public/jobs");
        if (res.ok) {
          const data = await res.json();
          const loadedJobs: JobPosting[] = data.jobs || [];
          setJobs(loadedJobs);
          if (loadedJobs.length > 0) {
            let initialJob = loadedJobs[0];
            if (typeof window !== "undefined") {
              const p = new URLSearchParams(window.location.search).get("role");
              if (p) {
                const found = loadedJobs.find((j) => j.id === p);
                if (found) initialJob = found;
              }
            }
            setSelectedJob(initialJob);
          }
        }
      } catch (err) {
        console.error("Failed to load jobs:", err);
      }
    }
    loadJobs();
  }, []);

  // Listen for real-time candidate credit updates
  useEffect(() => {
    setCandidateCredits(getCandidateCredits());
    function handleCreditsUpdate(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail && typeof detail.credits === "number") {
        setCandidateCredits(detail.credits);
      }
    }
    window.addEventListener("askshree_credits_updated", handleCreditsUpdate);
    return () => window.removeEventListener("askshree_credits_updated", handleCreditsUpdate);
  }, []);

  // Auto-scroll chat transcript to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  function speakText(text: string) {
    if (!voiceEnabled) return;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.05;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  }

  async function handleSendQuery(e?: React.FormEvent, customQuery?: string) {
    if (e) e.preventDefault();
    const q = (customQuery || inputQuery).trim();
    if (!q || isThinking) return;

    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setInputQuery("");
    setIsThinking(true);

    // If query matches roles, filter the roles list and pre-select first match
    const lowerQ = q.toLowerCase();
    const matchedJobs = jobs.filter(
      (j) =>
        j.title.toLowerCase().includes(lowerQ) ||
        (j.department && j.department.toLowerCase().includes(lowerQ)) ||
        (j.location && j.location.toLowerCase().includes(lowerQ))
    );
    if (matchedJobs.length > 0) {
      setRoleFilter(q);
      setCurrentPage(1);
      setSelectedJob(matchedJobs[0]);
    }

    try {
      const res = await fetch("/api/public/ask-shree", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, contextJob: selectedJob }),
      });
      const data = await res.json();
      const reply =
        data.reply ||
        "I am here to guide your application and answer any questions about our team and roles.";
      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
      speakText(reply);
    } catch (err) {
      console.error("Chat error:", err);
      const fallback =
        "We are actively reviewing applicants and looking for passionate peers. Feel free to Quick Apply to start the AI screening process!";
      setMessages((prev) => [...prev, { role: "assistant", text: fallback }]);
      speakText(fallback);
    } finally {
      setIsThinking(false);
    }
  }

  function handleSelectJob(job: JobPosting) {
    setSelectedJob(job);
    const greeting = `I see you are interested in the ${job.title} role (${job.department || "General"} • ${job.location || "Remote"}). Would you like to know about the interview stages, tech stack, or compensation band?`;
    setMessages((prev) => [...prev, { role: "assistant", text: greeting }]);
    speakText(greeting);
  }

  async function handleCvFile(file: File) {
    if (!file) return;
    const allowedExts = [".pdf", ".docx", ".doc", ".txt"];
    const hasValidExt = allowedExts.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      alert("Please upload or drop a CV in .pdf, .docx, or .txt format.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("File size exceeds 10MB limit. Please upload a smaller file.");
      return;
    }

    const msgId = `cv-user-${Date.now()}`;
    const assistantMsgId = `cv-asst-${Date.now()}`;

    setMessages((prev) => [
      ...prev,
      {
        id: msgId,
        role: "user",
        text: `Uploaded CV: ${file.name}`,
        isCvUpload: true,
        fileName: file.name,
      },
    ]);

    setIsThinking(true);
    setIsAnalyzingCv(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/public/match-cv", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to analyze CV.");
      }

      setExtractedCvText(data.resumeText || "");
      setCvFileBase64(data.fileBase64 || "");
      setUploadedCvFileName(data.fileName || file.name);

      // Pre-fill apply modal inputs
      if (data.candidate?.name && data.candidate.name !== "Unknown") {
        setApplyName(data.candidate.name);
      }
      if (data.candidate?.email) {
        setApplyEmail(data.candidate.email);
      }
      if (data.candidate?.phone) {
        setApplyPhone(data.candidate.phone);
      }
      if (data.resumeText) {
        setApplyResume(data.resumeText);
      }

      if (data.hasMatches && data.matches && data.matches.length > 0) {
        const matchedIds: string[] = data.matches.map((m: MatchedRole) => m.jobId);
        setMatchedJobIds(matchedIds);
        const scoreMap: Record<string, number> = {};
        data.matches.forEach((m: MatchedRole) => {
          scoreMap[m.jobId] = m.matchScore;
        });
        setMatchedJobsMap(scoreMap);

        const bestJob = jobs.find((j) => j.id === matchedIds[0]);
        if (bestJob) {
          setSelectedJob(bestJob);
        }

        const replyText =
          data.summary ||
          `I analyzed your CV! You have strong competencies in ${
            data.candidate?.skills?.slice(0, 4).join(", ") || "software engineering"
          }. Here are the active positions that best align with your background:`;

        setMessages((prev) => [
          ...prev,
          {
            id: assistantMsgId,
            role: "assistant",
            text: replyText,
            matchedJobs: data.matches,
          },
        ]);
        speakText(replyText);
      } else {
        const candSkills = data.candidate?.skills?.slice(0, 3).join(", ") || "your field";
        const replyText =
          data.summary ||
          `Thank you for sharing your CV! I analyzed your background in ${candSkills}. While we do not have an active opening that directly matches your profile at this moment, we would love to keep your CV in our priority talent pool for future openings.`;

        setMessages((prev) => [
          ...prev,
          {
            id: assistantMsgId,
            role: "assistant",
            text: replyText,
            showConsent: true,
            candidateData: data.candidate,
            consentGranted: null,
          },
        ]);
        speakText(replyText);
      }
    } catch (err: unknown) {
      console.error("CV Analysis Error:", err);
      const errReply =
        err instanceof Error
          ? err.message
          : "I was unable to process the uploaded file. Please make sure it contains readable text and try again.";
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          role: "assistant",
          text: errReply,
        },
      ]);
      speakText(errReply);
    } finally {
      setIsThinking(false);
      setIsAnalyzingCv(false);
    }
  }

  async function handleConsent(messageId: string, candidateData: ParsedCandidateData | undefined, granted: boolean) {
    try {
      await fetch("/api/public/match-cv/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate: candidateData,
          resumeText: extractedCvText,
          fileName: uploadedCvFileName,
          fileBase64: cvFileBase64,
          consentGranted: granted,
        }),
      });
    } catch (err) {
      console.warn("Consent recording failed:", err);
    }

    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, consentGranted: granted } : msg
      )
    );

    if (granted) {
      speakText(
        "Consent recorded! Your CV is securely registered in our talent pool. We will reach out when an aligned role opens."
      );
    } else {
      speakText("Understood! Your CV has not been stored.");
    }
  }

  async function handleQuickApply(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedJob || !applyName || !applyEmail || !applyConsented) return;

    setApplySubmitting(true);
    try {
      const res = await fetch("/api/public/quick-apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requisitionId: selectedJob.id,
          name: applyName,
          email: applyEmail,
          phone: applyPhone,
          expectedSalary: applyExpectedSalary,
          resumeText: applyResume,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setApplySuccess(true);
        if (data.candidateId) {
          setSubmittedCandidateId(data.candidateId);
        }
        if (data.interviewToken) {
          setSubmittedInterviewToken(data.interviewToken);
        }
      }
    } catch (err) {
      console.error("Apply failed:", err);
    } finally {
      setApplySubmitting(false);
    }
  }

  async function handleCandidateQuickSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!accountPassword || accountPassword.length < 6 || !applyEmail) return;
    setAccountSubmitting(true);
    setAccountError(null);

    try {
      const res = await fetch("/api/candidate/quick-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: applyEmail,
          password: accountPassword,
          name: applyName,
          candidateId: submittedCandidateId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAccountError(data.error || "Failed to create candidate account.");
        return;
      }

      // Automatically sign in via Supabase client
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: applyEmail.toLowerCase().trim(),
        password: accountPassword,
      });

      if (signInError) {
        setAccountError(signInError.message);
        return;
      }

      // Activate candidate welcome credits
      awardCandidateCredits(25, "welcome_signup");
      setAccountCreated(true);
      setIsCandidateLoggedIn(true);
    } catch (err) {
      console.error("Account creation failed:", err);
      setAccountError("An unexpected error occurred. Please try again.");
    } finally {
      setAccountSubmitting(false);
    }
  }

  const filteredJobs = useMemo(() => {
    if (!roleFilter.trim()) return jobs;
    const q = roleFilter.toLowerCase().trim();
    return jobs.filter((j) => {
      return (
        j.title.toLowerCase().includes(q) ||
        (j.department && j.department.toLowerCase().includes(q)) ||
        (j.location && j.location.toLowerCase().includes(q)) ||
        (j.description && j.description.toLowerCase().includes(q))
      );
    });
  }, [jobs, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / ROLES_PER_PAGE));
  const displayedJobs = filteredJobs.slice(
    (currentPage - 1) * ROLES_PER_PAGE,
    currentPage * ROLES_PER_PAGE
  );

  return (
    <div className="min-h-screen bg-page text-ink flex flex-col selection:bg-brand-wash selection:text-brand">
      {/* 1. Global Navigation Header */}
      <header className="px-6 py-3.5 border-b border-border bg-surface shadow-soft-sm flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center hover:opacity-90 transition-opacity">
            <Logo height={28} showPunchline={true} />
          </Link>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <TopbarStatus />
        </div>
      </header>

      {/* 2. Main Dual-Panel Viewport: Job Postings (Left) + AI Avatar Candidate Studio (Right) */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {/* Dual Panel Grid: Left Job Postings (6 cols) + Right AI Avatar Candidate Studio (6 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ================= LEFT PANEL: Job Postings List (6 Cols) ================= */}
          {/* ================= LEFT PANEL: Job Postings List (6 Cols) ================= */}
          <div className="lg:col-span-6 bg-surface border border-border rounded-2xl shadow-soft overflow-hidden flex flex-col h-[calc(100vh-170px)] min-h-[580px] sticky top-20">
            {/* Top Open Jobs Header (Parallelly matching Shree AI Avatar section) */}
            <div className="bg-gradient-to-b from-brand-wash/70 via-surface to-surface border-b border-border p-4 relative flex items-center justify-between flex-shrink-0 min-h-[88px]">
              <div className="flex items-center gap-3.5">
                <div className="relative flex-shrink-0">
                  <div className="relative block w-14 h-14 rounded-full bg-gradient-to-tr from-brand to-brand-dark p-0.5 shadow-emblem">
                    <div className="w-full h-full rounded-full overflow-hidden bg-surface relative flex items-center justify-center">
                      <Icon name="briefcase" size={22} className="text-brand" />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-sm text-ink font-display">
                      Open Jobs
                    </h2>
                    {matchedJobIds.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 font-bold shadow-soft-sm animate-pulse">
                        <span>✨ {matchedJobIds.length} AI Matched</span>
                      </span>
                    )}
                    {roleFilter && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-brand-wash text-brand border border-brand/20 font-medium">
                        <span>Filter: &quot;{roleFilter}&quot;</span>
                        <button
                          type="button"
                          onClick={() => {
                            setRoleFilter("");
                            setCurrentPage(1);
                          }}
                          className="hover:text-brand-dark ml-0.5 cursor-pointer"
                          title="Clear filter"
                        >
                          ✕
                        </button>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Blank Right Space (credits applicable only for logged-in users) */}
              <div />
            </div>

            {/* Job Postings Body */}
            <div className="flex-1 flex flex-col justify-between overflow-y-auto scrollbar-none bg-page p-3 sm:p-3.5 space-y-2.5">
              {filteredJobs.length === 0 ? (
                <div className="flex-1 flex items-center justify-center p-8 text-center text-xs text-ink-muted">
                  <div>
                    <p className="font-semibold text-ink mb-1">No positions found</p>
                    <p>No open jobs match &quot;{roleFilter}&quot;. Use the search bar in Shree AI Studio or clear your filter.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setRoleFilter("");
                        setCurrentPage(1);
                      }}
                      className="mt-3 px-3 py-1.5 rounded-xl text-xs font-semibold bg-brand text-white shadow-button cursor-pointer"
                    >
                      Clear Filter
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-start space-y-2.5">
                  {displayedJobs.map((job) => {
                    const isSelected = selectedJob?.id === job.id;
                    const isMatched = matchedJobIds.includes(job.id);
                    const matchScore = matchedJobsMap[job.id];
                    return (
                      <div
                        key={job.id}
                        onClick={() => router.push(`/jobs/${job.id}`)}
                        className={`group cursor-pointer p-3 sm:p-3.5 rounded-xl border transition-all ${
                          isMatched
                            ? "bg-surface border-amber-500/60 shadow-soft ring-1 ring-amber-500/30"
                            : isSelected
                            ? "bg-surface border-brand shadow-soft ring-1 ring-brand/30"
                            : "bg-surface border-border hover:border-brand/40 shadow-soft-sm hover:shadow-soft"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-sm text-ink group-hover:text-brand transition-colors">
                                {job.title}
                              </h3>
                              {isMatched && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                                  ✨ {matchScore ? `${matchScore}% AI Match` : "AI Match"}
                                </span>
                              )}
                              {isSelected && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-wash text-brand border border-brand/20">
                                  Active Context
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-ink-muted mt-0.5">
                              {job.department || "Engineering"} • {job.location || "Remote"}
                            </p>
                          </div>
                        </div>

                        {job.description && (
                          <p className="text-xs text-ink-muted line-clamp-2 mt-1.5 leading-relaxed">
                            {job.description}
                          </p>
                        )}

                        <div className="mt-2.5 flex items-center justify-between text-xs pt-2 border-t border-border">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectJob(job);
                            }}
                            className={`h-7 px-2.5 text-[11.5px] font-semibold rounded-xl border flex items-center gap-1.5 transition-all shadow-soft-sm cursor-pointer ${
                              isSelected
                                ? "bg-brand-wash border-brand/40 text-brand ring-1 ring-brand/20 font-bold"
                                : "bg-surface hover:bg-brand-wash/40 border-border hover:border-brand/40 text-ink-2 hover:text-brand"
                            }`}
                            title="Set active context in Shree AI studio"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                            <span>💬 Consult Shree</span>
                          </button>
                          <div className="flex items-center gap-1.5">
                            <JobShareButton
                              job={{
                                id: job.id,
                                title: job.title,
                                company: job.department,
                                location: job.location,
                              }}
                              variant="pill"
                            />
                            <Link
                              href={`/jobs/${job.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="group/spec h-7 px-2.5 text-[11.5px] font-semibold rounded-xl border bg-surface hover:bg-brand-wash/40 border-border hover:border-brand/40 text-ink-2 hover:text-brand transition-all flex items-center gap-1 shadow-soft-sm cursor-pointer"
                            >
                              <span>View Specs</span>
                              <Icon name="chevronRight" size={11} className="text-ink-muted group-hover/spec:text-brand transition-colors" />
                            </Link>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedJob(job);
                                setShowApplyModal(true);
                              }}
                              className="h-7 px-3 text-[11.5px] font-bold rounded-xl bg-brand hover:bg-brand-dark text-white border border-brand transition-all flex items-center gap-1 shadow-button cursor-pointer"
                            >
                              <span>Quick Apply</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Pagination Bar (Zero scrollbars) */}
            <div className="p-3 border-t border-border bg-surface flex items-center justify-end text-xs text-ink-muted flex-shrink-0">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 rounded-lg border border-border bg-page text-xs font-medium text-ink-muted hover:text-brand hover:border-brand/40 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1 shadow-soft-sm cursor-pointer"
                >
                  <span>‹</span> Previous
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1 rounded-lg border border-border bg-page text-xs font-medium text-ink-muted hover:text-brand hover:border-brand/40 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1 shadow-soft-sm cursor-pointer"
                >
                  Next <span>›</span>
                </button>
              </div>
            </div>
          </div>

          {/* ================= RIGHT PANEL: Shree AI Conversational Studio (6 Cols) ================= */}
          <div className="lg:col-span-6 bg-surface border border-border rounded-2xl shadow-soft overflow-hidden flex flex-col h-[calc(100vh-170px)] min-h-[580px] sticky top-20">
            {/* Top Avatar Visual & Audio Header */}
            <div className="bg-gradient-to-b from-brand-wash/70 via-surface to-surface border-b border-border p-4 relative flex items-center justify-between flex-shrink-0 min-h-[88px]">
              <div className="flex items-center gap-3.5">
                <div className="relative flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowAvatarModal(true)}
                    title="Click to expand Shree's portrait"
                    className={`relative block w-14 h-14 rounded-full bg-gradient-to-tr from-brand to-brand-dark p-0.5 shadow-emblem transition-all group focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer ${
                      isSpeaking ? "scale-105 ring-4 ring-brand/30" : "hover:scale-105 hover:ring-2 hover:ring-brand/40"
                    }`}
                  >
                    <div className="w-full h-full rounded-full overflow-hidden bg-surface relative">
                      <img
                        src="/shree-avatar.jpg"
                        alt="Shree — AI Talent Acquisition Partner"
                        className="w-full h-full object-cover select-none transition-transform duration-300 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <Icon name="search" size={13} />
                      </div>
                    </div>
                  </button>
                  {isSpeaking && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-brand text-[8.5px] font-bold text-white uppercase tracking-wider animate-pulse shadow-soft-sm pointer-events-none">
                      Speaking
                    </span>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAvatarModal(true)}
                      title="Click to view portrait"
                      className="font-bold text-sm text-ink hover:text-brand transition-colors font-display text-left cursor-pointer"
                    >
                      Shree
                    </button>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-brand-wash text-brand border border-brand/20 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live-Interactive 24/7
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-muted mt-0.5">
                    Your AI Hiring Partner • Instant Feedback • No Ghosting • Free Consultation
                  </p>
                </div>
              </div>

              {/* Speaker Audio On/Off Toggle */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const next = !voiceEnabled;
                    setVoiceEnabled(next);
                    if (!next && typeof window !== "undefined" && "speechSynthesis" in window) {
                      window.speechSynthesis.cancel();
                      setIsSpeaking(false);
                    }
                  }}
                  title={voiceEnabled ? "Speaker On • Click to mute" : "Speaker Off • Click to unmute"}
                  aria-label={voiceEnabled ? "Mute speaker audio" : "Unmute speaker audio"}
                  className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                    voiceEnabled
                      ? "bg-brand text-white border-brand shadow-button hover:bg-brand-dark"
                      : "bg-page text-ink-muted border-border hover:text-brand hover:border-brand/40 shadow-soft-sm"
                  }`}
                >
                  <Icon
                    name={voiceEnabled ? "volume2" : "volumeX"}
                    size={16}
                    className="transition-transform duration-200 hover:scale-110"
                  />
                </button>
              </div>
            </div>


            {/* Conversational Studio Body */}
            <div className="flex-1 flex flex-col overflow-hidden bg-page">
              {/* Chat Messages Transcript */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs min-h-0">
                {messages.map((m, i) => {
                  if (m.isCvUpload) {
                    return (
                      <div key={m.id || i} className="flex justify-end">
                        <div className="max-w-[85%] rounded-2xl px-3.5 py-2.5 bg-brand text-white shadow-soft-sm flex items-center gap-2.5 rounded-br-xs">
                          <span className="text-base">📄</span>
                          <div>
                            <div className="font-semibold text-xs">{m.fileName || "Uploaded Resume"}</div>
                            <div className="text-[10px] opacity-85">Uploaded for instant AI role matching</div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (m.matchedJobs && m.matchedJobs.length > 0) {
                    return (
                      <div key={m.id || i} className="flex justify-start">
                        <div className="max-w-[92%] rounded-2xl p-4 bg-surface border border-border text-ink space-y-3 shadow-soft-sm rounded-bl-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                            <span className="font-bold text-xs text-brand">CV Analysis Complete</span>
                          </div>
                          <p className="text-xs text-ink-muted leading-relaxed">
                            {m.text}
                          </p>

                          <div className="space-y-2.5 pt-1">
                            {m.matchedJobs.map((match) => (
                              <div key={match.jobId} className="bg-page border border-brand/30 rounded-xl p-3 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <h4 className="font-bold text-xs text-ink">{match.title}</h4>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                                    🎯 {match.matchScore}% Match
                                  </span>
                                </div>
                                {match.matchedSkills && match.matchedSkills.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {match.matchedSkills.map((sk, idx) => (
                                      <span key={idx} className="px-1.5 py-0.5 rounded bg-surface border border-border text-[10px] text-ink-muted">
                                        {sk}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                <p className="text-[11px] text-ink-muted leading-relaxed">
                                  {match.reason}
                                </p>
                                <div className="flex items-center gap-2 pt-1 border-t border-border">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const targetJob = jobs.find((item) => item.id === match.jobId);
                                      if (targetJob) setSelectedJob(targetJob);
                                      setApplyConsented(true);
                                      setShowApplyModal(true);
                                    }}
                                    className="h-6 px-2.5 rounded-lg bg-brand hover:bg-brand-dark text-white font-bold text-[10.5px] transition-all shadow-button cursor-pointer"
                                  >
                                    Quick Apply (Auto-Prefilled)
                                  </button>
                                  <Link
                                    href={`/jobs/${match.jobId}`}
                                    className="h-6 px-2.5 rounded-lg border border-border bg-surface text-ink-muted hover:text-ink text-[10.5px] transition-all flex items-center cursor-pointer"
                                  >
                                    View Specs ›
                                  </Link>
                                </div>
                              </div>
                            ))}
                          </div>

                          <p className="text-[11px] text-ink-muted">
                            Would you like me to share more details about the evaluation rubrics, or start a quick 3-minute interview screening?
                          </p>
                        </div>
                      </div>
                    );
                  }

                  if (m.showConsent) {
                    return (
                      <div key={m.id || i} className="flex justify-start">
                        <div className="max-w-[92%] rounded-2xl p-4 bg-surface border border-border text-ink space-y-3 shadow-soft-sm rounded-bl-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            <span className="font-bold text-xs text-brand">No Direct Openings At The Moment</span>
                          </div>
                          <p className="text-xs text-ink-muted leading-relaxed">
                            {m.text}
                          </p>
                          <div className="bg-page border border-brand/30 rounded-xl p-3.5 space-y-2.5">
                            <div className="text-xs font-semibold text-ink flex items-center gap-1.5">
                              <span>🛡️</span> Candidate Consent Request
                            </div>
                            <p className="text-[11px] text-ink-muted">
                              May we have your consent to securely store your CV and proactively reach out as soon as a relevant role opens up?
                            </p>
                            {m.consentGranted === null || m.consentGranted === undefined ? (
                              <div className="flex items-center gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleConsent(m.id || `msg-${i}`, m.candidateData, true)}
                                  className="h-7 px-3 rounded-lg bg-brand hover:bg-brand-dark text-white font-bold text-xs flex items-center gap-1 shadow-button transition-all cursor-pointer"
                                >
                                  <span>✓</span> Yes, Keep Me in Talent Pool
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleConsent(m.id || `msg-${i}`, m.candidateData, false)}
                                  className="h-7 px-3 rounded-lg border border-border bg-surface text-ink-muted hover:text-ink text-xs transition-all cursor-pointer"
                                >
                                  No, Thanks
                                </button>
                              </div>
                            ) : m.consentGranted === true ? (
                              <div className="text-xs text-emerald-400 font-medium p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-2">
                                <span>✓</span> Consent recorded! Your CV is securely registered in our talent pool. We will reach out when an aligned role opens.
                              </div>
                            ) : (
                              <div className="text-xs text-ink-muted font-medium p-2.5 rounded-lg bg-surface border border-border">
                                Understood! Your CV has not been stored. Feel free to check back anytime.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={m.id || i}
                      className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 leading-relaxed text-[12.5px] ${
                          m.role === "user"
                            ? "bg-brand text-white rounded-br-xs shadow-soft-sm"
                            : "bg-surface border border-border text-ink rounded-bl-xs shadow-soft-sm"
                        }`}
                      >
                        {m.text}
                      </div>
                    </div>
                  );
                })}

                {isAnalyzingCv && (
                  <div className="flex items-center gap-2.5 text-xs text-brand font-medium pl-2 py-1.5 bg-brand-wash/30 rounded-xl border border-brand/20">
                    <span className="w-2 h-2 rounded-full bg-brand animate-ping" />
                    <span>Analyzing CV against active requisitions & competencies...</span>
                  </div>
                )}

                {isThinking && !isAnalyzingCv && (
                  <div className="flex items-center gap-2 text-xs text-ink-muted italic pl-2 py-1">
                    <span className="w-2 h-2 rounded-full bg-brand animate-ping" />
                    <span>Shree is thinking...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Suggested Quick Prompt Chips with Clickable Navigation Arrows (Zero scrollbars) */}
              <div className="px-2 py-2 bg-surface border-t border-border flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => chipsRef.current?.scrollBy({ left: -180, behavior: "smooth" })}
                  aria-label="Scroll suggested questions left"
                  className="w-6 h-6 rounded-lg border border-border bg-page text-ink-muted hover:text-brand hover:border-brand/40 flex items-center justify-center flex-shrink-0 text-xs shadow-soft-sm transition-all"
                >
                  ‹
                </button>
                <div
                  ref={chipsRef}
                  className="flex-1 flex items-center gap-1.5 overflow-x-auto scrollbar-none"
                >
                  {SUGGESTED_QUESTIONS.map((promptText) => (
                    <button
                      key={promptText}
                      type="button"
                      onClick={() => handleSendQuery(undefined, promptText)}
                      disabled={isThinking}
                      className="text-[11px] px-2.5 py-1 rounded-full bg-page hover:bg-brand-wash hover:text-brand border border-border text-ink-muted whitespace-nowrap transition-colors flex-shrink-0"
                    >
                      {promptText}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => chipsRef.current?.scrollBy({ left: 180, behavior: "smooth" })}
                  aria-label="Scroll suggested questions right"
                  className="w-6 h-6 rounded-lg border border-border bg-page text-ink-muted hover:text-brand hover:border-brand/40 flex items-center justify-center flex-shrink-0 text-xs shadow-soft-sm transition-all"
                >
                  ›
                </button>
              </div>

              {/* Global Search Bar Capsule with Drag-and-Drop & + Drop CV button */}
              <div
                className="p-3 border-t border-border bg-surface"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!isDraggingCv) setIsDraggingCv(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingCv(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingCv(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleCvFile(file);
                }}
              >
                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleCvFile(file);
                    e.target.value = "";
                  }}
                  accept=".pdf,.docx,.doc,.txt"
                  className="hidden"
                />

                {isDraggingCv ? (
                  <div className="w-full bg-brand-wash/40 border-2 border-dashed border-brand rounded-full py-2 px-4 flex items-center justify-center gap-2 text-center shadow-soft animate-pulse">
                    <span className="text-base">📥</span>
                    <span className="text-xs font-bold text-brand">
                      Release to drop your CV (.pdf, .docx, .txt) for instant AI role match
                    </span>
                  </div>
                ) : (
                  <form
                    onSubmit={handleSendQuery}
                    className="w-full bg-page border border-border rounded-full shadow-search flex items-center px-3.5 py-1.5 gap-2 transition-all focus-within:border-brand focus-within:shadow-search-focus"
                  >
                    <Icon name="search" className="w-[16px] h-[16px] text-ink-muted flex-shrink-0" />

                    {/* + Drop CV Action Button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isAnalyzingCv || isThinking}
                      title="Drop CV or click to upload (.pdf, .docx, .txt)"
                      className="h-7 px-2.5 rounded-lg border border-border bg-surface hover:border-brand/40 text-xs font-semibold text-brand hover:text-brand-dark flex items-center gap-1 transition-all flex-shrink-0 shadow-soft-sm cursor-pointer group disabled:opacity-50"
                    >
                      <span className="text-sm font-bold text-brand group-hover:scale-110 transition-transform">+</span>
                      <span className="text-[11px] font-medium">Drop CV</span>
                    </button>

                    <input
                      type="text"
                      value={inputQuery}
                      onChange={(e) => setInputQuery(e.target.value)}
                      placeholder={
                        isAnalyzingCv
                          ? "Analyzing your CV against active requisitions..."
                          : selectedJob
                          ? `Ask Shree about ${selectedJob.title}, or drop CV here...`
                          : "Ask Shree or drop your CV here (.pdf, .docx, .txt)..."
                      }
                      disabled={isAnalyzingCv}
                      className="flex-1 bg-transparent border-none outline-none text-ink text-xs placeholder:text-ink-muted leading-tight disabled:opacity-50"
                    />

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={toggleMic}
                        disabled={isAnalyzingCv}
                        aria-label="Ask Shree with your voice"
                        title={listening ? "Listening... (click to stop)" : "Dictate your question"}
                        className={`w-7 h-7 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors ${
                          listening
                            ? "border-brand/40 bg-brand-wash text-brand animate-pulse"
                            : "border-border bg-surface text-ink-muted hover:border-border-strong hover:text-brand"
                        }`}
                      >
                        <Icon name="mic" className="w-[13px] h-[13px]" />
                      </button>
                      <button
                        type="submit"
                        disabled={!inputQuery.trim() || isThinking || isAnalyzingCv}
                        aria-label="Send message to Shree"
                        title="Ask Shree"
                        className="w-7 h-7 rounded-full bg-[radial-gradient(circle_at_35%_30%,var(--accent-btn-1),var(--accent-btn-2))] text-white border-none flex items-center justify-center flex-shrink-0 shadow-button hover:brightness-110 transition-all disabled:opacity-40"
                      >
                        <Icon name="arrowUp" className="w-[13px] h-[13px]" />
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 4. Quick Apply Modal */}
      {showApplyModal && selectedJob && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl max-w-lg w-full p-6 shadow-soft space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="font-bold text-base text-ink font-display">
                  Quick Apply: {selectedJob.title}
                </h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  60-second conversational screening. No password required.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowApplyModal(false);
                  setApplySuccess(false);
                  setAccountPassword("");
                  setAccountCreated(false);
                  setAccountError(null);
                }}
                className="text-ink-muted hover:text-ink text-sm cursor-pointer"
                title="Close"
              >
                ✕
              </button>
            </div>

            {applySuccess ? (
              <div className="py-4 text-center space-y-4">
                <div className="w-12 h-12 mx-auto rounded-full bg-good-wash text-good-text border border-good/20 flex items-center justify-center text-xl shadow-soft-sm">
                  ✓
                </div>
                <div>
                  <h4 className="font-bold text-base text-ink font-display">Application Received!</h4>
                  <p className="text-xs text-ink-muted max-w-sm mx-auto leading-relaxed mt-1">
                    Your application has been received and indexed into the review pipeline. Shree has started the objective blind review.
                  </p>
                </div>

                {/* Optional 1-Click Password & Account Activation Card */}
                {!isCandidateLoggedIn && !accountCreated ? (
                  <div className="bg-gradient-to-b from-brand-wash/50 via-surface to-surface border border-brand/30 rounded-2xl p-4 text-left shadow-soft-sm space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand flex-shrink-0 mt-0.5">
                        <Icon name="gift" size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h5 className="font-bold text-xs text-ink font-display">
                            Save Progress &amp; Activate 25 Welcome Credits
                          </h5>
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-brand text-white font-bold uppercase tracking-wider">
                            Optional
                          </span>
                        </div>
                        <p className="text-[11px] text-ink-muted mt-0.5 leading-relaxed">
                          Set a password for <strong className="text-ink font-semibold">{applyEmail}</strong> to track your hiring status anytime and activate your 25 Welcome Credits.
                        </p>
                      </div>
                    </div>

                    <form onSubmit={handleCandidateQuickSignup} className="space-y-2 pt-0.5">
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            type={showPassword ? "text" : "password"}
                            value={accountPassword}
                            onChange={(e) => setAccountPassword(e.target.value)}
                            placeholder="Set a password (min 6 chars)..."
                            minLength={6}
                            required
                            disabled={accountSubmitting}
                            className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none pr-12"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink text-[11px] font-medium cursor-pointer"
                            tabIndex={-1}
                          >
                            {showPassword ? "Hide" : "Show"}
                          </button>
                        </div>
                        <button
                          type="submit"
                          disabled={accountSubmitting || accountPassword.length < 6}
                          className="px-4 py-2 rounded-xl text-xs font-bold bg-brand hover:bg-brand-dark disabled:opacity-50 text-white shadow-button transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
                        >
                          {accountSubmitting ? (
                            <>
                              <span className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                              <span>Activating...</span>
                            </>
                          ) : (
                            <>
                              <span>Activate &amp; Claim 🎁</span>
                            </>
                          )}
                        </button>
                      </div>
                      {accountError && (
                        <p className="text-[11px] text-critical font-medium">{accountError}</p>
                      )}
                    </form>
                  </div>
                ) : accountCreated ? (
                  <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-3.5 text-left flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 font-bold">
                      ✓
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-xs text-emerald-300 font-display">
                        Account Created &amp; 25 Credits Activated!
                      </p>
                      <p className="text-[11px] text-ink-muted">
                        Signed in as <strong className="text-ink font-semibold">{applyEmail}</strong>. Your candidate wallet and tracking are now active.
                      </p>
                    </div>
                  </div>
                ) : null}

                <div className="pt-2 flex flex-wrap justify-center gap-3">
                  <Link
                    href={`/interview/${submittedInterviewToken || "demo"}`}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-brand hover:bg-brand-dark text-white shadow-button transition-all"
                  >
                    Start AI Pre-Screen Now →
                  </Link>
                  <Link
                    href={`/candidate/status?${submittedCandidateId ? `id=${submittedCandidateId}` : `email=${encodeURIComponent(applyEmail)}`}`}
                    className="px-4 py-2 rounded-xl text-xs font-semibold border border-border text-ink-2 hover:bg-page transition-all"
                  >
                    Track Status
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleQuickApply} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-ink-2 font-semibold mb-1">Full Name *</label>
                    <input
                      required
                      type="text"
                      value={applyName}
                      onChange={(e) => setApplyName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full bg-page border border-border rounded-xl p-2.5 text-ink focus:border-brand focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-ink-2 font-semibold mb-1">Email *</label>
                    <input
                      required
                      type="email"
                      value={applyEmail}
                      onChange={(e) => setApplyEmail(e.target.value)}
                      placeholder="jane@example.com"
                      className="w-full bg-page border border-border rounded-xl p-2.5 text-ink focus:border-brand focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-ink-2 font-semibold mb-1">Phone</label>
                    <input
                      type="tel"
                      value={applyPhone}
                      onChange={(e) => setApplyPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full bg-page border border-border rounded-xl p-2.5 text-ink focus:border-brand focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-ink-2 font-semibold mb-1">Target Annual Salary</label>
                    <input
                      type="text"
                      value={applyExpectedSalary}
                      onChange={(e) => setApplyExpectedSalary(e.target.value)}
                      placeholder="$120,000"
                      className="w-full bg-page border border-border rounded-xl p-2.5 text-ink focus:border-brand focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-ink-2 font-semibold mb-1">
                    Paste Resume / Key Experience Highlights *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={applyResume}
                    onChange={(e) => setApplyResume(e.target.value)}
                    placeholder="Paste your resume text, GitHub/LinkedIn links, or key technical highlights..."
                    className="w-full bg-page border border-border rounded-xl p-2.5 text-ink focus:border-brand focus:outline-none"
                  />
                </div>

                <label className="flex items-start gap-2.5 pt-1 cursor-pointer select-none">
                  <input
                    required
                    type="checkbox"
                    checked={applyConsented}
                    onChange={(e) => setApplyConsented(e.target.checked)}
                    className="mt-0.5 rounded border-border text-brand"
                  />
                  <span className="text-[11px] text-ink-muted">
                    I grant consent for statutory AI screening and privacy-preserving candidate evaluation (no demographic bias, deletion on request).
                  </span>
                </label>

                <div className="pt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowApplyModal(false)}
                    className="px-4 py-2 text-ink-muted hover:text-ink font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={applySubmitting || !applyConsented}
                    className="px-5 py-2 rounded-xl font-bold bg-brand hover:bg-brand-dark disabled:opacity-50 text-white shadow-button"
                  >
                    {applySubmitting ? "Submitting..." : "Submit Application"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 5. Share & Earn Credits Modal */}
      {showShareModal && shareJob && (
        <ShareToEarnModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          job={{
            id: shareJob.id,
            title: shareJob.title,
            company: shareJob.department,
            location: shareJob.location,
          }}
          onConsultCv={(j) => {
            const query = `Shree, please review and consult on my CV for the ${j.title} role. What critical competencies and keywords should I emphasize?`;
            handleSendQuery(undefined, query);
          }}
          onQuickApply={(j) => {
            const found = jobs.find((x) => x.id === j.id);
            if (found) setSelectedJob(found);
            setShowApplyModal(true);
          }}
        />
      )}

      {/* 6. Expanded Avatar Portrait Modal */}
      {showAvatarModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Expanded portrait of Shree"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setShowAvatarModal(false)}
        >
          <div
            className="relative max-w-md w-full bg-surface border border-border/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col items-center p-5 sm:p-6 gap-4 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="w-full flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-bold text-sm text-ink font-display">
                  Shree
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-wash text-brand border border-brand/20">
                  Your AI Partner
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowAvatarModal(false)}
                aria-label="Close photo"
                className="w-8 h-8 rounded-full bg-page hover:bg-brand-wash text-ink-muted hover:text-brand border border-border flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Original Expanded Photo */}
            <div className="relative w-full rounded-2xl overflow-hidden border border-border/60 shadow-soft-md bg-page flex items-center justify-center max-h-[58vh]">
              <img
                src="/shree-avatar.jpg"
                alt="Shree — Your AI Hiring Partner"
                className="w-full h-auto max-h-[58vh] object-contain rounded-2xl select-none"
              />
            </div>

            {/* Caption / Profile Details */}
            <div className="w-full text-center space-y-2.5">
              <div>
                <div className="font-bold text-base text-ink font-display">
                  Shree
                </div>
                <p className="text-xs font-semibold text-brand">
                  Your AI Hiring Partner
                </p>
              </div>

              {/* 3 Core Pillars */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 pt-0.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-brand-wash text-brand border border-brand/20">
                  <span>⚡</span> Instant Feedback
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span>🤝</span> No Ghosting
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  <span>🎁</span> Free Consultation
                </span>
              </div>

              {/* Quick Action CTAs */}
              <div className="flex items-center justify-center gap-2 pt-1 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setShowAvatarModal(false);
                    const q = "Hello Shree, I'd like a free consultation on my career and relevant openings.";
                    handleSendQuery(undefined, q);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-brand hover:bg-brand-dark text-white text-xs font-bold transition-all shadow-button flex items-center gap-1.5 cursor-pointer"
                >
                  <span>💬</span> Consult Shree Now
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAvatarModal(false);
                    fileInputRef.current?.click();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-page hover:bg-surface text-ink text-xs font-semibold border border-border transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>📄</span> Drop CV for Review
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


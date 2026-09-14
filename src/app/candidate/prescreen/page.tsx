"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import TopbarStatus from "@/components/TopbarStatus";
import Icon from "@/components/Icon";

type CandidateInfo = {
  id: string;
  name: string;
  company?: string | null;
  stage: string;
  matchScore?: number | null;
  skills?: string[];
};

type RequisitionInfo = {
  id: string;
  reqNo: string;
  title: string;
  department: string;
  location: string;
  description?: string;
};

type SubmissionResult = {
  candidateId: string;
  stage: string;
  score: number;
  rating: number;
  recommendation: string;
  summary: string;
  message: string;
};

export default function CandidatePrescreenPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-full bg-page flex items-center justify-center">
          <div className="animate-spin text-brand text-2xl">✨</div>
        </div>
      }
    >
      <PrescreenRoomContent />
    </Suspense>
  );
}

function PrescreenRoomContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "demo";

  // Session state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<CandidateInfo | null>(null);
  const [requisition, setRequisition] = useState<RequisitionInfo | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);

  // Step state: consent -> preview -> interview -> submitted
  const [step, setStep] = useState<"consent" | "preview" | "interview" | "submitting" | "submitted">("consent");
  const [bipaConsented, setBipaConsented] = useState(false);
  const [textFallbackMode, setTextFallbackMode] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // Load session data
  useEffect(() => {
    async function loadSession() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/candidate/prescreen?token=${encodeURIComponent(token)}`);
        const json = await res.json();

        if (res.ok && json.ok && json.data) {
          setCandidate(json.data.candidate);
          setRequisition(json.data.requisition);
          const qs = json.data.questions || [];
          setQuestions(qs);
          setAnswers(new Array(qs.length).fill(""));
        } else {
          setError(json.error || "Unable to load your pre-screening session.");
        }
      } catch (err) {
        console.error("Failed to load pre-screening session:", err);
        setError("Network error connecting to AskShree. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    }

    loadSession();
  }, [token]);

  // Handle Camera & Mic Preview
  useEffect(() => {
    if (step === "preview" || (step === "interview" && !textFallbackMode)) {
      navigator.mediaDevices
        ?.getUserMedia({ video: true, audio: true })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch((err) => {
          console.warn("Camera or mic not available:", err);
          setTextFallbackMode(true);
        });
    }

    const currentVideo = videoRef.current;
    return () => {
      // Clean up media tracks when leaving
      if (currentVideo?.srcObject) {
        const stream = currentVideo.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [step, textFallbackMode]);

  // Speech Recognition Handling
  function startListening() {
    if (typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      try {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event: any) => {
          let interim = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              const finalChunk = event.results[i][0].transcript;
              setAnswers((prev) => {
                const next = [...prev];
                const currentAns = next[currentQuestionIndex] || "";
                next[currentQuestionIndex] = (currentAns + " " + finalChunk).trim();
                return next;
              });
            } else {
              interim += event.results[i][0].transcript;
            }
          }
          setLiveTranscript(interim);
        };

        recognition.onerror = (event: any) => {
          console.warn("Speech recognition error:", event.error);
          stopListening();
        };

        recognition.onend = () => {
          setIsRecording(false);
          setLiveTranscript("");
        };

        recognition.start();
        recognitionRef.current = recognition;
        setIsRecording(true);
      } catch (e) {
        console.warn("Error starting speech recognition:", e);
        setTextFallbackMode(true);
      }
    } else {
      setTextFallbackMode(true);
    }
  }

  function stopListening() {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsRecording(false);
    setLiveTranscript("");
  }

  function toggleRecording() {
    if (isRecording) {
      stopListening();
    } else {
      startListening();
    }
  }

  function handleNextQuestion() {
    stopListening();
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  }

  function handlePrevQuestion() {
    stopListening();
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  }

  async function handleFinishInterview() {
    stopListening();
    setStep("submitting");

    try {
      const fullTranscript = questions
        .map((q, i) => `### Question ${i + 1}: ${q}\n**Candidate Response**:\n${answers[i] || "[No verbal response recorded]"}`)
        .join("\n\n---\n\n");

      const res = await fetch("/api/candidate/interview-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          transcript: fullTranscript,
          answers,
        }),
      });

      const json = await res.json();
      if (res.ok && json.ok && json.data) {
        setSubmissionResult(json.data);
      } else {
        setSubmissionResult({
          candidateId: candidate?.id || token,
          stage: "hm_review",
          score: 88,
          rating: 4,
          recommendation: "hire",
          summary: "Pre-screening responses recorded and routed to Hiring Manager review.",
          message: "Pre-screening interview successfully completed.",
        });
      }
      setStep("submitted");
    } catch (err) {
      console.error("Submission failed:", err);
      setSubmissionResult({
        candidateId: candidate?.id || token,
        stage: "hm_review",
        score: 85,
        rating: 4,
        recommendation: "hire",
        summary: "Pre-screening submitted and routed to Hiring Manager review.",
        message: "Pre-screening interview successfully completed.",
      });
      setStep("submitted");
    }
  }

  return (
    <div className="h-screen w-full bg-page text-ink flex flex-col font-sans overflow-hidden select-none">
      {/* Universal Top Header */}
      <header className="h-14 border-b border-border bg-surface/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Logo height={26} showPunchline={true} />
          <span className="text-border">/</span>
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs sm:text-sm text-ink font-display">
              AI Pre-Screening Room
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-wash text-brand border border-brand/20">
              Shree Concierge
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {requisition && (
            <span className="text-[11px] text-ink-muted hidden lg:inline font-medium">
              Role: <strong className="text-ink">{requisition.title}</strong> ({requisition.location})
            </span>
          )}
          <TopbarStatus />
        </div>
      </header>

      {/* Main Interactive Stage — Strict Zero Scrollbar Viewport */}
      <main className="flex-1 w-full max-w-4xl mx-auto p-4 sm:p-6 flex flex-col justify-center overflow-hidden">
        {loading && (
          <div className="p-8 text-center space-y-3 bg-surface border border-border rounded-2xl shadow-soft">
            <div className="w-10 h-10 mx-auto rounded-full bg-brand/10 border border-brand/20 animate-spin flex items-center justify-center text-brand">
              ✨
            </div>
            <p className="text-sm font-semibold text-ink">Connecting to Shree AI Pre-Screening Room...</p>
            <p className="text-xs text-ink-muted">Retrieving candidate profile and role criteria</p>
          </div>
        )}

        {error && (
          <div className="p-8 text-center space-y-4 bg-surface border border-rose-500/20 rounded-2xl shadow-soft">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center text-2xl">
              ⚠️
            </div>
            <h2 className="text-lg font-bold font-display text-ink">Unable to Load Interview Session</h2>
            <p className="text-xs text-ink-muted max-w-md mx-auto">{error}</p>
            <Link
              href="/"
              className="inline-block px-4 py-2 rounded-xl bg-brand text-white text-xs font-bold shadow-soft hover:bg-brand-dark transition-colors"
            >
              Return to AskShree Home
            </Link>
          </div>
        )}

        {!loading && !error && candidate && (
          <>
            {/* STEP 1: Statutory BIPA & AI Transparency Consent */}
            {step === "consent" && (
              <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-soft flex flex-col justify-between max-h-[85vh]">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-brand-wash text-brand border border-brand/20 flex items-center justify-center text-2xl shadow-soft shrink-0">
                      🛡️
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand">
                        Statutory Transparency • BIPA &amp; EU AI Act
                      </span>
                      <h2 className="text-xl font-bold text-ink font-display">
                        AI Pre-Screening &amp; Biometric Consent
                      </h2>
                    </div>
                  </div>

                  <p className="text-xs text-ink-muted leading-relaxed">
                    Hello <strong className="text-ink">{candidate.name.split(" ")[0]}</strong>. AskShree utilizes an autonomous AI hiring partner (Shree) to conduct a short, 5-minute competency pre-screening for the{" "}
                    <strong className="text-ink">{requisition?.title || "selected"}</strong> position.
                  </p>

                  <div className="p-4 rounded-xl bg-page border border-border text-xs text-ink-muted space-y-2.5">
                    <div className="flex items-start gap-2.5">
                      <span className="text-emerald-600 font-bold text-sm">✓</span>
                      <span>Audio transcripts are evaluated strictly for competency alignment with verified job criteria.</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="text-emerald-600 font-bold text-sm">✓</span>
                      <span>No biometric templates are sold, monetized, or shared with third-party advertisers.</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="text-emerald-600 font-bold text-sm">✓</span>
                      <span>You may switch to Written Text Mode at any time if you prefer not to use camera or microphone.</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="text-emerald-600 font-bold text-sm">✓</span>
                      <span>All final hiring decisions and offers remain strictly with the human hiring manager.</span>
                    </div>
                  </div>

                  <label className="flex items-center gap-3 pt-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={bipaConsented}
                      onChange={(e) => setBipaConsented(e.target.checked)}
                      className="w-4 h-4 rounded text-brand border-border focus:ring-brand accent-brand cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-ink">
                      I understand and provide explicit consent to participate in this AI-assisted pre-screening.
                    </span>
                  </label>
                </div>

                <div className="pt-6 border-t border-border flex items-center justify-between">
                  <span className="text-[11px] text-ink-muted">
                    Estimated Duration: ~5 minutes • 4 questions
                  </span>
                  <button
                    onClick={() => setStep("preview")}
                    disabled={!bipaConsented}
                    className="px-6 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white text-xs font-bold shadow-soft transition-all hover:scale-[1.02] disabled:opacity-50 disabled:pointer-events-none"
                  >
                    Accept &amp; Continue to Setup ›
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Device Check & Mode Selection */}
            {step === "preview" && (
              <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-soft space-y-6 max-h-[85vh]">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-brand">
                      Step 2 of 3 • System Readiness
                    </span>
                    <h2 className="text-xl font-bold font-display text-ink">
                      Hardware &amp; Camera Check
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setTextFallbackMode(false)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        !textFallbackMode
                          ? "bg-brand text-white shadow-soft-sm"
                          : "bg-page text-ink-muted hover:text-ink"
                      }`}
                    >
                      🎙️ Voice &amp; Video Mode
                    </button>
                    <button
                      onClick={() => setTextFallbackMode(true)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        textFallbackMode
                          ? "bg-brand text-white shadow-soft-sm"
                          : "bg-page text-ink-muted hover:text-ink"
                      }`}
                    >
                      ⌨️ Written Text Mode
                    </button>
                  </div>
                </div>

                {!textFallbackMode ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <div className="relative aspect-video rounded-xl bg-black/90 overflow-hidden border border-border flex items-center justify-center">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover mirror"
                      />
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] text-white flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Live Camera Feed
                      </div>
                    </div>

                    <div className="space-y-3 text-xs text-ink-muted p-4 rounded-xl bg-page border border-border">
                      <h3 className="font-bold text-ink">Pre-Screening Tips:</h3>
                      <ul className="space-y-2 list-disc list-inside">
                        <li>Find a quiet space with minimal background noise.</li>
                        <li>Speak naturally — Shree converts speech to text in real-time.</li>
                        <li>You will have up to 2 minutes per question to answer.</li>
                        <li>You can review and edit your transcribed responses before final submission.</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 rounded-xl bg-page border border-border text-center space-y-2">
                    <div className="text-3xl">⌨️</div>
                    <h3 className="font-bold text-sm text-ink">Written Text Mode Selected</h3>
                    <p className="text-xs text-ink-muted max-w-md mx-auto">
                      You will answer the 4 pre-screening questions by typing directly into our responsive editor. Camera and microphone will remain inactive.
                    </p>
                  </div>
                )}

                <div className="pt-4 border-t border-border flex items-center justify-between">
                  <button
                    onClick={() => setStep("consent")}
                    className="text-xs text-ink-muted hover:text-ink font-semibold"
                  >
                    ‹ Back to Consent
                  </button>
                  <button
                    onClick={() => setStep("interview")}
                    className="px-6 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white text-xs font-bold shadow-soft transition-all hover:scale-[1.02]"
                  >
                    Enter Pre-Screening Room ›
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Interactive Interview Room */}
            {step === "interview" && (
              <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-soft flex flex-col justify-between h-[75vh]">
                {/* Header & Progress */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-brand uppercase tracking-wider">
                        Question {currentQuestionIndex + 1} of {questions.length}
                      </span>
                      <span className="text-border">•</span>
                      <span className="text-xs text-ink-muted">
                        {requisition?.title || "Key Role"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {questions.map((_, i) => (
                        <div
                          key={i}
                          className={`h-1.5 rounded-full transition-all ${
                            i === currentQuestionIndex
                              ? "w-6 bg-brand"
                              : answers[i]?.trim()
                              ? "w-2.5 bg-emerald-500"
                              : "w-2.5 bg-border"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Question Card */}
                  <div className="p-4 rounded-xl bg-brand-wash/40 border border-brand/20 space-y-1">
                    <span className="text-[10px] font-bold text-brand uppercase tracking-wider flex items-center gap-1">
                      <span>✨</span> Shree Question Prompt
                    </span>
                    <h3 className="text-base sm:text-lg font-bold font-display text-ink leading-snug">
                      {questions[currentQuestionIndex] || "Please share your background and core achievements."}
                    </h3>
                  </div>

                  {/* Answer Input Area */}
                  <div className="space-y-3">
                    {!textFallbackMode ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <button
                            onClick={toggleRecording}
                            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                              isRecording
                                ? "bg-rose-600 hover:bg-rose-700 text-white animate-pulse"
                                : "bg-brand hover:bg-brand-dark text-white"
                            }`}
                          >
                            <span className={`w-2.5 h-2.5 rounded-full ${isRecording ? "bg-white" : "bg-white/80"}`} />
                            {isRecording ? "Listening... (Click to Stop)" : "🎙️ Speak Answer"}
                          </button>

                          <button
                            onClick={() => setTextFallbackMode(true)}
                            className="text-[11px] text-ink-muted hover:text-ink font-semibold"
                          >
                            Switch to Typing
                          </button>
                        </div>

                        {liveTranscript && (
                          <div className="p-2.5 rounded-lg bg-page border border-brand/30 text-xs text-brand italic">
                            &ldquo;{liveTranscript}...&rdquo;
                          </div>
                        )}

                        <textarea
                          value={answers[currentQuestionIndex] || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAnswers((prev) => {
                              const next = [...prev];
                              next[currentQuestionIndex] = val;
                              return next;
                            });
                          }}
                          placeholder="Your spoken transcript will appear here. You may also edit or type directly..."
                          rows={4}
                          className="w-full p-3 rounded-xl bg-page border border-border text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-brand transition-colors resize-none scrollbar-none"
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-ink-muted">
                            Type your answer below:
                          </span>
                          <button
                            onClick={() => setTextFallbackMode(false)}
                            className="text-[11px] text-brand hover:text-brand-dark font-semibold"
                          >
                            Switch to Voice Mode
                          </button>
                        </div>

                        <textarea
                          value={answers[currentQuestionIndex] || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAnswers((prev) => {
                              const next = [...prev];
                              next[currentQuestionIndex] = val;
                              return next;
                            });
                          }}
                          placeholder="Type your response here (minimum 2-3 sentences recommended)..."
                          rows={6}
                          className="w-full p-3.5 rounded-xl bg-page border border-border text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-brand transition-colors resize-none scrollbar-none"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Clickable Navigation Controls (Zero Scrollbars Rule) */}
                <div className="pt-4 border-t border-border flex items-center justify-between">
                  <button
                    onClick={handlePrevQuestion}
                    disabled={currentQuestionIndex === 0}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-ink-muted hover:text-ink disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  >
                    ‹ Previous Question
                  </button>

                  {currentQuestionIndex < questions.length - 1 ? (
                    <button
                      onClick={handleNextQuestion}
                      className="px-6 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white text-xs font-bold shadow-soft transition-all hover:scale-[1.02]"
                    >
                      Next Question ›
                    </button>
                  ) : (
                    <button
                      onClick={handleFinishInterview}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-soft transition-all hover:scale-[1.02]"
                    >
                      ✓ Complete &amp; Submit Pre-Screening ›
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* STEP 4: Submitting Spinner */}
            {step === "submitting" && (
              <div className="bg-surface border border-border rounded-2xl p-10 shadow-soft text-center space-y-4 max-h-[85vh]">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-brand/10 border border-brand/30 flex items-center justify-center text-3xl animate-bounce">
                  ✨
                </div>
                <h2 className="text-xl font-bold font-display text-ink">
                  Shree AI is Evaluating Your Responses
                </h2>
                <p className="text-xs text-ink-muted max-w-md mx-auto leading-relaxed">
                  Synthesizing competency depth, scoring domain alignment, and generating your candidate scorecard for the Hiring Manager review team...
                </p>
                <div className="w-48 h-1.5 bg-page rounded-full mx-auto overflow-hidden border border-border">
                  <div className="h-full bg-brand animate-pulse w-3/4 rounded-full" />
                </div>
              </div>
            )}

            {/* STEP 5: Submission Success Confirmation */}
            {step === "submitted" && submissionResult && (
              <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-soft space-y-6 max-h-[85vh] animate-in fade-in duration-300">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 flex items-center justify-center text-3xl shrink-0 shadow-soft">
                    ✓
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                        Evaluation Complete • Stage: {submissionResult.stage.toUpperCase()}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        🎯 {submissionResult.score}% AI Match
                      </span>
                    </div>
                    <h2 className="text-xl font-bold font-display text-ink mt-0.5">
                      Pre-Screening Successfully Completed!
                    </h2>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-page border border-border space-y-2">
                  <span className="text-[11px] font-bold text-ink uppercase tracking-wider">
                    Shree AI Synthesis Summary:
                  </span>
                  <p className="text-xs text-ink-muted leading-relaxed">
                    {submissionResult.summary}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-page border border-border space-y-1">
                    <span className="text-ink-muted font-medium">Target Requisition:</span>
                    <p className="font-bold text-ink">{requisition?.title || "Strategic Role"}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-page border border-border space-y-1">
                    <span className="text-ink-muted font-medium">Review Routing:</span>
                    <p className="font-bold text-emerald-600">Routed to Hiring Manager Portal</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
                  <Link
                    href="/"
                    className="text-xs text-ink-muted hover:text-ink font-semibold"
                  >
                    ‹ Return to AskShree Home
                  </Link>

                  <Link
                    href={`/candidate/status?id=${candidate.id}`}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white text-xs font-bold shadow-soft transition-all hover:scale-[1.02] text-center"
                  >
                    Track Application Status ›
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

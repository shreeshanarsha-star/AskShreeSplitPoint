"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Icon from "@/components/Icon";

export default function InterviewRoomPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;

  // Session States
  const [step, setStep] = useState<"consent" | "preview" | "interview" | "submitted">("consent");
  const [bipaConsented, setBipaConsented] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [textFallbackMode, setTextFallbackMode] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Candidate/Role data
  const [roleTitle, setRoleTitle] = useState("Software Engineer");
  const [questions, setQuestions] = useState<string[]>([
    "Can you share an overview of your background and the most impactful project you led recently?",
    "Tell me about a challenging technical trade-off you had to make and how you handled it.",
    "How do you approach collaborating across engineering, product, and business stakeholders?",
    "What motivated you to explore this opportunity with our team?",
  ]);
  const [answers, setAnswers] = useState<string[]>(["", "", "", ""]);
  const [liveTranscript, setLiveTranscript] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // Setup Camera Preview
  useEffect(() => {
    if (step === "preview" || step === "interview") {
      navigator.mediaDevices
        ?.getUserMedia({ video: true, audio: true })
        .then((stream) => {
          if (videoRef.current) videoRef.current.srcObject = stream;
        })
        .catch((err) => {
          console.warn("Camera or microphone permission denied:", err);
          setTextFallbackMode(true);
        });
    }
  }, [step]);

  // Speech Recognition (Free Browser Web Speech API)
  function startListening() {
    if (typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
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
              next[currentQuestionIndex] = (next[currentQuestionIndex] + " " + finalChunk).trim();
              return next;
            });
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        setLiveTranscript(interim);
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsRecording(true);
    }
  }

  function stopListening() {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
    setLiveTranscript("");
  }

  function handleNextQuestion() {
    stopListening();
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      finishInterview();
    }
  }

  async function finishInterview() {
    stopListening();
    setSubmitting(true);
    try {
      const fullTranscript = questions
        .map((q, i) => `Q: ${q}\nA: ${answers[i] || "[No verbal response recorded]"}`)
        .join("\n\n");

      await fetch("/api/candidate/interview-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          transcript: fullTranscript,
          answers,
        }),
      });
      setStep("submitted");
    } catch (err) {
      console.error("Submission failed:", err);
      setStep("submitted");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-2xl mx-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center font-bold text-xs">
              S
            </div>
            <span className="font-semibold text-sm">AskShree AI Pre-Screening Room</span>
          </div>
          <span className="text-xs text-slate-400">Position: {roleTitle}</span>
        </div>

        {/* STEP 1: Standalone BIPA Biometric Consent Modal */}
        {step === "consent" && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4 text-2xl">
              🛡️
            </div>
            <h2 className="text-xl font-bold text-white">Biometric & AI Screening Consent</h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              In accordance with statutory privacy regulations (including Illinois BIPA and the EU AI Act), AskShree requires your standalone, explicit consent prior to initiating an AI-assisted video/audio pre-screening interview.
            </p>

            <div className="mt-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 space-y-2">
              <div className="flex items-start gap-2">
                <span>✓</span>
                <span>Audio and transcript are processed strictly for competency evaluation against the job description.</span>
              </div>
              <div className="flex items-start gap-2">
                <span>✓</span>
                <span>Zero facial recognition, voice-biometric profiling, or emotional scoring is performed.</span>
              </div>
              <div className="flex items-start gap-2">
                <span>✓</span>
                <span>You can request complete permanent deletion of your data at any time via the Candidate Portal.</span>
              </div>
            </div>

            <label className="mt-6 flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={bipaConsented}
                onChange={(e) => setBipaConsented(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs text-slate-300">
                I acknowledge and grant explicit consent for AI audio recording, transcription, and rubric-based skill evaluation for this job application.
              </span>
            </label>

            <div className="mt-6 flex items-center justify-between gap-3">
              <button
                onClick={() => router.push("/")}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
              >
                Cancel & Exit
              </button>
              <button
                disabled={!bipaConsented}
                onClick={() => setStep("preview")}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-md transition-all"
              >
                Proceed to Camera Setup →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Device Preview */}
        {step === "preview" && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl text-center">
            <h2 className="text-xl font-bold text-white mb-1">Check Camera & Audio</h2>
            <p className="text-xs text-slate-400 mb-6">
              Ensure your face is well-lit and your microphone is working clearly.
            </p>

            <div className="w-full aspect-video bg-slate-950 rounded-xl overflow-hidden border border-slate-800 relative mx-auto mb-6 flex items-center justify-center">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-xs px-2.5 py-1 rounded-md text-[11px] text-emerald-400 flex items-center gap-1.5 border border-slate-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Camera Active
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setTextFallbackMode(!textFallbackMode)}
                className="px-3.5 py-2 rounded-xl text-xs border border-slate-700 hover:bg-slate-800 text-slate-300"
              >
                {textFallbackMode ? "Switch to Video/Voice" : "Prefer Text Questions"}
              </button>
              <button
                onClick={() => {
                  setStep("interview");
                  startListening();
                }}
                className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md"
              >
                Start Interview Now
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Active AI Interview Room */}
        {step === "interview" && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
            {/* Avatar & Candidate Split */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Shree AI Avatar Window */}
              <div className="aspect-video bg-gradient-to-br from-indigo-950 to-slate-900 rounded-xl border border-indigo-900/50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
                <div className="w-16 h-16 rounded-full bg-indigo-600/30 border-2 border-indigo-500 flex items-center justify-center text-3xl shadow-lg animate-pulse mb-2">
                  👩‍💼
                </div>
                <span className="text-xs font-semibold text-indigo-300">Shree AI Recruiter</span>
                <span className="text-[10px] text-indigo-400/80 mt-0.5">Listening & Calibrating</span>
                <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-800 text-[10px] text-indigo-300">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </div>
              </div>

              {/* Candidate Camera View */}
              <div className="aspect-video bg-slate-950 rounded-xl border border-slate-800 relative overflow-hidden flex items-center justify-center">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-slate-900/80 px-2 py-0.5 rounded text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                  <span className="text-rose-400 font-medium">Recording</span>
                </div>
              </div>
            </div>

            {/* Current Question Display */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 mb-4">
              <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block mb-1">
                Question {currentQuestionIndex + 1}
              </span>
              <h3 className="text-base font-semibold text-white leading-snug">
                {questions[currentQuestionIndex]}
              </h3>

              {/* Text Fallback Input */}
              {textFallbackMode ? (
                <div className="mt-4">
                  <textarea
                    rows={4}
                    value={answers[currentQuestionIndex] || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAnswers((prev) => {
                        const next = [...prev];
                        next[currentQuestionIndex] = val;
                        return next;
                      });
                    }}
                    placeholder="Type your response here..."
                    className="w-full text-xs bg-slate-900 border border-slate-800 rounded-lg p-3 text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              ) : (
                /* Live Speech Transcription Box */
                <div className="mt-4 p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 min-h-[60px] text-xs text-slate-300">
                  {answers[currentQuestionIndex] || liveTranscript ? (
                    <p>
                      {answers[currentQuestionIndex]}{" "}
                      <span className="text-indigo-400 italic">{liveTranscript}</span>
                    </p>
                  ) : (
                    <span className="text-slate-500 italic">Speak clearly into your microphone...</span>
                  )}
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                onClick={() => setTextFallbackMode(!textFallbackMode)}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                {textFallbackMode ? "Switch to Voice Mode" : "Switch to Text Input"}
              </button>

              <button
                onClick={handleNextQuestion}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md flex items-center gap-1.5"
              >
                {currentQuestionIndex < questions.length - 1 ? "Next Question →" : "Finish Interview ✓"}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Submitted & Completed Confirmation */}
        {step === "submitted" && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-xl">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-2xl mb-4">
              ✓
            </div>
            <h2 className="text-xl font-bold text-white">Interview Submitted Successfully!</h2>
            <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
              Your responses have been transcribed and logged. Shree will generate an evidence-grounded scorecard for the hiring team within 4 hours.
            </p>
            <div className="mt-6">
              <button
                onClick={() => router.push("/candidate/status")}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                View Application Status
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

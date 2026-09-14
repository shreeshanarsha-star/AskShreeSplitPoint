"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Logo from "@/components/Logo";
import TopbarStatus from "@/components/TopbarStatus";
import { GUEST_TOOLS, PremiumIcon, GuestTool, GuestToolId } from "@/components/WaffleMenu";

export default function ShreeAvatarProfilePage() {
  const [activeTab, setActiveTab] = useState<"pillars" | "tools" | "ethics" | "consult">("pillars");
  const [chatPrompt, setChatPrompt] = useState("");
  const [simulatedAnswer, setSimulatedAnswer] = useState<string | null>(null);
  const [isAnswering, setIsAnswering] = useState(false);
  const [loginModalTool, setLoginModalTool] = useState<GuestTool | null>(null);

  const sampleQuestions = [
    "How does Shree guarantee zero ghosting for candidates?",
    "How does the instant ATS CV scan analyze keyword density?",
    "What STAR rubrics do you use during interview pre-screening?",
    "How do referral credits work on the platform?",
  ];

  function handleAskSample(q: string) {
    setChatPrompt(q);
    simulateAsk(q);
  }

  function simulateAsk(question: string) {
    setIsAnswering(true);
    setSimulatedAnswer(null);

    setTimeout(() => {
      let answer = "";
      const lower = question.toLowerCase();
      if (lower.includes("ghosting")) {
        answer =
          "At AskShree, the Zero Ghosting Standard is an algorithmic commitment: Every applicant receives clear stage notifications within 24 to 48 hours. If an application is not moving forward, you receive detailed rubric feedback on strengths and skill gaps rather than radio silence.";
      } else if (lower.includes("ats") || lower.includes("cv") || lower.includes("resume")) {
        answer =
          "Our ATS scanner parses your resume against standardized industry ontologies, checking semantic relevance, quantifiable impact bullets, and parseability. You get instant red-amber-green feedback and 1-click layout fixes.";
      } else if (lower.includes("star") || lower.includes("interview")) {
        answer =
          "Shree evaluates mock answers across Situation, Task, Action, and Result dimensions. We score clarity, technical depth, ownership, and measurable business impact with real-time coaching suggestions.";
      } else if (lower.includes("refer") || lower.includes("credit")) {
        answer =
          "When you recommend peers to open requisitions or verified talent pools on AskShree, you earn platform credits redeemable for premium interview coaching or direct milestone payouts upon successful hiring calibrations.";
      } else {
        answer =
          "Hello! I am Shree, your AI Hiring Partner. I am always online to assist you with instant resume feedback, mock interview calibrations, transparent application tracking, and personalized career consultation.";
      }
      setSimulatedAnswer(answer);
      setIsAnswering(false);
    }, 600);
  }

  function handleToolClick(tool: GuestTool) {
    setLoginModalTool(tool);
  }

  return (
    <div className="min-h-screen flex flex-col bg-page text-ink selection:bg-brand/20 selection:text-brand-dark scrollbar-none font-sans">
      {/* 1. MANDATORY GLOBAL HEADER */}
      <header className="h-14 border-b border-border bg-surface/85 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            title="AskShree — AI powered hiring partner"
            className="flex items-center gap-2 hover:opacity-90 transition-opacity flex-shrink-0"
          >
            <Logo height={28} showPunchline={true} />
          </Link>
          <span className="text-border mx-1 hidden sm:inline select-none">/</span>
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Shree AI Partner Profile
            </span>
          </div>
        </div>

        {/* Action button + Persistent Status Bar */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/"
            className="h-8 px-3 rounded-lg bg-brand text-white hover:bg-brand-dark transition-all text-xs font-semibold flex items-center gap-1.5 shadow-button cursor-pointer"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth={2}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="hidden sm:inline">Consult Shree Now</span>
            <span className="sm:hidden">Consult</span>
          </Link>
          <span className="w-px h-5 bg-border flex-shrink-0" />
          <TopbarStatus />
        </div>
      </header>

      {/* 2. MAIN HERO & BIO SECTION */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8 scrollbar-none">
        {/* Hero Card */}
        <div className="relative rounded-3xl border border-border bg-surface p-6 sm:p-8 lg:p-10 shadow-soft overflow-hidden">
          {/* Subtle Ambient Background Glows */}
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-brand/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left: Avatar Visual & Status Lockup */}
            <div className="lg:col-span-4 flex flex-col items-center text-center">
              <div className="relative group">
                <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full p-1.5 bg-gradient-to-tr from-amber-500 via-brand to-amber-300 shadow-xl relative">
                  <div className="w-full h-full rounded-full overflow-hidden border-2 border-surface relative bg-surface-raised">
                    <Image
                      src="/shree-avatar.jpg"
                      alt="Shree — AI Hiring Partner"
                      width={176}
                      height={176}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      priority
                    />
                  </div>
                </div>
                {/* Live Online Badge */}
                <div className="absolute bottom-1 right-3 sm:right-5 bg-surface border border-border px-3 py-1 rounded-full shadow-md flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] font-bold text-ink-2">Online 24/7</span>
                </div>
              </div>

              <div className="mt-4">
                <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink tracking-tight">
                  Meet Shree
                </h1>
                <p className="text-sm font-semibold text-brand mt-0.5">
                  Your AI Hiring Partner
                </p>
                <p className="text-xs text-ink-muted mt-1 max-w-xs">
                  Autonomous hiring intelligence designed for transparent, instant, and human-centric talent discovery.
                </p>
              </div>

              {/* Verified Badges */}
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                <span className="px-2.5 py-1 rounded-full bg-brand-wash text-brand border border-brand/20 text-[11px] font-semibold flex items-center gap-1">
                  <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3" stroke="currentColor" strokeWidth={2.5}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Verified AI Partner
                </span>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold flex items-center gap-1">
                  <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3" stroke="currentColor" strokeWidth={2.5}>
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  Zero Bias Calibrated
                </span>
              </div>
            </div>

            {/* Right: Mission Statement & The 3 Pillars */}
            <div className="lg:col-span-8 space-y-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 border border-brand/20 text-brand text-xs font-semibold uppercase tracking-wider mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand" />
                  Hiring Partner Mandate
                </div>
                <h2 className="text-xl sm:text-2xl font-display font-semibold text-ink leading-snug">
                  Built to eliminate the hiring black hole with radical transparency and continuous support.
                </h2>
                <p className="text-sm text-ink-muted mt-2 leading-relaxed">
                  Traditional recruiting leaves candidates waiting in silence and hiring managers buried under uncalibrated resumes. 
                  Shree changes the dynamic by functioning as an always-on, unbiased hiring partner — providing real-time feedback loops, 
                  transparent rubric evaluations, and actionable career guidance with zero wait times.
                </p>
              </div>

              {/* The 3 Core Pillars Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {/* Pillar 1 */}
                <div className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-3">
                    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={2}>
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-ink">Instant Feedback</h3>
                  <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                    Evaluations in seconds, not weeks. Real-time ATS match scores, STAR interview coaching, and immediate rubric calibrations.
                  </p>
                  <div className="mt-2.5 pt-2 border-t border-amber-500/15 flex items-center justify-between text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                    <span>Response Time</span>
                    <span>&lt; 1.2s</span>
                  </div>
                </div>

                {/* Pillar 2 */}
                <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3">
                    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={2}>
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-ink">No Ghosting</h3>
                  <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                    100% notification guarantee. Every applicant gets transparent milestone tracking and structured closure rationales.
                  </p>
                  <div className="mt-2.5 pt-2 border-t border-emerald-500/15 flex items-center justify-between text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                    <span>Candidate Closure</span>
                    <span>100% Guaranteed</span>
                  </div>
                </div>

                {/* Pillar 3 */}
                <div className="p-4 rounded-2xl border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-3">
                    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={2}>
                      <rect x="3" y="8" width="18" height="13" rx="2" />
                      <line x1="12" y1="8" x2="12" y2="21" strokeWidth={2} />
                      <path d="M12 8H7.5a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8z" />
                      <path d="M12 8h4.5a2.5 2.5 0 0 0 0-5C13 3 12 8 12 8z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-bold text-ink">Free Consultation</h3>
                  <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                    Zero paywalls for candidate growth. Free ATS scans, interview simulation, resume builder, and market compensation benchmarks.
                  </p>
                  <div className="mt-2.5 pt-2 border-t border-blue-500/15 flex items-center justify-between text-[11px] font-semibold text-blue-700 dark:text-blue-300">
                    <span>Core Tool Access</span>
                    <span>Free Forever</span>
                  </div>
                </div>
              </div>

              {/* Quick Action CTAs */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="/"
                  className="px-4 py-2.5 rounded-xl bg-brand text-white hover:bg-brand-dark transition-all text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-button cursor-pointer"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={2}>
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  Start Conversation with Shree
                </Link>
                <Link
                  href="/candidate/ats-check"
                  className="px-4 py-2.5 rounded-xl border border-border bg-surface hover:bg-brand-wash hover:border-brand/30 transition-all text-xs sm:text-sm font-semibold text-ink flex items-center gap-2 cursor-pointer"
                >
                  <PremiumIcon id="atsScan" className="w-4 h-4 text-emerald-600" />
                  Run Free ATS CV Scan
                </Link>
                <Link
                  href="/interview-prep"
                  className="px-4 py-2.5 rounded-xl border border-border bg-surface hover:bg-brand-wash hover:border-brand/30 transition-all text-xs sm:text-sm font-semibold text-ink flex items-center gap-2 cursor-pointer"
                >
                  <PremiumIcon id="voiceAi" className="w-4 h-4 text-purple-600" />
                  Voice Mock Interview
                </Link>
                <Link
                  href="/refer"
                  className="px-3.5 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/15 transition-all text-xs sm:text-sm font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5 cursor-pointer"
                >
                  <PremiumIcon id="referCredits" className="w-4 h-4 text-amber-600" />
                  Refer &amp; Earn Credits
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* 3. INTERACTIVE SECTION TABS */}
        <div className="flex items-center gap-2 border-b border-border pb-3 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab("pillars")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "pillars"
                ? "bg-brand text-white shadow-button"
                : "text-ink-muted hover:text-ink hover:bg-surface border border-transparent"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={2}>
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            The 3 Guarantees
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("tools")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "tools"
                ? "bg-brand text-white shadow-button"
                : "text-ink-muted hover:text-ink hover:bg-surface border border-transparent"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            Shree Systems Suite (11 Tools)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("consult")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "consult"
                ? "bg-brand text-white shadow-button"
                : "text-ink-muted hover:text-ink hover:bg-surface border border-transparent"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={2}>
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
            Interactive Consultation Studio
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ethics")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "ethics"
                ? "bg-brand text-white shadow-button"
                : "text-ink-muted hover:text-ink hover:bg-surface border border-transparent"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={2}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Explainable AI &amp; Ethics
          </button>
        </div>

        {/* 4. TAB CONTENTS */}

        {/* TAB 1: THE 3 GUARANTEES DEEP DIVE */}
        {activeTab === "pillars" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1 */}
              <div className="p-6 rounded-3xl border border-border bg-surface shadow-soft space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
                  <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="currentColor" strokeWidth={2}>
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">Pillar 01</span>
                  <h3 className="text-lg font-bold text-ink mt-0.5">Instant Feedback</h3>
                  <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                    No waiting weeks for recruiters to open PDFs. Shree evaluates incoming resumes, responses, and questions in real-time.
                  </p>
                </div>
                <ul className="space-y-2 text-xs text-ink-2 pt-2 border-t border-border">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span>Real-time ATS keyword gap identification</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span>STAR behavioral scoring on interview answers</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span>Instant candidate-to-requisition fit percentiles</span>
                  </li>
                </ul>
                <Link
                  href="/candidate/ats-check"
                  className="w-full py-2 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  Test Instant ATS Feedback &rarr;
                </Link>
              </div>

              {/* Card 2 */}
              <div className="p-6 rounded-3xl border border-border bg-surface shadow-soft space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
                  <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="currentColor" strokeWidth={2}>
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Pillar 02</span>
                  <h3 className="text-lg font-bold text-ink mt-0.5">No Ghosting Guarantee</h3>
                  <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                    Silence is never acceptable. Shree guarantees every applicant explicit status transparency, timeline estimates, and honest rationale.
                  </p>
                </div>
                <ul className="space-y-2 text-xs text-ink-2 pt-2 border-t border-border">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Active stage milestones with live SLA tracking</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Direct WhatsApp &amp; in-app milestone alerts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Transparent closure notes if not calibrated</span>
                  </li>
                </ul>
                <Link
                  href="/candidate"
                  className="w-full py-2 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  View Candidate Stage Tracker &rarr;
                </Link>
              </div>

              {/* Card 3 */}
              <div className="p-6 rounded-3xl border border-border bg-surface shadow-soft space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600">
                  <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="currentColor" strokeWidth={2}>
                    <rect x="3" y="8" width="18" height="13" rx="2" />
                    <line x1="12" y1="8" x2="12" y2="21" strokeWidth={2} />
                    <path d="M12 8H7.5a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8z" />
                    <path d="M12 8h4.5a2.5 2.5 0 0 0 0-5C13 3 12 8 12 8z" />
                  </svg>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">Pillar 03</span>
                  <h3 className="text-lg font-bold text-ink mt-0.5">Free Consultation</h3>
                  <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                    Access to foundational career tools should never cost candidate money. All screening preps, benchmarks, and builders remain 100% free.
                  </p>
                </div>
                <ul className="space-y-2 text-xs text-ink-2 pt-2 border-t border-border">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <span>Free resume builder with LinkedIn imports</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <span>Market salary compensation percentiles</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <span>Referral rewards: Earn credits for verified peer intros</span>
                  </li>
                </ul>
                <Link
                  href="/refer"
                  className="w-full py-2 rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-300 hover:bg-blue-500/20 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  Explore Free Referral Program &rarr;
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SHREE SYSTEMS SUITE (11 GUEST TOOLS) */}
        {activeTab === "tools" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-ink">The 11 Systems Suite</h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  Full access suite for guests and registered candidates, equipped with rich AI scoring and tools.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-brand-wash text-brand border border-brand/20 text-xs font-semibold">
                11 Tools Ready
              </span>
            </div>

            {/* Grid of 11 Tools */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {GUEST_TOOLS.map((tool) => (
                <div
                  key={tool.name}
                  onClick={() => handleToolClick(tool)}
                  className="group p-4 rounded-2xl border border-border bg-surface hover:border-brand/40 hover:shadow-soft transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${tool.tileClass} transition-transform group-hover:scale-105`}>
                        <PremiumIcon id={tool.iconId} className="w-5 h-5" />
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${tool.badgeColor}`}>
                        {tool.badge}
                      </span>
                    </div>

                    <div className="mt-3">
                      <h4 className="text-sm font-bold text-ink group-hover:text-brand transition-colors">
                        {tool.name}
                      </h4>
                      <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                        {tool.desc}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs font-semibold text-brand">
                    <span>Open Tool</span>
                    <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: INTERACTIVE CONSULTATION STUDIO */}
        {activeTab === "consult" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Interactive Prompt Studio */}
            <div className="lg:col-span-7 p-6 rounded-3xl border border-border bg-surface shadow-soft space-y-4">
              <div>
                <h3 className="text-base font-bold text-ink flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-brand" />
                  Live Consultation Studio
                </h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  Test Shree&apos;s instant advisory responses right now, or select common candidate questions below.
                </p>
              </div>

              {/* Sample Prompt Chips */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">Suggested Queries</span>
                <div className="flex flex-wrap gap-2">
                  {sampleQuestions.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => handleAskSample(q)}
                      className="px-3 py-1.5 rounded-xl border border-border bg-page hover:bg-brand-wash hover:border-brand/30 transition-colors text-xs text-ink-2 text-left cursor-pointer"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Input Area */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (chatPrompt.trim()) simulateAsk(chatPrompt);
                }}
                className="space-y-2 pt-2"
              >
                <div className="relative">
                  <input
                    type="text"
                    value={chatPrompt}
                    onChange={(e) => setChatPrompt(e.target.value)}
                    placeholder="Ask Shree about ATS scores, interviews, or hiring standards..."
                    className="w-full h-11 px-4 pr-24 rounded-xl border border-border bg-page text-ink text-xs sm:text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
                  />
                  <button
                    type="submit"
                    disabled={isAnswering || !chatPrompt.trim()}
                    className="absolute right-1.5 top-1.5 h-8 px-3 rounded-lg bg-brand text-white hover:bg-brand-dark transition-all text-xs font-semibold flex items-center gap-1 shadow-button cursor-pointer disabled:opacity-50"
                  >
                    {isAnswering ? "Thinking..." : "Ask Shree"}
                  </button>
                </div>
              </form>

              {/* Live Answer Box */}
              {(simulatedAnswer || isAnswering) && (
                <div className="p-4 rounded-2xl border border-brand/30 bg-brand-wash/30 space-y-2 animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full overflow-hidden border border-brand/40">
                      <Image
                        src="/shree-avatar.jpg"
                        alt="Shree"
                        width={20}
                        height={20}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-xs font-bold text-brand">Shree responds:</span>
                  </div>
                  {isAnswering ? (
                    <p className="text-xs text-ink-muted italic animate-pulse">
                      Synthesizing rubric insights...
                    </p>
                  ) : (
                    <p className="text-xs text-ink leading-relaxed font-normal">
                      {simulatedAnswer}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Right: What You Can Ask */}
            <div className="lg:col-span-5 p-6 rounded-3xl border border-border bg-surface shadow-soft space-y-4">
              <h3 className="text-sm font-bold text-ink">Consultation Capabilities</h3>
              <ul className="space-y-3 text-xs text-ink-2">
                <li className="p-3 rounded-xl bg-page border border-border flex items-start gap-3">
                  <PremiumIcon id="atsScan" className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-ink font-semibold">Resume Diagnostics</strong>
                    <span>Paste your bullet points to get instant impact rewrites and keyword enhancements.</span>
                  </div>
                </li>
                <li className="p-3 rounded-xl bg-page border border-border flex items-start gap-3">
                  <PremiumIcon id="voiceAi" className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-ink font-semibold">Mock Technical Screening</strong>
                    <span>Test your answers to distributed systems, product design, or leadership prompts.</span>
                  </div>
                </li>
                <li className="p-3 rounded-xl bg-page border border-border flex items-start gap-3">
                  <PremiumIcon id="scalesOffer" className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-ink font-semibold">Compensation &amp; Equity Intel</strong>
                    <span>Benchmark base salary, ESOP equity value, and bonus structures against 2026 market standards.</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* TAB 4: EXPLAINABLE AI & ETHICS */}
        {activeTab === "ethics" && (
          <div className="p-6 sm:p-8 rounded-3xl border border-border bg-surface shadow-soft space-y-6">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-brand">Governance &amp; Trust</span>
              <h3 className="text-xl font-bold text-ink mt-1">
                Ethical Architecture &amp; Explainable AI Standards
              </h3>
              <p className="text-xs sm:text-sm text-ink-muted mt-1 leading-relaxed max-w-3xl">
                Shree is engineered with strict fairness constraints, auditable decision logs, and candidate data sovereignty. 
                We believe algorithmic decisions must never be opaque or unaccountable.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-page border border-border space-y-2">
                <div className="w-8 h-8 rounded-lg bg-brand-wash text-brand flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={2}>
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <h4 className="text-sm font-bold text-ink">Demographic Blind Screening</h4>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Personal Identifiable Information (PII) including name, age, gender, photo, and postal address is strictly stripped before competency evaluation to eliminate unconscious human or statistical bias.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-page border border-border space-y-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={2}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h4 className="text-sm font-bold text-ink">Transparent Rubric Citations</h4>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Every qualification score is accompanied by an itemized rubric citing explicit job requirements, observed evidence in candidate work, and specific skill improvement opportunities.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-page border border-border space-y-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={2}>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <h4 className="text-sm font-bold text-ink">Candidate Data Sovereignty</h4>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Your resume, notes, and interview answers are never sold or used to train third-party foundation models without explicit affirmative consent. You retain the right to delete your records at any time.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-page border border-border space-y-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor" strokeWidth={2}>
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <h4 className="text-sm font-bold text-ink">Human-in-the-Loop Safeguards</h4>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Shree provides calibrations and recommendations, but final hiring decisions are always made by accountable human hiring managers. Candidates can request human review of any AI screening.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/manual"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-white hover:bg-brand-dark transition-all text-xs font-semibold shadow-button cursor-pointer"
              >
                <PremiumIcon id="manualHandbook" className="w-4 h-4" />
                Read Full AI Governance &amp; Ethics Manual
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* 5. GUEST LOGIN INTERCEPTOR MODAL (When clicking any of the 11 tools) */}
      {loginModalTool && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
          onClick={() => setLoginModalTool(null)}
        >
          <div
            className="w-full max-w-md bg-surface border border-border rounded-3xl shadow-2xl p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border shadow-soft-sm flex-shrink-0 ${loginModalTool.tileClass}`}>
                  <PremiumIcon id={loginModalTool.iconId} className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-ink">Sign in to Access Tool</h4>
                  <p className="text-xs text-brand font-semibold">{loginModalTool.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLoginModalTool(null)}
                className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-ink-muted hover:text-ink hover:bg-page transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-ink-muted leading-relaxed">
              To use <strong className="text-ink">{loginModalTool.name}</strong>, save your progress, and receive instant feedback from Shree, please sign in to your AskShree account.
            </p>

            <div className="space-y-2">
              <Link
                href={`/login?redirect=${encodeURIComponent(loginModalTool.href)}&role=candidate`}
                className="w-full h-10 rounded-xl bg-brand text-white hover:bg-brand-dark transition-all text-xs font-semibold flex items-center justify-center gap-2 shadow-button cursor-pointer"
              >
                <span>Continue as Candidate</span>
                <span>&rarr;</span>
              </Link>
              <Link
                href={`/login?redirect=${encodeURIComponent(loginModalTool.href)}&role=recruiter`}
                className="w-full h-10 rounded-xl border border-border bg-page hover:bg-surface transition-all text-xs font-semibold text-ink flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Sign in as Recruiter / Organization</span>
              </Link>
            </div>

            <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-ink-muted">
              <span>New to AskShree?</span>
              <Link
                href={`/signup?redirect=${encodeURIComponent(loginModalTool.href)}`}
                className="font-bold text-brand hover:underline"
              >
                Create Free Account (30s)
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

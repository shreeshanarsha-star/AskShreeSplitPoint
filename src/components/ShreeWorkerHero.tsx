"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "./Icon";

export default function ShreeWorkerHero() {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleSpeak = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const text =
      "Hello! I am Shree, your autonomous AI talent and hiring partner. Welcome to AskShree. You can explore open positions, apply in 60 seconds with full salary transparency, track your live status, or launch your recruiter cockpit.";

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.05;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice =
      voices.find(
        (v) =>
          v.name.includes("Natural") ||
          v.name.includes("Google") ||
          v.name.includes("Samantha") ||
          v.lang.startsWith("en")
      ) || voices[0];

    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const sampleRoles = [
    { title: "Staff Full-Stack AI Lead", comp: "$160k – $210k", dept: "Engineering" },
    { title: "Autonomous Systems Architect", comp: "$180k – $240k", dept: "AI / ML" },
    { title: "Senior Legal Counsel", comp: "$150k – $195k", dept: "Legal & Contracts" },
    { title: "Enterprise Growth Lead", comp: "$130k – $180k", dept: "Sales" },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-2 sm:py-4 flex flex-col items-center text-center">
      {/* Shree AI Worker Identity Banner */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface border border-border shadow-soft-sm mb-4">
        <span className="w-2 h-2 rounded-full bg-good animate-pulse" />
        <span className="text-[12px] font-semibold text-ink">
          Shree — Autonomous AI Worker
        </span>
        <span className="text-border">|</span>
        <span className="text-[11px] text-ink-muted">Talent & Hiring OS</span>
      </div>

      {/* Main Heading in InterDisplay */}
      <h1 className="text-2xl sm:text-4xl font-extrabold text-ink tracking-tight mb-2 font-display">
        Simpler ways. Smarter hiring.
      </h1>
      <p className="text-sm sm:text-base text-ink-2 max-w-xl mb-6 leading-relaxed">
        Meet <strong className="text-ink font-semibold">Shree</strong>, the AI worker interacting with candidates 24/7. Explore open roles, experience instant pre-screening, or sign in to your team cockpit.
      </p>

      {/* Interactive Shree Voice Card */}
      <div className="w-full max-w-xl bg-surface border border-border rounded-2xl p-4 sm:p-5 shadow-soft mb-6 text-left flex flex-col sm:flex-row items-center gap-4 transition-all hover:border-brand/40">
        <div className="relative flex-shrink-0">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand to-brand-dark flex items-center justify-center text-white text-xl font-bold shadow-emblem">
            S
          </div>
          <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-surface border-2 border-surface flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-good" />
          </span>
        </div>

        <div className="flex-1 min-w-0 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <h2 className="text-sm font-bold text-ink">Shree AI Partner</h2>
            <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-brand-wash text-brand border border-brand/20">
              Voice Enabled
            </span>
          </div>
          <p className="text-[12px] text-ink-muted mt-1 leading-snug">
            {isSpeaking
              ? "Speaking now... listening to answer your hiring questions."
              : "“Hi! What kind of role are you looking for? Click to hear my voice.”"}
          </p>
        </div>

        <button
          type="button"
          onClick={handleSpeak}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all flex-shrink-0 ${
            isSpeaking
              ? "bg-critical text-white shadow-soft-sm animate-pulse"
              : "bg-brand text-white shadow-button hover:bg-brand-dark"
          }`}
        >
          <Icon name={isSpeaking ? "square" : "volume"} className="w-4 h-4" />
          <span>{isSpeaking ? "Stop Voice" : "Hear Shree"}</span>
        </button>
      </div>

      {/* Core Persona Entry Points */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 text-left">
        {/* Candidate Pathway */}
        <Link
          href="/careers"
          className="p-4 rounded-2xl bg-surface border border-border hover:border-brand hover:shadow-soft transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="w-8 h-8 rounded-xl bg-brand-wash text-brand border border-brand/20 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Icon name="briefcase" className="w-4 h-4" />
            </div>
            <div className="text-[13.5px] font-bold text-ink group-hover:text-brand transition-colors">
              Candidate Portal
            </div>
            <p className="text-[11.5px] text-ink-muted mt-1 leading-relaxed">
              Explore 14 live requisitions with transparent pay and 60-second quick apply.
            </p>
          </div>
          <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-brand">
            <span>Browse 14 Roles</span>
            <span className="group-hover:translate-x-0.5 transition-transform">→</span>
          </div>
        </Link>

        {/* Application Status Tracker */}
        <Link
          href="/candidate/status"
          className="p-4 rounded-2xl bg-surface border border-border hover:border-brand hover:shadow-soft transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Icon name="checkCircle" className="w-4 h-4" />
            </div>
            <div className="text-[13.5px] font-bold text-ink group-hover:text-brand transition-colors">
              Track Status
            </div>
            <p className="text-[11.5px] text-ink-muted mt-1 leading-relaxed">
              Real-time milestone tracker from Applied, Screening, to Final Offer & eSign.
            </p>
          </div>
          <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-brand">
            <span>Check My Status</span>
            <span className="group-hover:translate-x-0.5 transition-transform">→</span>
          </div>
        </Link>

        {/* Recruiter & Hiring Manager Cockpit */}
        <Link
          href="/recruiter"
          className="p-4 rounded-2xl bg-gradient-to-br from-brand-wash/60 via-surface to-surface border border-brand/30 hover:border-brand hover:shadow-soft transition-all group flex flex-col justify-between"
        >
          <div>
            <div className="w-8 h-8 rounded-xl bg-brand text-white flex items-center justify-center mb-3 shadow-soft-sm group-hover:scale-105 transition-transform">
              <Icon name="users" className="w-4 h-4" />
            </div>
            <div className="text-[13.5px] font-bold text-ink group-hover:text-brand transition-colors flex items-center gap-1.5">
              <span>Recruiter Cockpit</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-brand text-white">
                PRO
              </span>
            </div>
            <p className="text-[11.5px] text-ink-muted mt-1 leading-relaxed">
              Shadow Mode resume reviews, lane trust telemetry, and 1-click candidate sourcing.
            </p>
          </div>
          <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-brand">
            <span>Open Cockpit</span>
            <span className="group-hover:translate-x-0.5 transition-transform">→</span>
          </div>
        </Link>
      </div>

      {/* Featured Open Roles Pills */}
      <div className="w-full max-w-2xl mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
            Featured Open Positions
          </span>
          <Link
            href="/careers"
            className="text-[11px] font-semibold text-brand hover:underline"
          >
            View all 14 roles →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
          {sampleRoles.map((role) => (
            <Link
              key={role.title}
              href="/careers"
              className="px-3 py-2 rounded-xl bg-surface border border-border hover:border-brand/60 hover:bg-page transition-all flex items-center justify-between group"
            >
              <div className="min-w-0 flex-1 pr-2">
                <div className="text-[12px] font-bold text-ink truncate group-hover:text-brand transition-colors">
                  {role.title}
                </div>
                <div className="text-[10.5px] text-ink-muted flex items-center gap-1.5 mt-0.5">
                  <span>{role.dept}</span>
                  <span>•</span>
                  <span className="text-good font-medium">{role.comp}</span>
                </div>
              </div>
              <span className="text-xs text-ink-muted group-hover:text-brand group-hover:translate-x-0.5 transition-transform">
                →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

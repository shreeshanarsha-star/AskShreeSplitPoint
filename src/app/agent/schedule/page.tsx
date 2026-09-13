"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import Logo from "@/components/Logo";
import TopbarStatus from "@/components/TopbarStatus";

type AgentTask = {
  id: string;
  candidateName: string;
  role: string;
  roundName: string;
  panel: string;
  matchScore: number;
  status: "pending_dispatch" | "proposing_slots" | "confirmed" | "scheduled";
  confirmedSlot?: string;
  meetLink?: string;
  agentLog: string[];
};

const INITIAL_TASKS: AgentTask[] = [
  {
    id: "task-1",
    candidateName: "Alex Rivera",
    role: "Senior Full-Stack Engineer",
    roundName: "Technical Architecture Deep-Dive (60m)",
    panel: "David Miller (VP Eng) & Priya Patel (Architect)",
    matchScore: 94,
    status: "confirmed",
    confirmedSlot: "Tuesday, Sep 15 • 2:00 PM – 3:00 PM PST",
    meetLink: "https://meet.google.com/ask-shree-sync",
    agentLog: [
      "10:12:04 AM — Shree evaluated pre-screen transcript. Verified 94% fit with high-throughput distributed systems citations.",
      "10:12:15 AM — Scanned David Miller & Priya Patel Google Calendars: Found 3 mutual free windows.",
      "10:12:18 AM — Dispatched multi-channel scheduling invite via Email & SMS with one-click token.",
      "10:15:30 AM — Candidate selected Tuesday 2:00 PM PST. Reserved calendar holds.",
      "10:15:32 AM — Auto-generated Google Meet room & dispatched panel briefing notes with verbatim quotes.",
    ],
  },
  {
    id: "task-2",
    candidateName: "Elena Rostova",
    role: "Senior Full-Stack Engineer",
    roundName: "Hiring Manager 1-on-1 (45m)",
    panel: "David Miller (VP Engineering)",
    matchScore: 89,
    status: "proposing_slots",
    confirmedSlot: "Awaiting Candidate Slot Selection (3 windows offered)",
    agentLog: [
      "09:30:12 AM — Shree reviewed scorecard. Recommended advance to Hiring Manager stage.",
      "09:30:20 AM — Detected David Miller timezone preference (PST morning blocks).",
      "09:30:22 AM — Dispatched WhatsApp & Email invite offering Wed 11:00 AM, Thu 2:00 PM, and Fri 10:30 AM PST.",
      "09:45:00 AM — Candidate opened scheduling link (Session active).",
    ],
  },
  {
    id: "task-3",
    candidateName: "Marcus Vance",
    role: "Senior Full-Stack Engineer",
    roundName: "Shree Autonomous AI Pre-Screen (15m)",
    panel: "Shree AI Autonomous Screening Agent",
    matchScore: 85,
    status: "scheduled",
    confirmedSlot: "Today • Candidate Self-Paced (In-Browser Room)",
    meetLink: "/interview/cand-marcus-101",
    agentLog: [
      "08:14:02 AM — Candidate submitted Quick Apply on /careers.",
      "08:14:05 AM — Blind PII redaction completed; preliminary resume qualification approved.",
      "08:14:08 AM — Instant invitation dispatched to in-browser WebRTC room with BIPA consent gate.",
    ],
  },
];

export default function AgentSchedulingPage() {
  const [tasks, setTasks] = useState<AgentTask[]>(INITIAL_TASKS);
  const [selectedTaskId, setSelectedTaskId] = useState<string>("task-1");
  const [isSimulating, setIsSimulating] = useState(false);
  const [autonomousMode, setAutonomousMode] = useState(true);
  const [candidateDraftName, setCandidateDraftName] = useState("Priya Sharma");
  const [candidateDraftRole, setCandidateDraftRole] = useState("Enterprise Account Executive");

  const activeTask = tasks.find((t) => t.id === selectedTaskId) || tasks[0];

  function runAgentDispatchSimulation() {
    setIsSimulating(true);
    const newTask: AgentTask = {
      id: `task-${Date.now()}`,
      candidateName: candidateDraftName,
      role: candidateDraftRole,
      roundName: "Executive Leadership & Quota Review (45m)",
      panel: "Sarah Chen (Lead Recruiter) & VP Sales",
      matchScore: 91,
      status: "proposing_slots",
      confirmedSlot: "Agent calculating panel free windows...",
      agentLog: [
        "Just now — Shree triggered autonomous scheduling workflow.",
        "Scanning panel Google & Outlook calendars for conflict-free blocks...",
      ],
    };

    setTasks((prev) => [newTask, ...prev]);
    setSelectedTaskId(newTask.id);

    setTimeout(() => {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === newTask.id
            ? {
                ...t,
                agentLog: [
                  ...t.agentLog,
                  "Found 4 open windows across PST/EST panel zones.",
                  "Generated personalized email invite with smart self-booking magic token.",
                  "Dispatched invite to candidate inbox.",
                ],
                confirmedSlot: "Invited — Wed 10:00 AM or Thu 1:30 PM PST",
              }
            : t
        )
      );
      setIsSimulating(false);
    }, 2000);
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col">
      {/* Top Header */}
      <header className="px-6 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center gap-3">
          <Link
            href="/schedule"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500"
            title="Back to Scheduling Hub"
          >
            <Icon name="chevronLeft" size={16} />
          </Link>
          <Link href="/" className="group">
            <Logo height={28} showPunchline={true} />
          </Link>
          <span className="text-slate-300 dark:text-slate-700">/</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight">
                Autonomous Interview Scheduling Agent
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-md font-medium bg-brand-wash text-brand border border-brand/20">
                Agent Orchestration Layer
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-700 dark:text-slate-300">Autonomous Agent:</span>
            <button
              onClick={() => setAutonomousMode(!autonomousMode)}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                autonomousMode
                  ? "bg-emerald-600 text-white"
                  : "bg-amber-500 text-white"
              }`}
            >
              {autonomousMode ? "ENABLED (Auto-Dispatch)" : "SEMI-AUTONOMOUS (Human Review)"}
            </button>
          </div>

          <Link
            href="/schedule"
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Manual Calendar Grid
          </Link>
          <span className="w-px h-5 bg-border flex-shrink-0" />
          <TopbarStatus />
        </div>
      </header>

      {/* Main Command Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">

        {/* Agent Telemetry KPI Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-[11px] text-slate-500 font-medium block">Autonomous Scheduling Speed</span>
            <span className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400 block">4.2 mins</span>
            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
              vs. 3.5 days human calendar ping-pong
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-[11px] text-slate-500 font-medium block">Zero-Conflict Accuracy</span>
            <span className="text-2xl font-bold mt-1 block">99.8%</span>
            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
              Across Google &amp; Microsoft 365 calendars
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-[11px] text-slate-500 font-medium block">Active Agent Negotiating Threads</span>
            <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1 block">
              {tasks.length}
            </span>
            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
              Multi-channel (Email, SMS, Web)
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-[11px] text-slate-500 font-medium block">Candidate No-Show Rate</span>
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">1.8%</span>
            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
              Automated smart reminders &amp; prep brief
            </span>
          </div>
        </div>

        {/* Live Simulation Trigger Bar */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-850 to-slate-900 text-white flex flex-wrap items-center justify-between gap-4 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-200 font-semibold uppercase tracking-wider">
                Interactive Agent Control
              </span>
              <h2 className="text-sm sm:text-base font-bold">
                Test Shree Autonomous Interview Scheduling
              </h2>
            </div>
            <p className="text-xs text-indigo-200">
              Trigger the AI agent to scan panel availability, draft customized invites, and coordinate confirmation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={runAgentDispatchSimulation}
              disabled={isSimulating}
              className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <span>⚡</span>
              <span>{isSimulating ? "Agent Scheduling In Flight..." : "Simulate Agent Auto-Scheduling"}</span>
            </button>
          </div>
        </div>

        {/* 2-Column Split: Tasks & Agent Execution Log */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left 1 Col: Agent Scheduling Pipeline Tasks */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Agent Pipeline Queue ({tasks.length})
            </h3>

            {tasks.map((task) => {
              const isSelected = task.id === activeTask.id;
              return (
                <div
                  key={task.id}
                  onClick={() => setSelectedTaskId(task.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? "bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-600 shadow-xs"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-bold text-sm text-slate-900 dark:text-white block">
                        {task.candidateName}
                      </span>
                      <span className="text-[11px] text-slate-500 block">
                        {task.role}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        task.status === "confirmed"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : task.status === "proposing_slots"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          : "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                      }`}
                    >
                      {task.status === "confirmed"
                        ? "✓ Confirmed"
                        : task.status === "proposing_slots"
                        ? "Negotiating"
                        : "Scheduled"}
                    </span>
                  </div>

                  <div className="mt-2 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                    {task.roundName}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 truncate">
                    Panel: {task.panel}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right 2 Cols: Deep-Dive Agent Orchestration View */}
          <div className="lg:col-span-2 space-y-6">

            {/* Selected Task Overview */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xs space-y-5">
              
              <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                      {activeTask.candidateName}
                    </h2>
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      {activeTask.matchScore}% Shree Calibrated
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {activeTask.role} • Requisition Active
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/schedule/demo`}
                    target="_blank"
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 flex items-center gap-1"
                  >
                    <Icon name="external" size={12} />
                    View Candidate Token
                  </Link>
                  <button
                    onClick={() => alert(`Resending agent invite for ${activeTask.candidateName}`)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs"
                  >
                    Re-Dispatch Agent
                  </button>
                </div>
              </div>

              {/* Status Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-slate-400 font-medium block">Confirmed / Negotiated Slot</span>
                  <span className="font-bold text-slate-900 dark:text-white block">
                    {activeTask.confirmedSlot}
                  </span>
                  {activeTask.meetLink && (
                    <a
                      href={activeTask.meetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 dark:text-indigo-400 font-semibold inline-flex items-center gap-1 hover:underline mt-1"
                    >
                      <Icon name="external" size={11} /> Open Meeting Room
                    </a>
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-slate-400 font-medium block">Assigned Panelists</span>
                  <span className="font-bold text-slate-900 dark:text-white block">
                    {activeTask.panel}
                  </span>
                  <span className="text-slate-500 text-[11px] block">
                    Zero calendar conflicts detected
                  </span>
                </div>
              </div>

              {/* Autonomous Agent Execution Trace */}
              <div>
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Live Shree Agent Execution Log
                </h3>

                <div className="bg-slate-950 text-slate-200 p-4 rounded-xl font-mono text-xs space-y-2 border border-slate-800">
                  {activeTask.agentLog.map((logLine, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-indigo-400 select-none">›</span>
                      <span className="leading-relaxed">{logLine}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* What the Agent Did (Explainable AI Transparency) */}
              <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-xs space-y-2">
                <div className="font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                  <span>✨</span>
                  <span>Autonomous Actions Taken by Shree</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11.5px] text-slate-600 dark:text-slate-300">
                  <div className="p-2 rounded bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/30">
                    <strong className="block text-slate-900 dark:text-white mb-0.5">1. Calendar Crawl</strong>
                    Scanned 2 internal calendar schedules for free windows.
                  </div>
                  <div className="p-2 rounded bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/30">
                    <strong className="block text-slate-900 dark:text-white mb-0.5">2. Personalized Invite</strong>
                    Composed email citing candidate&apos;s specific backend strengths.
                  </div>
                  <div className="p-2 rounded bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/30">
                    <strong className="block text-slate-900 dark:text-white mb-0.5">3. Panel Prep Dossier</strong>
                    Attached verified transcript quotes &amp; 3 interview probes.
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>

      </main>
    </div>
  );
}

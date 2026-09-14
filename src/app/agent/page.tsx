"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import Logo from "@/components/Logo";
import TopbarStatus from "@/components/TopbarStatus";

type SubAgent = {
  id: string;
  name: string;
  role: string;
  icon: string;
  status: "active" | "standby" | "paused";
  mode: "autonomous" | "shadow_mode" | "paused";
  stats: string;
  statLabel: string;
  description: string;
  hubUrl: string;
  badge: string;
};

type AgentLogEvent = {
  id: string;
  timestamp: string;
  agentName: string;
  agentTag: string;
  level: "info" | "success" | "warning";
  message: string;
};

const INITIAL_SUB_AGENTS: SubAgent[] = [
  {
    id: "sourcing",
    name: "Sourcing & Ingestion Agent",
    role: "LinkedIn & External Talent Ingestion",
    icon: "sparkle",
    status: "active",
    mode: "autonomous",
    stats: "42 Candidates",
    statLabel: "Ingested this week",
    description: "Monitors LinkedIn Chrome Extension & Ingestion API. Automatically parses skills, experiences, and assigns candidates to open requisitions.",
    hubUrl: "/recruiter/extension",
    badge: "Milestone 1",
  },
  {
    id: "outreach",
    name: "Autonomous Outreach Agent",
    role: "InMail, Cold Email & WhatsApp Sequencer",
    icon: "megaphone",
    status: "active",
    mode: "autonomous",
    stats: "78.4%",
    statLabel: "Token open rate",
    description: "Crafts hyper-personalized invitations with embedded engagement tokens, turning cold sourced profiles into confirmed applicants.",
    hubUrl: "/recruiter",
    badge: "Milestone 2",
  },
  {
    id: "screening",
    name: "AI Pre-Screening Room Agent",
    role: "Voice STT & Competency Evaluator",
    icon: "award",
    status: "active",
    mode: "autonomous",
    stats: "85% Avg Fit",
    statLabel: "Objective score",
    description: "Conducts asynchronous interactive interviews, records speech-to-text transcriptions, and evaluates competency rubrics via Gemini.",
    hubUrl: "/candidate/prescreen",
    badge: "Milestone 3",
  },
  {
    id: "scheduling",
    name: "Calendar Negotiation Agent",
    role: "Smart Availability & Panel Sync",
    icon: "calendar",
    status: "active",
    mode: "autonomous",
    stats: "4.2 mins",
    statLabel: "Avg booking speed",
    description: "Calculates conflict-free business windows, generates Google Meet links, and dispatches RFC 5545 .ics invites without human ping-pong.",
    hubUrl: "/schedule",
    badge: "Milestone 4",
  },
  {
    id: "offer",
    name: "Executive Offer & Closing Agent",
    role: "Compensation Calibration & Digital eSign",
    icon: "penSignature",
    status: "active",
    mode: "shadow_mode",
    stats: "100%",
    statLabel: "Acceptance rate",
    description: "Synthesizes market-calibrated CTC breakdowns, formal appointment contracts, and captures legally binding digital signatures.",
    hubUrl: "/candidate/offer/e8445123-4d63-46a6-a2b2-a356f8d75195",
    badge: "Milestone 5",
  },
];

const INITIAL_LOGS: AgentLogEvent[] = [
  {
    id: "log-1",
    timestamp: "11:30:15 AM",
    agentName: "Closing Agent",
    agentTag: "OFFER",
    level: "success",
    message: "Candidate Aarav Sharma executed digital signature. Stage promoted to 'hired' (Req R-22082604).",
  },
  {
    id: "log-2",
    timestamp: "11:28:40 AM",
    agentName: "Scheduling Agent",
    agentTag: "CALENDAR",
    level: "info",
    message: "Google Meet room generated: https://meet.google.com/ask-yvk-lt1j. Calendar .ics dispatched to candidate inbox.",
  },
  {
    id: "log-3",
    timestamp: "11:25:12 AM",
    agentName: "Screening Agent",
    agentTag: "SCREEN",
    level: "success",
    message: "Pre-screen evaluated for Legal Counsel. Score 85% with verified corporate governance citations. Auto-promoted to 'hm_review'.",
  },
  {
    id: "log-4",
    timestamp: "11:22:04 AM",
    agentName: "Outreach Agent",
    agentTag: "ENGAGE",
    level: "info",
    message: "Candidate confirmed interest via Priority Career Invitation Portal. Transitioned from 'sourced' ➔ 'applied'.",
  },
  {
    id: "log-5",
    timestamp: "11:20:00 AM",
    agentName: "Sourcing Agent",
    agentTag: "INGEST",
    level: "info",
    message: "Candidate profile parsed from LinkedIn Extension (ID e8445123...). Assigned to Sourced Queue with stage: 'sourced'.",
  },
];

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function MasterAgentDashboardPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [userRoleLabel, setUserRoleLabel] = useState<string>("Talent Operator");

  const [agents, setAgents] = useState<SubAgent[]>(INITIAL_SUB_AGENTS);
  const [logs, setLogs] = useState<AgentLogEvent[]>(INITIAL_LOGS);
  const [masterAutonomy, setMasterAutonomy] = useState<"full" | "copilot" | "paused">("full");
  const [simulating, setSimulating] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("sourcing");
  const [apiPingStatus, setApiPingStatus] = useState<"idle" | "pinging" | "ok">("idle");

  useEffect(() => {
    async function verifyAccess() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login?next=/agent");
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("is_admin, org_role")
          .eq("id", user.id)
          .maybeSingle();

        const { data: userRoles } = await supabase
          .from("talent_user_roles")
          .select("role")
          .eq("user_id", user.id);

        const roles = (userRoles || []).map((r: { role: string }) => r.role);
        const isOwner = Boolean(profile?.is_admin);
        const isOrgAdmin = profile?.org_role === "org_admin";
        const isRecruiter = roles.some((r) =>
          ["recruiter", "ta_head", "lead_recruiter", "admin"].includes(r)
        );

        if (isOwner || isOrgAdmin || isRecruiter) {
          setAuthorized(true);
          setUserRoleLabel(
            isOwner
              ? "Platform Super Admin"
              : isOrgAdmin
              ? "Organization Admin"
              : "Lead Recruiter"
          );
        } else {
          setAuthorized(false);
        }
      } catch (err) {
        console.error("Auth check failed:", err);
      } finally {
        setCheckingAuth(false);
      }
    }
    verifyAccess();
  }, [router]);

  function toggleAgentMode(agentId: string) {
    setAgents((prev) =>
      prev.map((a) => {
        if (a.id !== agentId) return a;
        const nextMode =
          a.mode === "autonomous"
            ? "shadow_mode"
            : a.mode === "shadow_mode"
            ? "paused"
            : "autonomous";
        return {
          ...a,
          mode: nextMode,
          status: nextMode === "paused" ? "paused" : "active",
        };
      })
    );
  }

  async function testApiHealth() {
    setApiPingStatus("pinging");
    try {
      const res = await fetch("/api/v1/requisitions/active");
      if (res.ok) {
        setApiPingStatus("ok");
        setTimeout(() => setApiPingStatus("idle"), 3000);
      } else {
        setApiPingStatus("idle");
      }
    } catch {
      setApiPingStatus("idle");
    }
  }

  function runAgentSimulation() {
    setSimulating(true);
    const nowStr = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" });
    const newLog1: AgentLogEvent = {
      id: `log-${Date.now()}-1`,
      timestamp: nowStr,
      agentName: "Master Orchestrator",
      agentTag: "MASTER",
      level: "info",
      message: "⚡ Initiated autonomous sourcing scan across LinkedIn extension pool for active requisitions...",
    };

    setLogs((prev) => [newLog1, ...prev]);

    setTimeout(() => {
      const newLog2: AgentLogEvent = {
        id: `log-${Date.now()}-2`,
        timestamp: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" }),
        agentName: "Sourcing Agent",
        agentTag: "INGEST",
        level: "success",
        message: "✓ 3 high-affinity profiles matched (Fit > 88%). Ingested into Sourced Queue (stage: 'sourced').",
      };
      setLogs((prev) => [newLog2, ...prev]);
    }, 1200);

    setTimeout(() => {
      const newLog3: AgentLogEvent = {
        id: `log-${Date.now()}-3`,
        timestamp: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" }),
        agentName: "Outreach Agent",
        agentTag: "OUTREACH",
        level: "info",
        message: "Generated tailored InMail copy with secure engagement tokens. Dispatched to candidate queues.",
      };
      setLogs((prev) => [newLog3, ...prev]);
      setSimulating(false);
    }, 2400);
  }

  if (checkingAuth) {
    return (
      <div className="h-screen bg-page text-ink flex flex-col items-center justify-center">
        <div className="text-xs text-ink-muted flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
          Verifying Master Agent authorization…
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-page text-ink flex flex-col">
        <header className="px-6 py-3.5 border-b border-border bg-surface flex items-center justify-between">
          <Link href="/" className="hover:opacity-90 transition-opacity">
            <Logo height={28} showPunchline={true} />
          </Link>
          <TopbarStatus />
        </header>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-surface border border-border rounded-2xl p-8 text-center shadow-soft space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 flex items-center justify-center mx-auto text-amber-600 text-lg">
              🛡️
            </div>
            <h2 className="text-base font-bold text-ink font-display m-0">
              Access Restricted
            </h2>
            <p className="text-xs text-ink-muted leading-relaxed m-0">
              The <strong>Master AI Agent Mission Control</strong> is restricted to authorized Talent Acquisition personnel, Recruiters, TA Heads, and Organization Admins.
            </p>
            <div className="pt-2 flex items-center justify-center gap-2">
              <Link
                href="/"
                className="px-4 py-2 text-xs font-bold rounded-xl bg-brand text-white shadow-soft-sm hover:opacity-90"
              >
                Return to Career Portal
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) || agents[0];

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-page text-ink select-none">
      {/* Top Header */}
      <header className="px-5 py-3 border-b border-border bg-surface flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="hover:opacity-90 transition-opacity">
            <Logo height={26} showPunchline={true} />
          </Link>
          <span className="text-border">/</span>
          <div className="flex items-center gap-2">
            <h1 className="text-[13px] font-bold text-ink font-display m-0">
              Master AI Agent Mission Control
            </h1>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-wash text-brand border border-brand/20">
              Shree Autonomous Talent Partner
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Global Master Autonomy Switch */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-page border border-border text-[11px]">
            <span className="w-2 h-2 rounded-full bg-good animate-pulse" />
            <span className="text-ink-muted font-medium">Global Autonomy:</span>
            <button
              onClick={() =>
                setMasterAutonomy((curr) =>
                  curr === "full" ? "copilot" : curr === "copilot" ? "paused" : "full"
                )
              }
              className={`px-2 py-0.5 rounded-full font-bold text-[10px] transition-colors ${
                masterAutonomy === "full"
                  ? "bg-good text-white"
                  : masterAutonomy === "copilot"
                  ? "bg-amber-500 text-white"
                  : "bg-critical text-white"
              }`}
            >
              {masterAutonomy === "full"
                ? "FULL AUTONOMY (Self-Driving)"
                : masterAutonomy === "copilot"
                ? "COPILOT (Human-in-the-Loop)"
                : "PAUSED"}
            </button>
          </div>

          <button
            onClick={runAgentSimulation}
            disabled={simulating}
            className="flex items-center gap-1.5 px-3 py-1 text-[11.5px] font-bold rounded-full bg-brand text-white hover:opacity-90 transition-opacity shadow-soft-sm disabled:opacity-50"
          >
            <span>⚡</span>
            <span>{simulating ? "Executing Cycle…" : "Trigger Sourcing Cycle"}</span>
          </button>

          <span className="w-px h-4 bg-border flex-shrink-0" />
          <TopbarStatus />
        </div>
      </header>

      {/* Main Mission Control Canvas */}
      <main className="flex-1 min-h-0 p-4 grid grid-cols-12 gap-4">
        {/* Left Column: 5 Sub-Agents Pods (7 Cols) */}
        <div className="col-span-7 flex flex-col gap-3 min-h-0">
          {/* Top KPI Telemetry Banner */}
          <div className="grid grid-cols-4 gap-2.5 flex-shrink-0">
            <div className="p-3 rounded-xl bg-surface border border-border shadow-soft-sm">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted block">
                Active Sub-Agents
              </span>
              <span className="text-lg font-bold text-ink block mt-0.5">
                {agents.filter((a) => a.status === "active").length} / {agents.length} Online
              </span>
              <span className="text-[10px] text-good font-semibold">100% Pipeline Coverage</span>
            </div>

            <div className="p-3 rounded-xl bg-surface border border-border shadow-soft-sm">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted block">
                Autonomy Agreement
              </span>
              <span className="text-lg font-bold text-brand block mt-0.5">94.2%</span>
              <span className="text-[10px] text-ink-muted">Shadow mode trust index</span>
            </div>

            <div className="p-3 rounded-xl bg-surface border border-border shadow-soft-sm">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted block">
                Sourcing Ingestion
              </span>
              <span className="text-lg font-bold text-ink block mt-0.5">42 Candidates</span>
              <span className="text-[10px] text-ink-muted">Strict stage: &apos;sourced&apos;</span>
            </div>

            <div className="p-3 rounded-xl bg-surface border border-border shadow-soft-sm">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted block">
                API Health &amp; Gateway
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-good" />
                <span className="text-xs font-bold text-ink">Healthy</span>
                <button
                  onClick={testApiHealth}
                  className="text-[10px] text-brand font-bold underline ml-auto"
                >
                  {apiPingStatus === "pinging" ? "Pinging…" : apiPingStatus === "ok" ? "✓ 200 OK" : "Ping API"}
                </button>
              </div>
              <span className="text-[10px] text-ink-muted">Latency: ~48ms</span>
            </div>
          </div>

          {/* Sub-Agents Pod List */}
          <div className="flex-1 min-h-0 bg-surface border border-border rounded-xl p-3 shadow-soft flex flex-col gap-2">
            <div className="flex items-center justify-between pb-2 border-b border-border/70 flex-shrink-0">
              <div className="text-[11.5px] font-bold uppercase tracking-wider text-ink flex items-center gap-1.5 font-display">
                <span>Autonomous Sub-Agent Pods</span>
                <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-brand-wash text-brand border border-brand/20">
                  Self-Driving &amp; Copilot
                </span>
              </div>
              <span className="text-[11px] text-ink-muted">
                Click any agent pod to inspect telemetry &amp; controls
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-none">
              {agents.map((agent) => {
                const isSelected = agent.id === selectedAgent.id;
                return (
                  <div
                    key={agent.id}
                    onClick={() => setSelectedAgentId(agent.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? "bg-brand-wash/30 border-brand ring-1 ring-brand/30 shadow-soft-sm"
                        : "bg-page border-border hover:border-brand/40"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center text-brand flex-shrink-0 shadow-soft-sm">
                        <Icon name={agent.icon} size={15} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[12.5px] font-bold text-ink truncate font-display">
                            {agent.name}
                          </span>
                          <span className="text-[9.5px] px-1.5 py-0.2 rounded font-semibold bg-surface border border-border text-ink-muted">
                            {agent.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-ink-muted truncate m-0 mt-0.5">
                          {agent.role}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <span className="text-xs font-bold text-ink block">{agent.stats}</span>
                        <span className="text-[10px] text-ink-muted block">{agent.statLabel}</span>
                      </div>

                      {/* Autonomy Mode Toggle */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleAgentMode(agent.id);
                        }}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all shadow-soft-sm ${
                          agent.mode === "autonomous"
                            ? "bg-good-wash text-good-text border border-good/30"
                            : agent.mode === "shadow_mode"
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700"
                            : "bg-critical-wash text-critical border border-critical/30"
                        }`}
                      >
                        {agent.mode === "autonomous"
                          ? "● Auto-Drive"
                          : agent.mode === "shadow_mode"
                          ? "◐ Copilot Review"
                          : "○ Paused"}
                      </button>

                      <Link
                        href={agent.hubUrl}
                        onClick={(e) => e.stopPropagation()}
                        className="text-ink-muted hover:text-brand p-1 rounded transition-colors text-xs"
                        title="Open Dedicated Hub"
                      >
                        ↗
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Deep-Dive Agent Inspector & Live Telemetry Stream (5 Cols) */}
        <div className="col-span-5 flex flex-col gap-3 min-h-0">
          {/* Selected Sub-Agent Inspector Card */}
          <div className="bg-surface border border-border rounded-xl p-3.5 shadow-soft flex-shrink-0 flex flex-col gap-2.5">
            <div className="flex items-start justify-between gap-2 pb-2 border-b border-border/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand text-white flex items-center justify-center shadow-soft-sm">
                  <Icon name={selectedAgent.icon} size={16} />
                </div>
                <div>
                  <h2 className="text-[13px] font-bold text-ink font-display m-0">
                    {selectedAgent.name}
                  </h2>
                  <p className="text-[11px] text-ink-muted m-0">
                    {selectedAgent.role}
                  </p>
                </div>
              </div>
              <Link
                href={selectedAgent.hubUrl}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-page border border-border hover:border-brand text-ink transition-colors flex items-center gap-1"
              >
                <span>Launch Hub</span>
                <span>›</span>
              </Link>
            </div>

            <p className="text-[11.5px] text-ink-2 leading-relaxed m-0">
              {selectedAgent.description}
            </p>

            {/* Quick Actions & Connector Diagnostics */}
            <div className="pt-2 border-t border-border/70 grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded-lg bg-page border border-border flex flex-col gap-0.5">
                <span className="text-[10px] text-ink-muted font-medium">Connector Protocol</span>
                <span className="font-bold text-ink">
                  {selectedAgent.id === "sourcing"
                    ? "MV3 Chrome Ingestion API"
                    : selectedAgent.id === "outreach"
                    ? "InMail + SendGrid + WhatsApp"
                    : selectedAgent.id === "screening"
                    ? "WebRTC Audio + Gemini STT"
                    : selectedAgent.id === "scheduling"
                    ? "Google Calendar + Meet Sync"
                    : "Cryptographic SHA-256 eSign"}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-page border border-border flex flex-col gap-0.5">
                <span className="text-[10px] text-ink-muted font-medium">Security Gate</span>
                <span className="font-bold text-good">
                  {selectedAgent.id === "screening"
                    ? "BIPA & EU AI Act Consent"
                    : selectedAgent.id === "offer"
                    ? "Statutory Legal Timestamp"
                    : "x-api-key Auth Token"}
                </span>
              </div>
            </div>
          </div>

          {/* Live Terminal Telemetry Log */}
          <div className="flex-1 min-h-0 bg-surface border border-border rounded-xl p-3 shadow-soft flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-border/70 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-good animate-ping" />
                <h3 className="text-[11.5px] font-bold text-ink uppercase tracking-wider font-display m-0">
                  Live Agent Telemetry Stream
                </h3>
              </div>
              <span className="text-[10.5px] text-ink-muted">
                {logs.length} Events Logged
              </span>
            </div>

            {/* Terminal Log Output */}
            <div className="flex-1 overflow-y-auto space-y-2 pt-2 pr-1 font-mono text-[11px] leading-relaxed scrollbar-none">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="p-2 rounded-lg bg-page border border-border/70 flex items-start gap-2"
                >
                  <span className="text-ink-muted flex-shrink-0 text-[10px]">
                    {log.timestamp}
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9px] font-bold flex-shrink-0 ${
                      log.level === "success"
                        ? "bg-good-wash text-good-text border border-good/30"
                        : "bg-brand-wash text-brand border border-brand/20"
                    }`}
                  >
                    {log.agentTag}
                  </span>
                  <span className="text-ink-2 break-all">{log.message}</span>
                </div>
              ))}
            </div>

            {/* Bottom Connectors Status Bar */}
            <div className="pt-2 border-t border-border/70 flex items-center justify-between text-[10.5px] text-ink-muted flex-shrink-0">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-good" />
                  <span>LinkedIn Extension: Online</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-good" />
                  <span>Gemini 2.5: Active</span>
                </span>
              </div>
              <Link
                href="/recruiter"
                className="text-brand font-bold hover:underline"
              >
                Open Recruiter Cockpit ›
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

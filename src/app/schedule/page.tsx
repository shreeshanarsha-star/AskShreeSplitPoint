"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import Logo from "@/components/Logo";
import TopbarStatus from "@/components/TopbarStatus";

type InterviewRound = {
  id: string;
  name: string;
  duration: number; // in minutes
  description: string;
  defaultFormat: "google_meet" | "teams" | "zoom" | "shree_room";
};

const ROUND_TEMPLATES: InterviewRound[] = [
  {
    id: "r-shree",
    name: "Shree AI Pre-Screening",
    duration: 15,
    description: "In-browser speech & text verified screening against core competencies with zero-burn AI.",
    defaultFormat: "shree_room",
  },
  {
    id: "r-tech",
    name: "Technical Architecture Deep-Dive",
    duration: 60,
    description: "Distributed systems design, code quality evaluation, and API contract walk-through.",
    defaultFormat: "google_meet",
  },
  {
    id: "r-hm",
    name: "Hiring Manager 1-on-1",
    duration: 45,
    description: "Team fit, career trajectory, project ownership, and organizational alignment.",
    defaultFormat: "google_meet",
  },
  {
    id: "r-exec",
    name: "Executive Leadership & Culture",
    duration: 45,
    description: "Executive evaluation, high-stakes communication, and leadership ethos.",
    defaultFormat: "teams",
  },
];

const SAMPLE_SCHEDULED_INTERVIEWS = [
  {
    id: "sched-1",
    candidateName: "Alex Rivera",
    role: "Senior Full-Stack Engineer",
    roundName: "Technical Architecture Deep-Dive",
    interviewer: "David Miller (VP Eng) & Priya Patel (Architect)",
    scheduledDate: "Tomorrow, Sep 14",
    scheduledTime: "2:00 PM – 3:00 PM PST",
    format: "Google Meet",
    status: "confirmed",
    meetUrl: "https://meet.google.com/ask-shree-lead",
    shreeScore: 94,
  },
  {
    id: "sched-2",
    candidateName: "Elena Rostova",
    role: "Senior Full-Stack Engineer",
    roundName: "Hiring Manager 1-on-1",
    interviewer: "David Miller (VP Engineering)",
    scheduledDate: "Wednesday, Sep 16",
    scheduledTime: "11:00 AM – 11:45 AM PST",
    format: "Google Meet",
    status: "confirmed",
    meetUrl: "https://meet.google.com/hm-elena-sync",
    shreeScore: 89,
  },
  {
    id: "sched-3",
    candidateName: "Marcus Vance",
    role: "Senior Full-Stack Engineer",
    roundName: "Shree AI Pre-Screening",
    interviewer: "Shree AI Autonomous Room",
    scheduledDate: "Today, Sep 13",
    scheduledTime: "Self-scheduled by candidate",
    format: "Shree In-Browser AI Room",
    status: "in_progress",
    meetUrl: "/interview/cand-marcus-101",
    shreeScore: 85,
  },
];

export default function InterviewSchedulingPage() {
  const [activeTab, setActiveTab] = useState<"book" | "calendar" | "templates">("book");
  
  // Booking Form State
  const [selectedCandidate, setSelectedCandidate] = useState("Alex Rivera (Senior Full-Stack Engineer)");
  const [selectedRound, setSelectedRound] = useState<string>("r-tech");
  const [selectedDate, setSelectedDate] = useState("2026-09-15");
  const [selectedTime, setSelectedTime] = useState("14:00");
  const [selectedTimezone, setSelectedTimezone] = useState("America/Los_Angeles (PST)");
  const [meetingFormat, setMeetingFormat] = useState<"google_meet" | "teams" | "zoom" | "shree_room">("google_meet");
  const [interviewerNames, setInterviewerNames] = useState("David Miller (VP Eng), Priya Patel (Staff Architect)");
  const [includeShreeBrief, setIncludeShreeBrief] = useState(true);
  
  // Link generation & submission
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const currentRound = ROUND_TEMPLATES.find((r) => r.id === selectedRound) || ROUND_TEMPLATES[1];

  function handleScheduleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBookingSuccess(true);
    setTimeout(() => {
      setBookingSuccess(false);
      setActiveTab("calendar");
    }, 1800);
  }

  function handleCopyMagicLink() {
    const url = `${typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/schedule/demo`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  }

  return (
    <div className="min-h-screen bg-page text-ink flex flex-col font-sans">
      {/* Top Header */}
      <header className="px-6 py-3.5 bg-surface border-b border-border flex items-center justify-between sticky top-0 z-30 shadow-soft">
        <div className="flex items-center gap-3">
          <Link
            href="/recruiter"
            className="p-1.5 rounded-lg border border-border hover:bg-brand-wash transition-colors text-ink-muted"
            title="Back to Recruiter Console"
          >
            <Icon name="chevronLeft" size={16} />
          </Link>
          <Link href="/" className="group">
            <Logo height={28} showPunchline={true} />
          </Link>
          <span className="text-border">/</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-ink font-display">
                Interview Scheduling Hub
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-md font-medium bg-good-wash text-good-text border border-good/20">
                Zero-Conflict Engine
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={handleCopyMagicLink}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-brand/30 text-brand bg-brand-wash hover:opacity-90 transition-colors flex items-center gap-1.5"
          >
            <Icon name="share" size={13} />
            {copiedLink ? "✓ Copied!" : "Copy Booking Link"}
          </button>
          <Link
            href="/schedule/demo"
            target="_blank"
            className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-border text-ink hover:bg-brand-wash transition-colors flex items-center gap-1 hidden sm:flex"
          >
            <span>Candidate View</span>
            <Icon name="chevronRight" size={13} />
          </Link>
          <span className="w-px h-5 bg-border flex-shrink-0" />
          <TopbarStatus />
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <button
            onClick={() => setActiveTab("book")}
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 ${
              activeTab === "book"
                ? "bg-brand text-white shadow-button"
                : "text-ink-muted hover:bg-surface"
            }`}
          >
            <Icon name="calendar" size={14} /> Schedule Interview
          </button>
          <button
            onClick={() => setActiveTab("calendar")}
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 ${
              activeTab === "calendar"
                ? "bg-brand text-white shadow-button"
                : "text-ink-muted hover:bg-surface"
            }`}
          >
            <Icon name="users" size={14} /> Active Schedule Queue ({SAMPLE_SCHEDULED_INTERVIEWS.length})
          </button>
          <button
            onClick={() => setActiveTab("templates")}
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 ${
              activeTab === "templates"
                ? "bg-brand text-white shadow-button"
                : "text-ink-muted hover:bg-surface"
            }`}
          >
            <span>✨</span> Round Templates &amp; AI Briefings
          </button>
        </div>

        {/* TAB 1: SCHEDULE INTERVIEW FORM */}
        {activeTab === "book" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left 2 Cols: Interactive Scheduling Form */}
            <div className="lg:col-span-2 space-y-6">
              
              {bookingSuccess && (
                <div className="p-4 rounded-2xl bg-good-wash border border-good/20 text-good-text text-xs font-semibold flex items-center gap-2 shadow-soft">
                  <span>✓</span>
                  Interview successfully scheduled! Calendar invites &amp; AI candidate briefs dispatched to panel.
                </div>
              )}

              <form onSubmit={handleScheduleSubmit} className="space-y-6">
                
                {/* 1. Candidate & Role Selection */}
                <div className="bg-surface border border-border rounded-2xl p-5 shadow-soft space-y-4">
                  <h2 className="text-sm font-bold text-ink flex items-center gap-2 font-display">
                    <Icon name="users" size={15} />
                    1. Candidate &amp; Target Requisition
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-ink-muted mb-1">
                        Select Candidate *
                      </label>
                      <select
                        value={selectedCandidate}
                        onChange={(e) => setSelectedCandidate(e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-border bg-page text-ink focus:border-brand focus:outline-none"
                      >
                        <option value="Alex Rivera (Senior Full-Stack Engineer)">
                          Alex Rivera (94% Match — Staff Backend)
                        </option>
                        <option value="Elena Rostova (Senior Full-Stack Engineer)">
                          Elena Rostova (89% Match — Senior SE)
                        </option>
                        <option value="Marcus Vance (Senior Full-Stack Engineer)">
                          Marcus Vance (85% Match — Full Stack)
                        </option>
                        <option value="Priya Sharma (Enterprise Account Executive)">
                          Priya Sharma (86% Match — Sales Director)
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-ink-muted mb-1">
                        Interview Round Stage
                      </label>
                      <select
                        value={selectedRound}
                        onChange={(e) => setSelectedRound(e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-border bg-page text-ink focus:border-brand focus:outline-none"
                      >
                        {ROUND_TEMPLATES.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name} ({r.duration} mins)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* 2. Date, Time & Panelists */}
                <div className="bg-surface border border-border rounded-2xl p-5 shadow-soft space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-ink flex items-center gap-2 font-display">
                      <Icon name="calendar" size={15} />
                      2. Date, Time &amp; Panelists
                    </h2>
                    <span className="text-[10px] font-semibold text-brand px-2.5 py-0.5 rounded-full bg-brand-wash border border-brand/20 flex items-center gap-1">
                      <span>⚡</span> Auto-Detected Panel Free Windows
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-ink-muted mb-1">
                        Interview Date
                      </label>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-border bg-page text-ink focus:border-brand focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-ink-muted mb-1">
                        Start Time
                      </label>
                      <select
                        value={selectedTime}
                        onChange={(e) => setSelectedTime(e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-border bg-page text-ink focus:border-brand focus:outline-none"
                      >
                        <option value="09:00">09:00 AM</option>
                        <option value="10:30">10:30 AM</option>
                        <option value="11:30">11:30 AM</option>
                        <option value="13:00">01:00 PM</option>
                        <option value="14:00">02:00 PM (Recommended)</option>
                        <option value="15:30">03:30 PM</option>
                        <option value="16:30">04:30 PM</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-ink-muted mb-1">
                        Time Zone
                      </label>
                      <select
                        value={selectedTimezone}
                        onChange={(e) => setSelectedTimezone(e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-border bg-page text-ink focus:border-brand focus:outline-none"
                      >
                        <option value="America/Los_Angeles (PST)">America/Los_Angeles (PST / UTC-8)</option>
                        <option value="America/New_York (EST)">America/New_York (EST / UTC-5)</option>
                        <option value="Asia/Kolkata (IST)">Asia/Kolkata (IST / UTC+5:30)</option>
                        <option value="Europe/London (GMT)">Europe/London (GMT / UTC+0)</option>
                        <option value="Europe/Berlin (CET)">Europe/Berlin (CET / UTC+1)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink-muted mb-1">
                      Assigned Panelists &amp; Interviewers
                    </label>
                    <input
                      type="text"
                      value={interviewerNames}
                      onChange={(e) => setInterviewerNames(e.target.value)}
                      placeholder="e.g. David Miller (VP Eng), Priya Patel (Staff Architect)"
                      className="w-full text-xs px-3 py-2 rounded-xl border border-border bg-page text-ink focus:border-brand focus:outline-none"
                    />
                    <p className="text-[11px] text-ink-muted mt-1">
                      Interviewers automatically receive Google Calendar / Outlook invites with candidate resume and Shree AI briefing notes attached.
                    </p>
                  </div>
                </div>

                {/* 3. Meeting Format & Smart Briefing */}
                <div className="bg-surface border border-border rounded-2xl p-5 shadow-soft space-y-4">
                  <h2 className="text-sm font-bold text-ink flex items-center gap-2 font-display">
                    <Icon name="globe" size={15} />
                    3. Video Meeting Room &amp; AI Briefing Integration
                  </h2>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <button
                      type="button"
                      onClick={() => setMeetingFormat("google_meet")}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        meetingFormat === "google_meet"
                          ? "border-brand bg-brand-wash text-brand shadow-xs font-bold"
                          : "border-border bg-surface hover:border-brand/40 text-ink"
                      }`}
                    >
                      <div className="text-xs font-bold">Google Meet</div>
                      <div className="text-[10px] text-ink-muted mt-0.5">Auto-generates link</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMeetingFormat("teams")}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        meetingFormat === "teams"
                          ? "border-brand bg-brand-wash text-brand shadow-xs font-bold"
                          : "border-border bg-surface hover:border-brand/40 text-ink"
                      }`}
                    >
                      <div className="text-xs font-bold">MS Teams</div>
                      <div className="text-[10px] text-ink-muted mt-0.5">Enterprise calendar</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMeetingFormat("zoom")}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        meetingFormat === "zoom"
                          ? "border-brand bg-brand-wash text-brand shadow-xs font-bold"
                          : "border-border bg-surface hover:border-brand/40 text-ink"
                      }`}
                    >
                      <div className="text-xs font-bold">Zoom Video</div>
                      <div className="text-[10px] text-ink-muted mt-0.5">Direct API room</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMeetingFormat("shree_room")}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        meetingFormat === "shree_room"
                          ? "border-brand bg-brand-wash text-brand shadow-xs font-bold"
                          : "border-border bg-surface hover:border-brand/40 text-ink"
                      }`}
                    >
                      <div className="text-xs font-bold">✨ Shree AI Room</div>
                      <div className="text-[10px] text-brand/80 mt-0.5">Zero-burn in-browser</div>
                    </button>
                  </div>

                  <div className="p-3 rounded-xl bg-page border border-border flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="shreeBrief"
                      checked={includeShreeBrief}
                      onChange={(e) => setIncludeShreeBrief(e.target.checked)}
                      className="mt-0.5 rounded border-border text-brand focus:ring-brand"
                    />
                    <div>
                      <label htmlFor="shreeBrief" className="text-xs font-bold text-ink cursor-pointer">
                        Attach Shree AI Interview Prep Brief to Calendar Invite
                      </label>
                      <p className="text-[11px] text-ink-muted mt-0.5">
                        Provides interviewers with verified quote citations, detected skill gaps, and 3 high-signal interview questions tailored to the candidate&apos;s background.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCopyMagicLink}
                    className="px-4 py-2 text-xs font-semibold rounded-xl border border-border text-ink hover:bg-brand-wash transition-colors"
                  >
                    Send Self-Schedule Link to Candidate
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-semibold rounded-xl bg-brand hover:bg-brand-hover text-white shadow-button transition-colors flex items-center gap-1.5"
                  >
                    <Icon name="checkCircle" size={14} />
                    Confirm &amp; Send Calendar Invites
                  </button>
                </div>

              </form>

            </div>

            {/* Right 1 Col: Live Meeting Card Preview & Prep Brief */}
            <div className="space-y-4">
              <div className="sticky top-20 space-y-4">
                
                {/* Live Invite Card */}
                <div className="bg-surface border border-border rounded-2xl p-5 shadow-soft space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <span className="text-xs font-bold text-ink-muted uppercase tracking-wider">
                      Calendar Invitation Preview
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-good-wash text-good-text border border-good/20">
                      {currentRound.duration} mins
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-ink font-display">
                      {currentRound.name}
                    </h3>
                    <p className="text-xs text-ink-muted mt-0.5">
                      Candidate: <strong className="text-ink">{selectedCandidate.split("(")[0]}</strong>
                    </p>
                  </div>

                  <div className="space-y-1.5 text-xs text-ink-muted">
                    <div className="flex items-center gap-2">
                      <Icon name="calendar" size={13} className="text-ink-muted" />
                      <span className="text-ink">{selectedDate} at {selectedTime}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Icon name="globe" size={13} className="text-ink-muted" />
                      <span className="truncate">{selectedTimezone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Icon name="users" size={13} className="text-ink-muted" />
                      <span className="truncate">{interviewerNames}</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-brand-wash border border-brand/20 text-xs">
                    <span className="font-semibold text-brand block mb-1">
                      Meeting Link:
                    </span>
                    <span className="text-[11px] text-ink font-mono break-all">
                      {meetingFormat === "google_meet"
                        ? "https://meet.google.com/ask-shree-sync"
                        : meetingFormat === "shree_room"
                        ? "http://localhost:3000/interview/demo"
                        : "https://teams.microsoft.com/l/meetup-join/..."}
                    </span>
                  </div>
                </div>

                {/* Shree Autonomous Prep Brief Card */}
                {includeShreeBrief && (
                  <div className="p-4 rounded-2xl bg-brand-wash/50 border border-brand/20 text-xs space-y-2.5 shadow-soft">
                    <div className="flex items-center gap-1.5 font-bold text-brand">
                      <span>✨</span>
                      <span>Attached AI Panel Brief</span>
                    </div>
                    <p className="text-[11.5px] text-ink leading-relaxed">
                      &ldquo;Alex demonstrated exceptional distributed architecture pedigree handling 2B+ daily financial transactions. Recommend probing multi-region PostgreSQL failover.&rdquo;
                    </p>
                    <div className="text-[11px] text-brand font-medium">
                      ✓ 3 suggested technical probes included
                    </div>
                  </div>
                )}

              </div>
            </div>

          </div>
        )}

        {/* TAB 2: ACTIVE SCHEDULE QUEUE */}
        {activeTab === "calendar" && (
          <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-soft">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-ink font-display">
                  Confirmed &amp; Upcoming Interviews
                </h3>
                <p className="text-xs text-ink-muted">
                  Real-time calendar sync across engineering, HR, and executive panels
                </p>
              </div>
              <button
                onClick={() => setActiveTab("book")}
                className="px-3.5 py-1.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-semibold shadow-button flex items-center gap-1 transition-colors"
              >
                <span>+</span>
                <span>Schedule New</span>
              </button>
            </div>

            <div className="divide-y divide-border text-xs">
              {SAMPLE_SCHEDULED_INTERVIEWS.map((item) => (
                <div key={item.id} className="p-4 flex flex-wrap items-center justify-between gap-4 hover:bg-brand-wash/30 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-ink">
                        {item.candidateName}
                      </span>
                      <span className="text-[11px] text-ink-muted">• {item.role}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-good-wash text-good-text border border-good/20">
                        {item.shreeScore}% Shree Fit
                      </span>
                    </div>
                    <div className="text-ink-muted flex items-center gap-3 text-[11.5px]">
                      <span className="font-semibold text-brand">
                        {item.roundName}
                      </span>
                      <span>•</span>
                      <span>{item.scheduledDate} ({item.scheduledTime})</span>
                      <span>•</span>
                      <span>Panel: {item.interviewer}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={item.meetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl border border-border text-ink hover:bg-brand-wash font-medium transition-colors flex items-center gap-1"
                    >
                      <Icon name="external" size={12} />
                      Join {item.format.split(" ")[0]}
                    </a>
                    <button
                      onClick={() => alert(`Reschedule request sent for ${item.candidateName}`)}
                      className="px-3 py-1.5 rounded-xl border border-border text-ink-muted hover:text-ink transition-colors"
                    >
                      Reschedule
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: ROUND TEMPLATES & BRIEFINGS */}
        {activeTab === "templates" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ROUND_TEMPLATES.map((tmpl) => (
              <div key={tmpl.id} className="p-5 rounded-2xl bg-surface border border-border shadow-soft space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-ink font-display">
                    {tmpl.name}
                  </h3>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-page border border-border text-ink-muted">
                    {tmpl.duration} Minutes
                  </span>
                </div>
                <p className="text-xs text-ink-muted leading-relaxed">
                  {tmpl.description}
                </p>
                <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-ink-muted">
                  <span>Default Room: <strong className="capitalize text-ink">{tmpl.defaultFormat.replace("_", " ")}</strong></span>
                  <button
                    onClick={() => {
                      setSelectedRound(tmpl.id);
                      setActiveTab("book");
                    }}
                    className="text-brand font-semibold hover:underline"
                  >
                    Schedule with this round →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  );
}

"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import Icon from "./Icon";
import { createClient } from "@/lib/supabase/client";

type ToolCategory = "all" | "departments" | "talent" | "legal_ops" | "productivity" | "enterprise";

export type RoleClearance =
  | "candidate"
  | "public"
  | "recruiter"
  | "hiring_manager"
  | "internal"
  | "org_admin"
  | "platform_admin";

type ToolItem = {
  name: string;
  desc: string;
  href: string;
  category: "departments" | "talent" | "legal_ops" | "productivity" | "enterprise";
  icon: string;
  badge?: string;
  color: string;
  isExternal?: boolean;
  allowedRoles: RoleClearance[];
};

export type GuestToolId =
  | "atsScan"
  | "cvBuilder"
  | "voiceAi"
  | "calendarBooking"
  | "referCredits"
  | "salaryTrend"
  | "targetMatch"
  | "scalesOffer"
  | "notepadJotz"
  | "calendarPlanner"
  | "manualHandbook";

interface GuestTool {
  name: string;
  desc: string;
  href: string;
  badge: string;
  badgeColor: string;
  tileClass: string;
  iconId: GuestToolId;
  spanTwo?: boolean;
}

const GUEST_TOOLS: GuestTool[] = [
  {
    name: "Prepare ATS CV",
    desc: "ATS match score, keyword gaps & 1-click format fix",
    href: "/candidate/ats-check",
    badge: "Popular",
    badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    tileClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    iconId: "atsScan",
  },
  {
    name: "Create My CV",
    desc: "AI resume builder & LinkedIn profile import",
    href: "/candidate/resume-builder",
    badge: "AI Builder",
    badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    tileClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    iconId: "cvBuilder",
  },
  {
    name: "Interview Prep",
    desc: "Live AI mock interview with STAR rubric scoring",
    href: "/interview-prep",
    badge: "Voice AI",
    badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    tileClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    iconId: "voiceAi",
  },
  {
    name: "Schedule My Interview",
    desc: "Autonomous calendar slot selection & room sync",
    href: "/schedule",
    badge: "Booking",
    badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    tileClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    iconId: "calendarBooking",
  },
  {
    name: "Refer & Earn",
    desc: "Share open jobs with peers & earn credits",
    href: "/refer",
    badge: "Earn Credits",
    badgeColor: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    tileClass: "bg-amber-500/15 text-amber-500 border-amber-500/30",
    iconId: "referCredits",
  },
  {
    name: "Salary Benchmark",
    desc: "Live compensation percentiles & market data",
    href: "/salary-benchmark",
    badge: "Market Intel",
    badgeColor: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
    tileClass: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
    iconId: "salaryTrend",
  },
  {
    name: "Job Fit Analyzer",
    desc: "1-click compatibility score against active roles",
    href: "/candidate/job-fit",
    badge: "Instant Match",
    badgeColor: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    tileClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    iconId: "targetMatch",
  },
  {
    name: "Offer Letter Analyzer",
    desc: "ESOP equity value, bonus & clause risk review",
    href: "/candidate/offer-analyzer",
    badge: "Offer Intel",
    badgeColor: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    tileClass: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    iconId: "scalesOffer",
  },
  {
    name: "Jotz",
    desc: "Distraction-free markdown notes & prep pad",
    href: "/jotz",
    badge: "Scratchpad",
    badgeColor: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    tileClass: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    iconId: "notepadJotz",
  },
  {
    name: "Calendar",
    desc: "Schedule viewer & interview timelines",
    href: "/calendar",
    badge: "Planner",
    badgeColor: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    tileClass: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    iconId: "calendarPlanner",
  },
  {
    name: "User Manual & Platform Guide",
    desc: "Shree AI explainability guide, ethics audits & candidate privacy",
    href: "/manual",
    badge: "Transparency",
    badgeColor: "bg-stone-500/15 text-stone-600 dark:text-stone-300 border-stone-500/30",
    tileClass: "bg-stone-500/10 text-stone-600 dark:text-stone-300 border-stone-500/20",
    iconId: "manualHandbook",
    spanTwo: true,
  },
];

function PremiumIcon({ id, className = "w-4 h-4" }: { id: GuestToolId; className?: string }) {
  switch (id) {
    case "atsScan":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="9" y1="12" x2="15" y2="12" />
          <line x1="9" y1="16" x2="13" y2="16" />
          <circle cx="16.5" cy="16.5" r="3.5" fill="currentColor" fillOpacity={0.2} stroke="currentColor" strokeWidth={1.5} />
          <path d="m15.5 16.5 1 1 2-2" stroke="currentColor" strokeWidth={1.5} />
        </svg>
      );
    case "cvBuilder":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <path d="M10 13l4-4 2 2-4 4H10v-2z" fill="currentColor" fillOpacity={0.25} stroke="currentColor" strokeWidth={1.4} />
          <line x1="8" y1="18" x2="16" y2="18" strokeWidth={1.5} />
        </svg>
      );
    case "voiceAi":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="2" width="6" height="12" rx="3" fill="currentColor" fillOpacity={0.2} />
          <path d="M5 10a7 7 0 0 0 14 0" />
          <line x1="12" y1="17" x2="12" y2="21" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <path d="M2 10v1 M22 10v1" strokeWidth={2} />
        </svg>
      );
    case "calendarBooking":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="17" rx="3" />
          <line x1="16" y1="2" x2="16" y2="6" strokeWidth={2} />
          <line x1="8" y1="2" x2="8" y2="6" strokeWidth={2} />
          <line x1="3" y1="9" x2="21" y2="9" />
          <circle cx="15.5" cy="15.5" r="3.5" fill="currentColor" fillOpacity={0.25} stroke="currentColor" strokeWidth={1.5} />
          <polyline points="15.5 14 15.5 15.5 17 16" stroke="currentColor" strokeWidth={1.5} />
        </svg>
      );
    case "referCredits":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="8" width="18" height="13" rx="2" fill="currentColor" fillOpacity={0.15} />
          <line x1="12" y1="8" x2="12" y2="21" strokeWidth={2} />
          <line x1="3" y1="13" x2="21" y2="13" />
          <path d="M12 8H7.5a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8z" fill="currentColor" fillOpacity={0.25} />
          <path d="M12 8h4.5a2.5 2.5 0 0 0 0-5C13 3 12 8 12 8z" fill="currentColor" fillOpacity={0.25} />
          <circle cx="19" cy="4" r="1.5" fill="currentColor" stroke="none" />
        </svg>
      );
    case "salaryTrend":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="13" width="3.5" height="8" rx="1" fill="currentColor" fillOpacity={0.2} />
          <rect x="10.25" y="8.5" width="3.5" height="12.5" rx="1" fill="currentColor" fillOpacity={0.3} />
          <rect x="16.5" y="4" width="3.5" height="17" rx="1" fill="currentColor" fillOpacity={0.4} />
          <polyline points="4 10 10.5 5.5 16 7.5 20.5 3" strokeWidth={2} />
          <polyline points="17 3 20.5 3 20.5 6.5" strokeWidth={2} />
        </svg>
      );
    case "targetMatch":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" strokeWidth={1.6} />
          <circle cx="12" cy="12" r="5.5" strokeWidth={1.4} strokeDasharray="2 2" />
          <circle cx="12" cy="12" r="2.5" fill="currentColor" />
          <line x1="12" y1="2" x2="12" y2="5" strokeWidth={2} />
          <line x1="12" y1="19" x2="12" y2="22" strokeWidth={2} />
          <line x1="2" y1="12" x2="5" y2="12" strokeWidth={2} />
          <line x1="19" y1="12" x2="22" y2="12" strokeWidth={2} />
        </svg>
      );
    case "scalesOffer":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="3" x2="12" y2="21" strokeWidth={2} />
          <line x1="5" y1="7" x2="19" y2="7" strokeWidth={2} />
          <path d="m5 7-3 6a3 3 0 0 0 6 0z" fill="currentColor" fillOpacity={0.25} />
          <path d="m19 7-3 6a3 3 0 0 0 6 0z" fill="currentColor" fillOpacity={0.25} />
          <line x1="9" y1="21" x2="15" y2="21" strokeWidth={2} />
        </svg>
      );
    case "notepadJotz":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="3" width="16" height="18" rx="2.5" fill="currentColor" fillOpacity={0.12} />
          <line x1="8" y1="7.5" x2="16" y2="7.5" strokeWidth={1.8} />
          <line x1="8" y1="11.5" x2="14" y2="11.5" strokeWidth={1.8} />
          <line x1="8" y1="15.5" x2="12" y2="15.5" strokeWidth={1.8} />
          <circle cx="16.5" cy="15.5" r="1.5" fill="currentColor" stroke="none" />
        </svg>
      );
    case "calendarPlanner":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="17" rx="3" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="8" y1="2" x2="8" y2="5" strokeWidth={2} />
          <line x1="16" y1="2" x2="16" y2="5" strokeWidth={2} />
          <circle cx="7.5" cy="13" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="12" cy="13" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="16.5" cy="13" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="7.5" cy="17" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="12" cy="17" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="16.5" cy="17" r="1.2" fill="currentColor" stroke="none" />
        </svg>
      );
    case "manualHandbook":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" fill="currentColor" fillOpacity={0.15} />
          <path d="M12 2v7l2.5-2 2.5 2V2" fill="currentColor" fillOpacity={0.3} strokeWidth={1.2} />
          <line x1="9" y1="12" x2="15" y2="12" strokeWidth={1.5} />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth={1.8}>
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
  }
}

const ALL_WAFFLE_TOOLS: ToolItem[] = [
  // AI SYSTEMS & WORKSPACES — BY DEPARTMENT (Internal Enterprise)
  {
    name: "Human Resources & Talent",
    desc: "Autonomous AI sourcing, screening, interviews, offers, & requisitions",
    href: "/departments/hr",
    category: "departments",
    icon: "users",
    badge: "Department",
    color: "bg-brand-wash text-brand border-brand/30",
    allowedRoles: ["recruiter", "internal", "org_admin", "platform_admin"],
  },
  {
    name: "Legal & Compliance",
    desc: "Contract review, offer agreements, & cryptographic eSign",
    href: "/departments/legal",
    category: "departments",
    icon: "scale",
    badge: "Department",
    color: "bg-slate-100 text-slate-900 border-slate-300 dark:bg-slate-800 dark:text-slate-200",
    allowedRoles: ["internal", "org_admin", "platform_admin"],
  },
  {
    name: "IT & Communication",
    desc: "Real-time team messaging & organizational channels",
    href: "/departments/it",
    category: "departments",
    icon: "database",
    badge: "Department",
    color: "bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-950/50 dark:text-sky-300",
    allowedRoles: ["internal", "org_admin", "platform_admin"],
  },
  {
    name: "Customer Success & Support",
    desc: "Autonomous support triage & Gauri.ai specialized copilot",
    href: "/departments/support",
    category: "departments",
    icon: "headset",
    badge: "Department",
    color: "bg-lime-100 text-lime-900 border-lime-300 dark:bg-lime-950/50 dark:text-lime-300",
    allowedRoles: ["internal", "org_admin", "platform_admin"],
  },
  {
    name: "Personal Tools",
    desc: "Everyday workspace: Calculator, Notes, To-Do, & Calendar",
    href: "/departments/widgets",
    category: "departments",
    icon: "grid",
    badge: "Personal",
    color: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300",
    allowedRoles: ["public", "candidate", "recruiter", "hiring_manager", "internal", "org_admin", "platform_admin"],
  },

  // TALENT & RECRUITMENT
  {
    name: "Open Roles & AI Studio",
    desc: "Live job openings, role discovery & AI candidate studio",
    href: "/",
    category: "talent",
    icon: "users",
    badge: "Front Door",
    color: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300",
    allowedRoles: ["public", "candidate", "recruiter", "hiring_manager", "internal", "org_admin", "platform_admin"],
  },
  {
    name: "Master AI Agent Mission Control",
    desc: "Autonomous command center for all 5 hiring sub-agents",
    href: "/agent",
    category: "talent",
    icon: "sparkle",
    badge: "Master AI",
    color: "bg-brand text-white border-brand shadow-soft-sm",
    allowedRoles: ["recruiter", "org_admin", "platform_admin"],
  },
  {
    name: "Recruiter Cockpit",
    desc: "Shadow Mode queue & sourcing triage (Recruiters only)",
    href: "/recruiter",
    category: "talent",
    icon: "briefcase",
    badge: "Recruiter Auth",
    color: "bg-brand-wash text-brand border-brand/30",
    allowedRoles: ["recruiter", "org_admin", "platform_admin"],
  },
  {
    name: "Hiring Manager Portal",
    desc: "Calibrated candidate review, fit analysis & 1-click decisions",
    href: "/hm",
    category: "talent",
    icon: "users",
    badge: "HM Auth",
    color: "bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-950/50 dark:text-indigo-300",
    allowedRoles: ["hiring_manager", "recruiter", "org_admin", "platform_admin"],
  },
  {
    name: "Sourcing Chrome Extension",
    desc: "1-Click candidate ingestion from LinkedIn & GitHub",
    href: "/recruiter/extension",
    category: "talent",
    icon: "sparkle",
    badge: "Extension",
    color: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300",
    allowedRoles: ["recruiter", "org_admin", "platform_admin"],
  },
  {
    name: "Candidate Talent Portal",
    desc: "Application tracker, referrals, ATS CV optimizer & interview prep",
    href: "/candidate",
    category: "talent",
    icon: "check",
    color: "bg-teal-100 text-teal-900 border-teal-300 dark:bg-teal-950/50 dark:text-teal-300",
    allowedRoles: ["public", "candidate", "recruiter", "hiring_manager", "internal", "org_admin", "platform_admin"],
  },
  {
    name: "Interview.ai & Calendar",
    desc: "Autonomous scheduling & virtual rooms",
    href: "/schedule",
    category: "talent",
    icon: "calendar",
    color: "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300",
    allowedRoles: ["public", "candidate", "recruiter", "hiring_manager", "internal", "org_admin", "platform_admin"],
  },
  {
    name: "Smart Source.ai",
    desc: "Multi-channel passive talent sourcing",
    href: "/tools/smart-source-ai",
    category: "talent",
    icon: "search",
    color: "bg-cyan-100 text-cyan-900 border-cyan-300 dark:bg-cyan-950/50 dark:text-cyan-300",
    allowedRoles: ["recruiter", "org_admin", "platform_admin"],
  },
  {
    name: "Smart Screen.ai",
    desc: "Rubric-grounded candidate evaluation",
    href: "/tools/smart-screen-ai",
    category: "talent",
    icon: "award",
    color: "bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-950/50 dark:text-indigo-300",
    allowedRoles: ["recruiter", "org_admin", "platform_admin"],
  },
  {
    name: "Assessment.ai",
    desc: "Adaptive skills & coding evaluation",
    href: "/tools/assessment-ai",
    category: "talent",
    icon: "flask",
    color: "bg-violet-100 text-violet-900 border-violet-300 dark:bg-violet-950/50 dark:text-violet-300",
    allowedRoles: ["recruiter", "org_admin", "platform_admin"],
  },
  {
    name: "Talent.ai (ATS)",
    desc: "End-to-end requisition & stage management",
    href: "/tools/talent-ai",
    category: "talent",
    icon: "chart",
    color: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300",
    allowedRoles: ["recruiter", "org_admin", "platform_admin"],
  },
  {
    name: "Job Postings.ai",
    desc: "Multi-board distribution & analytics",
    href: "/tools/job-postings-ai",
    category: "talent",
    icon: "megaphone",
    color: "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300",
    allowedRoles: ["recruiter", "org_admin", "platform_admin"],
  },
  {
    name: "JD Studio.ai",
    desc: "Role intake spec & JD generator",
    href: "/tools/jd-studio-ai",
    category: "talent",
    icon: "edit",
    badge: "Recruiter",
    color: "bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-950/50 dark:text-orange-300",
    allowedRoles: ["recruiter", "platform_admin"],
  },
  {
    name: "Shortlist.ai",
    desc: "Instant batch candidate match ranker",
    href: "/tools/shortlist-ai",
    category: "talent",
    icon: "star",
    color: "bg-yellow-100 text-yellow-900 border-yellow-300 dark:bg-yellow-950/50 dark:text-yellow-300",
    allowedRoles: ["recruiter", "org_admin", "platform_admin"],
  },
  {
    name: "Offer.ai",
    desc: "Compensation benchmarking & offer builder",
    href: "/tools/offer-ai",
    category: "talent",
    icon: "gift",
    color: "bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/50 dark:text-purple-300",
    allowedRoles: ["recruiter", "org_admin", "platform_admin"],
  },
  {
    name: "WhatsApp Talent Bot",
    desc: "Mobile candidate outreach & 2-way bot",
    href: "/whatsapp",
    category: "talent",
    icon: "whatsapp",
    color: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300",
    allowedRoles: ["recruiter", "org_admin", "platform_admin"],
  },

  // LEGAL, OPERATIONS & SUPPORT
  {
    name: "Contracts & eSign",
    desc: "Zero-fee cryptographic legal agreements",
    href: "/tools/contracts-esign",
    category: "legal_ops",
    icon: "penSignature",
    badge: "Vault",
    color: "bg-slate-100 text-slate-900 border-slate-300 dark:bg-slate-800 dark:text-slate-200",
    allowedRoles: ["internal", "recruiter", "org_admin", "platform_admin"],
  },
  {
    name: "Team Chat",
    desc: "Organizational channels & real-time chat",
    href: "/chat",
    category: "legal_ops",
    icon: "chat",
    color: "bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-950/50 dark:text-sky-300",
    allowedRoles: ["internal", "recruiter", "org_admin", "platform_admin"],
  },
  {
    name: "Gauri.ai Support",
    desc: "Autonomous executive copilot",
    href: "/gauri",
    category: "legal_ops",
    icon: "headset",
    badge: "Owner Only",
    color: "bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/50 dark:text-purple-300",
    allowedRoles: ["platform_admin"],
  },

  // PRODUCTIVITY & PERSONAL TOOLS
  {
    name: "Jotz",
    desc: "Distraction-free markdown scratchpad",
    href: "/tools/jotz",
    category: "productivity",
    icon: "book",
    badge: "Popular",
    color: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300",
    allowedRoles: ["public", "candidate", "recruiter", "hiring_manager", "internal", "org_admin", "platform_admin"],
  },
  {
    name: "Calculator",
    desc: "Fast financial & everyday calculator",
    href: "/tools/widgets-ai?tool=calculator",
    category: "productivity",
    icon: "dollar",
    color: "bg-stone-100 text-stone-900 border-stone-300 dark:bg-stone-900 dark:text-stone-300",
    allowedRoles: ["public", "candidate", "recruiter", "hiring_manager", "internal", "org_admin", "platform_admin"],
  },
  {
    name: "Quick Notes",
    desc: "Instant desktop scratchpad & ideas",
    href: "/tools/widgets-ai?tool=notes",
    category: "productivity",
    icon: "receipt",
    color: "bg-yellow-100 text-yellow-900 border-yellow-300 dark:bg-yellow-950/50 dark:text-yellow-300",
    allowedRoles: ["public", "candidate", "recruiter", "hiring_manager", "internal", "org_admin", "platform_admin"],
  },
  {
    name: "To-Do List",
    desc: "Personal task tracker & checkboxes",
    href: "/tools/widgets-ai?tool=todo",
    category: "productivity",
    icon: "check",
    color: "bg-green-100 text-green-900 border-green-300 dark:bg-green-950/50 dark:text-green-300",
    allowedRoles: ["public", "candidate", "recruiter", "hiring_manager", "internal", "org_admin", "platform_admin"],
  },
  {
    name: "Calendar",
    desc: "Month & day schedule viewer",
    href: "/tools/widgets-ai?tool=calendar",
    category: "productivity",
    icon: "calendar",
    color: "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300",
    allowedRoles: ["public", "candidate", "recruiter", "hiring_manager", "internal", "org_admin", "platform_admin"],
  },
  {
    name: "World Clock",
    desc: "Multi-region global time zones",
    href: "/tools/widgets-ai?tool=clock",
    category: "productivity",
    icon: "globe",
    color: "bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-950/50 dark:text-indigo-300",
    allowedRoles: ["public", "candidate", "recruiter", "hiring_manager", "internal", "org_admin", "platform_admin"],
  },
  {
    name: "Focus Timer",
    desc: "Stopwatch & pomodoro countdown",
    href: "/tools/widgets-ai?tool=timer",
    category: "productivity",
    icon: "bell",
    color: "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300",
    allowedRoles: ["public", "candidate", "recruiter", "hiring_manager", "internal", "org_admin", "platform_admin"],
  },
  {
    name: "Unit Converter",
    desc: "Measurements & currency math",
    href: "/tools/widgets-ai?tool=converter",
    category: "productivity",
    icon: "gear",
    color: "bg-cyan-100 text-cyan-900 border-cyan-300 dark:bg-cyan-950/50 dark:text-cyan-300",
    allowedRoles: ["public", "candidate", "recruiter", "hiring_manager", "internal", "org_admin", "platform_admin"],
  },

  // SIMPLENOW.AI ENTERPRISE SUITE
  {
    name: "Executive & Board AI",
    desc: "Board deck generation & CEO strategy",
    href: "https://simplenow.ai",
    category: "enterprise",
    icon: "award",
    badge: "SimpleNow",
    color: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300",
    isExternal: true,
    allowedRoles: ["public", "candidate", "recruiter", "hiring_manager", "internal", "org_admin", "platform_admin"],
  },
  {
    name: "Finance & Margin AI",
    desc: "Runway, burn analysis & revenue models",
    href: "https://simplenow.ai",
    category: "enterprise",
    icon: "chart",
    badge: "SimpleNow",
    color: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300",
    isExternal: true,
    allowedRoles: ["public", "candidate", "recruiter", "hiring_manager", "internal", "org_admin", "platform_admin"],
  },
  {
    name: "Sales & Pipeline AI",
    desc: "Inbound CRM, deal room & sales scripts",
    href: "https://simplenow.ai",
    category: "enterprise",
    icon: "megaphone",
    badge: "SimpleNow",
    color: "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300",
    isExternal: true,
    allowedRoles: ["public", "candidate", "recruiter", "hiring_manager", "internal", "org_admin", "platform_admin"],
  },
  {
    name: "Marketing & Creative AI",
    desc: "Brand copy, ad campaigns & social engine",
    href: "https://simplenow.ai",
    category: "enterprise",
    icon: "sparkle",
    badge: "SimpleNow",
    color: "bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/50 dark:text-purple-300",
    isExternal: true,
    allowedRoles: ["public", "candidate", "recruiter", "hiring_manager", "internal", "org_admin", "platform_admin"],
  },
  {
    name: "Organization Settings",
    desc: "Manage organization profile, team members & permissions",
    href: "/org/settings",
    category: "enterprise",
    icon: "gear",
    badge: "Org Admin",
    color: "bg-stone-100 text-stone-900 border-stone-300 dark:bg-stone-900 dark:text-stone-300",
    allowedRoles: ["org_admin", "platform_admin"],
  },
  {
    name: "Platform Owner Console",
    desc: "Global organization approvals & system oversight",
    href: "/admin",
    category: "enterprise",
    icon: "award",
    badge: "Owner",
    color: "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300",
    allowedRoles: ["platform_admin"],
  },
];

export default function WaffleMenu() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<ToolCategory>("all");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRoles, setUserRoles] = useState<Set<RoleClearance>>(new Set(["public"]));
  const [loginModalTool, setLoginModalTool] = useState<GuestTool | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const supabase = createClient();

    async function loadUserRoles() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsAuthenticated(false);
          setUserRoles(new Set(["public"]));
          return;
        }

        setIsAuthenticated(true);
        const rolesSet = new Set<RoleClearance>(["public", "candidate"]);

        let profile: any = null;
        const { data: fullProfile, error: pErr } = await supabase
          .from("profiles")
          .select("is_admin, org_role, status, persona")
          .eq("id", user.id)
          .maybeSingle();

        if (!pErr && fullProfile) {
          profile = fullProfile;
        } else {
          const { data: fallback } = await supabase
            .from("profiles")
            .select("is_admin, org_role")
            .eq("id", user.id)
            .maybeSingle();
          if (fallback) {
            profile = {
              ...fallback,
              status: fallback.is_admin ? "approved" : "active",
              persona: fallback.is_admin ? "organization" : "recruiter",
            };
          }
        }

        if (profile?.is_admin || user.email?.toLowerCase().includes("shreesha")) {
          rolesSet.add("platform_admin");
          rolesSet.add("org_admin");
          rolesSet.add("recruiter");
          rolesSet.add("hiring_manager");
          rolesSet.add("internal");
        }

        if (profile?.persona === "recruiter" && (profile?.status === "active" || profile?.status === "approved")) {
          rolesSet.add("recruiter");
          rolesSet.add("internal");
        }

        if (profile?.org_role === "org_admin") {
          rolesSet.add("org_admin");
          rolesSet.add("recruiter");
          rolesSet.add("hiring_manager");
          rolesSet.add("internal");
        }

        const { data: talentRoles } = await supabase
          .from("talent_user_roles")
          .select("role")
          .eq("user_id", user.id);

        const roles = (talentRoles || []).map((r: { role: string }) => r.role);
        if (roles.some((r) => ["recruiter", "ta_head", "lead_recruiter"].includes(r))) {
          rolesSet.add("recruiter");
          rolesSet.add("internal");
        }
        if (roles.some((r) => ["hiring_manager", "reporting_manager"].includes(r))) {
          rolesSet.add("hiring_manager");
          rolesSet.add("internal");
        }
        if (roles.includes("admin")) {
          rolesSet.add("org_admin");
          rolesSet.add("recruiter");
          rolesSet.add("internal");
        }

        setUserRoles(rolesSet);
      } catch (err) {
        console.error("Failed to load user permissions for waffle menu:", err);
      }
    }

    loadUserRoles();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadUserRoles();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
        setLoginModalTool(null);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (loginModalTool) {
          setLoginModalTool(null);
        } else {
          setOpen(false);
        }
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, loginModalTool]);

  // Authenticated Tools
  const availableTools = useMemo(() => {
    return ALL_WAFFLE_TOOLS.filter((t) => {
      if (!t.allowedRoles || t.allowedRoles.length === 0) return true;
      return t.allowedRoles.some((r) => userRoles.has(r));
    });
  }, [userRoles]);

  const counts = useMemo(() => {
    return {
      all: availableTools.length,
      departments: availableTools.filter((t) => t.category === "departments").length,
      talent: availableTools.filter((t) => t.category === "talent").length,
      legal_ops: availableTools.filter((t) => t.category === "legal_ops").length,
      productivity: availableTools.filter((t) => t.category === "productivity").length,
      enterprise: availableTools.filter((t) => t.category === "enterprise").length,
    };
  }, [availableTools]);

  useEffect(() => {
    if (activeCategory !== "all" && counts[activeCategory] === 0) {
      setActiveCategory("all");
    }
  }, [counts, activeCategory]);

  const filteredTools = useMemo(() => {
    return availableTools.filter((t) => {
      const matchCat = activeCategory === "all" || t.category === activeCategory;
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.desc.toLowerCase().includes(q) ||
        (t.badge && t.badge.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [availableTools, search, activeCategory]);

  // Guest Tools Filtering
  const filteredGuestTools = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return GUEST_TOOLS;
    return GUEST_TOOLS.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.desc.toLowerCase().includes(q) ||
        t.badge.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        aria-label="AskShree Ecosystem Apps & Tools"
        title="AskShree Apps & Tools"
        onClick={() => {
          setOpen((prev) => !prev);
          setLoginModalTool(null);
        }}
        className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
          open
            ? "bg-brand text-white shadow-soft-sm"
            : "text-ink-2 hover:text-ink hover:bg-surface"
        }`}
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="2.5" cy="2.5" r="1.5" />
          <circle cx="8" cy="2.5" r="1.5" />
          <circle cx="13.5" cy="2.5" r="1.5" />
          <circle cx="2.5" cy="8" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="13.5" cy="8" r="1.5" />
          <circle cx="2.5" cy="13.5" r="1.5" />
          <circle cx="8" cy="13.5" r="1.5" />
          <circle cx="13.5" cy="13.5" r="1.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] w-[360px] sm:w-[520px] bg-surface border border-border rounded-2xl shadow-2xl z-50 p-4 animate-in fade-in slide-in-from-top-2 duration-150 flex flex-col relative max-h-[88vh] overflow-hidden select-none">
          {/* ================= GUEST VIEW (11 Unauthenticated Tools) ================= */}
          {!isAuthenticated ? (
            <div className="flex flex-col gap-2.5">
              {/* Clean Header: No counters, no directory clutter */}
              <div className="flex items-center justify-between pb-2.5 border-b border-border/70">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-brand-wash border border-brand/30 flex items-center justify-center text-xs text-brand font-bold">
                    9
                  </div>
                  <div>
                    <h2 className="text-[13px] font-bold text-ink font-display m-0 leading-tight">
                      AskShree Systems Grid
                    </h2>
                    <p className="text-[11px] text-ink-muted mt-0.5 m-0">
                      AI powered hiring partner
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-7 h-7 rounded-full bg-page hover:bg-brand-wash text-ink-muted hover:text-brand border border-border flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                  title="Close"
                >
                  ✕
                </button>
              </div>

              {/* Search Box */}
              <div className="relative">
                <Icon
                  name="search"
                  size={13}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted"
                />
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search tools..."
                  className="w-full text-xs pl-8 pr-8 py-1.5 bg-page border border-border rounded-xl text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none transition-colors"
                />
                {search ? (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink text-[11px]"
                  >
                    ✕
                  </button>
                ) : (
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-ink-muted font-mono">
                    ⌘K
                  </span>
                )}
              </div>

              {/* 11 Unified Tools Grid (Zero Scrollbars) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                {filteredGuestTools.map((tool) => (
                  <button
                    key={tool.name}
                    type="button"
                    onClick={() => setLoginModalTool(tool)}
                    className={`text-left p-2.5 rounded-xl border border-border/70 hover:border-brand/50 bg-page hover:bg-surface transition-all group flex items-start gap-2.5 cursor-pointer shadow-soft-xs ${
                      tool.spanTwo ? "sm:col-span-2" : ""
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 shadow-soft-sm ${tool.tileClass}`}
                    >
                      <PremiumIcon id={tool.iconId} className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[12px] font-bold text-ink group-hover:text-brand transition-colors truncate">
                          {tool.name}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border flex-shrink-0 ${tool.badgeColor}`}
                        >
                          {tool.badge}
                        </span>
                      </div>
                      <p className="text-[10.5px] text-ink-muted line-clamp-1 leading-snug mt-0.5 m-0">
                        {tool.desc}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Bottom Action Footer */}
              <div className="pt-2.5 mt-1 border-t border-border/70 flex items-center justify-between text-xs">
                <div className="text-[11px] text-ink-muted">
                  💡 Click any tool to launch or test
                </div>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="text-xs font-bold text-brand hover:text-brand-dark transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>Sign in to unlock all</span>
                  <span>&rarr;</span>
                </Link>
              </div>

              {/* In-Waffle Login Interceptor Modal */}
              {loginModalTool && (
                <div
                  role="dialog"
                  aria-modal="true"
                  className="absolute inset-0 bg-page/95 backdrop-blur-sm rounded-2xl p-5 flex flex-col justify-center items-center text-center z-50 animate-in fade-in duration-150"
                >
                  <div
                    className={`w-12 h-12 rounded-2xl border flex items-center justify-center mb-3 shadow-soft-sm ${loginModalTool.tileClass}`}
                  >
                    <PremiumIcon id={loginModalTool.iconId} className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-ink font-display m-0 mb-1">
                    Unlock {loginModalTool.name}
                  </h3>
                  <p className="text-xs text-ink-muted max-w-xs mb-4 leading-relaxed">
                    {loginModalTool.desc}
                  </p>

                  <div className="w-full max-w-xs flex flex-col gap-2">
                    <Link
                      href={`/login?redirect=${encodeURIComponent(loginModalTool.href)}`}
                      onClick={() => setOpen(false)}
                      className="w-full py-2 px-3 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-button"
                    >
                      <svg width="14" height="14" viewBox="0 0 48 48">
                        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"/>
                        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4c-7.5 0-14 4.2-17.7 10.7z"/>
                        <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.1-5.1l-6.5-5.5C29.6 35.1 26.9 36 24 36c-5.3 0-9.7-3.1-11.3-7.6l-6.6 5.1C9.9 39.6 16.4 44 24 44z"/>
                        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.5 5.5C39.5 37.6 44 31.5 44 24c0-1.3-.1-2.7-.4-3.5z"/>
                      </svg>
                      <span>Continue with Google</span>
                    </Link>
                    <Link
                      href={`/login?redirect=${encodeURIComponent(loginModalTool.href)}`}
                      onClick={() => setOpen(false)}
                      className="w-full py-2 px-3 rounded-xl border border-border bg-page hover:bg-surface text-xs font-semibold text-ink transition-colors"
                    >
                      Sign in with Email / Password
                    </Link>
                    <button
                      type="button"
                      onClick={() => setLoginModalTool(null)}
                      className="mt-1 text-[11px] text-ink-muted hover:text-ink transition-colors cursor-pointer"
                    >
                      ✕ Dismiss &amp; return to grid
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ================= AUTHENTICATED VIEW ================= */
            <div className="flex flex-col gap-2.5">
              {/* Authenticated Header */}
              <div className="flex items-center justify-between pb-2.5 border-b border-border/70">
                <div>
                  <div className="text-[13px] font-bold text-ink flex items-center gap-1.5 font-display">
                    <span>AskShree Systems Grid</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-wash text-brand border border-brand/20">
                      {counts.all} Systems
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-muted mt-0.5">
                    AI powered hiring partner &bull; Enterprise Workspace
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-7 h-7 rounded-full bg-page hover:bg-brand-wash text-ink-muted hover:text-brand border border-border flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                  title="Close"
                >
                  ✕
                </button>
              </div>

              {/* Quick Search */}
              <div className="relative">
                <Icon
                  name="search"
                  size={13}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted"
                />
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search ${counts.all} accessible systems...`}
                  className="w-full text-xs pl-8 pr-3 py-1.5 bg-page border border-border rounded-xl text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink text-[11px]"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Category Chips */}
              <div className="flex flex-wrap items-center gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setActiveCategory("all")}
                  className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    activeCategory === "all"
                      ? "bg-brand text-white shadow-soft-sm"
                      : "text-ink-muted hover:text-ink hover:bg-page"
                  }`}
                >
                  All ({counts.all})
                </button>
                {counts.departments > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveCategory("departments")}
                    className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                      activeCategory === "departments"
                        ? "bg-brand text-white shadow-soft-sm"
                        : "text-ink-muted hover:text-ink hover:bg-page"
                    }`}
                  >
                    Departments ({counts.departments})
                  </button>
                )}
                {counts.talent > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveCategory("talent")}
                    className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                      activeCategory === "talent"
                        ? "bg-brand text-white shadow-soft-sm"
                        : "text-ink-muted hover:text-ink hover:bg-page"
                    }`}
                  >
                    Talent AI ({counts.talent})
                  </button>
                )}
                {counts.legal_ops > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveCategory("legal_ops")}
                    className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                      activeCategory === "legal_ops"
                        ? "bg-brand text-white shadow-soft-sm"
                        : "text-ink-muted hover:text-ink hover:bg-page"
                    }`}
                  >
                    Legal &amp; Ops ({counts.legal_ops})
                  </button>
                )}
                {counts.productivity > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveCategory("productivity")}
                    className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                      activeCategory === "productivity"
                        ? "bg-brand text-white shadow-soft-sm"
                        : "text-ink-muted hover:text-ink hover:bg-page"
                    }`}
                  >
                    Productivity ({counts.productivity})
                  </button>
                )}
                {counts.enterprise > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveCategory("enterprise")}
                    className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                      activeCategory === "enterprise"
                        ? "bg-brand text-white shadow-soft-sm"
                        : "text-ink-muted hover:text-ink hover:bg-page"
                    }`}
                  >
                    Enterprise ({counts.enterprise})
                  </button>
                )}
              </div>

              {/* Filtered Tools Grid (Zero Scrollbars) */}
              <div className="max-h-[380px] overflow-y-auto scrollbar-none pr-1 space-y-1 pt-1">
                {filteredTools.length === 0 ? (
                  <div className="py-8 text-center text-xs text-ink-muted">
                    No tools found matching &ldquo;{search}&rdquo;
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {filteredTools.map((app) => {
                      const content = (
                        <div className="flex items-start gap-2.5 p-2 rounded-xl border border-transparent hover:border-border hover:bg-page transition-all group h-full">
                          <div
                            className={`w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0 mt-0.5 transition-transform group-hover:scale-105 ${app.color}`}
                          >
                            <Icon name={app.icon} className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[12px] font-bold text-ink truncate group-hover:text-brand transition-colors flex items-center gap-1">
                              <span className="truncate">{app.name}</span>
                              {app.badge && (
                                <span className="text-[9px] px-1 py-0.2 rounded font-semibold bg-brand-wash text-brand border border-brand/20 flex-shrink-0">
                                  {app.badge}
                                </span>
                              )}
                              {app.isExternal && (
                                <span className="text-[10px] text-ink-muted group-hover:text-brand">
                                  ↗
                                </span>
                              )}
                            </div>
                            <div className="text-[10.5px] text-ink-muted line-clamp-1 leading-snug">
                              {app.desc}
                            </div>
                          </div>
                        </div>
                      );

                      return app.isExternal ? (
                        <a
                          key={app.name}
                          href={app.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setOpen(false)}
                          className="block"
                        >
                          {content}
                        </a>
                      ) : (
                        <Link
                          key={app.name}
                          href={app.href}
                          onClick={() => setOpen(false)}
                          className="block"
                        >
                          {content}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* SimpleNow.ai Enterprise Bridge Footer Card */}
              <div className="pt-2 border-t border-border/70">
                <a
                  href="https://www.simplenow.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block p-2 rounded-xl bg-gradient-to-br from-brand-wash/80 via-surface to-page border border-border hover:border-brand transition-all shadow-soft-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-brand text-white flex items-center justify-center text-[10px] font-bold shadow-soft-sm">
                        SN
                      </div>
                      <div>
                        <div className="text-[11.5px] font-bold text-ink flex items-center gap-1.5 font-display">
                          <span>SimpleNow.ai Enterprise Suite</span>
                          <span className="text-[9px] font-semibold text-brand">PRO</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-ink-muted group-hover:text-brand group-hover:translate-x-0.5 transition-all text-xs">
                      ↗
                    </span>
                  </div>
                  <p className="text-[10px] text-ink-muted mt-1 leading-snug m-0">
                    Need Executive Board decks, Finance runways, or Sales CRM? Switch to SimpleNow.ai.
                  </p>
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

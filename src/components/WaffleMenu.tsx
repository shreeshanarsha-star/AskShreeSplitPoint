"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import Icon from "./Icon";

type ToolCategory = "all" | "departments" | "talent" | "legal_ops" | "productivity" | "enterprise";

type ToolItem = {
  name: string;
  desc: string;
  href: string;
  category: "departments" | "talent" | "legal_ops" | "productivity" | "enterprise";
  icon: string;
  badge?: string;
  color: string;
  isExternal?: boolean;
};

const ALL_WAFFLE_TOOLS: ToolItem[] = [
  // AI SYSTEMS & WORKSPACES — BY DEPARTMENT (Moved from Sidebar)
  {
    name: "Human Resources & Talent",
    desc: "Autonomous AI sourcing, screening, interviews, offers, & requisitions",
    href: "/departments/hr",
    category: "departments",
    icon: "users",
    badge: "Department",
    color: "bg-brand-wash text-brand border-brand/30",
  },
  {
    name: "Legal & Compliance",
    desc: "Contract review, offer agreements, & cryptographic eSign",
    href: "/departments/legal",
    category: "departments",
    icon: "scale",
    badge: "Department",
    color: "bg-slate-100 text-slate-900 border-slate-300 dark:bg-slate-800 dark:text-slate-200",
  },
  {
    name: "IT & Communication",
    desc: "Real-time team messaging & organizational channels",
    href: "/departments/it",
    category: "departments",
    icon: "database",
    badge: "Department",
    color: "bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-950/50 dark:text-sky-300",
  },
  {
    name: "Customer Success & Support",
    desc: "Autonomous support triage & Gauri.ai specialized copilot",
    href: "/departments/support",
    category: "departments",
    icon: "headset",
    badge: "Department",
    color: "bg-lime-100 text-lime-900 border-lime-300 dark:bg-lime-950/50 dark:text-lime-300",
  },
  {
    name: "Personal Tools",
    desc: "Everyday workspace: Calculator, Notes, To-Do, & Calendar",
    href: "/departments/widgets",
    category: "departments",
    icon: "grid",
    badge: "Personal",
    color: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300",
  },

  // TALENT & RECRUITMENT
  {
    name: "Careers Portal",
    desc: "Live job openings, role discovery & fast-track apply",
    href: "/",
    category: "talent",
    icon: "users",
    badge: "Front Door",
    color: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300",
  },
  {
    name: "Recruiter Cockpit",
    desc: "Shadow Mode queue & sourcing triage (Recruiters only)",
    href: "/recruiter",
    category: "talent",
    icon: "briefcase",
    badge: "Recruiter Auth",
    color: "bg-brand-wash text-brand border-brand/30",
  },
  {
    name: "Candidate Status",
    desc: "Real-time application milestone tracker (Registered candidates)",
    href: "/candidate/status",
    category: "talent",
    icon: "check",
    color: "bg-teal-100 text-teal-900 border-teal-300 dark:bg-teal-950/50 dark:text-teal-300",
  },
  {
    name: "Interview.ai & Calendar",
    desc: "Autonomous scheduling & virtual rooms",
    href: "/schedule",
    category: "talent",
    icon: "calendar",
    color: "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300",
  },
  {
    name: "Smart Source.ai",
    desc: "Multi-channel passive talent sourcing",
    href: "/tools/smart-source-ai",
    category: "talent",
    icon: "search",
    color: "bg-cyan-100 text-cyan-900 border-cyan-300 dark:bg-cyan-950/50 dark:text-cyan-300",
  },
  {
    name: "Smart Screen.ai",
    desc: "Rubric-grounded candidate evaluation",
    href: "/tools/smart-screen-ai",
    category: "talent",
    icon: "award",
    color: "bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-950/50 dark:text-indigo-300",
  },
  {
    name: "Assessment.ai",
    desc: "Adaptive skills & coding evaluation",
    href: "/tools/assessment-ai",
    category: "talent",
    icon: "flask",
    color: "bg-violet-100 text-violet-900 border-violet-300 dark:bg-violet-950/50 dark:text-violet-300",
  },
  {
    name: "Talent.ai (ATS)",
    desc: "End-to-end requisition & stage management",
    href: "/tools/talent-ai",
    category: "talent",
    icon: "chart",
    color: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300",
  },
  {
    name: "Job Postings.ai",
    desc: "Multi-board distribution & analytics",
    href: "/tools/job-postings-ai",
    category: "talent",
    icon: "megaphone",
    color: "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300",
  },
  {
    name: "JD Studio.ai",
    desc: "Role intake spec & JD generator",
    href: "/tools/jd-studio-ai",
    category: "talent",
    icon: "edit",
    color: "bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-950/50 dark:text-orange-300",
  },
  {
    name: "Shortlist.ai",
    desc: "Instant batch candidate match ranker",
    href: "/tools/shortlist-ai",
    category: "talent",
    icon: "star",
    color: "bg-yellow-100 text-yellow-900 border-yellow-300 dark:bg-yellow-950/50 dark:text-yellow-300",
  },
  {
    name: "Offer.ai",
    desc: "Compensation benchmarking & offer builder",
    href: "/tools/offer-ai",
    category: "talent",
    icon: "gift",
    color: "bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/50 dark:text-purple-300",
  },
  {
    name: "WhatsApp Talent Bot",
    desc: "Mobile candidate outreach & 2-way bot",
    href: "/whatsapp",
    category: "talent",
    icon: "whatsapp",
    color: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300",
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
  },
  {
    name: "Team Chat",
    desc: "Organizational channels & real-time chat",
    href: "/chat",
    category: "legal_ops",
    icon: "chat",
    color: "bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-950/50 dark:text-sky-300",
  },
  {
    name: "Gauri.ai Support",
    desc: "Autonomous customer success & support copilot",
    href: "/gauri",
    category: "legal_ops",
    icon: "headset",
    badge: "Specialized",
    color: "bg-lime-100 text-lime-900 border-lime-300 dark:bg-lime-950/50 dark:text-lime-300",
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
  },
  {
    name: "Calculator",
    desc: "Fast financial & everyday calculator",
    href: "/tools/widgets-ai?tool=calculator",
    category: "productivity",
    icon: "dollar",
    color: "bg-stone-100 text-stone-900 border-stone-300 dark:bg-stone-900 dark:text-stone-300",
  },
  {
    name: "Quick Notes",
    desc: "Instant desktop scratchpad & ideas",
    href: "/tools/widgets-ai?tool=notes",
    category: "productivity",
    icon: "receipt",
    color: "bg-yellow-100 text-yellow-900 border-yellow-300 dark:bg-yellow-950/50 dark:text-yellow-300",
  },
  {
    name: "To-Do List",
    desc: "Personal task tracker & checkboxes",
    href: "/tools/widgets-ai?tool=todo",
    category: "productivity",
    icon: "check",
    color: "bg-green-100 text-green-900 border-green-300 dark:bg-green-950/50 dark:text-green-300",
  },
  {
    name: "Calendar",
    desc: "Month & day schedule viewer",
    href: "/tools/widgets-ai?tool=calendar",
    category: "productivity",
    icon: "calendar",
    color: "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300",
  },
  {
    name: "World Clock",
    desc: "Multi-region global time zones",
    href: "/tools/widgets-ai?tool=clock",
    category: "productivity",
    icon: "globe",
    color: "bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-950/50 dark:text-indigo-300",
  },
  {
    name: "Focus Timer",
    desc: "Stopwatch & pomodoro countdown",
    href: "/tools/widgets-ai?tool=timer",
    category: "productivity",
    icon: "bell",
    color: "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300",
  },
  {
    name: "Unit Converter",
    desc: "Measurements & currency math",
    href: "/tools/widgets-ai?tool=converter",
    category: "productivity",
    icon: "gear",
    color: "bg-cyan-100 text-cyan-900 border-cyan-300 dark:bg-cyan-950/50 dark:text-cyan-300",
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
  },
];

export default function WaffleMenu() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<ToolCategory>("all");
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
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
  }, [open]);

  const filteredTools = useMemo(() => {
    return ALL_WAFFLE_TOOLS.filter((t) => {
      const matchCat = activeCategory === "all" || t.category === activeCategory;
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.desc.toLowerCase().includes(q) ||
        (t.badge && t.badge.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [search, activeCategory]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        aria-label="AskShree Ecosystem Apps & Tools"
        title="AskShree Apps & Tools (All 29 Systems)"
        onClick={() => setOpen((prev) => !prev)}
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
        <div className="absolute right-0 top-[calc(100%+8px)] w-[360px] sm:w-[460px] bg-surface border border-border rounded-2xl shadow-soft z-50 p-4 animate-in fade-in slide-in-from-top-2 duration-150 flex flex-col max-h-[600px]">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-border/70">
            <div>
              <div className="text-[13px] font-bold text-ink flex items-center gap-1.5 font-display">
                <span>AskShree Systems Grid</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-wash text-brand border border-brand/20">
                  {ALL_WAFFLE_TOOLS.length} Systems
                </span>
              </div>
              <p className="text-[11px] text-ink-muted mt-0.5">
                AI powered hiring partner • Full Platform Directory
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-ink-muted hover:text-ink text-xs p-1 rounded-lg"
              title="Close"
            >
              ✕
            </button>
          </div>

          {/* Quick Search */}
          <div className="pt-2.5 pb-2">
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
                placeholder={`Search all ${ALL_WAFFLE_TOOLS.length} systems, departments & tools...`}
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
          </div>

          {/* Category Chips */}
          <div className="flex flex-wrap items-center gap-1 pb-2 text-[11px]">
            <button
              onClick={() => setActiveCategory("all")}
              className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                activeCategory === "all"
                  ? "bg-brand text-white shadow-soft-sm"
                  : "text-ink-muted hover:text-ink hover:bg-page"
              }`}
            >
              All ({ALL_WAFFLE_TOOLS.length})
            </button>
            <button
              onClick={() => setActiveCategory("departments")}
              className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                activeCategory === "departments"
                  ? "bg-brand text-white shadow-soft-sm"
                  : "text-ink-muted hover:text-ink hover:bg-page"
              }`}
            >
              Departments (5)
            </button>
            <button
              onClick={() => setActiveCategory("talent")}
              className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                activeCategory === "talent"
                  ? "bg-brand text-white shadow-soft-sm"
                  : "text-ink-muted hover:text-ink hover:bg-page"
              }`}
            >
              Talent AI (14)
            </button>
            <button
              onClick={() => setActiveCategory("legal_ops")}
              className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                activeCategory === "legal_ops"
                  ? "bg-brand text-white shadow-soft-sm"
                  : "text-ink-muted hover:text-ink hover:bg-page"
              }`}
            >
              Legal &amp; Ops (3)
            </button>
            <button
              onClick={() => setActiveCategory("productivity")}
              className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                activeCategory === "productivity"
                  ? "bg-brand text-white shadow-soft-sm"
                  : "text-ink-muted hover:text-ink hover:bg-page"
              }`}
            >
              Productivity (8)
            </button>
            <button
              onClick={() => setActiveCategory("enterprise")}
              className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                activeCategory === "enterprise"
                  ? "bg-brand text-white shadow-soft-sm"
                  : "text-ink-muted hover:text-ink hover:bg-page"
              }`}
            >
              SimpleNow (4)
            </button>
          </div>

          {/* Scrollable Tools Grid */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 pt-1.5 divide-y divide-border/40">
            {filteredTools.length === 0 ? (
              <div className="py-8 text-center text-xs text-ink-muted">
                No tools found matching &ldquo;{search}&rdquo;
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
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
          <div className="mt-2.5 pt-2.5 border-t border-border/70">
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
              <p className="text-[10px] text-ink-muted mt-1 leading-snug">
                Need Executive Board decks, Finance runways, or Sales CRM? Switch to SimpleNow.ai.
              </p>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

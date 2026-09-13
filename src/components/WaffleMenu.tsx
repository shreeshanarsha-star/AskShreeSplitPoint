"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Icon from "./Icon";

export default function WaffleMenu() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const apps = [
    {
      name: "Shree AI Worker",
      desc: "Candidate AI front door",
      href: "/",
      icon: "sparkles",
      color: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300",
    },
    {
      name: "Recruiter Cockpit",
      desc: "Shadow Mode & sourcing",
      href: "/recruiter",
      icon: "briefcase",
      color: "bg-brand-wash text-brand border-brand/30",
    },
    {
      name: "Careers & Apply",
      desc: "14 open roles & voice AI",
      href: "/careers",
      icon: "users",
      color: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300",
    },
    {
      name: "Interview & Calendar",
      desc: "Autonomous negotiation",
      href: "/schedule",
      icon: "calendar",
      color: "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300",
    },
    {
      name: "Offer & eSign",
      desc: "Zero-fee legal agreements",
      href: "/tools/offer-ai",
      icon: "file",
      color: "bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/50 dark:text-purple-300",
    },
    {
      name: "Team Chat",
      desc: "Internal team messaging",
      href: "/chat",
      icon: "message",
      color: "bg-stone-100 text-stone-800 border-stone-300 dark:bg-stone-900 dark:text-stone-300",
    },
  ];

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        aria-label="AskShree Apps & Ecosystem"
        title="AskShree Apps & Ecosystem"
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
        <div className="absolute right-0 top-[calc(100%+8px)] w-80 sm:w-92 bg-surface border border-border rounded-2xl shadow-soft z-50 p-4 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-border/70">
            <div>
              <div className="text-[13px] font-bold text-ink flex items-center gap-1.5">
                <span>AskShree Ecosystem</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-wash text-brand border border-brand/20">
                  Talent OS
                </span>
              </div>
              <p className="text-[11px] text-ink-muted mt-0.5">
                AI Workers & Department Workspaces
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3">
            {apps.map((app) => (
              <Link
                key={app.name}
                href={app.href}
                onClick={() => setOpen(false)}
                className="group flex items-start gap-2.5 p-2 rounded-xl border border-transparent hover:border-border hover:bg-page transition-all"
              >
                <div
                  className={`w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0 mt-0.5 transition-transform group-hover:scale-105 ${app.color}`}
                >
                  <Icon name={app.icon} className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-bold text-ink truncate group-hover:text-brand transition-colors">
                    {app.name}
                  </div>
                  <div className="text-[10.5px] text-ink-muted truncate">
                    {app.desc}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* SimpleNow.ai Enterprise Bridge */}
          <div className="mt-3 pt-3 border-t border-border/70">
            <a
              href="https://www.simplenow.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="group block p-2.5 rounded-xl bg-gradient-to-br from-brand-wash/80 via-surface to-page border border-border hover:border-brand transition-all shadow-soft-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-brand text-white flex items-center justify-center text-[10px] font-bold shadow-soft-sm">
                    SN
                  </div>
                  <div>
                    <div className="text-[12px] font-bold text-ink flex items-center gap-1.5">
                      <span>SimpleNow.ai</span>
                      <span className="text-[9.5px] font-bold text-ink-muted uppercase tracking-wider">
                        Enterprise Suite
                      </span>
                    </div>
                  </div>
                </div>
                <span className="text-ink-muted group-hover:text-brand group-hover:translate-x-0.5 transition-all text-xs">
                  ↗
                </span>
              </div>
              <p className="text-[10.5px] text-ink-muted mt-1 leading-snug">
                Access Executive, Finance, Margin, Sales & Marketing AI systems.
              </p>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

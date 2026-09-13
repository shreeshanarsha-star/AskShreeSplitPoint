// Department / AI-Systems taxonomy for the console.
//
// `status` and each tool's `s` field are the SOURCE OF TRUTH for what's
// actually built vs. not — never hardcode "live" for something that isn't
// wired to a real backend yet. This mirrors the console mockup you
// reviewed, but with honest statuses for the real build (the mockup used
// aspirational statuses for design purposes only).

export type ToolStatus = "live" | "soon";

export interface Tool {
  n: string; // name
  s: ToolStatus;
  group?: string; // sub-group within a department (e.g. "Talent Acquisition")
  href?: string; // route, once built
  // Bundled, non-purchasable platform feature (like Team Chat) that every
  // approved org gets automatically -- no feature_access grant required
  // (mirrors requireOrgMember() in lib/supabase/requireAdmin.ts). Every
  // place that filters a department's tool list down to what an org is
  // licensed for (Sidebar.tsx, departments/[id]/page.tsx, the admin
  // grant-checklist in admin/organizations/page.tsx, and the AI agent's
  // destination index in lib/agent/actions.ts) must treat a bundled tool
  // as always-visible/always-reachable instead of grant-gated.
  bundled?: boolean;
}

export interface Department {
  id: string;
  name: string;
  icon: string;
  status: ToolStatus;
  desc: string;
  tools: Tool[];
}

export const DEPARTMENTS: Department[] = [
  {
    id: "hr",
    name: "Human Resources & Talent",
    icon: "users",
    status: "live",
    desc: "Autonomous AI sourcing, screening, interviews, offers, and talent pipelines.",
    tools: [
      { n: "Recruiter Console", s: "live", group: "Talent Acquisition", href: "/recruiter", bundled: true },
      { n: "Talent.ai", s: "live", group: "Talent Acquisition", href: "/tools/talent-ai" },
      { n: "Careers Portal (Public)", s: "live", group: "Talent Acquisition", href: "/careers", bundled: true },
      { n: "Interview.ai", s: "live", group: "Talent Acquisition", href: "/schedule", bundled: true },
      { n: "Offer.ai", s: "live", group: "Talent Acquisition", href: "/tools/offer-ai" },
      { n: "Job Postings.ai", s: "live", group: "Talent Acquisition", href: "/tools/job-postings-ai" },
      { n: "Apply.ai", s: "live", group: "Talent Acquisition", href: "/apply" },
      { n: "Smart Source.ai", s: "live", group: "Talent Acquisition", href: "/tools/smart-source-ai" },
      { n: "Smart Screen.ai", s: "live", group: "Talent Acquisition", href: "/tools/smart-screen-ai" },
      { n: "Assessment.ai", s: "live", group: "Talent Acquisition", href: "/tools/assessment-ai" },
    ],
  },
  {
    id: "legal",
    name: "Legal & Compliance",
    icon: "scale",
    status: "live",
    desc: "Contract review, offer agreements, and cryptographic eSign.",
    tools: [
      { n: "Contracts & eSign", s: "live", href: "/tools/contracts-esign", bundled: true },
    ],
  },
  {
    id: "it",
    name: "IT & Communication",
    icon: "database",
    status: "live",
    desc: "Real-time team messaging and organizational communication.",
    tools: [
      { n: "Team Chat", s: "live", href: "/chat", bundled: true },
    ],
  },
  {
    id: "support",
    name: "Customer Success & Support",
    icon: "headset",
    status: "live",
    desc: "Autonomous support triage and specialized staff copiloting.",
    tools: [
      { n: "Gauri.ai", s: "live", href: "/gauri", bundled: true },
    ],
  },
];

// Cross-cutting capability — not tied to one department, kept out of the
// department list/stats and surfaced through its own sidebar entry.
export const PERSONAL_TOOLS: Department = {
  id: "widgets",
  name: "Personal Tools",
  icon: "grid",
  status: "live",
  desc: "Small, genuinely useful everyday tools — no AI key required, available to everyone regardless of department.",
  tools: [
    { n: "Calculator", s: "live", href: "/tools/widgets-ai?tool=calculator" },
    { n: "Quick Notes", s: "live", href: "/tools/widgets-ai?tool=notes" },
    { n: "To-Do List", s: "live", href: "/tools/widgets-ai?tool=todo" },
    { n: "Calendar", s: "live", href: "/tools/widgets-ai?tool=calendar" },
    { n: "Clock", s: "live", href: "/tools/widgets-ai?tool=clock" },
    { n: "Timer / Stopwatch", s: "live", href: "/tools/widgets-ai?tool=timer" },
    { n: "Unit Converter", s: "live", href: "/tools/widgets-ai?tool=converter" },
    { n: "Jotz", s: "live", href: "/tools/jotz" },
    { n: "Shortlist.ai", s: "live", href: "/tools/shortlist-ai" },
    { n: "JD Studio.ai", s: "live", href: "/tools/jd-studio-ai" },
  ],
};

export const ALL_ITEMS: Department[] = [...DEPARTMENTS, PERSONAL_TOOLS];

export function liveToolCountFor(d: Department): number {
  if (d.tools.length) return d.tools.filter((t) => t.s === "live").length;
  return d.status === "live" ? 1 : 0;
}

export const totalLiveTools = DEPARTMENTS.reduce(
  (sum, d) => sum + liveToolCountFor(d),
  0
);

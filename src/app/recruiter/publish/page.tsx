"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import Logo from "@/components/Logo";

type SocialPlatform = "linkedin" | "twitter" | "whatsapp" | "slack";

type JobPreset = {
  id: string;
  title: string;
  reqNo: string;
  department: string;
  location: string;
  workMode: string;
  salary: string;
  keySkills: string[];
  perks: string;
};

const SAMPLE_JOBS: JobPreset[] = [
  {
    id: "req-1",
    title: "Senior Full-Stack Engineer",
    reqNo: "R-2208261",
    department: "Platform Engineering",
    location: "San Francisco, CA / Remote",
    workMode: "Remote",
    salary: "$160,000 – $210,000 + Equity",
    keySkills: ["TypeScript", "Next.js", "Distributed Systems", "PostgreSQL"],
    perks: "Flexible PTO, remote setup stipend, zero-burn AI talent stack",
  },
  {
    id: "req-2",
    title: "Enterprise Account Executive",
    reqNo: "R-2208262",
    department: "Enterprise Sales",
    location: "New York, NY / Hybrid",
    workMode: "Hybrid",
    salary: "$140,000 Base / $280,000 OTE + Equity",
    keySkills: ["B2B SaaS", "Complex Deal Cycles", "Executive Selling"],
    perks: "Uncapped commission, President's Club trip, top-tier healthcare",
  },
  {
    id: "req-3",
    title: "Principal Infrastructure Architect",
    reqNo: "R-2208264",
    department: "Cloud Systems",
    location: "Seattle, WA / Remote",
    workMode: "Remote",
    salary: "$195,000 – $250,000 + Equity",
    keySkills: ["Kubernetes", "Multi-Cloud", "eBPF", "Terraform"],
    perks: "Leading high-scale multi-region core network with 99.999% uptime",
  },
];

export default function SocialMediaPublishPage() {
  const [selectedJobId, setSelectedJobId] = useState<string>("req-1");
  const [activePlatform, setActivePlatform] = useState<SocialPlatform>("linkedin");
  const [tone, setTone] = useState<"visionary" | "technical" | "casual">("visionary");
  const [copied, setCopied] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null);

  const currentJob = SAMPLE_JOBS.find((j) => j.id === selectedJobId) || SAMPLE_JOBS[0];

  // Base Public URL with UTM Attribution
  const getUtmLink = (platform: string) => {
    return `https://askshree.com/careers?req=${currentJob.reqNo}&utm_source=${platform}&utm_medium=social&utm_campaign=talent_acquisition`;
  };

  // AI-Generated Copy for each platform based on tone
  const getSocialContent = (platform: SocialPlatform, toneMode: string) => {
    const link = getUtmLink(platform);

    if (platform === "linkedin") {
      if (toneMode === "technical") {
        return `We are hiring a ${currentJob.title} (${currentJob.workMode}) to scale our core ${currentJob.department} systems.\n\nKey focus:\n• Build high-throughput event-driven microservices\n• Tech Stack: ${currentJob.keySkills.join(", ")}\n• Transparent Compensation: ${currentJob.salary}\n\nOur candidate experience is powered by Shree AI: instant pre-screening, verified quote citations, and zero ghosting.\n\nDirect 60-second Quick Apply here: ${link}\n\n#SoftwareEngineering #TechHiring #RemoteJobs #EngineeringHiring #${currentJob.keySkills[0]} #Hiring`;
      }
      if (toneMode === "casual") {
        return `Hey network! 👋 Our team is expanding and we're looking for an awesome ${currentJob.title} to join us (${currentJob.location}).\n\nIf you love working with ${currentJob.keySkills.slice(0, 2).join(" & ")}, and care about building reliable distributed products without red tape, this is for you!\n\n💰 Pay band: ${currentJob.salary}\n✨ Perks: ${currentJob.perks}\n\nNo 20-page ATS forms. Apply in under 60 seconds with our AI partner Shree: ${link}\n\nFeel free to DM me or tag anyone who might be a great fit!`;
      }
      return `🚀 We're expanding our team! We are looking for an exceptional ${currentJob.title} to join ${currentJob.department} (${currentJob.location}).\n\nAt AskShree, we believe in radical transparency, high engineering standards, and empowering engineers to do the best work of their careers.\n\n✨ Why this role matters:\n• Shape critical architectural decisions handling millions of transactions.\n• Modern Tech Stack: ${currentJob.keySkills.join(", ")}\n• Transparent Pay: ${currentJob.salary}\n\nExperience candidate-first hiring with Shree — zero ghosting, instant milestone tracking, and 1-click apply.\n\n🔗 Apply directly: ${link}\n\n#Hiring #Careers #${currentJob.department.replace(/\s+/g, "")} #OpenRoles #Leadership`;
    }

    if (platform === "twitter") {
      return `We're hiring a ${currentJob.title} (${currentJob.workMode})! 🚀\n\n🛠️ Stack: ${currentJob.keySkills.slice(0, 3).join(", ")}\n💵 Comp: ${currentJob.salary}\n⚡ 60-second apply with zero ghosting\n\nCheck out the role & apply 👇\n${link}`;
    }

    if (platform === "whatsapp") {
      return `*Opportunity: ${currentJob.title} at AskShree*\n\nHey! We're hiring for a ${currentJob.title} in ${currentJob.department} (${currentJob.workMode}).\n\n• *Budget:* ${currentJob.salary}\n• *Key Skills:* ${currentJob.keySkills.join(", ")}\n• *Location:* ${currentJob.location}\n\nQuick apply without resume formatting headaches: ${link}\n\nLet me know if you or someone in your network is interested!`;
    }

    // Slack / Teams
    return `📢 *Internal Referral Callout: ${currentJob.title}*\n\nTeam, our ${currentJob.department} is actively hiring for a *${currentJob.title}* (${currentJob.workMode}).\n\n• *Compensation Band:* ${currentJob.salary}\n• *Core Competencies:* ${currentJob.keySkills.join(", ")}\n• *Referral Link:* ${link}\n\nKnow an exceptional engineer? Share the link above — successful referrals are eligible for our full employee referral bonus! 🎉`;
  };

  const [customText, setCustomText] = useState<Record<string, string>>({});

  const activeContent = customText[`${selectedJobId}-${activePlatform}-${tone}`] || getSocialContent(activePlatform, tone);

  function handleContentChange(val: string) {
    setCustomText((prev) => ({
      ...prev,
      [`${selectedJobId}-${activePlatform}-${tone}`]: val,
    }));
  }

  function handleCopy() {
    navigator.clipboard.writeText(activeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDirectPublish() {
    setPublishing(true);
    setTimeout(() => {
      setPublishing(false);
      if (activePlatform === "linkedin") {
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(getUtmLink("linkedin"))}`, "_blank");
      } else if (activePlatform === "twitter") {
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(activeContent)}`, "_blank");
      } else if (activePlatform === "whatsapp") {
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(activeContent)}`, "_blank");
      }
      setPublishSuccess(`Post successfully prepared for ${activePlatform.toUpperCase()}! Tracking UTMs attached.`);
      setTimeout(() => setPublishSuccess(null), 3500);
    }, 800);
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col">
      {/* Top Header */}
      <header className="px-6 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center gap-3">
          <Link
            href="/recruiter"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500"
            title="Back to Recruiter Console"
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
                Social Media Multi-Channel Job Publishing Hub
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-md font-medium bg-brand-wash text-brand border border-brand/20">
                AI Social Studio
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/careers"
            target="_blank"
            className="text-xs text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 flex items-center gap-1 transition-colors"
          >
            <Icon name="external" size={13} />
            View Live Careers Board
          </Link>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">

        {publishSuccess && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <Icon name="checkCircle" size={16} />
            {publishSuccess}
          </div>
        )}

        {/* 1. Job Requisition Selector Bar */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Select Role to Broadcast:
            </span>
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            >
              {SAMPLE_JOBS.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title} ({job.department} • {job.salary})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Tracking UTM:</span>
            <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 font-mono text-[11px] text-indigo-600 dark:text-indigo-400">
              ?utm_source={activePlatform}&amp;utm_campaign={currentJob.reqNo}
            </span>
          </div>
        </div>

        {/* 2. Channel & Tone Selector Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          
          {/* Social Platform Tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActivePlatform("linkedin")}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 ${
                activePlatform === "linkedin"
                  ? "bg-[#0A66C2] text-white shadow-xs"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300"
              }`}
            >
              <span className="font-bold">in</span>
              <span>LinkedIn</span>
            </button>

            <button
              onClick={() => setActivePlatform("twitter")}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 ${
                activePlatform === "twitter"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300"
              }`}
            >
              <span className="font-bold">𝕏</span>
              <span>X (Twitter)</span>
            </button>

            <button
              onClick={() => setActivePlatform("whatsapp")}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 ${
                activePlatform === "whatsapp"
                  ? "bg-[#25D366] text-white shadow-xs"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300"
              }`}
            >
              <Icon name="whatsapp" size={13} />
              <span>WhatsApp / Groups</span>
            </button>

            <button
              onClick={() => setActivePlatform("slack")}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 ${
                activePlatform === "slack"
                  ? "bg-[#4A154B] text-white shadow-xs"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300"
              }`}
            >
              <Icon name="chat" size={13} />
              <span>Internal Slack / Teams</span>
            </button>
          </div>

          {/* AI Tone Selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-850 p-1 rounded-xl text-xs font-semibold">
            <span className="text-slate-400 px-2">Shree AI Tone:</span>
            <button
              onClick={() => setTone("visionary")}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                tone === "visionary" ? "bg-white dark:bg-slate-700 shadow-xs text-indigo-600 dark:text-indigo-300" : "text-slate-500"
              }`}
            >
              Visionary &amp; Inspiring
            </button>
            <button
              onClick={() => setTone("technical")}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                tone === "technical" ? "bg-white dark:bg-slate-700 shadow-xs text-indigo-600 dark:text-indigo-300" : "text-slate-500"
              }`}
            >
              Technical &amp; Direct
            </button>
            <button
              onClick={() => setTone("casual")}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                tone === "casual" ? "bg-white dark:bg-slate-700 shadow-xs text-indigo-600 dark:text-indigo-300" : "text-slate-500"
              }`}
            >
              Casual &amp; Community
            </button>
          </div>

        </div>

        {/* 3. 2-Column Split: AI Post Editor & Live Social Feed Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Left Column: AI Post Editor */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-600 font-bold text-xs">
                    ✨
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Generated {activePlatform.toUpperCase()} Copy
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400">
                  {activeContent.length} characters
                </span>
              </div>

              <textarea
                value={activeContent}
                onChange={(e) => handleContentChange(e.target.value)}
                rows={14}
                className="w-full text-xs p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850/50 font-sans leading-relaxed focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100 resize-none"
              />
            </div>

            {/* Action Bar */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
              <button
                onClick={handleCopy}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-slate-700 dark:text-slate-300"
              >
                <Icon name="download" size={13} />
                {copied ? "✓ Copied to Clipboard!" : "Copy Post Content"}
              </button>

              <button
                onClick={handleDirectPublish}
                disabled={publishing}
                className={`px-5 py-2 text-xs font-bold rounded-xl text-white shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50 ${
                  activePlatform === "linkedin"
                    ? "bg-[#0A66C2] hover:bg-[#084e96]"
                    : activePlatform === "whatsapp"
                    ? "bg-[#25D366] hover:bg-[#1eb857]"
                    : "bg-indigo-600 hover:bg-indigo-500"
                }`}
              >
                <span>{publishing ? "Preparing..." : `Publish to ${activePlatform.toUpperCase()}`}</span>
                <span>→</span>
              </button>
            </div>
          </div>

          {/* Right Column: Live Feed Simulation Card */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Live Feed Visual Preview
              </span>
              <span className="text-[11px] text-slate-400">
                What candidates see in their timeline
              </span>
            </div>

            {/* Social Mockup Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3 font-sans">
              
              {/* Author Header */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-300">
                  SC
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                    Sarah Chen
                    <span className="text-[10px] text-slate-400 font-normal">• 1st</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Lead Technical Recruiter at AskShree
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Just now • 🌐 Public
                  </div>
                </div>
              </div>

              {/* Body Content */}
              <div className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                {activeContent}
              </div>

              {/* Rich OpenGraph Card Preview */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/70 dark:bg-slate-850/60 mt-2">
                <div className="h-32 bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 p-4 flex flex-col justify-between text-white relative">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-medium backdrop-blur-md">
                      {currentJob.department}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-300">
                      {currentJob.salary}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white drop-shadow-xs">
                      {currentJob.title}
                    </h4>
                    <span className="text-[11px] text-indigo-200">
                      {currentJob.location} • Instant AI Screening
                    </span>
                  </div>
                </div>
                <div className="p-3 text-left">
                  <span className="text-[10px] text-slate-400 font-mono block">askshree.com/careers</span>
                  <div className="font-bold text-xs text-slate-900 dark:text-white mt-0.5">
                    {currentJob.title} — Quick Apply (60 Seconds)
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                    Powered by Shree AI Talent OS. Experience transparent pay, real-time tracking, and verified quotes.
                  </p>
                </div>
              </div>

              {/* Social Engagement Footer */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-around text-slate-400 text-xs">
                <span className="flex items-center gap-1 cursor-pointer hover:text-indigo-600">👍 Like</span>
                <span className="flex items-center gap-1 cursor-pointer hover:text-indigo-600">💬 Comment</span>
                <span className="flex items-center gap-1 cursor-pointer hover:text-indigo-600">🔁 Repost</span>
                <span className="flex items-center gap-1 cursor-pointer hover:text-indigo-600">✈️ Send</span>
              </div>

            </div>

            {/* Campaign Attribution Analytics Tile */}
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Real-Time Channel Attribution
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold">
                  Live UTM Telemetry
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-850">
                  <span className="text-[10px] text-slate-400 block">LinkedIn Inbound</span>
                  <strong className="text-sm font-bold text-slate-900 dark:text-white">68%</strong>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-850">
                  <span className="text-[10px] text-slate-400 block">WhatsApp Groups</span>
                  <strong className="text-sm font-bold text-slate-900 dark:text-white">22%</strong>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-850">
                  <span className="text-[10px] text-slate-400 block">X / Twitter</span>
                  <strong className="text-sm font-bold text-slate-900 dark:text-white">10%</strong>
                </div>
              </div>
            </div>

          </div>

        </div>

      </main>
    </div>
  );
}

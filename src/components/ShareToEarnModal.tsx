"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Icon from "./Icon";
import {
  getCandidateCredits,
  awardCandidateCredits,
  UNLOCKED_TOOLS,
  SHARE_REWARD_CREDITS,
  UnlockedTool,
} from "@/lib/credits";

export type ShareJob = {
  id: string;
  title: string;
  company?: string;
  location?: string;
  salary_range?: string;
  ctc_budget?: string;
};

interface ShareToEarnModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: ShareJob | null;
  onConsultCv?: (job: ShareJob) => void;
  onQuickApply?: (job: ShareJob) => void;
}

export default function ShareToEarnModal({
  isOpen,
  onClose,
  job,
  onConsultCv,
  onQuickApply,
}: ShareToEarnModalProps) {
  const [credits, setCredits] = useState<number>(25);
  const [copied, setCopied] = useState(false);
  const [justEarned, setJustEarned] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"share" | "tools">("share");

  useEffect(() => {
    if (isOpen) {
      setCredits(getCandidateCredits());
      setJustEarned(null);
      setCopied(false);
    }
  }, [isOpen]);

  useEffect(() => {
    function handleUpdate(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail && typeof detail.credits === "number") {
        setCredits(detail.credits);
      }
    }
    window.addEventListener("askshree_credits_updated", handleUpdate);
    return () => window.removeEventListener("askshree_credits_updated", handleUpdate);
  }, []);

  if (!isOpen || !job) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "https://www.askshree.com";
  const shareUrl = `${origin}/jobs/${job.id}?ref=candidate_share`;
  const payInfo = job.salary_range || job.ctc_budget || "Competitive Pay Band";
  const shareText = `Check out this open position at AskShree: ${job.title} (${payInfo}) in ${job.location || "Remote"}. Apply or consult Shree AI directly:`;

  function handleShare(channel: "copy" | "whatsapp" | "linkedin" | "twitter" | "email") {
    if (!job) return;
    // Reward credits
    const newTotal = awardCandidateCredits(SHARE_REWARD_CREDITS, `share_${channel}`);
    setCredits(newTotal);
    setJustEarned(SHARE_REWARD_CREDITS);

    if (channel === "copy") {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(shareUrl);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } else if (channel === "whatsapp") {
      const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;
      window.open(waUrl, "_blank", "noopener,noreferrer");
    } else if (channel === "linkedin") {
      const liUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
      window.open(liUrl, "_blank", "noopener,noreferrer");
    } else if (channel === "twitter") {
      const twUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
      window.open(twUrl, "_blank", "noopener,noreferrer");
    } else if (channel === "email") {
      const subject = encodeURIComponent(`Exciting Opportunity: ${job.title} at AskShree`);
      const body = encodeURIComponent(`Hi,\n\nI thought you might be interested in this role at AskShree:\n\n${job.title} (${payInfo})\n${shareUrl}\n\nBest regards!`);
      window.open(`mailto:?subject=${subject}&body=${body}`);
    }
  }

  function handleAction(tool: UnlockedTool) {
    if (!job) return;
    if (tool.actionType === "cv_consult") {
      onClose();
      if (onConsultCv) onConsultCv(job);
    } else if (tool.actionType === "quick_apply") {
      onClose();
      if (onQuickApply) onQuickApply(job);
    } else if (tool.actionType === "job_intel") {
      onClose();
      window.location.href = `/jobs/${job.id}`;
    } else if (tool.actionType === "ai_interview") {
      onClose();
      window.location.href = "/interview/demo";
    } else if (tool.actionType === "ats_builder") {
      onClose();
      window.location.href = "/tools/jotz";
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 selection:bg-brand-wash selection:text-brand">
      <div className="bg-surface border border-border rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-soft space-y-4 max-h-[90vh] flex flex-col justify-between">
        {/* Header with Title and Credit Pill */}
        <div className="flex items-start justify-between pb-3 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-bold text-ink font-display">
                Share Role & Earn Credits
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-wash text-brand border border-brand/20">
                +25 Credits/Share
              </span>
            </div>
            <p className="text-xs text-ink-muted mt-0.5">
              Share <strong className="text-ink">{job.title}</strong> with peers to earn credits for premium candidate tools.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close share dialog"
            className="w-7 h-7 rounded-lg border border-border hover:border-brand/40 text-ink-muted hover:text-ink flex items-center justify-center text-sm transition-all"
          >
            ✕
          </button>
        </div>

        {/* Live Credits Balance & Just-Earned Banner */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-page border border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center text-base">
              🎁
            </div>
            <div>
              <div className="text-[11px] text-ink-muted uppercase tracking-wider font-semibold">
                Your Available Credits
              </div>
              <div className="text-sm sm:text-base font-bold text-ink font-display flex items-center gap-1.5">
                <span className="text-brand">{credits}</span> Credits
                {justEarned && (
                  <span className="text-[11px] font-bold text-emerald-500 animate-bounce">
                    (+{justEarned} awarded!)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Tab Switcher (Zero scrollbars) */}
          <div className="flex items-center gap-1 bg-surface p-1 rounded-lg border border-border">
            <button
              type="button"
              onClick={() => setActiveTab("share")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                activeTab === "share"
                  ? "bg-brand text-white shadow-soft-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              1. Share & Earn
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("tools")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                activeTab === "tools"
                  ? "bg-brand text-white shadow-soft-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              2. Unlocked Tools
            </button>
          </div>
        </div>

        {/* TAB 1: 1-Click Share & Referral Options */}
        {activeTab === "share" && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Direct Copy Referral Link */}
            <div>
              <label className="text-[11px] font-bold text-ink-muted uppercase tracking-wider block mb-1.5">
                Your Personal Referral Link
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 bg-page border border-border rounded-xl px-3 py-2 text-xs text-ink outline-none select-all truncate"
                />
                <button
                  type="button"
                  onClick={() => handleShare("copy")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-button flex items-center gap-1 flex-shrink-0 ${
                    copied
                      ? "bg-emerald-600 text-white"
                      : "bg-brand hover:bg-brand-dark text-white"
                  }`}
                >
                  <Icon name="check" size={13} />
                  <span>{copied ? "Copied! (+25)" : "Copy Link"}</span>
                </button>
              </div>
            </div>

            {/* Social Share Buttons */}
            <div>
              <label className="text-[11px] font-bold text-ink-muted uppercase tracking-wider block mb-2">
                Fast 1-Click Share
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleShare("whatsapp")}
                  className="px-3 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-soft-sm"
                >
                  <span>💬 WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleShare("linkedin")}
                  className="px-3 py-2.5 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-soft-sm"
                >
                  <span>💼 LinkedIn</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleShare("twitter")}
                  className="px-3 py-2.5 rounded-xl border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-soft-sm"
                >
                  <span>🐦 X / Twitter</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleShare("email")}
                  className="px-3 py-2.5 rounded-xl border border-border bg-page hover:bg-surface text-ink-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-soft-sm"
                >
                  <span>✉️ Email</span>
                </button>
              </div>
            </div>

            {/* Credit Earning Guidance */}
            <div className="p-3 rounded-xl bg-brand-wash/60 border border-brand/20 text-xs space-y-1">
              <div className="font-bold text-brand flex items-center gap-1.5">
                <span>⚡ How Candidate Credits Work</span>
              </div>
              <p className="text-ink-muted text-[11.5px] leading-relaxed">
                Every share or link copy instantly adds <strong className="text-ink">+25 credits</strong>. Use your credits to unlock AI CV reviews, tailored ATS resume builders, fast-track screening, and confidential role rubrics.
              </p>
            </div>
          </div>
        )}

        {/* TAB 2: Unlocked Candidate Tools */}
        {activeTab === "tools" && (
          <div className="space-y-2.5 animate-in fade-in duration-150">
            <div className="text-xs text-ink-muted flex items-center justify-between px-1">
              <span className="font-semibold uppercase tracking-wider text-[10.5px]">
                5 Premium Candidate Tools
              </span>
              <span className="text-[11px] text-brand font-medium">
                Spend credits or log in to sync
              </span>
            </div>

            <div className="space-y-2">
              {UNLOCKED_TOOLS.map((tool) => {
                const canAfford = credits >= tool.cost;
                return (
                  <div
                    key={tool.id}
                    className="p-3 rounded-xl border border-border bg-page flex items-center justify-between gap-3 hover:border-brand/30 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-xs text-ink truncate">
                          {tool.name}
                        </h4>
                        <span className="text-[9.5px] font-semibold px-1.5 py-0.2 rounded bg-brand-wash text-brand border border-brand/20 whitespace-nowrap">
                          {tool.badge}
                        </span>
                        <span className="text-[10px] text-ink-muted whitespace-nowrap">
                          • {tool.cost} Credits
                        </span>
                      </div>
                      <p className="text-[11px] text-ink-muted line-clamp-1 mt-0.5">
                        {tool.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAction(tool)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex-shrink-0 shadow-soft-sm ${
                        canAfford
                          ? "bg-brand hover:bg-brand-dark text-white shadow-button"
                          : "bg-surface border border-border text-ink-muted hover:text-ink"
                      }`}
                    >
                      {tool.actionLabel}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer with Sign-In Note & Done Button */}
        <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
          <div className="text-ink-muted text-[11px]">
            <span>Credits saved locally. </span>
            <Link href="/login" className="text-brand font-semibold hover:underline">
              Sign in
            </Link>{" "}
            to sync to your profile.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-bold border border-border bg-page hover:bg-surface text-ink transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

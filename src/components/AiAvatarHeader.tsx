"use client";

import { useState } from "react";
import Icon from "./Icon";

export interface AiAvatarHeaderProps {
  title?: string;
  subtitle?: string;
  badgeText?: string;
  isSpeaking?: boolean;
  avatarSrc?: string;
  avatarAlt?: string;
  rightAction?: React.ReactNode;
}

export default function AiAvatarHeader({
  title = "Shree",
  subtitle = "AI powered hiring partner",
  badgeText = "Live-Interactive 24/7",
  isSpeaking = false,
  avatarSrc = "/shree-avatar.jpg",
  avatarAlt = "Shree — AI powered hiring partner",
  rightAction,
}: AiAvatarHeaderProps) {
  const [showPortrait, setShowPortrait] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  function toggleVoice() {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    if (!next && typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }

  return (
    <>
      <div className="bg-gradient-to-b from-brand-wash/70 via-surface to-surface border-b border-border px-4 py-3 sm:px-5 sm:py-3.5 relative flex items-center justify-between flex-shrink-0 min-h-[76px]">
        <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
          {/* Avatar Orb */}
          <div className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => setShowPortrait(true)}
              title="Click to expand Shree's portrait"
              aria-label="Expand AI avatar portrait"
              className={`relative block w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-gradient-to-tr from-brand to-brand-dark p-0.5 shadow-emblem transition-all group focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer ${
                isSpeaking ? "scale-105 ring-4 ring-brand/30" : "hover:scale-105 hover:ring-2 hover:ring-brand/40"
              }`}
            >
              <div className="w-full h-full rounded-full overflow-hidden bg-surface relative">
                <img
                  src={avatarSrc}
                  alt={avatarAlt}
                  className="w-full h-full object-cover select-none transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <Icon name="search" size={13} />
                </div>
              </div>
            </button>
            {isSpeaking && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-brand text-[8px] font-bold text-white uppercase tracking-wider animate-pulse shadow-soft-sm pointer-events-none whitespace-nowrap">
                Speaking
              </span>
            )}
          </div>

          {/* Context Details */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setShowPortrait(true)}
                title="Click to view portrait"
                className="font-bold text-[13.5px] sm:text-[14.5px] text-ink hover:text-brand transition-colors font-display text-left cursor-pointer truncate"
              >
                {title}
              </button>
              {badgeText && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] sm:text-[10px] bg-brand-wash text-brand border border-brand/20 font-medium flex-shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {badgeText}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-[11px] text-ink-muted mt-0.5 truncate leading-tight">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right Side Controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {rightAction}

          {/* Audio Synthesizer Toggle */}
          <button
            type="button"
            onClick={toggleVoice}
            title={voiceEnabled ? "Speaker On • Click to mute" : "Speaker Off • Click to unmute"}
            aria-label={voiceEnabled ? "Mute speaker audio" : "Unmute speaker audio"}
            className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
              voiceEnabled
                ? "bg-brand text-white border-brand shadow-button hover:bg-brand-dark"
                : "bg-page text-ink-muted border-border hover:text-brand hover:border-brand/40 shadow-soft-sm"
            }`}
          >
            <Icon
              name={voiceEnabled ? "volume2" : "volumeX"}
              size={15}
              className="transition-transform duration-200 hover:scale-110"
            />
          </button>
        </div>
      </div>

      {/* Expanded Avatar Portrait Modal */}
      {showPortrait && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Portrait View"
          onClick={() => setShowPortrait(false)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-surface border border-border rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl flex flex-col items-center gap-3.5 relative"
          >
            <button
              type="button"
              onClick={() => setShowPortrait(false)}
              aria-label="Close portrait view"
              className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full border border-border bg-page text-ink-muted hover:text-ink flex items-center justify-center cursor-pointer transition-colors"
            >
              ✕
            </button>
            <div className="w-52 h-52 rounded-full overflow-hidden p-1 bg-gradient-to-tr from-brand to-brand-dark shadow-emblem">
              <img
                src={avatarSrc}
                alt={avatarAlt}
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-display font-bold text-base text-ink">{title}</h3>
              <p className="text-xs font-semibold text-brand">AI powered hiring partner</p>
            </div>

            <div className="pt-2">
              <a
                href="/avatar"
                onClick={() => setShowPortrait(false)}
                className="text-[11px] font-medium text-brand hover:underline inline-flex items-center gap-1"
              >
                <span>View Full Avatar Profile &amp; Mission</span>
                <span>&rarr;</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

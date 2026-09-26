"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Logo from "./Logo";
import TopbarStatus from "./TopbarStatus";
import AiAvatarHeader, { AiAvatarHeaderProps } from "./AiAvatarHeader";
import Icon from "./Icon";

export interface UniversalNavItem {
  id: string;
  label: string;
  icon?: string;
  badge?: string | number | null;
  badgeColor?: "amber" | "emerald" | "blue" | "purple" | "rose" | "gray";
  active?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

export interface UniversalPlatformShellProps {
  // Page / Portal context
  portalTitle?: string;
  
  // Left Panel Props
  leftTitle?: string;
  leftSubtitle?: string;
  leftAction?: {
    label: string;
    icon?: string;
    onClick: () => void;
  };
  navItems?: UniversalNavItem[];
  activeNavId?: string;
  onSelectNav?: (id: string) => void;
  leftFooter?: React.ReactNode;
  
  // Custom Left Panel override (e.g. for Job Openings cards)
  customLeftContent?: React.ReactNode;

  // When true, navItems are shown as a dropdown menu next to portalTitle
  // instead of an always-visible left <aside> panel, and the main canvas
  // takes the full width. Opt-in per consumer -- defaults to false so the
  // existing aside behavior (e.g. AdminPlatformShell) is unaffected.
  navAsMenu?: boolean;

  // Right Panel Props
  avatarConfig?: AiAvatarHeaderProps;
  children: React.ReactNode;
  
  // Bottom Global Search Bar Props
  searchPlaceholder?: string;
  onSearchSubmit?: (query: string) => void;
  onCvDrop?: (file: File) => void;
  showCvDrop?: boolean;
  suggestedQuestions?: string[];
  onSuggestedQuestionClick?: (q: string) => void;
  customBottomBar?: React.ReactNode;
}

export default function UniversalPlatformShell({
  portalTitle,
  leftTitle,
  leftSubtitle,
  leftAction,
  navItems = [],
  activeNavId,
  onSelectNav,
  leftFooter,
  customLeftContent,
  navAsMenu = false,
  avatarConfig,
  children,
  searchPlaceholder = "Ask Shree anything, drop CV, or type command...",
  onSearchSubmit,
  onCvDrop,
  showCvDrop = false,
  suggestedQuestions = [],
  onSuggestedQuestionClick,
  customBottomBar,
}: UniversalPlatformShellProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDraggingCv, setIsDraggingCv] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [navMenuOpen, setNavMenuOpen] = useState(false);
  const navMenuRef = useRef<HTMLDivElement | null>(null);
  const activeNavItem = navItems.find((item) => activeNavId === item.id || item.active);

  useEffect(() => {
    if (!navMenuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (navMenuRef.current && !navMenuRef.current.contains(e.target as Node)) {
        setNavMenuOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setNavMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [navMenuOpen]);

  // Suggested questions scroll without browser scrollbars
  const chipsRef = useRef<HTMLDivElement | null>(null);
  function scrollChips(offset: number) {
    if (chipsRef.current) {
      chipsRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  }

  function handleSearchFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    if (onSearchSubmit) {
      onSearchSubmit(searchQuery.trim());
    }
    setSearchQuery("");
  }

  function toggleVoice() {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition ||
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice speech recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "en-US";
      recognition.interimResults = false;
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      recognition.onresult = (evt: any) => {
        const transcript = evt.results?.[0]?.[0]?.transcript;
        if (transcript) {
          setSearchQuery(transcript);
          if (onSearchSubmit) onSearchSubmit(transcript);
        }
      };
      recognition.start();
    } catch {
      setIsListening(false);
    }
  }

  const badgeColorMap = {
    amber: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
    emerald: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
    blue: "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800",
    purple: "bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800",
    rose: "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
    gray: "bg-surface text-ink-muted border-border",
  };

  return (
    <div className="flex flex-col h-screen w-full bg-page overflow-hidden select-none">
      {/* ================= GLOBAL UNIFIED HEADER ================= */}
      <header className="flex-shrink-0 bg-surface border-b border-border px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-3 shadow-soft-sm z-30">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/"
            aria-label="AskShree Home"
            title="AskShree — AI powered hiring partner"
            className="flex items-center gap-2 hover:opacity-90 transition-opacity flex-shrink-0"
          >
            <Logo height={28} showPunchline={true} />
          </Link>

          {portalTitle && (
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-border mx-0.5 hidden sm:inline select-none">/</span>
              {navAsMenu && navItems.length > 0 ? (
                <div className="relative" ref={navMenuRef}>
                  <button
                    type="button"
                    onClick={() => setNavMenuOpen((v) => !v)}
                    aria-expanded={navMenuOpen}
                    aria-haspopup="menu"
                    className="flex items-center gap-1.5 text-[13px] sm:text-[14px] font-semibold text-ink-2 hover:text-ink transition-colors cursor-pointer"
                  >
                    <span className="truncate">{activeNavItem?.label ?? portalTitle}</span>
                    <span
                      className={`text-[9px] transition-transform duration-200 ${
                        navMenuOpen ? "rotate-180 opacity-100" : "opacity-60"
                      }`}
                    >
                      ▾
                    </span>
                  </button>
                  {navMenuOpen && (
                    <div
                      role="menu"
                      aria-orientation="vertical"
                      className="absolute left-0 top-[calc(100%+10px)] w-64 bg-surface border border-border rounded-xl shadow-soft z-50 p-2 flex flex-col gap-1 animate-in fade-in slide-in-from-top-1.5 duration-150"
                    >
                      {(leftTitle || leftSubtitle) && (
                        <div className="px-2 pt-1 pb-1.5 border-b border-border mb-1">
                          {leftTitle && <div className="text-[11px] font-bold text-ink">{leftTitle}</div>}
                          {leftSubtitle && (
                            <div className="text-[10px] text-ink-muted mt-0.5">{leftSubtitle}</div>
                          )}
                        </div>
                      )}
                      {navItems.map((item) => {
                        const isActive = activeNavId === item.id || item.active;
                        const badgeColor = item.badgeColor ? badgeColorMap[item.badgeColor] : badgeColorMap.amber;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            role="menuitem"
                            disabled={item.disabled}
                            onClick={() => {
                              if (item.onClick) item.onClick();
                              if (onSelectNav) onSelectNav(item.id);
                              setNavMenuOpen(false);
                            }}
                            className={`w-full text-left px-2.5 py-2 rounded-lg text-[12.5px] font-medium transition-all flex items-center justify-between gap-2 cursor-pointer ${
                              isActive
                                ? "bg-brand-wash text-brand font-semibold"
                                : "text-ink-2 hover:bg-page"
                            } ${item.disabled ? "opacity-40 pointer-events-none" : ""}`}
                          >
                            <span className="flex items-center gap-2 min-w-0">
                              {item.icon && (
                                <Icon
                                  name={item.icon}
                                  className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? "text-brand" : "text-ink-muted"}`}
                                />
                              )}
                              <span className="truncate">{item.label}</span>
                            </span>
                            {item.badge !== undefined && item.badge !== null && (
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border flex-shrink-0 ${badgeColor}`}
                              >
                                {item.badge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-[13px] sm:text-[14px] font-semibold text-ink-2 truncate">
                  {portalTitle}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Global Persistent Heartbeat / Status Bar */}
        <TopbarStatus />
      </header>

      {/* ================= UNIVERSAL 2-PANEL SPLIT WORKSPACE ================= */}
      <div className="flex-1 min-h-0 grid grid-cols-12 gap-3 sm:gap-4 p-2 sm:p-4 overflow-hidden max-w-[1600px] w-full mx-auto">
        {/* ----------------- LEFT PANEL: Feature Navigation / Actions -----------------
            Hidden entirely when navAsMenu is true (nav items are shown via the
            header dropdown instead). Consumers that don't opt in (e.g.
            AdminPlatformShell) keep this panel exactly as before. */}
        {!navAsMenu && (
        <aside className="col-span-12 md:col-span-4 lg:col-span-3.5 xl:col-span-3 bg-surface border border-border rounded-2xl shadow-soft flex flex-col overflow-hidden">
          {/* Optional Action Header (e.g. Create Requisition +) */}
          {leftAction && (
            <div className="p-3 sm:p-3.5 border-b border-border bg-brand-wash/20 flex-shrink-0">
              <button
                type="button"
                onClick={leftAction.onClick}
                className="w-full h-10 px-3.5 rounded-xl bg-brand text-white hover:bg-brand-dark transition-all text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-button cursor-pointer active:scale-[0.99]"
              >
                <span className="text-base font-bold">{leftAction.icon || "+"}</span>
                <span>{leftAction.label}</span>
              </button>
            </div>
          )}

          {/* Left Title if specified */}
          {leftTitle && !leftAction && (
            <div className="p-3.5 border-b border-border bg-page/40 flex-shrink-0">
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                {leftTitle}
              </h2>
              {leftSubtitle && (
                <p className="text-[11px] text-ink-muted mt-0.5">{leftSubtitle}</p>
              )}
            </div>
          )}

          {/* Left Nav List / Features */}
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none p-2 sm:p-3 space-y-1.5">
            {customLeftContent ? (
              customLeftContent
            ) : (
              navItems.map((item) => {
                const isActive = activeNavId === item.id || item.active;
                const badgeColor = item.badgeColor ? badgeColorMap[item.badgeColor] : badgeColorMap.amber;

                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={item.disabled}
                    onClick={() => {
                      if (item.onClick) item.onClick();
                      if (onSelectNav) onSelectNav(item.id);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs sm:text-[13px] font-medium transition-all flex items-center justify-between gap-2.5 cursor-pointer border ${
                      isActive
                        ? "bg-brand-wash text-brand border-brand/40 shadow-soft-sm font-semibold"
                        : "bg-surface hover:bg-page text-ink-2 hover:text-ink border-transparent"
                    } ${item.disabled ? "opacity-40 pointer-events-none" : ""}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {item.icon && (
                        <Icon
                          name={item.icon}
                          className={`w-4 h-4 flex-shrink-0 ${
                            isActive ? "text-brand" : "text-ink-muted"
                          }`}
                        />
                      )}
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge !== undefined && item.badge !== null && (
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 shadow-soft-sm ${badgeColor}`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Left Footer (if present, e.g. paging controls) */}
          {leftFooter && (
            <div className="p-3 border-t border-border bg-page/30 flex-shrink-0">
              {leftFooter}
            </div>
          )}
        </aside>
        )}

        {/* ----------------- RIGHT PANEL: Active AI Canvas & Workspace ----------------- */}
        <main
          className={`${
            navAsMenu ? "col-span-12" : "col-span-12 md:col-span-8 lg:col-span-8.5 xl:col-span-9"
          } bg-surface border border-border rounded-2xl shadow-soft flex flex-col overflow-hidden relative`}
        >
          {/* Top Shree AI Avatar Header */}
          <AiAvatarHeader {...avatarConfig} />

          {/* Center Active Workspace Canvas */}
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none p-3 sm:p-5 relative flex flex-col bg-page/30">
            {children}
          </div>

          {/* Bottom Pinned Global Search / Shree AI Bar */}
          {customBottomBar ? (
            customBottomBar
          ) : (
            <div
              className="p-3 border-t border-border bg-surface flex-shrink-0"
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (showCvDrop && !isDraggingCv) setIsDraggingCv(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (showCvDrop) setIsDraggingCv(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (showCvDrop) {
                  setIsDraggingCv(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file && onCvDrop) onCvDrop(file);
                }
              }}
            >
              {/* Optional Drag Drop CV banner */}
              {showCvDrop && (
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && onCvDrop) onCvDrop(file);
                    e.target.value = "";
                  }}
                  accept=".pdf,.docx,.doc,.txt"
                  className="hidden"
                />
              )}

              {/* Suggested Questions Quick Carousel (Zero Scrollbar) */}
              {suggestedQuestions.length > 0 && (
                <div className="flex items-center gap-1.5 mb-2.5">
                  <button
                    type="button"
                    onClick={() => scrollChips(-200)}
                    aria-label="Scroll suggested queries left"
                    className="w-6 h-6 rounded-lg border border-border bg-page text-ink-muted hover:text-brand hover:border-brand/40 flex items-center justify-center flex-shrink-0 text-xs shadow-soft-sm transition-all cursor-pointer"
                  >
                    ‹
                  </button>
                  <div
                    ref={chipsRef}
                    className="flex-1 flex items-center gap-1.5 overflow-x-auto scrollbar-none scroll-smooth py-0.5"
                  >
                    {suggestedQuestions.map((sq, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSearchQuery(sq);
                          if (onSuggestedQuestionClick) onSuggestedQuestionClick(sq);
                          else if (onSearchSubmit) onSearchSubmit(sq);
                        }}
                        className="px-2.5 py-1 rounded-full border border-border bg-page hover:bg-brand-wash hover:border-brand/40 text-[11px] text-ink-muted hover:text-brand font-medium whitespace-nowrap transition-all shadow-soft-sm cursor-pointer"
                      >
                        {sq}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => scrollChips(200)}
                    aria-label="Scroll suggested queries right"
                    className="w-6 h-6 rounded-lg border border-border bg-page text-ink-muted hover:text-brand hover:border-brand/40 flex items-center justify-center flex-shrink-0 text-xs shadow-soft-sm transition-all cursor-pointer"
                  >
                    ›
                  </button>
                </div>
              )}

              {/* Input Capsule */}
              {isDraggingCv ? (
                <div className="w-full bg-brand-wash/40 border-2 border-dashed border-brand rounded-full py-2 px-4 flex items-center justify-center gap-2 text-center shadow-soft animate-pulse">
                  <span className="text-base">📥</span>
                  <span className="text-xs font-bold text-brand">
                    Release to drop CV (.pdf, .docx, .txt) for instant AI processing
                  </span>
                </div>
              ) : (
                <form
                  onSubmit={handleSearchFormSubmit}
                  className="w-full bg-page border border-border rounded-full shadow-search flex items-center px-3.5 py-1.5 gap-2 transition-all focus-within:border-brand focus-within:shadow-search-focus"
                >
                  <Icon name="search" className="w-[15px] h-[15px] text-ink-muted flex-shrink-0" />

                  {/* Optional "+ Drop CV" button */}
                  {showCvDrop && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      title="Drop CV or click to upload"
                      className="h-7 px-2.5 rounded-lg border border-border bg-surface hover:border-brand/40 text-xs font-semibold text-brand hover:text-brand-dark flex items-center gap-1 transition-all flex-shrink-0 shadow-soft-sm cursor-pointer"
                    >
                      <span className="text-sm font-bold text-brand">+</span>
                      <span className="text-[11px] font-medium">Drop CV</span>
                    </button>
                  )}

                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="flex-1 bg-transparent border-none outline-none text-ink text-xs sm:text-[13px] placeholder:text-ink-muted leading-tight"
                  />

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={toggleVoice}
                      title={isListening ? "Listening... click to stop" : "Ask Shree using your voice"}
                      aria-label="Voice input"
                      className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                        isListening
                          ? "bg-brand text-white border-brand animate-pulse shadow-button"
                          : "bg-surface text-ink-muted border-border hover:text-brand hover:border-brand/40 shadow-soft-sm"
                      }`}
                    >
                      <Icon name="mic" size={13} />
                    </button>

                    <button
                      type="submit"
                      aria-label="Send Query"
                      className="w-7 h-7 rounded-full bg-brand text-white flex items-center justify-center shadow-button hover:bg-brand-dark transition-all cursor-pointer"
                    >
                      <span className="text-xs font-bold">›</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

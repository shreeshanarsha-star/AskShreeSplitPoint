"use client";

import Link from "next/link";
import Icon from "./Icon";
import Logo from "./Logo";
import TopbarStatus from "./TopbarStatus";
import { useToolHomeHandler } from "./ToolHomeContext";

export default function Topbar({
  title,
  onMenuClick,
  alwaysShowMenu = false,
  showMenuButton = true,
}: {
  title: string;
  onMenuClick?: () => void;
  /** true on tool/feature pages, where the sidebar is a drawer at every
   *  breakpoint -- so the hamburger has to stay visible on desktop too,
   *  not just hide below lg like it does on the Home page. */
  alwaysShowMenu?: boolean;
  showMenuButton?: boolean;
}) {
  const toolHome = useToolHomeHandler();

  return (
    <header className="flex-shrink-0 bg-surface px-4 sm:px-[26px] py-3 flex items-center gap-2.5 sm:gap-3">
      {showMenuButton && (
        <button
          type="button"
          aria-label="Open menu"
          onClick={onMenuClick}
          className={`${alwaysShowMenu ? "" : "lg:hidden"} w-8 h-8 rounded-full border border-border bg-surface flex items-center justify-center text-ink-2 flex-shrink-0`}
        >
          <Icon name="menu" className="w-[16px] h-[16px]" />
        </button>
      )}

      {/* AskShree Brand Lockup */}
      <Link
        href="/"
        aria-label="AskShree Home"
        title="AskShree — AI powered hiring partner"
        className="flex items-center gap-2 hover:opacity-90 transition-opacity flex-shrink-0"
      >
        <Logo height={28} showPunchline={true} />
      </Link>

      {/* Page Title Context (when not on root Overview) */}
      {title && title !== "Shree AI Worker" && (
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-border mx-0.5 hidden sm:inline select-none">/</span>
          {toolHome ? (
            <button
              type="button"
              onClick={toolHome}
              title={`Back to ${title} home`}
              className="m-0 text-[13.5px] sm:text-[14.5px] font-semibold text-ink flex-shrink-0 truncate hover:text-brand transition-colors"
            >
              {title}
            </button>
          ) : (
            <h1 className="m-0 text-[13.5px] sm:text-[14.5px] font-semibold text-ink-2 flex-shrink-0 truncate">
              {title}
            </h1>
          )}
        </div>
      )}

      <div className="flex-1" />
      <TopbarStatus />
    </header>
  );
}

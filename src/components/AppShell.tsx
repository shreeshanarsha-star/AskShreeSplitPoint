"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { VScroller } from "./Scroller";
import { ToolHomeProvider } from "./ToolHomeContext";

export default function AppShell({
  title,
  children,
  sidebarMode = "tool",
}: {
  title: string;
  children: React.ReactNode;
  /**
   * "tool" (default) -- every feature/tool page (Talent.ai, Offer.ai,
   *   department pages, admin, etc). Sidebar starts collapsed and stays
   *   a drawer at every screen size, including desktop, so the tool gets
   *   full width; reopen via the hamburger in Topbar.
   * "home" -- classic layout: full sidebar always visible in-flow on desktop.
   * "none" -- no sidebar; all systems and departments are accessed exclusively
   *   via the 9-dot grid launcher in Topbar.
   */
  sidebarMode?: "tool" | "home" | "none";
}) {
  const [navOpen, setNavOpen] = useState(false);
  const alwaysDrawer = sidebarMode === "tool";
  const showSidebar = sidebarMode !== "none";

  return (
    <ToolHomeProvider>
      <div className="flex w-full h-screen lg:h-screen p-2 sm:p-4 gap-2 sm:gap-4 overflow-hidden">
        {showSidebar && (
          <Sidebar open={navOpen} onClose={() => setNavOpen(false)} alwaysDrawer={alwaysDrawer} />
        )}
        <div className="flex-1 min-w-0 flex flex-col bg-surface rounded-[20px] sm:rounded-[28px] shadow-soft overflow-hidden">
          <Topbar
            title={title}
            onMenuClick={() => setNavOpen(true)}
            alwaysShowMenu={alwaysDrawer}
            showMenuButton={showSidebar}
          />
          <main className="flex-1 min-h-0 flex flex-col max-w-[1180px] w-full mx-auto">
            <VScroller className="flex-1 min-h-0" trackClassName="h-full p-4 sm:p-[26px] flex flex-col">
              {children}
            </VScroller>
          </main>
        </div>
      </div>
    </ToolHomeProvider>
  );
}

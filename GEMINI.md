# Core Memory & Architectural Rules for AskShree

> **"We have to achieve something great. I need your support. We learn and make it happen."**

## Unbending Brand & Architectural Thumbrules

### 1. Universal Brand Logo Presence (Non-Negotiable)
- **Thumbrule**: The official AskShree brand logo MUST appear in **each and every page of the site, now and in future**. No page, portal, standalone view, modal header, or tool may omit it or substitute it with an ad-hoc letter icon (such as temporary `S` squares or plain text).
- **Official Brand Component**: Use `<Logo />` from `@/components/Logo`.
- **Official Lockup Specifications**:
  1. **Emblem**: Official Gold Sri Chakra emblem (`/askshree-emblem.png`) with `rounded-[22%]` and `shadow-emblem`.
  2. **Typography**: Wordmark with `Ask` in ink/dark color and `Shree` in luxury brand gold (`text-brand`).
  3. **Punchline**: Subtitle `"AI powered hiring partner"` rendered with `text-ink-muted tracking-tight font-medium`.
- **Default Props**: `<Logo />` defaults `showPunchline={true}` to ensure the punchline is universally rendered across all pages.
- **Sub-Portals & Child Pages**: When building standalone sub-portals (e.g., Recruiter Console, Candidate Talent Portal, Schedule Hub, Hiring Manager Review Portal, Interview Pre-Screening Room), the header MUST render `<Logo height={28} showPunchline={true} />` linked to `/`, followed by a subtle divider `/` and the portal descriptor.

### 2. Universal Status & Notification Bar Presence (Non-Negotiable)
- **Thumbrule**: The official status and notification bar (`<TopbarStatus />` from `@/components/TopbarStatus`) MUST live in **each and every page of the site, now and in future**.
- **Unified Global Heartbeat**: No page, portal, standalone view, modal header, tool, or auth screen may omit it. It is the visitor's and user's persistent anchor for system time, inline day/month/date, real-time weather, appearance theme switcher, live notification alerts, 9-dot platform waffle launcher, and user authentication / profile menu.
- **Layout Standard**:
  - In `AppShell` pages, it is automatically rendered on the right side of `<Topbar />`.
  - In standalone sub-portals and child pages (e.g., Recruiter Console, Candidate Talent Portal, Schedule Hub, Careers Portal, Hiring Manager Review Portal, Pre-screening Room, Sign, Apply, and Auth views), the top header MUST render `<TopbarStatus />` on the right side.
  - The status bar format strictly maintains the inline layout: `[Greeting] • [Day, Month Date] | [Weather] [Time] | [Appearance] [Notifications] [Waffle] [Auth]`, preserving generous breathing space and clean typographic hierarchy.

### 3. Design System & Luxury Token Discipline
- AskShree adheres to a warm, high-craft editorial aesthetic (warm alabaster page canvas, subtle borders `border-border`, crisp typography with `font-display` and `font-sans`, and warm gold amber accent `#B45309` / `var(--brand)`).
- Full platform navigation is accessible via the 9-dot waffle grid launcher (`<WaffleMenu />`) in the topbar.

### 4. Verification & Zero Regressions
- Every change must strictly typecheck with zero errors (`npx tsc --noEmit`) and build cleanly (`npm run build`).
- Live production deployments to `https://www.askshree.com/` must be verified using Chrome DevTools MCP.

### 5. Zero Scrollbars Thumbrule (Non-Negotiable)
- **Thumbrule**: There will be **no scroll bars in the site, now and in future**.
- **Execution**: Eliminate all browser and container scrollbars across all pages, modals, tables, and views (enforcing `scrollbar-none`, `scrollbar-width: none`, and `::-webkit-scrollbar { display: none; }` globally).
- **Clickable Navigation**: Instead of scrolling containers, implement **clickable arrows** (`‹` / `›`, `▲` / `▼`, or `Previous` / `Next` paging buttons) wherever navigation through overflow content is required.


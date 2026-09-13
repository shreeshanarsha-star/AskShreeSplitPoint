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

### 2. Design System & Luxury Token Discipline
- AskShree adheres to a warm, high-craft editorial aesthetic (warm alabaster page canvas, subtle borders `border-border`, crisp typography with `font-display` and `font-sans`, and warm gold amber accent `#B45309` / `var(--brand)`).
- Full platform navigation is accessible via the 9-dot waffle grid launcher (`<WaffleMenu />`) in the topbar.

### 3. Verification & Zero Regressions
- Every change must strictly typecheck with zero errors (`npx tsc --noEmit`) and build cleanly (`npm run build`).
- Live production deployments to `https://www.askshree.com/` must be verified using Chrome DevTools MCP.

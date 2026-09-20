# CHANGES.md — Items removed or replaced in feature/ats-flow

This file lists every feature or UI element that was removed, replaced, or
significantly changed. Required per HARD RULE 5 (never delete a real feature
without listing it here).

---

## Phase 2 — Recruiter Hub rebuild (2026-09-19)

### Removed: AI Agents tab with fabricated metrics

**Location before:** `src/app/recruiter/page.tsx` — `activeTab === "agents"` section  
**What it showed:**
- "Shree Sourcing Agent" — `"142 profiles parsed today"` (invented)
- "Resume ATS Pre-Screener" — `"91% accuracy correlation"` (invented)
- "Interview Coordinator Bot" — `"18 slots scheduled"` (invented)
- "HM Bias & Rubric Calibrator" — `"Zero compliance flags"` (invented)

All four agent cards had hard-coded metric strings with no database backing.

**Replaced with:** A single honest "AI Agents — Coming in V2" card in the new
`agents` feature panel. No numbers are shown. A clear note explains that
agentic sourcing and screening capabilities are on the roadmap.

---

### Removed: Funnel Analytics tab with hard-coded numbers

**Location before:** `src/app/recruiter/page.tsx` — `activeTab === "analytics"` section  
**What it showed:**
- "Average Time-to-Fill" → `"14.2 Days"` (hard-coded, no source)
- "HM Approval Velocity" → `"4.8 Hours"` (hard-coded, no source)
- "Interview Pass Rate" → `"68.5%"` (hard-coded, no source)
- "Offer Acceptance" → `"94.2%"` (hard-coded, no source; note "12 of 13" was also invented)

**Replaced with:** Real counts derived from database queries (total
requisitions, total applications, in-HM-review count). No percentage or
velocity metrics are shown until real pipeline data exists. A "Coming in V2"
note is shown for advanced funnel analytics.

---

### Changed: Requisition creation route

**Before:** POST to `/api/requisitions` (legacy, writes to `job_postings` table)  
**After:** POST to `/api/ats/requisitions` (writes to `talent_requisitions` table)  
The legacy `/api/requisitions` route is NOT removed; it is left as-is.

---

### Changed: Requisition list route

**Before:** GET `/api/requisitions` (reads `job_postings` table)  
**After:** GET `/api/ats/requisitions` (reads `talent_requisitions` table)  
The legacy route is NOT removed.

---

### Removed: Perspective switcher (Recruiter / Hiring Manager toggle)

**Location before:** `src/app/recruiter/page.tsx` — perspective control bar at top of content  
**Reason:** HARD RULE 3 — sidebar lists features/tools only. The perspective
switcher was a non-standard control that conflated two distinct hub roles
in one page. Hiring Manager Hub will be a separate Phase 6 hub.  
**Replacement:** The recruiter page now shows a recruiter-only view. HM access
is scoped to Phase 6.

---

### Changed: Quick Approve button route

**Before:** PATCH `/api/requisitions/[id]/approve` (approval on `job_postings`)  
**After:** The recruiter page no longer has a quick-approve button. Approval  
happens via the dedicated `/api/ats/requisitions/[id]/approve` endpoint (Phase 1).  
The button was removed from the All Requisitions feature to enforce the proper
step-by-step approval flow. Status badge now shows accurate ATS statuses.
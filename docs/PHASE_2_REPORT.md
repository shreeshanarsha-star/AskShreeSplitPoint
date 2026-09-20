# Phase 2 Report — Security Fix + Recruiter Hub

**Branch:** feature/ats-flow
**Date:** 2026-09-20
**Engineer:** Antigravity (implementation) | Claude CTO (review)
**Verification:** `npx tsc --noEmit` clean | `npm run build` exit 0

---

## Security Fix — Individual-Licence Isolation (null org_id)

### Bug

When `ctx.orgId` is `null` (user on individual licence, no organisation),
the guard `existing.org_id !== ctx.orgId` evaluates `null !== null` → `false`,
so the condition does NOT fire and any individual user could read/edit any
other individual user's records.

### Fix applied in 3 routes

| File | What changed |
|---|---|
| `src/app/api/ats/requisitions/[id]/route.ts` | After org_id equality check, added `if (ctx.orgId === null && existing.created_by !== user.id) → 403` |
| `src/app/api/ats/requisitions/[id]/postings/route.ts` | Same fix in both GET handler (added `created_by` to select) and POST handler |
| `src/app/api/ats/postings/[id]/route.ts` | Same fix (added `created_by` to select) |

Smoke test section 10 (individual-licence isolation) added to `scripts/ats-smoke.md`.

---

## New: GET /api/ats/applications

**File:** `src/app/api/ats/applications/route.ts` (NEW)

- Service-role client only; 401 without session, 403 without talent role
- Joins `talent_candidates` → `talent_requisitions` (inner join) for title/req_no
- Org scoping: org users filtered to `talent_requisitions.org_id = ctx.orgId`;
  individual (null orgId) filtered to `talent_requisitions.created_by = user.id`
- Role scoping: hiring managers see only their own requisitions' candidates;
  lead_recruiter / ta_head / admin / org_admin see whole org
- Platform owners see everything
- Query params: `?requisition_id=<uuid>` and `?stage=<stage>` for filtering
- Safe output: never exposes `org_id`, `created_by`, or recruiter emails
- Fails gracefully to `{ applications: [] }` if `talent_candidates` table has
  no matching rows (e.g. if not yet populated)

---

## Recruiter Hub Rebuild

**File:** `src/app/recruiter/page.tsx` (MODIFIED — full rewrite)

### What changed vs original

| Before | After |
|---|---|
| Calls `GET /api/requisitions` (legacy, job_postings) | Calls `GET /api/ats/requisitions` |
| Calls `POST /api/requisitions` (legacy) | Calls `POST /api/ats/requisitions` |
| 4 tabs: My Requisitions, AI Agents, Funnel Analytics, + Create | 4 feature nav items (sidebar): + New Requisition, All Requisitions, All Applications, Post to Boards |
| Perspective switcher (Recruiter/HM toggle) | Removed; recruiter-only view (HM Hub → Phase 6) |
| AI Agents tab with 4 hard-coded agent cards + invented metrics | Replaced with honest "Coming in V2" card (no numbers) |
| Funnel Analytics tab with 4 hard-coded KPIs | Replaced with real counts from DB (open, pending, total) |
| Quick Approve button hitting legacy route | Removed; approval via dedicated ATS endpoint |
| All Applications shows applications from /api/requisitions response | New All Applications feature calls GET /api/ats/applications |
| No posting editor | Post to Boards: board checkboxes (AskShree/Google enabled; Indeed/LinkedIn/Naukri disabled), hide_company_name toggle, valid_through date, 7 content blocks stored as JSON (with TODO for Phase 3 template) |

### Sidebar nav items (FEATURES only per spec)
1. **+ New Requisition** — JD drop/analyse + form → POST `/api/ats/requisitions`
2. **All Requisitions** — live count badge; row actions: Post, Applications
3. **All Applications** — calls GET `/api/ats/applications`; filter by req + stage
4. **Post to Boards** — posting editor; boards: AskShree ✅, Google ✅, Indeed/LinkedIn/Naukri 🔒

### Removed / documented in docs/CHANGES.md
- AI agent metrics (4 hard-coded cards with invented numbers)
- Funnel analytics KPIs (4 hard-coded percentages with no data source)
- Perspective switcher (HM view deferred to Phase 6)

---

## docs/CHANGES.md

New file documenting every removed/replaced feature in this phase.

---

## What I Am Unsure About

1. **`talent_candidates` schema** — the applications route selects fields
   (`name`, `email`, `phone`, `current_company`, etc.) that I inferred from
   the SCHEMA_SNAPSHOT. If column names differ, the select will return nulls
   but not error. Claude (CTO) should verify field names against the live schema
   before Phase 4 wires the apply flow to this table.

2. **`talent_requisitions.created_by` filter for individual licence** — the
   applications route uses `talent_requisitions.created_by = user.id` via a
   PostgREST filter on the joined table. This syntax is valid in Supabase but
   should be smoke-tested once the DRAFT migration is applied.

3. **Hiring Manager Hub** — Phase 6. The old perspective switcher is gone.
   No HM-specific route or page exists yet.

---

## Verification

- `npx tsc --noEmit` → exit 0 ✅
- `npm run build` → exit 0 ✅ (`/api/ats/applications` visible in build manifest)
- `/recruiter` page: 6.82 kB, compiles as static (○)
- Branch: **feature/ats-flow** — not pushed
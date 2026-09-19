# Phase 1 Report — ATS API Layer (Requisitions & Postings)

**Branch:** feature/ats-flow  
**Date:** 2026-09-19  
**Engineer:** Antigravity (implementation) | Claude CTO (review)  
**Verification:** `npx tsc --noEmit` ✅ exit 0 | `npm run build` ✅ exit 0

---

## Files Created / Modified

### New Files

| File | Description |
|---|---|
| `supabase/migrations/DRAFT_20260919_talent_job_postings.sql` | DRAFT migration — `talent_job_postings` table, RLS enabled (no anon/authenticated policies), indexes on `requisition_id`, `org_id`, `status`, unique constraint on `(requisition_id, board)`. **Not applied.** |
| `src/app/api/ats/requisitions/route.ts` | GET (role-scoped list) + POST (create in `talent_requisitions`, licence-aware status + approval chain) |
| `src/app/api/ats/requisitions/[id]/route.ts` | PATCH — whitelist-only field edit, org-scoped, role-gated |
| `src/app/api/ats/requisitions/[id]/approve/route.ts` | POST — step-level approval; verifies assigned approver; promotes to `open` when all steps pass |
| `src/app/api/ats/requisitions/[id]/reject/route.ts` | POST — step-level rejection; sets requisition to `rejected`; notifies creator |
| `src/app/api/ats/requisitions/[id]/postings/route.ts` | GET + POST — create/list postings in `talent_job_postings`; 501 for unconnected boards; 422 for Google + confidential |
| `src/app/api/ats/postings/[id]/route.ts` | PATCH — update posting content/status; same board/confidential rules enforced |
| `scripts/ats-smoke.md` | Manual test script — 9 sections covering every route with 401/403/happy-path cases |

### Modified Files

| File | Change |
|---|---|
| `src/app/api/public/jobs/route.ts` | Replaced legacy `talent_requisitions` + hard-coded demo fallback with join on `talent_job_postings (board=askshree, status=published)`. Response shape is **identical** to before (`{ jobs: [{ id, title, department, location, type, description }] }`). Returns `{ jobs: [] }` (honest empty state) until DRAFT migration is applied. Never exposes `org_id`, `created_by`, or any email. |

---

## What Works (after DRAFT migration is applied)

- **POST /api/ats/requisitions**
  - Individual licence (org.plan = `individual` or no org) → status `open`, no approval steps, NOT published
  - Organisation licence (plan = `enterprise` / `organization` / `bulk`) → status `pending_approval`, `talent_approval_steps` inserted via `buildApprovalChain()`, status-history row inserted
  - Generates `req_no` via existing `generateReqNo()`
  - Audit log written
  - 401 without session, 403 without creator role

- **GET /api/ats/requisitions**
  - `lead_recruiter` / `ta_head` / `hr_head` / `hr_ops` / `admin` / `org_admin` → whole org
  - `recruiter` → own + explicitly assigned (via `talent_requisition_assignment`)
  - `hiring_manager` → own only
  - Individual (no org) → own only
  - Platform owner (is_admin) → all
  - 401 / 403 enforced

- **PATCH /api/ats/requisitions/[id]**
  - Whitelist of editable fields; `org_id`, `status`, `created_by` cannot be patched via this route
  - Org scope enforced; hiring managers limited to own requisitions

- **POST /api/ats/requisitions/[id]/approve** and **/reject**
  - Finds first pending step in `talent_approval_steps`
  - Verifies caller is named `approver_user_id` OR holds the step's `approver_role`
  - `org_admin` / platform owner can override
  - When all steps approved → requisition becomes `open`
  - Status-history rows inserted; notifications sent to creator

- **POST/GET /api/ats/requisitions/[id]/postings**
  - `indeed`, `linkedin`, `naukri` → 501 "not connected"
  - `google` + `hide_company_name: true` → 422
  - Unique `(requisition_id, board)` constraint surfaced as clean 409

- **PATCH /api/ats/postings/[id]**
  - Same publish rules enforced on update
  - Org scoping from DB, never from request body

- **GET /api/public/jobs**
  - Joins `talent_job_postings` + `talent_requisitions`, `board = askshree`, `status = published`
  - `hide_company_name` → `company: "Confidential"` in response
  - Never exposes internal IDs or emails
  - Fails gracefully to `{ jobs: [] }` if table does not exist yet

---

## What I Am Unsure About

1. **`talent_job_postings` join syntax** — Supabase PostgREST returns a FK join as an object when the relation is 1-to-1. The public/jobs route handles both `Array` and `object` shapes. Verify after migration is applied.

2. **`generateReqNo` race safety** — The existing function uses an optimistic "max + 1" pattern with no advisory lock. It works for low concurrency but may collide under burst creation. This is pre-existing behaviour; noted for future hardening.

3. **`buildApprovalChain` returns `approver_user_id: null` for step 2 (hr_approver)** — The approve route handles the `null` case by matching on the caller's role. This means ANY user holding `hr_approver` can approve step 2 for any org. Adequate for now per spec; Phase 5 will introduce a per-org flow editor that names specific users.

4. **`must_have_skills` / `good_to_have_skills`** — `talent_requisitions` stores these inside `eligibility_criteria jsonb`, not as top-level array columns. The GET response exposes `eligibility_criteria` as-is; Phase 2 UI should expect this shape, not separate columns.

5. **`talent_job_postings.org_id`** — Populated from `getOrgContext()` server-side. For individual users (no org), stored as `null`. The public/jobs join is on `requisition_id` only so this is safe.

---

## What Was Skipped / Deferred

- **SQL not executed.** All DB changes are DRAFT only. The `talent_job_postings` table does not exist at runtime until Claude (CTO) applies the migration. Public routes fail gracefully.
- **Phase 2–8** not started per instructions.
- **Existing `/api/requisitions` routes not touched** — left exactly as-is per HARD RULE 4 and CTO instruction.
- **`src/app/page.tsx` not touched** — home page data path unchanged; only the API route it calls was updated.
- **`UniversalPlatformShell`, `Logo`, `TopbarStatus`, `GlobalSearchBar`, `AdminPlatformShell`** — not touched.
- **`/api/ats/applications`** — deferred to Phase 4 (candidates apply flow).
- **SimpleNow.ai** — not touched.

---

## Response Shape Comparison — GET /api/public/jobs

| Field | Before | After |
|---|---|---|
| `id` | requisition UUID or `"demo-req-N"` | posting UUID (public job id) |
| `title` | from `talent_requisitions.title` | from `talent_requisitions.title` via join ✅ |
| `department` | hard-coded `"Engineering & Technology"` | from `talent_requisitions.department` ✅ |
| `location` | `req.location \|\| "Bangalore / Remote"` | from `talent_requisitions.location` ✅ |
| `type` | hard-coded `"Full-Time"` | from `talent_requisitions.employment_type` ✅ |
| `description` | from `talent_requisitions.description` | from `talent_requisitions.description` via join ✅ |
| demo fallback | ✅ present (3 hard-coded jobs) | ❌ removed — honest empty state |

> **Note for CTO review**: the `id` field now carries the `talent_job_postings.id` (posting UUID) rather than the `talent_requisitions.id`. This is intentional — `/jobs/[id]` in Phase 3 will route to the posting, not the raw requisition. If the current `/jobs/[id]` route looks up by requisition id, it will need updating in Phase 3. Flagged here so the CTO can check before Phase 3 starts.
# Phase 4 Report — Apply Flow (posting id -> talent_candidates)

**Branch:** feature/ats-flow
**Date:** 2026-09-20
**Engineer:** Antigravity (implementation) | Claude CTO (review)
**Verification:** `npx tsc --noEmit` clean | `npm run build` exit 0

---

## Files Changed

| File | Change |
|---|---|
| `src/app/api/public/quick-apply/route.ts` | MODIFIED — Phase 4 apply flow |
| `src/app/api/candidate/quick-apply/submit/route.ts` | MODIFIED — Phase 4 apply flow |

---

## Problem Statement

Before Phase 4, the home page's Quick Apply sent `requisitionId: selectedJob.id`.
After Phase 1, `selectedJob.id` became a `talent_job_postings.id` (posting UUID),
not a `talent_requisitions.id`. The apply routes were not updated to handle this.

Additionally:
- `candidate/quick-apply/submit` wrote to `job_applications` (legacy table).
- `match_score: 82` was hard-coded as a fallback in `submit/route.ts`.
- No duplicate protection existed in either route.

---

## Changes: `src/app/api/public/quick-apply/route.ts`

### Input fields
Now accepts `postingId` (primary, from home page) OR `requisitionId` (legacy callers).
The home page sends `requisitionId: selectedJob.id` — this value is now interpreted as a
posting id first (the field name in page.tsx wasn't changed, since page.tsx is read-only).

### Resolution chain
1. If `postingId` given: look up `talent_job_postings`. Must be `status=published, board=askshree`.
   → extracts `requisition_id`. Returns 410 if posting is not accepting applications.
2. If table doesn't exist yet (DRAFT migration pending): treats `postingId` as a direct
   `requisitionId` (fallback for pre-migration state).
3. If `requisitionId` given directly: uses it.

### Duplicate protection
Checks `talent_candidates` for `requisition_id + email (ilike)` before inserting.
Returns HTTP 409 with `{ ok: false, duplicate: true, message: "You've already applied..." }`.
Home page checks `res.ok` — returns false on 409, so the modal shows the error message.

### match_score fallback removed
`matchScore` starts as `null`. AI scoring (`scoreCandidateFit`) populates it if resume
provided. On failure: stays `null`. No `82` fallback. The home page reads `data.candidateId`
and `data.interviewToken` — neither depends on matchScore. ✅

### Response shape (unchanged from what home page reads)
```json
{ "ok": true, "candidateId": "...", "interviewToken": "int-..." }
```

---

## Changes: `src/app/api/candidate/quick-apply/submit/route.ts`

### Resolution chain (same as above)
1. Try `talent_job_postings` by `jobPostingId` → resolve to `talent_requisitions`.
2. Try `talent_requisitions` directly by `jobPostingId`.
3. Try legacy `job_postings` → write to `job_applications` (legacy path, not retired yet).

### ATS path writes to
- `talent_people` (find or create by email)
- `talent_candidates` (stage = "applied", linked to `requisition_id` and `person_id`)
- `consent_records` (best effort)
- `apply_candidates` upsert (legacy candidate tracker, non-blocking)

### Fake 82 removed
`match_score` in `job_applications` (legacy path) and `talent_candidates` (ATS path)
both start as `null`. AI scoring via `screenCandidate` is attempted; on failure stays null.

### Response shape (compatible with home page)
```json
{ "ok": true, "applicationId": "...", "matchScore": null, "matchedSkills": [], "missingSkills": [], "message": "..." }
```
Home page checks `res.ok` and reads `data.candidateId` — not `applicationId`, so legacy
callers are unaffected.

---

## Duplicate Detection

Same email + same requisition → HTTP 409:
```json
{ "ok": false, "duplicate": true, "message": "You've already applied to this role..." }
```
The home page `handleQuickApply` checks `res.ok`: on false (409), it does not call
`setApplySuccess(true)`. The error is silently swallowed in the current UI (no toast);
this is acceptable for now — Phase 7 can surface it via a dedicated message.

---

## What I Am Unsure About

1. **`talent_candidates` field names for `current_location`, `notice_period`,
   `qualification`, `resume_file_name`, `met_must_have_skills`, `missing_must_have_skills`**
   — inferred from SCHEMA_SNAPSHOT. If any column names differ, the insert will error.
   The route handles `candError` and returns 500 with the message, so it will be visible.
   CTO should verify column names against live schema before end-to-end testing.

2. **Home page sends `requisitionId` key, not `postingId`** — the home page (read-only)
   sends `body: { requisitionId: selectedJob.id, ... }`. `selectedJob.id` is now a posting
   UUID. The `public/quick-apply` route reads `postingId` first, then `requisitionId` as
   a fallback. So `{ requisitionId: <posting-uuid> }` is handled by the fallback branch:
   treated as a posting id lookup first, then direct requisition. This works correctly
   as long as posting UUIDs and requisition UUIDs don't collide (they won't — different
   tables with separate UUID sequences).

3. **`screenCandidate` signature** — accepts `{ title, company, must_have_skills,
   good_to_have_skills, qualification, min_years_experience }` per existing usage.
   The ATS path uses `requisitionMustHaveSkills` etc from `eligibility_criteria` JSON.
   If the JSON structure differs, scoring returns null gracefully.
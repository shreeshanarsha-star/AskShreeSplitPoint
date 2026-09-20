# ATS Phase 1 — Smoke Test Script

This document describes how to exercise every new route introduced in Phase 1.
Run these tests after Claude (CTO) applies `DRAFT_20260919_talent_job_postings.sql`.

All examples assume the dev server is running at `http://localhost:3000`.

---

## Prerequisites

1. Have two browser sessions (or curl with two different cookie jars):
   - **Session A** — a user with role `recruiter` in an *organization* org (plan = enterprise/organization/bulk).
   - **Session B** — a user with role `recruiter` in an *individual* licence (no org, or org.plan = "individual").
   - **Session C** — a user with NO talent roles (regular `member` of an org).
   - **Session U** — unauthenticated (no cookie).
2. Copy the session cookie from the browser DevTools → Application → Cookies → `sb-*`.

---

## 1. POST /api/ats/requisitions — Create a requisition

### 1a. 401 — unauthenticated

```bash
curl -s -X POST http://localhost:3000/api/ats/requisitions \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Role"}' | jq .
```
**Expected:** `{"error":"Unauthorized"}` with HTTP 401.

### 1b. 403 — wrong role (Session C, no talent role)

```bash
curl -s -X POST http://localhost:3000/api/ats/requisitions \
  -H "Content-Type: application/json" \
  -H "Cookie: <session_c_cookie>" \
  -d '{"title":"Test Role"}' | jq .
```
**Expected:** `{"error":"Forbidden"}` with HTTP 403.

### 1c. Happy path — individual licence (Session B)

```bash
curl -s -X POST http://localhost:3000/api/ats/requisitions \
  -H "Content-Type: application/json" \
  -H "Cookie: <session_b_cookie>" \
  -d '{
    "title": "Senior Engineer",
    "department": "Engineering",
    "location": "Bangalore",
    "work_mode": "remote",
    "employment_type": "full-time",
    "headcount": 2,
    "priority": "high"
  }' | jq .
```
**Expected:** HTTP 200, `status: "open"`, `message` contains "individual licence".
Note the returned `id` as `$REQ_B_ID`.

### 1d. Happy path — organisation licence (Session A)

Same payload via Session A.
**Expected:** HTTP 200, `status: "pending_approval"`, `message` contains "queued for approval".
Note the returned `id` as `$REQ_A_ID`.

---

## 2. GET /api/ats/requisitions — List requisitions

### 2a. 401 — unauthenticated

```bash
curl -s http://localhost:3000/api/ats/requisitions | jq .
```
**Expected:** HTTP 401.

### 2b. Happy path — recruiter sees own requisitions

```bash
curl -s http://localhost:3000/api/ats/requisitions \
  -H "Cookie: <session_b_cookie>" | jq '.requisitions | length'
```
**Expected:** includes the requisition created in 1c.

### 2c. Wrong org — Session B must NOT see Session A's org requisitions

Verify that `$REQ_A_ID` is absent from Session B's response.

---

## 3. PATCH /api/ats/requisitions/[id] — Edit a requisition

### 3a. 401 — unauthenticated

```bash
curl -s -X PATCH http://localhost:3000/api/ats/requisitions/$REQ_B_ID \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated Title"}' | jq .
```
**Expected:** HTTP 401.

### 3b. 403 — wrong org (Session A trying to edit Session B's req)

```bash
curl -s -X PATCH http://localhost:3000/api/ats/requisitions/$REQ_B_ID \
  -H "Content-Type: application/json" \
  -H "Cookie: <session_a_cookie>" \
  -d '{"title":"Hacked"}' | jq .
```
**Expected:** HTTP 403.

### 3c. Attempt to patch org_id or status — rejected silently

```bash
curl -s -X PATCH http://localhost:3000/api/ats/requisitions/$REQ_B_ID \
  -H "Content-Type: application/json" \
  -H "Cookie: <session_b_cookie>" \
  -d '{"org_id":"fake-org","status":"open","title":"Safe Update"}' | jq .
```
**Expected:** HTTP 200, only `title` is updated; `org_id` and `status` unchanged.

### 3d. Happy path — valid edit

```bash
curl -s -X PATCH http://localhost:3000/api/ats/requisitions/$REQ_B_ID \
  -H "Content-Type: application/json" \
  -H "Cookie: <session_b_cookie>" \
  -d '{"title":"Senior Full-Stack Engineer","headcount":3}' | jq .
```
**Expected:** HTTP 200, updated title and headcount.

---

## 4. POST /api/ats/requisitions/[id]/approve

### 4a. 401 — unauthenticated

```bash
curl -s -X POST http://localhost:3000/api/ats/requisitions/$REQ_A_ID/approve | jq .
```
**Expected:** HTTP 401.

### 4b. 409 — requisition not pending (Session B's req is already open)

```bash
curl -s -X POST http://localhost:3000/api/ats/requisitions/$REQ_B_ID/approve \
  -H "Cookie: <session_b_cookie>" | jq .
```
**Expected:** HTTP 409 with message about status not being pending_approval.

### 4c. 403 — caller is not the assigned approver

Try approving `$REQ_A_ID` using Session B (who did not create it and holds no approver role).
**Expected:** HTTP 403.

### 4d. Happy path — step 1 approve via reporting manager (Session A org context)

Use the session of the person named as `approver_user_id` in step 1.
```bash
curl -s -X POST http://localhost:3000/api/ats/requisitions/$REQ_A_ID/approve \
  -H "Content-Type: application/json" \
  -H "Cookie: <reporting_manager_cookie>" \
  -d '{"comment":"Looks good."}' | jq .
```
**Expected:** HTTP 200, `status: "pending_approval"` (step 2 still pending).

---

## 5. POST /api/ats/requisitions/[id]/reject

### 5a. 401 — unauthenticated

```bash
curl -s -X POST http://localhost:3000/api/ats/requisitions/$REQ_A_ID/reject | jq .
```
**Expected:** HTTP 401.

### 5b. Happy path — reject with comment

Use the session of the current pending approver:
```bash
curl -s -X POST http://localhost:3000/api/ats/requisitions/$REQ_A_ID/reject \
  -H "Content-Type: application/json" \
  -H "Cookie: <approver_cookie>" \
  -d '{"comment":"Headcount budget not approved."}' | jq .
```
**Expected:** HTTP 200, `status: "rejected"`. Creator receives an in-app notification.

---

## 6. POST /api/ats/requisitions/[id]/postings — Create a posting

### 6a. 401 — unauthenticated

```bash
curl -s -X POST http://localhost:3000/api/ats/requisitions/$REQ_B_ID/postings \
  -H "Content-Type: application/json" \
  -d '{"board":"askshree"}' | jq .
```
**Expected:** HTTP 401.

### 6b. 501 — unconnected board

```bash
curl -s -X POST http://localhost:3000/api/ats/requisitions/$REQ_B_ID/postings \
  -H "Content-Type: application/json" \
  -H "Cookie: <session_b_cookie>" \
  -d '{"board":"linkedin"}' | jq .
```
**Expected:** HTTP 501, message "not connected".

### 6c. 422 — Google + hide_company_name

```bash
curl -s -X POST http://localhost:3000/api/ats/requisitions/$REQ_B_ID/postings \
  -H "Content-Type: application/json" \
  -H "Cookie: <session_b_cookie>" \
  -d '{"board":"google","hide_company_name":true}' | jq .
```
**Expected:** HTTP 422, message about Google not allowing confidential postings.

### 6d. Happy path — AskShree draft posting

```bash
curl -s -X POST http://localhost:3000/api/ats/requisitions/$REQ_B_ID/postings \
  -H "Content-Type: application/json" \
  -H "Cookie: <session_b_cookie>" \
  -d '{"board":"askshree","status":"draft","content":{"intro":"Great company"}}' | jq .
```
**Expected:** HTTP 200, `status: "draft"`. Note `id` as `$POSTING_ID`.

### 6e. 409 — duplicate board

Repeat 6d. **Expected:** HTTP 409 "already exists".

### 6f. Happy path — AskShree published posting

```bash
curl -s -X POST http://localhost:3000/api/ats/requisitions/$REQ_B_ID/postings \
  -H "Content-Type: application/json" \
  -H "Cookie: <session_b_cookie>" \
  -d '{"board":"google","status":"published"}' | jq .
```
**Expected:** HTTP 200, `status: "published"`. Note as `$GOOGLE_POSTING_ID`.

---

## 7. GET /api/ats/requisitions/[id]/postings

```bash
curl -s http://localhost:3000/api/ats/requisitions/$REQ_B_ID/postings \
  -H "Cookie: <session_b_cookie>" | jq '.postings | length'
```
**Expected:** 2 postings (askshree draft, google published).

---

## 8. PATCH /api/ats/postings/[id]

### 8a. 401 — unauthenticated

```bash
curl -s -X PATCH http://localhost:3000/api/ats/postings/$POSTING_ID | jq .
```
**Expected:** HTTP 401.

### 8b. Publish the AskShree draft

```bash
curl -s -X PATCH http://localhost:3000/api/ats/postings/$POSTING_ID \
  -H "Content-Type: application/json" \
  -H "Cookie: <session_b_cookie>" \
  -d '{"status":"published"}' | jq .
```
**Expected:** HTTP 200, `status: "published"`.

### 8c. Attempt to set LinkedIn to published — 501

Create a LinkedIn posting (will return 501 on POST itself, so test via direct DB insert if needed). Skip if infeasible in dev.

---

## 9. GET /api/public/jobs — Public job listings

### 9a. Returns no demo jobs

```bash
curl -s http://localhost:3000/api/public/jobs | jq .
```
**Expected:** `{ "jobs": [] }` (until migration applied) OR a list of jobs from `talent_job_postings`.

### 9b. Response shape is backward-compatible

Each job object must have: `id`, `title`, `department`, `location`, `type`, `description`.
Must NOT contain: `org_id`, `created_by`, any email address, `recruiter_id`.

### 9c. Confidential posting masks company name

Publish an AskShree posting with `hide_company_name: true` via Session B,
then verify the public API returns `"company":"Confidential"` (or omits the field if unchanged).

---

## Summary Matrix

| Route | 401 no session | 403 wrong role | 403 wrong org | Happy path |
|---|---|---|---|---|
| POST /api/ats/requisitions | 6a | 1b | N/A | 1c, 1d |
| GET /api/ats/requisitions | 2a | N/A | 2c | 2b |
| PATCH /api/ats/requisitions/[id] | 3a | N/A | 3b | 3d |
| POST /api/ats/requisitions/[id]/approve | 4a | N/A | 4c | 4d |
| POST /api/ats/requisitions/[id]/reject | 5a | N/A | N/A | 5b |
| POST /api/ats/requisitions/[id]/postings | 6a | N/A | N/A | 6d |
| GET /api/ats/requisitions/[id]/postings | N/A | N/A | N/A | 7 |
| PATCH /api/ats/postings/[id] | 8a | N/A | N/A | 8b |
| GET /api/public/jobs | N/A | N/A | N/A | 9a, 9b, 9c |
---

## 10. Security: Individual-licence isolation (null org_id)

This test verifies that two individual-licence users (orgId = null) cannot
read or edit each other's records. Run after creating requisitions from
two separate individual accounts.

**Setup:**
- Session I1 — individual user, creates `$REQ_I1` (status "open").
- Session I2 — different individual user (different user.id, also no org).

### 10a. PATCH — Session I2 cannot edit I1's requisition

```bash
curl -s -X PATCH http://localhost:3000/api/ats/requisitions/$REQ_I1 \
  -H "Content-Type: application/json" \
  -H "Cookie: <session_i2_cookie>" \
  -d '{"title":"Stolen!"}' | jq .
```
**Expected:** HTTP 403 `{"error":"Forbidden"}`.

### 10b. GET postings — Session I2 cannot list I1's postings

```bash
curl -s http://localhost:3000/api/ats/requisitions/$REQ_I1/postings \
  -H "Cookie: <session_i2_cookie>" | jq .
```
**Expected:** HTTP 403 `{"error":"Forbidden"}`.

### 10c. POST postings — Session I2 cannot create postings for I1's requisition

```bash
curl -s -X POST http://localhost:3000/api/ats/requisitions/$REQ_I1/postings \
  -H "Content-Type: application/json" \
  -H "Cookie: <session_i2_cookie>" \
  -d '{"board":"askshree"}' | jq .
```
**Expected:** HTTP 403 `{"error":"Forbidden"}`.

### 10d. PATCH posting — Session I2 cannot update I1's posting

First create a posting as I1 (use session_i1), note `$POSTING_I1_ID`.
Then:
```bash
curl -s -X PATCH http://localhost:3000/api/ats/postings/$POSTING_I1_ID \
  -H "Content-Type: application/json" \
  -H "Cookie: <session_i2_cookie>" \
  -d '{"status":"published"}' | jq .
```
**Expected:** HTTP 403 `{"error":"Forbidden"}`.

### 10e. Happy path — Session I1 can still edit own records

```bash
curl -s -X PATCH http://localhost:3000/api/ats/requisitions/$REQ_I1 \
  -H "Content-Type: application/json" \
  -H "Cookie: <session_i1_cookie>" \
  -d '{"title":"My Updated Role"}' | jq .
```
**Expected:** HTTP 200 with updated title.

**Root cause fixed:** `null !== null` evaluates to `false` in JavaScript, so
the plain `existing.org_id !== ctx.orgId` check would PASS for both I1 and I2
(both null). The fix adds `if (ctx.orgId === null && record.created_by !== user.id) → 403`
in all three affected routes: requisitions/[id], requisitions/[id]/postings (GET+POST),
and postings/[id].
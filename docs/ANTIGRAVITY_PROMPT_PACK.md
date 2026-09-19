# AskShree — Antigravity prompt pack

How to use: open the repo AskShreeSplitPoint in Antigravity. Create a branch `feature/ats-flow` (never work on `main`). Paste the SHARED RULES block first in every session, then ONE phase prompt. When a phase is done, commit to the branch, tell Claude the phase number. Claude reviews, fixes, and merges to main.

Today's goal = Phases 1 to 4 (requisition -> posting -> home page -> apply -> recruiter). Phases 5 to 8 come after.

---

## SHARED RULES (paste at the top of every session)

You are working in the AskShree repo (Next.js 15 App Router, React 18, TypeScript, Tailwind, Supabase). Read GEMINI.md and follow it.

HARD RULES
1. Do NOT modify `src/app/page.tsx` (the home / Guest Hub) or its visual output in any way. Its data may change only through the API routes it calls.
2. Do NOT touch anything related to SimpleNow.ai. Do NOT edit `UniversalPlatformShell.tsx`, `AdminPlatformShell.tsx`, `GlobalSearchBar.tsx`, `Logo`, or `TopbarStatus`. You may USE them. If you believe a shell change is needed, stop and write it in `docs/NEEDS_OWNER_PERMISSION.md` instead.
3. Layout is locked: Logo top-left, top bar top-right, left side panel, main canvas, bottom Global search bar. Only the side-panel contents (features and tools) differ by role. Sidebar lists features/tools only, not page content.
4. Design: warm alabaster canvas, gold brand #B45309, font-display / font-sans, no scrollbars (use clickable paging), as in GEMINI.md.
5. Never invent data or numbers. If data is not available, show an honest empty or "not connected" state. Delete no real feature without listing it in `docs/CHANGES.md`.
6. Never put secrets in code. Never read or print env values. Use `process.env.X` only server-side.
7. Every API route must authenticate the user, resolve their org and role (`src/lib/org.ts`, `src/lib/talentRoles.ts`), and enforce org scoping. No unauthenticated reads of ATS data. Public routes return only fields safe for guests.
8. Do not edit or apply anything in `supabase/migrations` that Claude has already supplied. New SQL goes in new files only, marked DRAFT. Do not run SQL against any database.
9. Before finishing: `npx tsc --noEmit` and `npm run build` must both pass. Fix what you broke; do not disable lint or type checks.
10. Small commits on the feature branch with clear messages. Never push to `main`. Never force push.
11. At the end write `docs/PHASE_<n>_REPORT.md`: files changed, what works, what you were unsure about, anything you skipped.

---

## PHASE 1 — ATS API layer (requisitions and postings)

Read first: `docs/SCHEMA_SNAPSHOT.md` (live schema, provided by Claude), `src/lib/talentRoles.ts`, `src/lib/talentStages.ts`, `src/lib/org.ts`, `src/app/api/requisitions/**`, `src/app/api/public/jobs/route.ts`.

Build new authenticated routes under `src/app/api/ats/`:
- `POST /api/ats/requisitions` create a requisition in `talent_requisitions` (requisition number R-DDMMYYNN as existing code does). Organization licence: status `pending_approval` and create approval steps from the org's configured flow (see Phase 5; until then use the existing `buildApprovalChain()`). Individual licence: status `open`, NOT published anywhere.
- `GET /api/ats/requisitions` list, scoped to the caller's org/role (recruiters: assigned or own; hiring managers: own; lead recruiter/org admin: whole org).
- `PATCH /api/ats/requisitions/[id]` edit (allowed roles only).
- `POST /api/ats/requisitions/[id]/approve` and `/reject` approve or reject the caller's pending step only; when the last step is approved the requisition becomes `open`. Must verify the caller is the assigned approver and the org matches.
- `GET/POST /api/ats/requisitions/[id]/postings` and `PATCH /api/ats/postings/[id]`: postings are separate from requisitions. A posting has: board (`askshree`, `google`, `indeed`, `linkedin`, `naukri`), status (`draft`, `published`, `closed`), `hide_company_name` boolean, `content` JSON (the template blocks, see Phase 3), `valid_through`. Only a `recruiter`, `lead_recruiter`, or org admin may publish. Only `askshree` and `google` may be set `published`; other boards return 501 "not connected". Google is automatically blocked when `hide_company_name` is true.
- Table for postings: if `talent_job_postings` does not exist in the schema snapshot, write a DRAFT migration `supabase/migrations/DRAFT_<date>_talent_job_postings.sql` with RLS enabled and org-scoped policies. Claude will review and apply it.

Update `GET /api/public/jobs` so it returns ONLY published `askshree` postings (joined to their requisition), fields safe for guests, company name replaced by "Confidential" when `hide_company_name`. Remove the hard-coded demo jobs. Keep the response SHAPE identical to today so the home page renders unchanged (compare against the current code and note any differences in the report).

Done when: routes typecheck, each route returns 401 without a session and 403 for the wrong org/role, and a written test script `scripts/ats-smoke.md` describes how to exercise each.

---

## PHASE 2 — Recruiter Hub (features)

Read first: `src/app/recruiter/page.tsx`, `src/components/UniversalPlatformShell.tsx` (usage only), Phase 1 report.

Rebuild `/recruiter` on `UniversalPlatformShell` (already used) with the sidebar as FEATURES only:
- `+ New requisition` (form, calls `POST /api/ats/requisitions`; fields: title, function, location, work mode on-site/remote, employment type, openings, must-have and good-to-have skills, what you will do, core strengths, additional strengths, salary band optional)
- `All Requisitions` (list from `GET /api/ats/requisitions`; per row actions: Post / Don't post, choose boards, Edit)
- `All Applications` (list from Phase 4 route; filter by requisition and stage)
- `Post to boards` (opens the posting editor from Phase 3)

Remove or replace, and list in `docs/CHANGES.md`: the "AI Agents" tab mock (fabricated metrics) and the "Funnel Analytics" hard-coded numbers (14.2 days, 94.2%, etc.). Replace with an honest "Coming in V2" or real counts computed from the database. No invented numbers.

Done when: a recruiter can create a requisition, see it in All Requisitions with status `open` (individual) or `pending_approval` (org), and nothing is auto-published.

---

## PHASE 3 — JD template and public posting page

Read first: `Template_01_Joyful_Science.docx` (in the repo root or provided), `src/app/jobs/[id]/page.tsx`. The full spec is below.

Build a single component `src/components/JobPostingTemplate.tsx` that renders every posting, web only (no PDF or DOCX). Fixed section order:
1. Header: company logo, job title | function, location, work mode, employment type
2. WHO WE ARE
3. OUR SUCCESS STORIES
4. WHY JOIN US
5. WHAT YOU WILL DO (bullets)
6. WHAT YOU WILL BRING: two boxes, CORE STRENGTHS and ADDITIONAL STRENGTHS
7. HOW YOU GROW WITH US
8. Footer band: tagline, careers email, website, social icons
Style with AskShree tokens (alabaster, gold #B45309), NOT the sample's blue/green.

Content rules:
- Blocks 2, 3, 4, 7 and footer are pre-filled from the org's company profile (add a company profile store if missing; DRAFT migration) and are editable per posting. Blocks 1, 5, 6 fill from the requisition.
- Posting editor at the "Post to boards" feature: shows the template filled in, every block editable, board checkboxes (AskShree, Google enabled; Indeed, LinkedIn, Naukri disabled with the label "Not connected"), a "Hide company name (show Confidential)" toggle, a valid-through date.
- When `hide_company_name` is on, logo and name are replaced by "Confidential" everywhere the posting appears.
- `/jobs/[id]` renders the template using published `askshree` postings only (no demo fallback).
- Add JobPosting JSON-LD to `/jobs/[id]` with title, description, datePosted, validThrough, hiringOrganization, jobLocation or applicantLocationRequirements (remote), employmentType, and an apply URL. Omit the JSON-LD entirely when `hide_company_name` is on. Add `src/app/sitemap.ts` listing published, non-confidential postings only.

Done when: publishing a posting makes `/jobs/<id>` render the template correctly with and without confidentiality, and the JSON-LD validates against Google's structured-data requirements.

---

## PHASE 4 — Apply and applications land on the recruiter page

Read first: `src/app/api/public/quick-apply/route.ts`, `src/app/api/candidate/quick-apply/submit/route.ts`, `src/lib/talentStages.ts`.

- Make the home page Quick Apply and the candidate apply flow write to ONE path: `talent_people` + `talent_candidates`, linked to the requisition AND the posting, starting at stage `applied`. Do not change the home page UI; only the route it calls.
- Remove the fake fallback `match_score: 82`. If AI scoring fails, store score `null` and show "Not scored yet".
- Duplicate protection: same person and same requisition cannot apply twice; return a friendly message.
- `GET /api/ats/applications`: org-scoped list for recruiters, filterable by requisition and stage. Recruiter Hub "All Applications" reads it. Include stage change with `talentStages.ts` and a status history row.
- Consent record kept as today.

Done when: from the home page a candidate applies to a published posting, and within the recruiter's All Applications the application appears against the right requisition, with no other org able to see it.

---

## PHASE 5 — Org Admin Hub and approval flow (after today)

Build the Org Admin Hub on the shell. Sidebar features: Approval flow, Company profile (logo, name, template blocks), Users and roles, Requisitions overview. Approval flow editor: ordered steps (e.g. Hiring Manager -> next-level approver -> Lead Recruiter); store per org (DRAFT migration `talent_approval_flows`); replace hard-coded `buildApprovalChain()` with the org's flow, defaulting to the current chain.

## PHASE 6 — Hiring Manager Hub and Lead Recruiter Hub

New hubs on the shell. HM sidebar: New requisition, My requisitions, Applications for my requisitions, Interviews and feedback. Lead Recruiter sidebar: Approvals queue, All requisitions, Team, Applications. Data from `/api/ats/*`, role-scoped.

## PHASE 7 — Global search bar scoping and refusals

Server-side only: route each question through a role/licence-aware layer. Guests get public info and general questions. Candidates never get counts or details about other candidates or org internals. When information is confidential the reply is polite and transparent: "I'm sorry, I can't share that. Applicant numbers are confidential to the hiring team. I'm happy to help with ..." Enforcement must live in the API (query only what the role may read), NOT in the prompt alone. Add a test list of at least 20 role/question pairs in `docs/search-scope-tests.md`.

## PHASE 8 — Other pages, Owner Hub, connectors

- Owner Hub: restructure `/admin` (owner = shreesha.narsha@gmail.com only, server-checked) on the shell with sidebar features.
- Move the 8 pages on the old `AppShell` and other app pages onto `UniversalPlatformShell`. Login, signup, forgot/reset password, e-sign, interview room and apply forms get a focused layout with the official Logo and top bar only.
- Connector registry: `src/lib/connectors/` with one `JobBoardConnector` interface (publish, update, close, fetchApplications) and adapters for Indeed, LinkedIn, Naukri that return "not connected". Add an agent-action audit table (DRAFT migration) and route agent actions through the existing `ActionSpec` risk tiers: read and reversible writes automatic with logging, commitments need human approval, financial always human.

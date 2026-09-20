# Phase 3 Report — JD Template and Public Posting Page

**Branch:** feature/ats-flow
**Date:** 2026-09-20
**Engineer:** Antigravity (implementation) | Claude CTO (review)
**Verification:** `npx tsc --noEmit` clean | `npm run build` exit 0

---

## Files Changed

| File | Change |
|---|---|
| `src/components/JobPostingTemplate.tsx` | NEW — reusable template component |
| `src/app/jobs/[id]/page.tsx` | MODIFIED — now resolves talent_job_postings, renders template |
| `src/app/sitemap.ts` | NEW — sitemap listing published non-confidential postings |
| `src/app/recruiter/page.tsx` | MODIFIED — added import + Live Preview toggle in Post to Boards |

---

## JobPostingTemplate (`src/components/JobPostingTemplate.tsx`)

Fixed section order per Phase 3 spec:
1. Header — company logo/name (or Confidential), title, function, location, work mode, employment type
2. WHO WE ARE
3. OUR SUCCESS STORIES
4. WHY JOIN US
5. WHAT YOU WILL DO (bullet list, split by newlines)
6. WHAT YOU WILL BRING — two boxes: CORE STRENGTHS (required) + ADDITIONAL STRENGTHS
7. HOW YOU GROW WITH US
8. Footer band — tagline, careers email, website

Style: AskShree tokens (`bg-surface`, `text-brand` gold, `font-display`, warm alabaster canvas).
Web-only — no PDF/DOCX rendering.

When `hideCompanyName` is true: logo replaced by a briefcase icon, name replaced by
"Confidential", email/website links hidden from footer.

When `isEditable` is true: all blocks become textarea inputs, enabling the recruiter's
live preview in Post to Boards.

### Company profile note
The live `organizations` table (per SCHEMA_SNAPSHOT.md 2026-09-19) has:
`id, name, status, plan, owner_user_id, created_at, approved_at, approved_by, notes`.
**No logo, website, or careers email columns exist yet.**
`companyLogoUrl`, `companyWebsite`, `careersEmail` props are accepted but default to
sensible values (`careers@askshree.com`, `https://www.askshree.com`).
TODO (Phase 5): when org profile columns are added, pass them from the org settings page.

---

## `/jobs/[id]` Rewrite (`src/app/jobs/[id]/page.tsx`)

Before: looked up `job_postings` (legacy) or `talent_requisitions` directly by id.
After: primary lookup is `talent_job_postings` (id = posting UUID, as set by Phase 1's
`GET /api/public/jobs`). Must be `status=published` and `board=askshree`.

Lookup chain:
1. `talent_job_postings` → `talent_requisitions` → `organizations` (for org name)
2. If `talent_job_postings` table doesn't exist yet (DRAFT migration), falls through to step 3
3. Legacy `job_postings` row → renders `LegacyJobDetail` component (no template, just description)
4. `notFound()` if nothing matches

JSON-LD:
- Included when `hide_company_name = false`
- Fields: title, description, datePosted, validThrough, hiringOrganization,
  employmentType, jobLocation (or TELECOMMUTE), url
- **Omitted entirely** when `hide_company_name = true` (per spec)
- Uses existing `src/lib/jobPostings/schema.ts` pattern but built inline to support
  the confidentiality omission

Action bar: Quick Apply passes `posting.id` to `/api/public/quick-apply`
(Phase 4 route accepts this as `postingId`).

---

## Sitemap (`src/app/sitemap.ts`)

Lists:
- Static routes: `/`, `/jobs`, `/login`, `/signup`
- Dynamic: all `talent_job_postings` where `status=published AND board=askshree
  AND hide_company_name=false`
- On error (table not yet created): returns static routes only, build does not fail.

`/sitemap.xml` visible in build manifest (○ static).

---

## Recruiter Post to Boards — Live Preview

Added `showPreview` state and a "Live Preview" toggle button in the Post to Boards
feature header. When toggled on, renders `<JobPostingTemplate isEditable={false} ...>`
using the current `postContent` state, the selected requisition's metadata, and
`postHideCompany` flag. The template updates live as the recruiter fills in content blocks.

---

## Open Questions for CTO

1. **`organizations.logo_url`** — not in the current schema. Phase 5 should add this
   column and pass it to JobPostingTemplate. Until then, the initial letter of the
   company name is used as the avatar.
2. **`talent_job_postings` DRAFT migration** — the table is referenced in `/jobs/[id]`
   and `sitemap.ts`. Both fail gracefully until the migration is applied. Applying the
   DRAFT migration (`supabase/migrations/DRAFT_20260919_talent_job_postings.sql`)
   is the CTO's gate.
3. **Legacy `/jobs/[id]` links** — old links with `job_postings.id` still work via the
   `LegacyJobDetail` fallback. Plan to retire after Phase 5 data migration.
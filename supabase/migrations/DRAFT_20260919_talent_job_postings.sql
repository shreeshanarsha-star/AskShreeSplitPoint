-- DRAFT migration: talent_job_postings
-- Status: DRAFT -- do NOT apply directly. Claude (CTO) reviews before execution.
-- Generated: 2026-09-19

CREATE TABLE IF NOT EXISTS public.talent_job_postings (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_id   uuid NOT NULL REFERENCES public.talent_requisitions(id) ON DELETE CASCADE,
  org_id           uuid NULL REFERENCES public.organizations(id) ON DELETE SET NULL,
  board            text NOT NULL CHECK (board IN ('askshree', 'google', 'indeed', 'linkedin', 'naukri')),
  status           text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed')),
  hide_company_name bool NOT NULL DEFAULT false,
  content          jsonb NOT NULL DEFAULT '{}',
  valid_through    timestamptz NULL,
  created_by       uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Unique: one posting per requisition per board.
ALTER TABLE public.talent_job_postings
  ADD CONSTRAINT talent_job_postings_requisition_board_unique
  UNIQUE (requisition_id, board);

-- Performance indexes.
CREATE INDEX IF NOT EXISTS talent_job_postings_requisition_id_idx
  ON public.talent_job_postings (requisition_id);

CREATE INDEX IF NOT EXISTS talent_job_postings_org_id_idx
  ON public.talent_job_postings (org_id);

CREATE INDEX IF NOT EXISTS talent_job_postings_status_idx
  ON public.talent_job_postings (status);

-- RLS: enabled. No policies granted to anon or authenticated roles.
-- All access is via the service-role key (server-side only).
ALTER TABLE public.talent_job_postings ENABLE ROW LEVEL SECURITY;

-- Explicit comment so the intent is clear in the Supabase dashboard.
COMMENT ON TABLE public.talent_job_postings IS
  'ATS job postings. RLS enabled; no anon/authenticated policies. '
  'Accessed exclusively via the service-role client inside API route handlers. '
  'DRAFT -- applied by Claude (CTO) after review.';

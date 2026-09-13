-- Migration: 20260913_shree_foundation.sql
-- AskShree AI-Native Talent Acquisition Operating System Foundation

-- 1. Consent Records (Standalone BIPA, GDPR, Biometric, and AI Screening consent)
CREATE TABLE IF NOT EXISTS consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID,
  email TEXT NOT NULL,
  scope TEXT NOT NULL, -- 'biometric', 'ai_screening', 'talent_pool', 'data_retention'
  granted BOOLEAN NOT NULL DEFAULT TRUE,
  legal_text_hash TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consent_records_email ON consent_records(email);
CREATE INDEX IF NOT EXISTS idx_consent_records_candidate ON consent_records(candidate_id);

-- 2. Shree Decisions Log (Explainability, citations, and trust audit trail)
CREATE TABLE IF NOT EXISTS shree_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  requisition_id UUID REFERENCES talent_requisitions(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES talent_candidates(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'screen', 'advance', 'hold', 'reject', 'schedule', 'send_assessment', 'draft_offer'
  target_stage TEXT,
  shree_reasoning JSONB NOT NULL DEFAULT '{}'::jsonb, -- { matched_criteria: [], missing_criteria: [], summary: "" }
  citations JSONB DEFAULT '[]'::jsonb, -- [ { dimension: "", quote: "", timestamp: "" } ]
  shree_confidence NUMERIC(3, 2) DEFAULT 0.85,
  human_decision TEXT DEFAULT 'pending', -- 'pending', 'approved_as_is', 'edited', 'rejected'
  human_feedback TEXT,
  graduated_at_execution BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_shree_decisions_req ON shree_decisions(requisition_id);
CREATE INDEX IF NOT EXISTS idx_shree_decisions_cand ON shree_decisions(candidate_id);
CREATE INDEX IF NOT EXISTS idx_shree_decisions_status ON shree_decisions(human_decision);
CREATE INDEX IF NOT EXISTS idx_shree_decisions_org ON shree_decisions(org_id);

-- 3. Shree Lane Trust (Graduation metrics per organization and role family)
CREATE TABLE IF NOT EXISTS shree_lane_trust (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  role_family TEXT NOT NULL, -- e.g. 'Software Engineering', 'Sales', 'Product', 'Operations'
  total_evaluations INT NOT NULL DEFAULT 0,
  human_agreement_count INT NOT NULL DEFAULT 0,
  agreement_rate NUMERIC(4, 3) NOT NULL DEFAULT 0.000, -- e.g. 0.942 = 94.2%
  is_autonomous BOOLEAN NOT NULL DEFAULT FALSE,
  graduated_at TIMESTAMPTZ,
  kill_switch_engaged BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, role_family)
);

CREATE INDEX IF NOT EXISTS idx_shree_lane_trust_org ON shree_lane_trust(org_id);

-- 4. Alter talent_candidates to support blind screening & rubrics
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'talent_candidates' AND column_name = 'anonymized_id'
  ) THEN
    ALTER TABLE talent_candidates ADD COLUMN anonymized_id TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'talent_candidates' AND column_name = 'rubric_version_hash'
  ) THEN
    ALTER TABLE talent_candidates ADD COLUMN rubric_version_hash TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'talent_candidates' AND column_name = 'interview_token'
  ) THEN
    ALTER TABLE talent_candidates ADD COLUMN interview_token TEXT;
  END IF;
END $$;

-- 5. Row-Level Security Policies
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE shree_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shree_lane_trust ENABLE ROW LEVEL SECURITY;

-- Read/write policies for service role & authenticated org members
CREATE POLICY "Allow service role full access consent_records" 
ON consent_records FOR ALL 
USING (auth.role() = 'service_role');

CREATE POLICY "Allow public insert consent_records" 
ON consent_records FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow service role full access shree_decisions" 
ON shree_decisions FOR ALL 
USING (auth.role() = 'service_role');

CREATE POLICY "Allow org members read shree_decisions" 
ON shree_decisions FOR SELECT 
USING (
  org_id IN (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "Allow org members update shree_decisions" 
ON shree_decisions FOR UPDATE 
USING (
  org_id IN (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "Allow service role full access shree_lane_trust" 
ON shree_lane_trust FOR ALL 
USING (auth.role() = 'service_role');

CREATE POLICY "Allow org members read shree_lane_trust" 
ON shree_lane_trust FOR SELECT 
USING (
  org_id IN (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "Allow org members update shree_lane_trust" 
ON shree_lane_trust FOR UPDATE 
USING (
  org_id IN (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  )
);

-- Migration: 20260914_rbac_user_entitlements.sql
-- AskShree 3-Persona RBAC & Granular Per-User Tool Entitlements

-- 1. Enhance profiles table with persona, status, telemetry, and provider
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'status'
  ) THEN
    ALTER TABLE profiles ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'persona'
  ) THEN
    ALTER TABLE profiles ADD COLUMN persona TEXT NOT NULL DEFAULT 'candidate';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'signup_ip'
  ) THEN
    ALTER TABLE profiles ADD COLUMN signup_ip TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'signup_location'
  ) THEN
    ALTER TABLE profiles ADD COLUMN signup_location TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'auth_provider'
  ) THEN
    ALTER TABLE profiles ADD COLUMN auth_provider TEXT DEFAULT 'email';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'company_name'
  ) THEN
    ALTER TABLE profiles ADD COLUMN company_name TEXT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_persona ON profiles(persona);

-- 2. Create user_feature_access for granular per-user tool entitlements
CREATE TABLE IF NOT EXISTS user_feature_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  granted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, feature_key)
);

CREATE INDEX IF NOT EXISTS idx_user_feature_access_user ON user_feature_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feature_access_key ON user_feature_access(feature_key);

-- 3. Row Level Security
ALTER TABLE user_feature_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access user_feature_access"
ON user_feature_access FOR ALL
USING (auth.role() = 'service_role');

CREATE POLICY "Allow users read own feature access"
ON user_feature_access FOR SELECT
USING (
  user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "Allow platform admin full access user_feature_access"
ON user_feature_access FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  )
);

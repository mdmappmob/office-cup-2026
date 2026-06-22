-- =============================================================
-- OfficeCup 2026 — Schema para ambiente demo
-- Apenas tabelas + RLS. Sem inserts (seed script popula dados).
-- =============================================================

-- 1. MATCHES
CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  home_flag TEXT NOT NULL DEFAULT '',
  away_flag TEXT NOT NULL DEFAULT '',
  match_date TEXT NOT NULL,
  venue_tz TEXT DEFAULT NULL,
  phase TEXT NOT NULL,
  "group" TEXT DEFAULT NULL,
  home_score INTEGER DEFAULT NULL,
  away_score INTEGER DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  bracket_slot TEXT DEFAULT NULL
);

-- 2. PREDICTIONS
CREATE TABLE IF NOT EXISTS predictions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  league_id TEXT NOT NULL DEFAULT 'default',
  match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  slot INTEGER NOT NULL DEFAULT 1,
  predicted_home_score INTEGER DEFAULT NULL,
  predicted_away_score INTEGER DEFAULT NULL,
  predicted_goalscorers TEXT[] NOT NULL DEFAULT '{}',
  points_earned INTEGER NOT NULL DEFAULT 0,
  is_zebra BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, match_id, slot)
);

-- 3. LEAGUES
CREATE TABLE IF NOT EXISTS leagues (
  id TEXT PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. MEMBERS
CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  league_id TEXT NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  has_paid_admin BOOLEAN NOT NULL DEFAULT FALSE,
  total_points INTEGER NOT NULL DEFAULT 0,
  UNIQUE(league_id, user_id)
);

-- 5. PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. ÍNDICES
CREATE INDEX IF NOT EXISTS idx_predictions_user ON predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_match ON predictions(match_id);
CREATE INDEX IF NOT EXISTS idx_matches_phase ON matches(phase);
CREATE INDEX IF NOT EXISTS idx_members_user ON members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_league ON members(league_id);
CREATE INDEX IF NOT EXISTS idx_leagues_admin ON leagues(admin_id);

-- 7. invite_code nas ligas
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;

-- =============================================================
-- RLS (Row Level Security)
-- =============================================================

-- MATCHES
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "matches_select_public" ON matches;
CREATE POLICY "matches_select_public" ON matches
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "matches_insert_admin" ON matches;
CREATE POLICY "matches_insert_admin" ON matches
  FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "matches_update_admin" ON matches;
CREATE POLICY "matches_update_admin" ON matches
  FOR UPDATE USING (auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "matches_delete_admin" ON matches;
CREATE POLICY "matches_delete_admin" ON matches
  FOR DELETE USING (auth.jwt() ->> 'role' = 'service_role');

-- PREDICTIONS
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "predictions_select_own" ON predictions;
CREATE POLICY "predictions_select_own" ON predictions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "predictions_insert_own" ON predictions;
CREATE POLICY "predictions_insert_own" ON predictions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "predictions_update_own" ON predictions;
CREATE POLICY "predictions_update_own" ON predictions
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "predictions_delete_own" ON predictions;
CREATE POLICY "predictions_delete_own" ON predictions
  FOR DELETE USING (auth.uid() = user_id);

-- LEAGUES
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leagues_select_public" ON leagues;
CREATE POLICY "leagues_select_public" ON leagues
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "leagues_insert_admin" ON leagues;
CREATE POLICY "leagues_insert_admin" ON leagues
  FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "leagues_update_admin" ON leagues;
CREATE POLICY "leagues_update_admin" ON leagues
  FOR UPDATE USING (auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "leagues_delete_admin" ON leagues;
CREATE POLICY "leagues_delete_admin" ON leagues
  FOR DELETE USING (auth.jwt() ->> 'role' = 'service_role');

-- MEMBERS
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members_select_public" ON members;
CREATE POLICY "members_select_public" ON members
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "members_insert_own" ON members;
CREATE POLICY "members_insert_own" ON members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "members_update_own" ON members;
CREATE POLICY "members_update_own" ON members
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "members_delete_admin" ON members;
CREATE POLICY "members_delete_admin" ON members
  FOR DELETE USING (auth.jwt() ->> 'role' = 'service_role');

-- PROFILES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_public" ON profiles;
CREATE POLICY "profiles_select_public" ON profiles
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid()::text = id OR auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid()::text = id OR auth.jwt() ->> 'role' = 'service_role');

-- =============================================================
-- OfficeCup 2026 — Supabase Migration
-- Execute no SQL Editor do painel Supabase
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

-- 5. ÍNDICES
CREATE INDEX IF NOT EXISTS idx_predictions_user ON predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_match ON predictions(match_id);
CREATE INDEX IF NOT EXISTS idx_matches_phase ON matches(phase);
CREATE INDEX IF NOT EXISTS idx_members_user ON members(user_id);
CREATE INDEX IF NOT EXISTS idx_leagues_admin ON leagues(admin_id);

-- =============================================================
-- RLS (Row Level Security)
-- =============================================================

-- MATCHES — leitura pública, escrita só admin (via service_role)
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "matches_select_public" ON matches
  FOR SELECT USING (TRUE);

CREATE POLICY "matches_insert_admin" ON matches
  FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "matches_update_admin" ON matches
  FOR UPDATE USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "matches_delete_admin" ON matches
  FOR DELETE USING (auth.jwt() ->> 'role' = 'service_role');

-- PREDICTIONS — cada um vê e edita as suas
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "predictions_select_own" ON predictions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "predictions_insert_own" ON predictions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "predictions_update_own" ON predictions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "predictions_delete_own" ON predictions
  FOR DELETE USING (auth.uid() = user_id);

-- LEAGUES — leitura pública, escrita admin
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leagues_select_public" ON leagues
  FOR SELECT USING (TRUE);

CREATE POLICY "leagues_insert_admin" ON leagues
  FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "leagues_update_admin" ON leagues
  FOR UPDATE USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "leagues_delete_admin" ON leagues
  FOR DELETE USING (auth.jwt() ->> 'role' = 'service_role');

-- MEMBERS — leitura pública, cada um insere/atualiza o próprio registro
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members_select_public" ON members
  FOR SELECT USING (TRUE);

CREATE POLICY "members_insert_own" ON members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "members_update_own" ON members
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "members_delete_admin" ON members
  FOR DELETE USING (auth.jwt() ->> 'role' = 'service_role');

-- =============================================================
-- OfficeCup 2026 — Adicionar invite_code às ligas
-- Execute no SQL Editor do painel Supabase
-- =============================================================

ALTER TABLE leagues ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;

-- Gera código único para liga l1
UPDATE leagues SET invite_code = 'BOLAO-A7F2' WHERE id = 'l1' AND invite_code IS NULL;

-- Corrige predictions que foram salvos com league_id = 'default' para membros da liga l1
UPDATE predictions SET league_id = 'l1'
WHERE league_id = 'default'
  AND user_id IN (SELECT user_id FROM members WHERE league_id = 'l1');

-- Tabela de perfis (nome dos usuarios)
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_public" ON profiles
  FOR SELECT USING (TRUE);

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid()::text = id OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid()::text = id OR auth.jwt() ->> 'role' = 'service_role');

-- Insere profile do admin se nao existir
INSERT INTO profiles (id, full_name, email)
SELECT id, raw_user_meta_data->>'full_name', email
FROM auth.users
WHERE id = 'ff848e82-aaf9-4bf0-8827-71d05f008b8b'
ON CONFLICT (id) DO NOTHING;

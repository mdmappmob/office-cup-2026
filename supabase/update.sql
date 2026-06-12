-- =============================================================
-- OfficeCup 2026 — Atualização para adicionar leagues
-- Execute no SQL Editor APÓS a migration.sql inicial
-- =============================================================

-- 1. Cria leagues (se não existir — migration antiga não tinha)
CREATE TABLE IF NOT EXISTS leagues (
  id TEXT PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Liga padrão (necessário para FK de members)
INSERT INTO leagues (id, admin_id, name, is_active, payment_status, created_at)
VALUES ('l1', (SELECT id FROM auth.users LIMIT 1), 'Bolão da Diretoria 2026', TRUE, 'paid', now())
ON CONFLICT (id) DO NOTHING;

-- 3. Se members não tem FK para leagues, adiciona
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'members_league_id_fkey'
  ) THEN
    -- Remove registros órfãos de members sem league compatível
    DELETE FROM members WHERE league_id NOT IN (SELECT id FROM leagues);
    -- Adiciona FK
    ALTER TABLE members ADD CONSTRAINT members_league_id_fkey
      FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 4. RLS para leagues
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'leagues_select_public') THEN
    CREATE POLICY "leagues_select_public" ON leagues FOR SELECT USING (TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'leagues_insert_admin') THEN
    CREATE POLICY "leagues_insert_admin" ON leagues FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'leagues_update_admin') THEN
    CREATE POLICY "leagues_update_admin" ON leagues FOR UPDATE USING (auth.jwt() ->> 'role' = 'service_role');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'leagues_delete_admin') THEN
    CREATE POLICY "leagues_delete_admin" ON leagues FOR DELETE USING (auth.jwt() ->> 'role' = 'service_role');
  END IF;
END $$;

-- 5. Índice
CREATE INDEX IF NOT EXISTS idx_leagues_admin ON leagues(admin_id);

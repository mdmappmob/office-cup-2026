-- =============================================================
-- OfficeCup 2026 — Adicionar invite_code às ligas
-- Execute no SQL Editor do painel Supabase
-- =============================================================

ALTER TABLE leagues ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;

-- Gera código único para liga l1
UPDATE leagues SET invite_code = 'BOLAO-A7F2' WHERE id = 'l1' AND invite_code IS NULL;

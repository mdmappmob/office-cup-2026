-- =============================================================
-- OfficeCup 2026 — Adicionar coluna winner para prorrogação
-- =============================================================

ALTER TABLE matches ADD COLUMN IF NOT EXISTS winner TEXT DEFAULT NULL;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS winner_flag TEXT DEFAULT NULL;

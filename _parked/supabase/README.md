# Supabase (pausado)

Toda a integração Supabase foi movida para esta pasta enquanto o projeto roda
em SQLite local (sql.js + IndexedDB). Nada foi apagado.

## Estrutura aqui

- `integrations/` — clientes browser/server e sync (antigo `src/integrations/supabase/`)
- `ResetPassword.tsx` / `reset-password.tsx` — página e rota de reset por e-mail
- `officecup_migration.sql` — schema completo + seed dos 104 jogos da Copa 2026

## Como reativar

1. Mover de volta:
   - `_parked/supabase/integrations` → `src/integrations/supabase`
   - `_parked/supabase/ResetPassword.tsx` → `src/pages/ResetPassword.tsx`
   - `_parked/supabase/reset-password.tsx` → `src/routes/reset-password.tsx`
2. Em `vite.config.ts`, restaurar o bloco `define` injetando
   `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` a partir dos secrets
   `HELPDESK_SUPABASE_URL` / `HELPDESK_SUPABASE_PUBLISHABLE_KEY` (já guardados
   no painel).
3. Em `src/routes/__root.tsx`, trocar `<SqliteBootstrap />` por um boot que
   chame `initSupabaseAuthSync()` (ver histórico em git).
4. Reescrever `src/pages/Login.tsx` para usar `supabase.auth.*` (signIn /
   signUp / resetPasswordForEmail).
5. Reescrever `src/lib/db/index.ts` para a versão Supabase (chamadas a
   `oc_predictions` e RPC `oc_settle_match`).
6. Rodar `officecup_migration.sql` no SQL Editor do projeto helpdesk se ainda
   não foi aplicado.

## Secrets necessários (já existentes)

- `HELPDESK_SUPABASE_URL`
- `HELPDESK_SUPABASE_PUBLISHABLE_KEY`
- `HELPDESK_SUPABASE_SERVICE_ROLE_KEY` (server only)
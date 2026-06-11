# Plano: voltar para SQLite local e congelar Supabase

Objetivo: deixar o app rodando 100% local (sql.js + IndexedDB) para você analisar telas e fluxos, sem depender do Supabase. Toda a integração Supabase fica preservada em `_parked/` para reativar quando decidirmos.

## 1. Congelar o Supabase (sem apagar)

Mover para fora do grafo de build, mantendo arquivos intactos:

```text
_parked/supabase/
  client.ts
  client.server.ts
  sync.ts
  officecup_migration.sql
  README.md   ← como reativar
```

- Remover `import` de `initSupabaseAuthSync` em `src/routes/__root.tsx`.
- Tirar `@supabase/supabase-js` do `package.json` (opcional — fica em `_parked/README.md` o comando para reinstalar).
- Secrets `HELPDESK_SUPABASE_*` ficam guardados no painel (não removo).
- Bloco do `vite.config.ts` que injeta `VITE_SUPABASE_*` fica como está, só comentado, para reativação rápida.

## 2. Camada SQLite (sql.js + IndexedDB)

Recriar a camada local que existia antes:

```text
src/lib/db/
  config.ts        ← caminho do .wasm, nome do IDB
  sqlite-repo.ts   ← open/persist + repos (matches, predictions, results, users)
  seed.ts          ← popula oc_matches a partir de src/mocks/matches.ts
  index.ts         ← reexporta matchesRepo / predictionsRepo / authRepo
```

Schema (idêntico ao Supabase, sem RLS):

```sql
oc_users(id TEXT PK, email TEXT UNIQUE, password_hash TEXT, full_name TEXT, is_admin INTEGER, created_at TEXT)
oc_matches(...)                -- igual aos mocks
oc_predictions(id, user_id, match_id, slot, ph, pa, is_zebra, points_earned)
oc_results(match_id PK, home_score, away_score, settled_at)
oc_standings(user_id PK, total_points, exact_hits, result_hits, zebra_hits)
```

Bootstrap: novo `src/components/SqliteBootstrap.tsx` carrega o wasm uma vez no `__root.tsx`, hidrata o `app-store` e seta `ready=true` no `auth-store`.

Persistência: snapshot do DB em IndexedDB a cada mutação (debounce 300ms), igual ao padrão anterior.

## 3. Cadastro/login local com senha

- Usar **Web Crypto API** (`crypto.subtle`) com PBKDF2 + salt aleatório → guardado em `password_hash` no formato `pbkdf2$<iter>$<saltB64>$<hashB64>`. Sem dependência nova.
- Reescrever `src/pages/Login.tsx` para usar `authRepo` local com 3 abas:
  - **Entrar** — verifica hash, popula `auth-store`.
  - **Criar conta** — cria `oc_users` (primeira conta criada vira `is_admin=1`).
  - **Esqueci a senha** — formulário local que define nova senha direto (sem email; é só análise local).
- Remover rota `/reset-password` e `src/pages/ResetPassword.tsx` (não faz sentido sem email). Mantém em `_parked/` junto com Supabase.
- `src/store/auth-store.ts` ganha `login/signup/logout` chamando `authRepo`; sessão persistida no IndexedDB também (chave `current_user_id`).

## 4. Repos e telas

- `src/lib/db/index.ts` volta a ser síncrono em cima do `app-store`, sem `await supabase.*`.
- `predictionsRepo.upsertPrediction` grava no SQLite e atualiza store (mantém palpites ilimitados por slot).
- `predictionsRepo.settleMatch` calcula pontos localmente com `scoreMatch` e atualiza `oc_standings`.
- `AdminResultados`, `Palpites`, `Dashboard`, `Ranking`, `Perfil`, `Gestao` continuam usando os mesmos hooks/stores — só a fonte muda.

## 5. Rotas e guards

- `/` permanece a landing pública da Copa 2026 (sem mudanças).
- `_app.tsx` continua exigindo `auth-store.user`, mas agora alimentado pelo SQLite local em vez do Supabase.
- `__root.tsx`: troca `<SupabaseBoot/>` por `<SqliteBootstrap/>`.

## 6. Limpeza de dependências

- Adicionar: `sql.js` (e `@types/sql.js`).
- Remover do uso runtime: `@supabase/supabase-js` (fica registrado em `_parked/README.md`; podemos deixar instalado para reativação rápida — sugiro manter instalado, é leve).

## 7. Como voltar para Supabase depois

`_parked/supabase/README.md` vai conter:

1. Mover `_parked/supabase/*` de volta para `src/integrations/supabase/`.
2. Descomentar bloco `VITE_SUPABASE_*` no `vite.config.ts`.
3. Trocar `<SqliteBootstrap/>` por `<SupabaseBoot/>` no `__root.tsx`.
4. Rodar `officecup_migration.sql` no SQL Editor (se ainda não rodado).
5. Reescrever `src/lib/db/index.ts` na versão Supabase (cópia também guardada em `_parked/`).

## Arquivos afetados (resumo)

- **Move para `_parked/`**: `src/integrations/supabase/`, `src/pages/ResetPassword.tsx`, `src/routes/reset-password.tsx`, `officecup_migration.sql`, versão atual de `src/lib/db/index.ts`.
- **Cria**: `src/lib/db/{config,sqlite-repo,seed,index}.ts`, `src/components/SqliteBootstrap.tsx`, `_parked/supabase/README.md`.
- **Edita**: `src/routes/__root.tsx`, `src/store/auth-store.ts`, `src/pages/Login.tsx`, `vite.config.ts`, `package.json`.

Depois disso o app sobe sem nenhuma chamada de rede e você pode navegar tudo localmente. Aprova?

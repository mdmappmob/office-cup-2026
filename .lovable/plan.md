# Plano: Migração para Supabase (projeto helpdesk)

## 1. Conexão Supabase

O projeto hoje usa SQLite no navegador (sql.js + IndexedDB). Para usar o seu projeto Supabase **helpdesk** existente sem apagar nada que já está lá, é necessário **conectar a integração Supabase do Lovable** ao projeto helpdesk. Isso é feito por você no painel (botão Supabase no topo direito → Connect → escolher o projeto "helpdesk").

# Não vou utilizar o Supabase do Lovable. Utilizar o próprio Supabase.

Assim que conectado, eu crio todas as tabelas do OfficeCup 2026 com prefixo `oc_` para garantir que **nenhuma tabela existente do helpdesk seja afetada** (sem DROP, sem ALTER em tabelas alheias).

## 2. Schema novo (todas com prefixo `oc_`)

```text
oc_profiles      (id uuid PK → auth.users, full_name, avatar_url, is_admin)
oc_matches       (id, home_team, away_team, home_flag, away_flag,
                  match_date, phase, group, home_score, away_score,
                  status, bracket_slot)
oc_predictions   (id, user_id, match_id, slot, predicted_home_score,
                  predicted_away_score, is_zebra, points_earned, created_at)
                  -- sem unique(user_id, match_id): palpites ilimitados
oc_results       (match_id PK, home_score, away_score, settled_at, settled_by)
oc_standings     (user_id PK, total_points, exact_hits, result_hits,
                  zebra_hits, updated_at)
oc_match_stats   (match_id PK, total_predictions, avg_home, avg_away,
                  zebra_rate, updated_at)
```

RLS:

- `oc_matches`, `oc_results`, `oc_standings`, `oc_match_stats`: SELECT público autenticado.
- `oc_predictions`: usuário lê/escreve só os próprios (`auth.uid() = user_id`); admin lê tudo.
- `oc_results`: apenas admin escreve (via função `has_role`).
- Tabela separada `oc_user_roles` + função `has_role` (padrão seguro, sem flag no profile).

GRANTs explícitos para `authenticated` e `service_role` em cada tabela.

## 3. Seed de matches

Migrar o conteúdo atual de `src/mocks/matches.ts` (104 jogos da Copa 2026, com bandeiras ISO) para `oc_matches` via migration de INSERT. Os dados de matches são preservados integralmente.

## 4. Autenticação

Tela `/login` reformulada com 3 abas:

- **Entrar** — email + senha (`supabase.auth.signInWithPassword`)
- **Criar conta** — email + senha + nome (`supabase.auth.signUp` com `emailRedirectTo`)
- **Esqueci a senha** — envia `resetPasswordForEmail` com redirect para `/reset-password`

Nova rota pública `/reset-password` que detecta `type=recovery` no hash e chama `supabase.auth.updateUser({ password })`.

Trigger no banco: `on auth.user created → insert oc_profiles`.

Guard de rotas (`_app`) passa a ler sessão do Supabase em vez do `auth-store` local. `onAuthStateChange` no `__root.tsx`.

## 5. Monetização — remoção

Remover do menu lateral e do código:

- `src/pages/Pagamento.tsx` e rota `pagamento.tsx`
- Campos `payment_status`, `has_paid_admin` (não serão criados no schema novo)
- Quaisquer CTAs de pagamento no Dashboard / CriarBolao

## 6. Palpites ilimitados

A UI já tem botão "+ Novo palpite" por slot. Vou:

- Remover qualquer constraint de slot único no novo schema.
- Garantir que `Palpites.tsx` lê/grava do Supabase (substituir `sqliteUpsertPrediction` por chamada Supabase via server function).
- Pontuação considera o **melhor** palpite por partida.

## 7. Tela de Apuração

Reaproveitar layout de `AdminResultados.tsx` mas:

- Listar partidas com filtro por fase, igual à tela de palpites.
- Para cada partida: inputs de placar real → grava em `oc_results`.
- Trigger SQL `after insert/update on oc_results`:
  - Calcula `points_earned` de cada `oc_prediction` daquela partida (regra: 5 pts placar exato, 3 pts resultado + saldo, 2 pts vencedor, 0).
  - Recalcula `oc_standings` (soma melhor slot por partida).
  - Atualiza `oc_match_stats`.
- Acesso restrito via `has_role(auth.uid(), 'admin')`.

A partir do início da Copa (11/06/2026), os resultados reais são lançados aqui e tudo é apurado automaticamente.

## 8. Camada de acesso a dados

Substituir `src/lib/db/sqlite-repo.ts` + `src/lib/db/index.ts` por:

- `src/lib/matches.functions.ts` — server fns para listar/ler matches.
- `src/lib/predictions.functions.ts` — listar/criar/remover palpites (com `requireSupabaseAuth`).
- `src/lib/results.functions.ts` — settle match (admin).
- `src/lib/standings.functions.ts` — ranking.

Componentes passam a usar TanStack Query + `useServerFn`. O `app-store` (zustand) deixa de ser fonte de verdade; vira só UI state (filtros, modais).

## 9. Limpeza

- Remover `sql.js`, `src/lib/db/sqlite-repo.ts`, `src/lib/db/config.ts`, `src/lib/db/seed.ts`, `src/components/SqliteBootstrap.tsx` (já removido), `src/store/auth-store.ts` local.
- Manter `src/lib/teams.ts`, `src/components/Flag.tsx`, `src/lib/scoring.ts`, `src/lib/copilot.ts`.

## Pré-requisito (ação sua)

**Antes de eu poder começar**, conecte o projeto Supabase **helpdesk** ao Lovable:

- topo direito → ícone Supabase → Connect Supabase → selecionar workspace e projeto "helpdesk".

Depois disso me avise que eu sigo com tudo acima em sequência (migrations → auth → telas → apuração). Nenhuma tabela existente do helpdesk será tocada.
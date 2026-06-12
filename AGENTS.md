# OFFICECUP 26 — Bolão Corporativo Copa 2026

## Stack
- TanStack Start + React 19 + TypeScript + Vite + Tailwind 4 + shadcn/ui
- Zustand com persist (localStorage) para dados da aplicação
- SQLite via sql.js (WASM) no navegador, persistido em IndexedDB (autenticação)
- Vercel (deploy via `vite build` — preset nitro `vercel`)

## Regras de Pontuação (src/lib/scoring.ts)

### Categoria de acerto
| Tipo | Pontos | Condição |
|---|---|---|
| Placar exato | 10 | home_score === predicted_home_score && away_score === predicted_away_score |
| Vencedor + diferença de gols | 7 | Mesmo vencedor e mesma diferença (ex: 3x1 palpite, 2x0 real → diferença 2) |
| Apenas vencedor | 5 | Mesmo vencedor (ou empate), mas diferença diferente |
| Artilheiros | 3 cada | predicted_goalscorers cadastrados |
| Zebra (multiplicador) | ×1.5 | Se placar é contra o favorito estatístico, pontos são multiplicados por 1.5 |

### Cálculo
- A melhor pontuação entre múltiplos slots (palpites) de um mesmo usuário para uma partida é considerada
- Zebra é detectada automaticamente pelo Copilot (src/lib/copilot.ts) com base em ranking de força das seleções
- O admin pode lançar resultado de qualquer partida via página "Apuração"

## Bracket Oficial FIFA (src/lib/bracket.ts)

Implementação completa do chaveamento da Copa 2026 conforme regulamento da FIFA (Anexo C).

### Estrutura
- **12 grupos** (A–L) com 4 seleções cada → 72 jogos na fase de grupos
- **32 seleções classificadas**: 12 primeiros + 12 segundos + 8 melhores terceiros
- **31 jogos mata-mata**: r32 (16), oitavas (8), quartas (4), semi (2), final (1)

### Funções exportadas

| Função | Descrição |
|---|---|
| `computeGroupStandings()` | Tabela de cada grupo a partir dos palpites |
| `sortGroupStandings()` | Ordenação com todos os tiebreakers FIFA |
| `computeH2H()` | Desempate por pontos/saldo/gols entre times empatados |
| `rankThirdPlaceTeams()` | Ranking dos 12 terceiros lugares → top 8 avançam |
| `buildRoundOf32()` | Alocação dos classificados com base na matriz FIFA |
| `propagateKnockout()` | Propagação automática de vencedores entre fases |
| `computeBracket()` | Função principal que orquestra tudo |

### Critérios de desempate (ordem FIFA)
1. Pontos
2. Pontos no confronto direto (H2H)
3. Saldo de gols no H2H
4. Gols marcados no H2H
5. Saldo de gols geral
6. Gols marcados geral
7. Fair Play (simulado deterministicamente: hash do nome → 30–100)
8. Ranking FIFA

### Matriz de Terceiros Lugares (Anexo C)
- 495 combinações possíveis de 8 grupos de terceiros classificados
- Mapeamento: chave de 8 caracteres (grupos ordenados alfabeticamente) → alocação dos 8 terceiros contra os 8 primeiros colocados
- Extraída da Wikipedia (scripts/parse-matrix.cjs)
- Fonte: `FIFA_2026_THIRD_PLACE_MATRIX` em `src/lib/bracket.ts`

### Alocação do R32
- **4 jogos 2º vs 2º**: A×B, D×G, E×I, K×L
- **4 jogos 1º vs 2º**: C×F, F×C, H×J, J×H
- **8 jogos 1º vs 3º**: vencedores A,B,D,E,G,I,K,L vs matriz

## Fluxo de Dados

### Inicialização
1. SqliteBootstrap abre SQLite WASM, restaura sessão do localStorage
2. AppStore carrega partidas (mockMatches — fixtures reais da Copa 2026)
3. Se usuário logado, redireciona para /dashboard

### Cadastro / Login
1. Primeiro usuário cadastrado vira admin automaticamente
2. Senha hasheada com PBKDF2 (120k iterações, SHA-256)
3. Sessão salva em `localStorage.current_user_id`

### Partidas
- 103 partidas reais: 72 grupos (12 grupos × 6 jogos) + 31 mata-mata (r32/16/8/4/2/1)
- Times das fases mata-mata são populados dinamicamente com base nos palpites do usuário (bracket)
- Datas reais da Copa 2026 (11 jun - 19 jul)
- `computeBracket` em `app-store.ts` delega para `src/lib/bracket.ts`

### Resultados
- **Sincronização automática**: botão "Sincronizar resultados" na página de Apuração busca placares da football-data.org
- **Manual**: admin pode lançar resultado de qualquer partida diretamente
- Partidas com data passada são destacadas para lançamento
- Pontuação recalculada automaticamente ao encerrar partida
- API configurada via env vars: `FOOTBALL_API_KEY`, `FOOTBALL_COMPETITION_ID`

### Ranking
- Baseado nos pontos acumulados dos palpites vs resultados reais
- Melhor slot (múltiplos palpites por partida) é considerado
- Status de pagamento (PAGO/PENDENTE) gerenciado pelo admin

## Tabelas

### SQLite (IndexedDB) — `officecup-sqlite`
- `oc_users`: id, email, password_hash, full_name, is_admin, created_at

### Zustand (localStorage) — chave `officecup-2026`
Persist via `partialize`:
- `predictions`: palpites dos usuários
- `members`: membros da liga com pontuação
- `theme`: light/dark
- `isAdmin`: flag admin
- `matches`: NÃO persiste (sempre recarregado do mockMatches)

### Supabase (planejado — PRÓXIMO PASSO)
Migrar dados do localStorage para Supabase para ranking global.

Tabelas planejadas:
- `predictions`: id, user_id, league_id, match_id, slot, predicted_home_score, predicted_away_score, predicted_goalscorers, points_earned, is_zebra, created_at
- `members`: id, league_id, user_id, has_paid_admin, total_points
- `matches`: id, home_team, away_team, home_flag, away_flag, match_date, phase, group, home_score, away_score, status
- `users`: id, email, full_name, is_admin (via Supabase Auth)

Migração:
1. Criar migrations SQL com RLS
2. `src/lib/supabase/client.ts` — cliente Supabase
3. `src/lib/supabase/predictions.ts` + `members.ts` — CRUD
4. Hook de migração no login: ler `localStorage['officecup-2026']`, upload pro Supabase, marcar `migrated`
5. Zustand vira cache: lê do Supabase no startup, escreve local + Supabase

## Scripts

| Script | Descrição |
|---|---|
| `scripts/parse-matrix.cjs` | Extrai matriz FIFA 495 do HTML da Wikipedia |
| `npm run dev` | Dev server (Vite) |
| `npm run build` | Build produção (Vercel) |
| `npm run lint` | ESLint |

## Deploy (Vercel)

- `vercel.json`: `buildCommand: "vite build"`, `framework: null`
- Build gera `.vercel/output/` com preset nitro `vercel`
- Basta conectar o repositório GitHub no painel da Vercel

## Arquivos Relevantes

| Arquivo | Função |
|---|---|
| `src/lib/bracket.ts` | Lógica oficial FIFA do chaveamento (novo — 904 linhas) |
| `src/store/app-store.ts` | Zustand store com persist localStorage + delegação para bracket.ts |
| `src/lib/scoring.ts` | Pontuação dos palpites vs resultados reais |
| `src/lib/copilot.ts` | Detecção de zebra com base em força das seleções |
| `src/lib/db/index.ts` | Camada de repositório local (Zustand) |
| `src/mocks/types.ts` | Tipos compartilhados (MockMatch, MockPrediction, etc.) |
| `src/mocks/matches.ts` | Fixtures das 103 partidas reais |
| `src/pages/Palpites.tsx` | Página de palpites com BracketRow para fase mata-mata |
| `src/pages/Dashboard.tsx` | Dashboard do usuário com pontuação |
| `src/pages/AdminResultados.tsx` | Admin: lançar resultados e sincronizar |
| `vercel.json` | Configuração de build/deploy Vercel |
| `AGENTS.md` | Este arquivo — documentação do projeto |

## Observações sobre Admin e Demo

- **Admin fixo**: hardcoded via `ADMIN_EMAIL` em `src/lib/supabase/auth.ts` e `ADMIN_EMAIL_SQLITE` em `src/lib/db/sqlite-repo.ts` — somente `mdm.appmob@gmail.com` é admin.
- **Toggle "Simular admin" removido**: existia no Perfil (`src/pages/Perfil.tsx`) para demonstração, mas foi removido porque admin já é determinado por email. Futuramente, quando houver múltiplas ligas e um modo demonstração para visitantes, reativar esse toggle com `Switch` + `setAdmin` da app-store.

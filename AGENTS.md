# OFFICECUP 26 — Bolão Corporativo Copa 2026

## Stack
- TanStack Start + React 19 + TypeScript + Vite + Tailwind 4 + shadcn/ui
- Zustand com persist (localStorage) para dados da aplicação
- SQLite via sql.js (WASM) no navegador, persistido em IndexedDB (autenticação legado)
- **Supabase** (PostgreSQL + Auth) para dados compartilhados: predictions, members, profiles, leagues, matches
- Vercel (deploy via `vite build` — preset nitro `vercel`)

## Regras de Pontuação (src/lib/scoring.ts)

### Categoria de acerto
| Tipo | Pontos | Condição |
|---|---|---|
| Placar exato | 10 | home_score === predicted_home_score && away_score === predicted_away_score |
| Vencedor + diferença de gols | 7 | Mesmo vencedor e mesma diferença (ex: 3x1 palpite, 2x0 real → diferença 2) |
| Apenas vencedor | 5 | Mesmo vencedor, mas diferença diferente |
| Acertou empate | 3 | Palpite foi empate e resultado foi empate (ex: palpite 2x2, real 1x1) |
| Acertou placar de 1 seleção | 2 | Acertou o número de gols de um dos times (ex: palpite 3x0, real 3x2 → acertou os 3 gols do mandante) |
| Placar inverso (consolação) | 1 | Acertou o placar mas inverteu os times (ex: palpite 3x1, real 1x3) |
| Zebra (multiplicador) | ×1.5 | Se placar é contra o favorito estatístico, pontos base são multiplicados por 1.5 |

### Cálculo
- A melhor pontuação entre múltiplos slots (palpites) de um mesmo usuário para uma partida é considerada
- Zebra é detectada automaticamente pelo Copilot (src/lib/copilot.ts) com base em ranking de força das seleções
- O admin pode lançar resultado de qualquer partida via página "Apuração"
- **Artilheiros removidos**: não há mais pontuação por artilheiros (predicted_goalscorers ignorado na pontuação)
- As categorias são mutuamente exclusivas: aplica-se sempre a maior pontuação possível
- `totalUserPoints()` soma `p.points_earned` diretamente (não recalcula via `scoreMatch`)
- `breakdownFromPoints()` deriva categorias de acerto a partir de `points_earned` + `is_zebra`, sem depender de `match.home_score` — usado pelo Dashboard mesmo sem resultados locais

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
1. `restoreSession()` (auth-store.ts) tenta sessão Supabase; se falha, fallback SQLite
2. Se Supabase, chama `setCurrentUser(supabaseUserId)` → `loadFromSupabase()` → `loadProfiles()` e `ensureProfile()`
3. AppStore carrega partidas (mockMatches — fixtures reais da Copa 2026)
4. Se usuário logado, redireciona para /dashboard

### Cadastro / Login
1. `signUp`/`signIn` via Supabase Auth (`src/lib/supabase/auth.ts`)
2. Admin detectado por `leagues.admin_id` + fallback `VITE_ADMIN_EMAIL`
3. Sessão salva pelo Supabase (localStorage `sb-*-auth-token`)
4. `ensureProfile()` upserta `{ id, full_name, email }` na tabela `profiles` automaticamente no login/restoreSession

### Partidas
- 103 partidas reais: 72 grupos (12 grupos × 6 jogos) + 31 mata-mata (r32/16/8/4/2/1)
- Times das fases mata-mata são populados dinamicamente com base nos palpites do usuário (bracket)
- Datas reais da Copa 2026 (11 jun - 19 jul)
- Fuso horário por partida explicitado nos fixtures: `[group, dateISO, home, away, venueTz]` com constantes EDT/CDT/MT/ET

### Palpites (src/pages/Palpites.tsx)
- **Avançar fase**: botão "Avançar fase" visível em todos os dispositivos
- Progresso da fase atual mostrado ao lado do botão
- Fases mata-mata usam `BracketRow` (Card responsivo) com layout adaptável
- Fase de grupos usa `GroupTable` com data do jogo exibida
- Ctrl+S continua funcionando como atalho
- **Trava por tempo**: palpites são bloqueados conforme regras detalhadas na seção "Trava por Tempo". Guard também no `upsertPrediction` da store e no `addPredictionSlot`.
- **Prazo global**: após o 1º jogo da 2ª rodada da fase de grupos, todo o bolão é congelado — não é mais permitido alterar palpites nem entrar no bolão.
- **Avançar fase**: botão "Avançar fase" visível em todos os dispositivos
- Progresso da fase atual mostrado ao lado do botão
- Fases mata-mata usam `BracketRow` (Card responsivo) com layout adaptável
- Fase de grupos usa `GroupTable` com data do jogo exibida
- Ctrl+S continua funcionando como atalho

### Resultados / Apuração (src/pages/AdminResultados.tsx)
- **Membros podem visualizar** resultados e pontos, sem os botões de admin
- Botões "Sincronizar resultados" e "Encerrar partida"/"Reapurar" renderizam apenas para admin
- Inputs de placar desabilitados para não-admin (visualização apenas)
- Admin lança resultado de qualquer partida
- **Sincronização automática**: botão "Sincronizar resultados" busca placares da football-data.org
- Ao encerrar partida, `settleMatch()` (app-store.ts) recalcula pontos localmente + dispara `settleAllPredictions` (server fn) que:
  1. Busca TODAS as predictions da partida no Supabase
  2. Recalcula `points_earned` e `is_zebra` para cada uma
  3. Atualiza `total_points` na tabela `members` para todos os usuários afetados
  4. **Upserta o resultado na tabela `matches`** do Supabase (via service role)
- Partidas com data passada são destacadas para lançamento

### Ranking / Dashboard
- **Ranking** (`src/pages/Ranking.tsx`): tabela completa, busca `profiles` do Zustand (populado por `loadProfiles`)
- **Dashboard** (`src/pages/Dashboard.tsx`): "Top do Bolão" com top 5, gráfico de evolução, breakdown por fase
- Ambos leem `useAppStore((s) => s.profiles)` — mesma fonte, sem duplicação
- Dashboard **não depende de resultados locais**: usa `points_earned` das predictions + `breakdownFromPoints()`
- Cards: "Classificação" primeiro, depois "Pontos Totais", "Acertos em Cheio", "Aproveitamento"
- `loadProfiles()` busca `id, full_name, email` da tabela `profiles`; fallback: `full_name` → `email` → `id.slice(0,8)`
- Status de pagamento (PAGO/PENDENTE) gerenciado pelo admin via Gestão
- Nomes dos membros vindos da tabela `profiles`; upsert automático no login

### Convite
- Admin vê código do bolão no Perfil (botão Copiar) e na **Gestão** (com link funcional)
- Gestão: busca `invite_code` real do Supabase e copia `https://app/login?invite=CODE`
- Login: salva `pending_invite` na `sessionStorage`
- Perfil: detecta `pending_invite` e **auto-entra no bolão** ao carregar
- Convidado também pode inserir código manualmente no Perfil → `handleJoinLeague()`:
  1. Busca liga por `invite_code`
  2. Upsert em `members` + `profiles`
  3. Mostra "Você está participando do [nome da liga]"
- Código real: `UYLJBBTYW9` (liga "Palpites - Copa 2026")

## Tabelas

### Supabase (PostgreSQL) — schema `public`

#### `matches`
| Coluna | Tipo | Descrição |
|---|---|---|
| id | TEXT PK | ex: `g0`, `r32_1` |
| home_team, away_team | TEXT | Placeholder `_` (dados reais só no Zustand local) |
| home_score, away_score | INTEGER NULL | Preenchido ao apurar |
| status | TEXT | `scheduled` / `finished` |
| phase, group, bracket_slot | TEXT | Metadados da partida |

#### `predictions`
| Coluna | Tipo | Descrição |
|---|---|---|
| id | TEXT PK (UUID) | |
| user_id | UUID FK → auth.users | |
| league_id | TEXT | `l1` |
| match_id | TEXT FK → matches | |
| slot | INTEGER | Múltiplos palpites por partida |
| predicted_home_score, predicted_away_score | INTEGER | Palpite |
| points_earned | INTEGER | Recalculado por `settleAllPredictions` |
| is_zebra | BOOLEAN | Flag de zebra |
| UNIQUE(user_id, match_id, slot) | | |

#### `members`
| Coluna | Tipo | Descrição |
|---|---|---|
| id | TEXT PK (UUID) | |
| league_id | TEXT FK → leagues | |
| user_id | UUID FK → auth.users | |
| has_paid_admin | BOOLEAN | |
| total_points | INTEGER | Recalculado por `settleAllPredictions` |
| UNIQUE(league_id, user_id) | | |

#### `leagues`
| Coluna | Tipo | Descrição |
|---|---|---|
| id | TEXT PK | `l1` |
| admin_id | UUID FK → auth.users | Quem cria é admin |
| name | TEXT | "Palpites - Copa 2026" |
| invite_code | TEXT UNIQUE | Código de convite (`UYLJBBTYW9`) |
| is_active, payment_status | BOOLEAN/TEXT | |

#### `profiles`
| Coluna | Tipo | Descrição |
|---|---|---|
| id | TEXT PK | UUID do auth.users |
| full_name | TEXT | Nome de exibição |
| email | TEXT | |
| created_at | TIMESTAMPTZ | |

### Zustand (localStorage) — chave `officecup-2026`
Persist via `partialize`:
- `predictions`: palpites dos usuários
- `members`: membros da liga com pontuação
- `profiles`: mapa `{ [id]: full_name }` (NÃO persiste, recarregado via `loadProfiles`)
- `theme`: light/dark
- `isAdmin`: flag admin
- `matches`: NÃO persiste (sempre recarregado do mockMatches)

### SQLite (IndexedDB) — `officecup-sqlite` (apenas fallback)
- `oc_users`: id, email, password_hash, full_name, is_admin, created_at

## Migração (local → Supabase)
- Botão "Migrar dados locais" no Perfil
- `migrateUserData` (server fn) upserta predictions + members via service role
- Estado `migrated` consulta Supabase predictions count
- Após migrar, `loadFromSupabase` recalcula `points_earned` localmente se o match tem resultado e a prediction veio com 0

## Trava por Tempo (Match Time Lock)

### Regra
- **Todas as partidas**: palpite **trava 10 minutos após o início da partida** para todos os usuários, independentemente da fase ou de quantos palpites já completaram
- A trava se aplica tanto aos inputs visuais quanto aos guards no `upsertPrediction` e `addPredictionSlot` da store

### Prazo Global (removido)
- Não existe mais deadline global. Todas as partidas que ainda não foram realizadas permanecem editáveis até o início da partida + 10 minutos de tolerância.

### Implementação

| Local | O que faz |
|---|---|
| `app-store.ts:isMatchTimeLocked(match)` | Retorna `true` se `Date.now() >= matchStart + 10min` ou se status é `finished` |
| `app-store.ts:upsertPrediction()` | Guard: se `isMatchTimeLocked` → retorna sem salvar |
| `app-store.ts:addPredictionSlot()` | Guard: se `isMatchTimeLocked` → retorna `null` |
| `Palpites.tsx:MatchRow` | `locked` inclui `timeLocked` (desabilita inputs) + toast no onClick |
| `Palpites.tsx:BracketRow` | Idem |
| `Palpites.tsx:AlternativePalpites` | Idem |

## Scripts

| Script | Descrição |
|---|---|
| `scripts/parse-matrix.cjs` | Extrai matriz FIFA 495 do HTML da Wikipedia |
| `npm run dev` | Dev server (Vite) |
| `npm run build` | Build produção (Vercel) |
| `npm run lint` | ESLint |

## Deploy (Vercel)

- `vercel.json`: `buildCommand: "node scripts/version.mjs && vite build"`, `framework: null`
- Build gera `.vercel/output/` com preset nitro `vercel`
- Basta conectar o repositório GitHub no painel da Vercel

## Arquivos Relevantes

| Arquivo | Função |
|---|---|
| `src/lib/bracket.ts` | Lógica oficial FIFA do chaveamento (904 linhas) |
| `src/store/app-store.ts` | Zustand store: persist + Supabase sync + profiles + bracket |
| `src/store/auth-store.ts` | Auth: login/signup/restoreSession + ensureProfile |
| `src/lib/scoring.ts` | Pontuação dos palpites vs resultados reais |
| `src/lib/copilot.ts` | Detecção de zebra com base em força das seleções |
| `src/lib/db/index.ts` | Camada de repositório (Zustand) |
| `src/lib/supabase/client.ts` | Cliente Supabase (anon key) |
| `src/lib/supabase/auth.ts` | signIn/signUp/getSessionUser + admin detection via leagues table |
| `src/lib/supabase/predictions.ts` | CRUD predictions + upsertPrediction com leagueId |
| `src/lib/supabase/members.ts` | CRUD members |
| `src/lib/supabase/settle-all.server.ts` | Server fn: recalcula points_earned + total_points de TODOS os usuários |
| `src/lib/supabase/migrate.server.ts` | Server fn: migra dados locais para Supabase |
| `src/lib/supabase/backfill-matches.server.ts` | Server fn: backfill de resultados locais para tabela matches do Supabase |
| `src/lib/supabase/sync-members.server.ts` | Server fn: sincroniza has_paid_admin + total_points de todos os membros |
| `src/mocks/types.ts` | Tipos compartilhados (MockMatch, MockPrediction, etc.) |
| `src/mocks/matches.ts` | Fixtures das 103 partidas reais com timezone por partida |
| `src/pages/Palpites.tsx` | Página de palpites |
| `src/pages/Dashboard.tsx` | Dashboard: Top do Bolão, evolução, breakdown |
| `src/pages/Ranking.tsx` | Ranking completo da liga |
| `src/pages/Perfil.tsx` | Perfil: migração, código convite, joinedLeague |
| `src/pages/AdminResultados.tsx` | Admin: lançar resultados + sincronizar |
| `supabase/migration.sql` | Schema base: matches, predictions, leagues, members + RLS |
| `supabase/invite_code.sql` | invite_code column, profiles table, correção league_id |
| `vercel.json` | Configuração de build/deploy Vercel |
| `AGENTS.md` | Este arquivo — documentação do projeto |

## Estado Atual (Jun 2026)

### Dados da Liga
- **Liga**: "Palpites - Copa 2026"
- **Código convite**: `UYLJBBTYW9`
- **Membros**:
  1. Márcio Donizeti Marcondes — 75 pts (admin)
  2. MDM — 75 pts
  3. THIAGO HENRIQUE BARREIRO OLIVEIRA MARCONDES — 72 pts

### Fluxo de Apuração
1. Admin clica "Encerrar partida" → `settleMatch()` no app-store
2. Atualiza `points_earned` localmente + sync predictions do admin
3. Chama `settleAllPredictions` (server fn com service role):
   - Busca TODAS predictions da partida no Supabase
   - Recalcula `points_earned` + `is_zebra` para cada prediction
   - Recalcula `total_points` na tabela `members` para todos afetados
   - **Upserta resultado na tabela `matches`** (agora visível a todos)
4. `loadFromSupabase()` no mount do Ranking recarrega dados + recalcula localmente se prediction veio com 0

### Funcionalidades Verificadas
- ✅ Login/Logout com Supabase Auth
- ✅ Admin detectado por `leagues.admin_id`
- ✅ Profile upsert automático no login (`ensureProfile`)
- ✅ Convite por código (entrar/sair do bolão)
- ✅ Palpites locais + sync Supabase
- ✅ Migração dados locais → Supabase
- ✅ Apuração recalcula pontos de todos os membros
- ✅ Ranking mostra nomes corretos dos membros
- ✅ Dashboard com "Top do Bolão" e nomes corretos
- ✅ Título da liga dinâmico no Ranking
- ✅ Multi-browser (admin + MDM + Thiago)
- ✅ 12+ partidas apuradas com pontuação de todos os membros
- ✅ Trava por tempo: 10min na 1ª rodada (só para quem completou todos os palpites), trava no início nas demais fases
- ✅ Prazo global no 1º jogo da 2ª rodada: tudo congelado (palpites + entrada de membros)
- ✅ Sincronização football-data.org com mapeamento de nomes (Cape Verde Islands, Holland)
- ✅ Líder atual na Apuração e Classificação no Dashboard mostram nome completo
- ✅ Membros visualizam Apuração com resultados e pontos (sem botões admin)
- ✅ Dashboard membro: cards e gráficos funcionam sem resultados locais (breakdownFromPoints)
- ✅ Gestão: toggleMemberPaid persiste no Supabase via sync-members.server (service role)
- ✅ Gestão: nomes dos membros vindos do Supabase (fallback email/id)
- ✅ Link convite funcional: /login?invite=CODE → sessionStorage → Perfil auto-join
- ✅ Resultados de partidas sincronizados para tabela matches do Supabase
- ✅ loadFromSupabase busca match results do Supabase e mescla no estado local

### Próximos Passos
1. Implementar recuperação de senha
2. Múltiplas ligas com seleção dinâmica (remover `CURRENT_LEAGUE_ID` hardcoded)

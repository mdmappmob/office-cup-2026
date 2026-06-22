# OFFICECUP 26 — Bolão Corporativo Copa 2026

## ⚠️ REGRA ABSOLUTA — NUNCA ALTERAR NADA SEM AUTORIZAÇÃO

**Nunca modificar, criar, deletar arquivos, executar scripts, alterar configurações, banco de dados, deploy ou qualquer recurso sem autorização explícita do usuário.** Mesmo que pareça óbvio, necessário ou "só uma correção rápida". Pergunte primeiro. Sempre.

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
| `buildRoundOf32()` | Alocação dos classificados com base na matriz FIFA |
| `getTeamForSlot()` | Resolve time de uma posição (1º/2º/3º) de um grupo |
| `computeGroupStandingsFromResults(matches)` | Tabela de cada grupo a partir dos **resultados reais** |
| `propagateKnockoutFromResults(matches)` | Propagação de vencedores entre fases usando **resultados reais** |
| `computeBracketFromResults(matches)` | Função principal — chaveamento único baseado em resultados reais |
| *(legado)* `computeGroupStandings()` | Antigo, baseado em palpites — não usado |
| *(legado)* `propagateKnockout()` | Antigo, baseado em palpites — não usado |
| *(legado)* `computeBracket()` | Antigo, baseado em palpites — não usado |

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
4. `regenerateBracket()` recalcula chaveamento com `computeBracketFromResults` a partir dos resultados reais
5. Se usuário logado, redireciona para /dashboard

### Cadastro / Login
1. `signUp`/`signIn` via Supabase Auth (`src/lib/supabase/auth.ts`)
2. Admin detectado por `leagues.admin_id` + fallback `VITE_ADMIN_EMAIL`
3. Sessão salva pelo Supabase (localStorage `sb-*-auth-token`)
4. `ensureProfile()` upserta `{ id, full_name, email }` na tabela `profiles` automaticamente no login/restoreSession

### Partidas
- 103 partidas reais: 72 grupos (12 grupos × 6 jogos) + 31 mata-mata (r32/16/8/4/2/1)
- Times das fases mata-mata são populados dinamicamente com base nos **resultados reais** (placares lançados pelo admin), não mais com base em palpites
- Chaveamento é **único para todos os usuários** — todo mundo vê os mesmos confrontos
- Datas reais da Copa 2026 (11 jun - 19 jul)
- Fuso horário por partida explicitado nos fixtures: `[group, dateISO, home, away, venueTz]` com constantes EDT/CDT/MT/ET

### Palpites (src/pages/Palpites.tsx)
- **Fase a fase**: as fases são liberadas automaticamente quando o admin settleia a última partida da fase anterior. **Não há mais botão "Avançar fase"** nem atalho Ctrl+S.
- **Abas com badges**: cada fase mostra ✓ (encerrada), ▶ (atual) ou 🔒 (futura)
- **Fase encerrada**: exibe placar real + seu palpite + pontos conquistados (view-only)
- **Fase atual**: inputs habilitados para palpitar (até 10 min após o início de cada partida)
- **Fase futura**: bloqueada, mostra cadeado
- Fases mata-mata usam `BracketRow` (Card responsivo) com layout adaptável
- Fase de grupos usa `GroupTable` com data do jogo exibida
- **Trava por tempo**: palpites são bloqueados conforme regras detalhadas na seção "Trava por Tempo". Guard também no `upsertPrediction` da store e no `addPredictionSlot`.
- **Banner informativo**: banner azul fixo no topo informando "Janela de alteração: você pode alterar seu palpite até 10 minutos após o início da partida"

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
- **Detecção de fase completa**: se a partida encerrada era a última da fase, `settleMatch()` dispara `onPhaseCompleted()` que:
  1. Limpa predictions de TODOS os usuários para as fases seguintes
  2. Recalcula o bracket a partir dos resultados reais (`computeBracketFromResults`)
  3. A próxima fase abre automaticamente para palpites
- Toast condicional: "Fase de Grupos encerrada! 16-avos de Final liberada com chaveamento real."
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

## Fluxo de Chaveamento (Result-based)

```
computeBracketFromResults(matches)
  │
  ├─ computeGroupStandingsFromResults(matches)
  │    └─ Usa home_score/away_score das partidas de grupos
  │    └─ Critérios FIFA: pts → H2H pts → H2H GD → H2H GF → GD → GF → Fair Play → Ranking
  │
  ├─ buildRoundOf32(standings)
  │    └─ Aloca 1º, 2º, 3º lugares conforme matriz FIFA (Anexo C)
  │
  └─ propagateKnockoutFromResults(matches)
       └─ r32 → oitavas → quartas → semi → final
       └─ Vencedor = home_score >= away_score
       └─ Só propaga se TODAS as partidas da fase têm resultado
```

## Arquivos Relevantes

| Arquivo | Função |
|---|---|
| `src/lib/bracket.ts` | Lógica oficial FIFA do chaveamento (+1200 linhas, novas funções result-based) |
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
4. `settleMatch()` verifica se a fase foi completamente encerrada (`isPhaseFullySettled`)
5. Se sim, dispara `onPhaseCompleted()`:
   - `clearFuturePhasePredictions()` — apaga predictions das fases seguintes
   - `regenerateBracket()` — recalcula chaveamento com `computeBracketFromResults`
   - Próxima fase abre automaticamente no Palpites
6. `loadFromSupabase()` no mount do Ranking recarrega dados + recalcula localmente se prediction veio com 0

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
- ✅ Trava por tempo: 10 min após o início de cada partida (regra única para todas as fases)
- ✅ Banner informativo azul "Janela de alteração" sempre visível na página de palpites
- ✅ Sincronização football-data.org com mapeamento de nomes (Cape Verde Islands, Holland)
- ✅ Líder atual na Apuração e Classificação no Dashboard mostram nome completo
- ✅ Membros visualizam Apuração com resultados e pontos (sem botões admin)
- ✅ Dashboard membro: cards e gráficos funcionam sem resultados locais (breakdownFromPoints)
- ✅ Gestão: toggleMemberPaid persiste no Supabase via sync-members.server (service role)
- ✅ Gestão: nomes dos membros vindos do Supabase (fallback email/id)
- ✅ Link convite funcional: /login?invite=CODE → sessionStorage → Perfil auto-join
- ✅ Resultados de partidas sincronizados para tabela matches do Supabase
- ✅ loadFromSupabase busca match results do Supabase e mescla no estado local

## Últimas Alterações

### 2026-06-18 — Snyk + Time Lock
- **Snyk**: upgrade `@cloudflare/vite-plugin` 1.40.1 → 1.42.0 (fixa vulnerabilidades em `undici` e `ws`)
- **Time lock**: trava passou de 10 min **antes** para 10 min **após** o início da partida
- **Prazo global removido**: não há mais deadline único; cada partida é independente
- **Banner azul**: mensagem "Janela de alteração" em banner fixo (`bg-sky-50`) sempre visível em Palpites
- **Limpeza**: `isDeadlinePassed` removido do app-store, Palpites e Perfil

### 2026-06-18 — Fix userId filter + limite de slots extras
- **Bug MatchRow/BracketRow**: `predictions.find` sem filtro `userId` exibia palpites de outro usuário e impedia edição do slot principal
- **Limite de slots**: `MAX_EXTRA_SLOTS = 1` (máx. 2 slots por partida: principal + 1 extra)
- **Botão oculto**: "+ Novo palpite" some quando limite é atingido (não apenas disabled)
- **Constantes exportadas**: `LOCK_TIME_MINUTES`, `MAX_EXTRA_SLOTS` em `src/store/app-store.ts`
- **Toast corrigido**: BracketRow e AlternativePalpites agora dizem "após o início" (estava "antes")

### 2026-06-18 — Fix sync silencioso + async settleMatch
- **Bug crítico**: `settleAllPredictions` engolia erros (retornava `{ ok: false }` em vez de lançar exceção), então `.catch()` nunca disparava e o admin via "Resultado registrado" mesmo com falha
- **settleMatch agora async**: retorna o resultado do sync remoto
- **Toast condicional**: AdminResultados mostra toast de erro se o sync falhar

### 2026-06-18 — Fix sync football-data: dateFrom + season + feedback
- **Bug sync automático**: API gratuita football-data.org só retorna matchday atual + próximo; partidas de rodadas anteriores (ex.: Suíça×Bósnia) não apareciam mais
- **Fix**: adicionado `?dateFrom=2026-06-01&season=2026` na chamada à API
- **Feedback**: AdminResultados agora exibe toast.warning listando partidas que a API retornou mas não foram encontradas localmente
- **Env vars**: `FOOTBALL_DATE_FROM`, `FOOTBALL_SEASON` (defaults: `2026-06-01`, `2026`)

### 2026-06-18 — Fix sync football-data: API_TEAM_MAP + swapped fallback + fresh deploy
- **Bug**: Suíça×Bósnia-Herzegovina (g8) não era encontrada pelo `resolveMatch` mesmo com "Switzerland" mapeado — API retornava "Bosnia-Herzegovina" (hífen) que não estava no `API_TEAM_MAP`
- **Fix**: adicionado `"Bosnia-Herzegovina" → "Bósnia-Herzegovina"` ao `API_TEAM_MAP`
- **Fix**: adicionado fallback de busca com home/away invertido em `resolveMatch`
- **Fix**: adicionados `dateFrom=2026-06-01&dateTo=2026-07-31` na chamada `syncFootballData` para evitar partidas faltando de rodadas anteriores
- **Causa raiz**: mapping correto existia no código mas deploy no Vercel não havia sido acionado — build stale impedia o fix de entrar em produção
- **Resolução**: novo commit forçou build fresh e o mapeamento passou a funcionar
- **Troubleshooting**: debug toast com detalhes do `resolveMatch` (API→mapeado→matches locais) adicionado e posteriormente removido

### 2026-06-19 — Result-based bracket + phase-by-phase predictions
- **Mudança radical no chaveamento**: bracket agora é calculado a partir dos **resultados reais** (`home_score`/`away_score`), não mais dos palpites do usuário
- **Novas funções em `bracket.ts`**: `computeGroupStandingsFromResults`, `propagateKnockoutFromResults`, `computeBracketFromResults`
- **Palpites fase a fase**: cada fase só abre quando o admin settleia a última partida da fase anterior
- **Botão "Avançar fase" removido**: fases avançam automaticamente, sem ação do usuário
- **Ctrl+S removido**: não há mais atalho de teclado para avançar fase
- **Abas com badges**: ✓ encerrada / ▶ atual / 🔒 futura
- **View-only em fases passadas**: mostra placar real + palpite + pontos (opção c)
- **`upsertPrediction` otimizado**: não chama mais `computeBracket` a cada palpite (só quando admin settleia)
- **`clearFuturePhasePredictions`**: apaga predictions de todos os usuários para fases futuras ao completar uma fase
- **Novos membros**: entram a qualquer momento, veem o mesmo chaveamento de todos, palpam a fase atual (fases passadas = 0 pontos)
- **Toast de fase encerrada**: AdminResultados mostra toast diferente quando uma fase é completamente settleada

### 2026-06-20 — Extra slots removidos + multiplicador por fase + ranking por fase + homepage cleanup
- **Extra slots removidos**: `MAX_EXTRA_SLOTS = 0` em `app-store.ts`; botão "Novo palpite" e UI de slots extras removidos de `Palpites.tsx`; `AlternativePalpites` simplificado para prediction única
- **Multiplicador por fase**: `PHASE_MULTIPLIER` em `scoring.ts` (grupos×1, r32×2, oitavas×3, quartas×4, semi×5, final×6); `scoreMatch()` aplica multiplicador antes do zebra 1.5×; `breakdownFromPoints()` aceita `matches` opcional para detectar tier do palpite; `userBreakdown()` aplica multiplicador por fase
- **Ranking por fase**: `Ranking.tsx` com abas "Geral" | "Por Fase"; cards por fase com ícone (Trophy/Swords/Shield/Medal/Star/Crown), badge do multiplicador, mini-ranking com pontos na fase + acumulado; linhas com 0 pontos ocultas
- **Dashboard**: fix `totalPredictable` — conta partidas encerradas onde usuário palpitou (não só onde pontuou); `breakdownFromPoints` recebe `matches`
- **AdminResultados**: coluna "Pontos" removida; coluna "Ação" só aparece para admin
- **Homepage**: grid de seleções e times removido
- **Restrição**: nenhum dado de artilheiros/cartões/cantos por falta de fonte gratuita confiável
- **Legenda**: `Palpites.tsx` exibe tabela de multiplicadores abaixo da tabela de pontuação

### 2026-06-20 — Homepage: imagem copa2026.png como background
- **Background hero**: `public/copa2026.png` adicionada como background da seção hero
- **Ajustes de opacidade**: 6% → 10% → 15% → 25% para equilibrar visibilidade e contraste dos textos
- **Estilo**: `bg-cover` cobre toda a largura; sem blur; `pointer-events-none`
- **Textos escurecidos**: badge "FIFA World Cup" com `text-foreground/70` e parágrafo descritivo com `text-foreground/80` para melhor legibilidade contra o fundo

### 2026-06-20 — Ranking por fase em abas + fetch all predictions + fix payment status race
- **Ranking por fase**: `Ranking.tsx` — "Por Fase" agora com sub-abas (Grupos/R32/Oitavas/Quartas/Semi/Final) em vez de lista vertical; avatar `size-8` igual ao card Geral; ordenação por pontos na fase com desempate por nome
- **Todos os membros visíveis**: linhas com 0 pontos não são mais ocultadas; coluna Status removida das tabelas por fase; alinhamento `text-right` consistente em "Pontos na Fase" e "Acumulado"
- **Cumulativo entre fases**: `cumulativeEarned` acumula pontos por fase na ordem (grupos → r32 → ... → final); cada aba mostra acumulado até aquela fase
- **fetchAllLeaguePredictions**: novo `src/lib/supabase/fetch-all-predictions.server.ts` — server fn que busca predictions de TODOS os membros via service role (soluciona o bug onde outros membros apareciam com 0 pontos porque o store só carregava predictions do usuário logado)
- **loadFromSupabase**: agora carrega predictions de todos os membros após carregar `members`; merge no store local
- **Fix syncMembersToSupabase race condition**: removido `upsertMember` que hardcodava `has_paid_admin: false`; `syncAllMembers` agora é `await` (era fire-and-forget); removidas chamadas duplicadas em `settleMatch` e `recalculateAllScores`

### Próximos Passos
1. Implementar recuperação de senha
2. Múltiplas ligas com seleção dinâmica (remover `CURRENT_LEAGUE_ID` hardcoded)

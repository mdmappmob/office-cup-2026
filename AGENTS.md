# OFFICECUP 26 — Bolão Corporativo Copa 2026

## Stack
- TanStack Start + React 19 + TypeScript + Vite + Tailwind 4 + shadcn/ui
- Zustand com persist (localStorage) para dados da aplicação
- SQLite via sql.js (WASM) no navegador, persistido em IndexedDB (autenticação)
- Cloudflare (deploy via wrangler)

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

### Resultados
- **Sincronização automática**: botão "Sincronizar resultados" na página de Apuração busca placares da football-data.org
- **Manual**: admin pode lançar resultado de qualquer partida diretamente
- Partidas com data passada são destacadas para lançamento
- Pontuação recalculada automaticamente ao encerrar partida
- API configurada via env vars: `FOOTBALL_API_KEY`, `FOOTBALL_COMPETITION_ID`

### Ranking
- Baseado nos pontos acumulados dos palpites vs resultados reais
- Status de pagamento (PAGO/PENDENTE) gerenciado pelo admin

## Tabelas

### SQLite (IndexedDB) — `officecup-sqlite`
- `oc_users`: id, email, password_hash, full_name, is_admin, created_at

### Zustand (localStorage) — chave `officecup-2026`
- `matches`: 103 partidas reais (não mock)
- `predictions`: palpites dos usuários
- `members`: membros da liga com pontuação
- `theme`: light/dark
- `isAdmin`: flag admin

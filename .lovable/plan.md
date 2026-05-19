## OfficeCup 2026 — Plano de implementação

Front-end completo com mockdata, pronto para trocar por backend real depois. Direção visual escolhida: **Tactical Terminal** (light, Inter + JetBrains Mono, accent azul `#2563eb` e verde `#10b981`).

### 1. Design system (src/styles.css)
- Tokens semânticos em oklch espelhando o protótipo: `--background`, `--foreground`, `--muted`, `--primary` (azul), `--accent` (verde), `--border`.
- Variantes light/dark.
- Fontes Inter + JetBrains Mono via Google Fonts no `__root.tsx`.
- Toggle de tema (botão sol/lua na sidebar) com persistência em `localStorage`.

### 2. Mockdata (`src/mocks/`)
Arquivos TypeScript tipados espelhando o schema relacional:
- `profiles.ts` — `MockProfile[]`
- `leagues.ts` — `MockLeague[]`
- `leagueMembers.ts` — `MockLeagueMember[]`
- `matches.ts` — `MockMatch[]` (48 jogos de grupos + placeholders de mata-mata)
- `predictions.ts` — `MockPrediction[]`
- `currentUser.ts` — usuário ativo simulado (com flag para alternar entre admin e participante para demo)

### 3. Estado global (`src/store/`)
Store leve com Zustand (ou Context + reducer) para:
- usuário atual, liga atual
- palpites (CRUD em memória)
- derivar fase desbloqueada a partir de `predictions` vs `matches` da fase anterior
- gerar confrontos de mata-mata a partir dos palpites de grupos

### 4. Roteamento (TanStack Start)
Layout `_app.tsx` com sidebar fixa + `<Outlet />`. Rotas:
- `/` → Dashboard
- `/palpites` → Inserir Palpites (core)
- `/ranking` → Ranking da Firma
- `/gestao` → Gestão do Bolão (visível só se admin)
- `/perfil` → Meu Perfil
- `/criar-bolao` + `/pagamento` + `/convite/$token` → fluxo de criação/entrada

### 5. Sidebar (`src/components/AppSidebar.tsx`)
shadcn Sidebar, ícones Lucide:
- Dashboard, Inserir Palpites, Ranking da Firma, Gestão do Bolão (condicional admin)
- Divisor
- Meu Perfil (base), Sair
- Bloco de usuário com avatar + plano
- Botão toggle tema

### 6. Tela de Palpites (core)
- shadcn `Tabs` para fases: Grupos, Oitavas, Quartas, Semi, Final.
- Cada aba mostra progresso `X/Y jogos` em chip mono.
- Abas futuras renderizadas `disabled` com ícone cadeado; desbloqueiam quando `predictions.fase_anterior.filled === matches.fase_anterior.length`.
- Empty state ilustrativo nas bloqueadas ("Termine a fase de grupos para descobrir os classificados do mata-mata").
- `MatchCard`: bandeira + nome + inputs de placar mono + ícone Sparkles (copilot) + `Accordion` colapsado com tabs internos "Escalação" e "Artilheiros".
- Confrontos de mata-mata gerados dinamicamente a partir dos palpites de grupos (função `computeKnockoutBracket`).
- Atalho `Ctrl+S` salva todos palpites da aba ativa com toast (sonner).
- Animações de troca de aba e expand de accordion com `framer-motion`.

### 7. Dashboard
- 4 KPI cards: pontuação total, rank na firma, acertos em cheio, % aproveitamento.
- Gráfico de linha (Recharts) — pontos por rodada.
- Gráfico de barras — distribuição por tipo de acerto (exato, saldo, vencedor).
- Card "Próximos jogos" e "Última análise do Copilot".

### 8. Ranking da Firma
- shadcn `DataTable` (TanStack Table) com posição, avatar, nome, jogos preenchidos, pontos, badge de status pago.
- Highlight da linha do usuário atual.

### 9. Gestão do Bolão (admin)
- Lista de membros com toggle `has_paid_admin` (atualiza mock).
- Botão "Copiar link de convite".
- Campos de configuração da liga (nome, status).
- Aviso bloqueando palpites enquanto participante estiver não-pago.

### 10. Fluxo de criação e pagamento (simulado)
- `/criar-bolao` formulário → `/pagamento` tela mock R$ 19,99 → gera token de convite e redireciona para gestão.
- `/convite/$token` cadastro simples → status pendente até admin liberar.

### 11. Motor de pontuação (`src/lib/scoring.ts`)
Funções puras cruzando `predictions` × `matches`:
- placar exato 10 / saldo+vencedor 7 / só vencedor 5
- escalação 15/7/3 conforme regra
- artilheiros 3pts por palpite acertado
- multiplicador 1.5x se `is_zebra && resultado confirmado`
- recalc on demand (chamado pelo dashboard e ranking)

### 12. Copilot das Zebras (`src/lib/copilot.ts`)
- Função `analyzeMatch(matchId, prediction)` retorna análise simulada (string + flag `isZebra`) determinística baseada em hash do match.
- Modal/Drawer (shadcn `Sheet`) abre ao clicar no ícone Sparkles do card; mostra "análise da IA" com efeito de digitação.
- Marca `is_zebra=true` no mock prediction quando confirmado pelo usuário.

### 13. Microinterações & UX
- Sonner toasts para salvar/erro/desbloqueio de fase.
- Reveal animado da aba recém-desbloqueada (framer-motion + confete sutil).
- Empty states ilustrativos com ícone Lucide grande + copy.
- Skeleton loaders nos cards.
- Validação inline de placar (>=0, inteiro).

### Detalhes técnicos
- TanStack Start file-based routing, sem backend.
- shadcn/ui: Sidebar, Tabs, Accordion, Card, Table, Sheet, Dialog, Input, Button, Badge, Toggle, Toast (sonner já incluso).
- Recharts para gráficos.
- framer-motion para animações.
- Zustand para estado global (peso baixo, fácil migrar).
- Todos os tipos exportados de `src/mocks/types.ts` para reuso quando migrar pro Supabase.
- Helper `useUnlockedPhases()` centraliza a lógica de bloqueio.

### Fora de escopo (futuro)
- Backend real (Supabase), auth, pagamento real (Stripe), IA real do Copilot, push notifications. Toda a camada de dados está isolada em `src/mocks/` + store, então a troca futura é cirúrgica.
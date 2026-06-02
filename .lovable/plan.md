# Plano: Painel inline, zebrinha automática e camada de dados

## 1. Camada de acesso "tipo DB" (pronta pra trocar por SQLite/Postgres)

Novo arquivo `src/lib/db/index.ts` com uma interface única `MatchesRepo` e `PredictionsRepo`:

- `listMatches()`, `getMatch(id)`, `listByPhase(phase)`, `listByGroup(group)`
- `getPrediction(matchId)`, `upsertPrediction(matchId, patch)`, `listPredictions()`

Implementação inicial `src/lib/db/local-repo.ts` que lê/escreve do Zustand store (mocks atuais + persistência local que já existe). Assim toda a UI passa a chamar `repo.*` em vez de `useAppStore` direto para dados de jogos — quando trocarmos por SQLite/Postgres, só essa camada muda.

Seed: `src/lib/db/seed.ts` exporta a tabela completa dos 72 jogos da fase de grupos (reaproveita `src/mocks/matches.ts`) e expõe `getSeedMatches()` — simula o "insert inicial" da tabela.

Documento `src/lib/db/README.md` curto explicando como plugar SQLite (sql.js) ou Postgres depois.

## 2. Remover o popup (Sheet)

Em `src/pages/Palpites.tsx`:

- Remover `Sheet`, `SheetContent`, `MatchDetailsSheet`, `detailMatchId` state.
- Manter `selectedMatchId` (substitui `detailMatchId`) — controla qual jogo está expandido no painel inline.

## 3. Painel inline abaixo da tabela do grupo

Novo componente `MatchDetailsInline` (mesmo arquivo ou `src/components/MatchDetailsPanel.tsx`):

- Renderiza dentro de `GroupTable`, logo abaixo do `<Table>`, quando `selectedMatchId` pertence ao grupo.
- Mostra 3 seções como hoje (Escalações, Artilheiros, Copilot das Zebras), mas em layout horizontal de 3 colunas em telas largas, empilhado em mobile.
- Animação `motion.div` com `height: auto` e `opacity` para abrir/fechar suave.
- Botão "fechar" no canto.
- Ao clicar em outro jogo do mesmo grupo, o painel atualiza o conteúdo sem fechar/reabrir.
- Em fases de mata-mata, o painel aparece abaixo da `BracketRow` selecionada.

## 4. Zebrinha automática (substitui o ícone Settings2)

Em `MatchRow`:

- Calcular `analysis = analyzeMatch(match, prediction)` quando `filled === true`.
- Se `analysis.isZebra`:
  - Trocar `Settings2` por um ícone de zebra (emoji 🦓 ou ícone Lucide `Sparkles`/custom — vou usar `Sparkles` com cor `accent` + tooltip "Zebra detectada").
  - Auto-marcar `is_zebra: true` via `upsertPrediction` se ainda não estiver (com guard pra não criar loop).
- Caso contrário, mantém o ícone de "abrir detalhes" (uso `ChevronDown` que indica expansão, mais coerente que Settings2).
- Clicar no ícone (qualquer um dos dois) abre/atualiza o painel inline com aquele jogo selecionado.
- Tooltip via `title` no botão explicando o estado.

## 5. Ajustes visuais

- Linha selecionada na tabela ganha destaque (`bg-accent/10` + borda esquerda colorida).
- Painel inline com border-top tracejada conectando visualmente à linha selecionada.
- Badge "ZEBRA" pequena ao lado do placar quando a heurística detecta.

## Arquivos afetados

- novo: `src/lib/db/index.ts`, `src/lib/db/local-repo.ts`, `src/lib/db/seed.ts`, `src/lib/db/README.md`
- novo: `src/components/MatchDetailsPanel.tsx` (extraído do Sheet atual)
- editado: `src/pages/Palpites.tsx` (remove Sheet, adiciona painel inline, zebrinha automática)

## Fora de escopo

- Trocar Zustand pelo repo em outras páginas (Dashboard, Ranking) — fica pra depois.
- SQLite real via sql.js — a camada fica pronta, mas a implementação WASM não entra agora (você escolheu manter mocks).
- Controle de horário de cutoff dos jogos (explicitamente eliminado pelo pedido).

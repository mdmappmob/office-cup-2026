## Plano de mudanças

### 1. Caminho da base SQLite memorizado → pula popup
- Hoje já gravamos o nome em `localStorage` (`officecup-sqlite-name`). O popup ainda aparece quando o nome não existe.
- Mudança: na 1ª execução, criar **automaticamente** com nome padrão `officecup-2026` (sem pedir nada). Remover o componente `SqliteBootstrap` da árvore — o boot vira um efeito no root que apenas chama `initSqliteRepo("officecup-2026")` e dispara o redirect para `/login` quando termina.
- O arquivo persistente continua em IndexedDB (não dá pra gravar caminho real em browser); o "caminho" passa a ser uma constante salva em `src/lib/db/config.ts` que o sistema lê.

### 2. Guard de autenticação
- Criar `src/store/auth-store.ts` (zustand persistido) com `user | null`, `login()`, `logout()`.
- Ajustar `src/pages/Login.tsx` para validar contra a tabela `users` no SQLite (com hash simples). Se não há usuário cadastrado, criar um seed (`admin@firma.com / demo`).
- Converter `/_app` em **rota protegida**: `beforeLoad` verifica auth-store; sem usuário → `redirect({ to: "/login" })`.
- `/` redireciona a `/login` quando deslogado, a `/dashboard` quando logado.

### 3. Múltiplos palpites por partida
- Schema SQLite: relaxar unicidade. `predictions.id` continua PK, mas remove a regra implícita de "1 por match_id+user_id". Adicionar coluna `slot` (1..N) e índice `(user_id, match_id, slot)`.
- `upsertPrediction(matchId, patch, slot?)` aceita slot opcional; sem slot → cria novo.
- UI em `Palpites.tsx`: botão **"+ Novo palpite"** dentro do card aberto, listando os palpites já cadastrados com botão remover. A pontuação considera o **melhor palpite** por partida.

### 4. Bandeiras renderizadas via SVG (cross-OS)
- Instalar `country-flag-icons` (SVG, funciona em qualquer SO).
- Mudar storage: `matches.home_flag` / `away_flag` voltam a guardar **ISO-2** (ex.: `MX`, `BR`, `GB-ENG`).
- Criar `src/components/Flag.tsx` que recebe o nome do time, mapeia para ISO via tabela `TEAM_ISO`, e renderiza `<svg>` do `country-flag-icons/react/3x2`.
- Atualizar `seed.ts`, `Palpites.tsx`, `computeBracket` (store) e `sqlite-repo` para usar ISO.
- **Migração**: rodar uma vez `UPDATE matches SET home_flag = <iso>, away_flag = <iso>` para bases já criadas.
- Gerar script `/mnt/documents/rollback_flags_table.sql` que faz `DROP TABLE IF EXISTS flags;` (rollback do `update_flags.sql` enviado antes).

### 5. Apuração de resultados + estatísticas
- Nova rota `/_app/admin/resultados` (admin) com tabela editável: para cada partida o admin lança `home_score`, `away_score`, marca `status = 'finished'` → grava em `matches`.
- Ao salvar resultado: percorrer todas predições do match, calcular pontos com `scoreMatch` (já existe em `src/lib/scoring.ts`), gravar `points_earned` em `predictions`, atualizar `members.total_points`.
- Recalcular `unlockedPhases` e propagar vencedores reais para chaves seguintes (substituir cálculo baseado em palpites pelo resultado real quando `status='finished'`).
- Página `Ranking` lê `members.total_points` (SQLite) e quebra por categoria (exato / vencedor+diff / vencedor / artilheiros / zebra).
- Dashboard ganha cards: "Próximos jogos", "Acertos da rodada", "Maior pontuador da fase".

### Arquivos tocados
**Novos:** `src/lib/db/config.ts`, `src/store/auth-store.ts`, `src/components/Flag.tsx`, `src/lib/results.ts` (apuração), `src/pages/AdminResultados.tsx`, `src/routes/_app.admin.resultados.tsx`, `/mnt/documents/rollback_flags_table.sql`.

**Editados:** `src/routes/__root.tsx` (remove SqliteBootstrap, adiciona boot auto), `src/routes/_app.tsx` (beforeLoad guard), `src/routes/index.tsx` (redirect condicional), `src/routes/login.tsx`, `src/pages/Login.tsx`, `src/lib/db/sqlite-repo.ts` (schema users, multi-palpite, ISO flags, apuração), `src/lib/db/index.ts`, `src/mocks/matches.ts` + `seed.ts` (ISO codes), `src/store/app-store.ts` (computeBracket usa ISO + score real), `src/pages/Palpites.tsx` (Flag component + multi-palpite UI), `src/pages/Dashboard.tsx`, `src/pages/Ranking.tsx`.

**Removidos:** `src/lib/db/SqliteBootstrap.tsx`.

### Pacotes
- `bun add country-flag-icons`

Quer que eu prossiga assim? Posso ajustar qualquer ponto antes de implementar.
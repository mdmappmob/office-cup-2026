# Fix: predictions R32 não persistem + bracket grupos incompletos

## Problema 1 — Predictions R32 somem

**Causa:** Filtro em `loadFromSupabase` (app-store.ts ~linha 308–326) elimina predictions de fases consideradas "futuras". Como grupos ainda não está 100% encerrado, `currentIdx = 0`, e só predictions de grupos são mantidas. R32 é filtrado = perdido.

**Solução:** Remover o bloco inteiro de filtro (linhas 308–326). Não é mais necessário porque:
- Todas as abas estão liberadas (R32 é acessível)
- `clearFuturePhasePredictions` em `onPhaseCompleted` já limpa predictions quando uma fase é oficialmente encerrada

## Problema 2 — Grupos incompletos populam R32 com times fictícios

**Causa:** `computeGroupStandingsFromResults` (bracket.ts ~linha 1134) processa todos os 12 grupos mesmo sem resultados. Times com 0 pts são ordenados por tiebreaker → 1º/2º/3º fictícios vão para o R32.

**Solução:** Adicionar guarda `allPlayed` — só incluir grupo se todas as 6 partidas têm placar. Se não, `continue` (grupo não entra no standings → `getTeamForSlot` retorna null → R32 fica "—").

### Arquivo: `src/lib/bracket.ts` — função `computeGroupStandingsFromResults`

**Antes** (linha ~1134):
```ts
    const gms = groupMatches.filter((m) => m.group === g);
    const raw = getStandingsForGroupFromResults(gms);
    const sorted = sortGroupStandingsFromResults(raw, gms);
    result[g] = sorted;
    if (sorted.length >= 3) allThird.push(sorted[2]);
```

**Depois:**
```ts
    const gms = groupMatches.filter((m) => m.group === g);
    const allPlayed = gms.every((m) => m.home_score !== null && m.away_score !== null);
    if (!allPlayed) continue;
    const raw = getStandingsForGroupFromResults(gms);
    const sorted = sortGroupStandingsFromResults(raw, gms);
    result[g] = sorted;
    if (sorted.length >= 3) allThird.push(sorted[2]);
```

### Arquivo: `src/store/app-store.ts` — função `loadFromSupabase`

Remover bloco inteiro (linhas 308–326):

```ts
          // Segurança: filtra predictions de fases futuras
          {
            const currentIdx = PHASE_ORDER.findIndex((p) => !get().isPhaseFullySettled(p));
            if (currentIdx >= 0) {
              const allowed = new Set(PHASE_ORDER.slice(0, currentIdx + 1));
              const allowedIds = new Set(
                get()
                  .matches.filter((m) => allowed.has(m.phase))
                  .map((m) => m.id),
              );
              const before = merged.length;
              merged = merged.filter((p) => allowedIds.has(p.match_id));
              if (merged.length !== before) {
                console.log(
                  `loadFromSupabase: filtradas ${before - merged.length} predictions de fases futuras`,
                );
              }
            }
          }
```

Virar:

```ts
          // (filtro removido — todas as fases estão liberadas)
```

### Depois de aplicar

```bash
git add src/lib/bracket.ts src/store/app-store.ts
git commit -m "fix: predictions R32 persistem + grupos incompletos não populam bracket"
git push
```

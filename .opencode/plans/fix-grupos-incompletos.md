# Fix: grupos incompletos não populam R32

## Arquivo
`src/lib/bracket.ts`, função `computeGroupStandingsFromResults` (linha 1134)

## Mudança
Adicionar guarda para pular grupos que ainda têm partidas sem resultado:

```ts
// Antes (linha 1134-1139):
    const gms = groupMatches.filter((m) => m.group === g);
    const raw = getStandingsForGroupFromResults(gms);
    const sorted = sortGroupStandingsFromResults(raw, gms);
    result[g] = sorted;
    if (sorted.length >= 3) allThird.push(sorted[2]);

// Depois:
    const gms = groupMatches.filter((m) => m.group === g);
    // Só inclui grupo se TODAS as partidas têm resultado — evita classificação fictícia
    const allPlayed = gms.every((m) => m.home_score !== null && m.away_score !== null);
    if (!allPlayed) continue;
    const raw = getStandingsForGroupFromResults(gms);
    const sorted = sortGroupStandingsFromResults(raw, gms);
    result[g] = sorted;
    if (sorted.length >= 3) allThird.push(sorted[2]);
```

## Efeito
- Grupos sem resultado completo → `result[g]` não existe → `getTeamForSlot` retorna `null` → R32 fica "—"
- Grupos já 100% resolvidos → classificados corretamente no R32
- `allThird` só coleta 3º lugar de grupos completos → terceiros classificados só aparecem quando todos os grupos estão resolvidos

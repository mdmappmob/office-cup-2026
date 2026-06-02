# Camada de acesso (DB piloto)

Interface única (`MatchesRepo`, `PredictionsRepo`) que toda a UI deve usar para ler/escrever
jogos e palpites. Hoje a implementação é local (Zustand + persistência em `localStorage`).

## Como plugar SQLite (sql.js — browser/WASM)

1. `bun add sql.js`
2. Criar `src/lib/db/sqlite-repo.ts` que abre um banco em memória, faz `CREATE TABLE matches/predictions`
   e `INSERT` com `getSeedMatches()` no boot.
3. Persistir o `db.export()` (Uint8Array) em IndexedDB.
4. Trocar os `export const matchesRepo` em `index.ts` para a nova implementação.

## Como plugar Lovable Cloud (Postgres)

1. Habilitar Lovable Cloud.
2. Migração SQL com tabelas `matches` e `predictions` (espelho de `MockMatch`/`MockPrediction`).
3. Criar `src/lib/db/cloud-repo.ts` usando `supabase.from('matches').select(...)`.
4. Trocar os exports em `index.ts`.

Nenhum componente precisa mudar — todos consomem `matchesRepo` / `predictionsRepo`.
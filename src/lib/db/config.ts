/**
 * "Caminho" da base SQLite. No browser não existe path real; este nome
 * identifica o registro persistido em IndexedDB e é lido pelo bootstrap
 * para abrir a base automaticamente sem perguntar nada ao usuário.
 */
export const SQLITE_DB_NAME = "officecup-2026";
export const SQLITE_WASM_URL = "/sql-wasm.wasm";
export const IDB_NAME = "officecup-sqlite";
export const IDB_STORE = "db";
export const IDB_RECORD_ID = "snapshot";
export const SESSION_ID = "current_user_id";

export const ADMIN_EMAIL: string = (import.meta.env.VITE_ADMIN_EMAIL as string) || "";

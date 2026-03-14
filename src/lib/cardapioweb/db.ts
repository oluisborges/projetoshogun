import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const db = new Database(path.join(DATA_DIR, "orders.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id         INTEGER PRIMARY KEY,
    status     TEXT    NOT NULL,
    total      REAL    NOT NULL,
    created_at TEXT    NOT NULL,
    updated_at TEXT    NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_orders_status_created
    ON orders (status, created_at);

  CREATE TABLE IF NOT EXISTS sync_meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

export default db;

/** Último created_at salvo no banco, ou null se vazio. */
export function getLastSyncedDate(): string | null {
  const row = db
    .prepare("SELECT value FROM sync_meta WHERE key = 'last_synced_at'")
    .get() as { value: string } | undefined;
  return row?.value ?? null;
}

export function setLastSyncedDate(date: string) {
  db.prepare(
    "INSERT INTO sync_meta (key, value) VALUES ('last_synced_at', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(date);
}

export interface StoredOrder {
  id: number;
  status: string;
  total: number;
  created_at: string;
  updated_at: string;
}

const upsert = db.prepare(`
  INSERT INTO orders (id, status, total, created_at, updated_at)
  VALUES (@id, @status, @total, @created_at, @updated_at)
  ON CONFLICT(id) DO UPDATE SET
    status     = excluded.status,
    total      = excluded.total,
    updated_at = excluded.updated_at
`);

export const upsertOrders = db.transaction((orders: StoredOrder[]) => {
  for (const o of orders) upsert.run(o);
});

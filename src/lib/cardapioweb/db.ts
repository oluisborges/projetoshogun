import { sql } from "@vercel/postgres";

// ─── Schema ───────────────────────────────────────────────────────────────────

/**
 * Cria as tabelas se não existirem.
 * Seguro chamar em toda inicialização (idempotente).
 */
export async function initDb() {
  await sql`
    CREATE TABLE IF NOT EXISTS stores (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      cw_token    TEXT NOT NULL,
      cw_base_url TEXT NOT NULL DEFAULT 'https://integracao.sandbox.cardapioweb.com',
      active      BOOLEAN NOT NULL DEFAULT true,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS orders (
      id         BIGINT,
      store_id   TEXT NOT NULL REFERENCES stores(id),
      status     TEXT NOT NULL,
      total      NUMERIC(12,2) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      PRIMARY KEY (store_id, id)
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_orders_store_status_created
      ON orders (store_id, status, created_at)
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS sync_meta (
      store_id TEXT NOT NULL,
      key      TEXT NOT NULL,
      value    TEXT NOT NULL,
      PRIMARY KEY (store_id, key)
    )
  `;
}

// ─── Stores ───────────────────────────────────────────────────────────────────

export interface StoreRow {
  id: string;
  name: string;
  cw_token: string;
  cw_base_url: string;
  active: boolean;
}

export async function getStore(storeId: string): Promise<StoreRow | null> {
  const { rows } = await sql<StoreRow>`
    SELECT id, name, cw_token, cw_base_url, active
      FROM stores
     WHERE id = ${storeId}
  `;
  return rows[0] ?? null;
}

export async function getActiveStores(): Promise<StoreRow[]> {
  const { rows } = await sql<StoreRow>`
    SELECT id, name, cw_token, cw_base_url, active
      FROM stores
     WHERE active = true
     ORDER BY name
  `;
  return rows;
}

/**
 * Garante que a store padrão (configurada via env) existe no banco.
 * Chamado no primeiro sync.
 */
export async function ensureDefaultStore() {
  const id = process.env.CARDAPIOWEB_STORE_ID ?? "default";
  const token = process.env.CARDAPIOWEB_TOKEN;
  const baseUrl =
    process.env.CARDAPIOWEB_BASE_URL ??
    "https://integracao.sandbox.cardapioweb.com";
  const name = process.env.CARDAPIOWEB_STORE_NAME ?? id;

  if (!token) return; // sem token, não tem o que registrar

  await sql`
    INSERT INTO stores (id, name, cw_token, cw_base_url)
    VALUES (${id}, ${name}, ${token}, ${baseUrl})
    ON CONFLICT (id) DO UPDATE SET
      cw_token    = EXCLUDED.cw_token,
      cw_base_url = EXCLUDED.cw_base_url,
      name        = EXCLUDED.name
  `;
}

// ─── Sync meta ────────────────────────────────────────────────────────────────

export async function getLastSyncedDate(storeId: string): Promise<string | null> {
  const { rows } = await sql`
    SELECT value FROM sync_meta
     WHERE store_id = ${storeId} AND key = 'last_synced_at'
  `;
  return (rows[0]?.value as string) ?? null;
}

export async function setLastSyncedDate(storeId: string, date: string) {
  await sql`
    INSERT INTO sync_meta (store_id, key, value)
    VALUES (${storeId}, 'last_synced_at', ${date})
    ON CONFLICT (store_id, key) DO UPDATE SET value = EXCLUDED.value
  `;
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export interface StoredOrder {
  id: number;
  store_id: string;
  status: string;
  total: number;
  created_at: string;
  updated_at: string;
}

/** Upsert em lote (serial, ~10 por vez para não explodir timeout). */
export async function upsertOrders(orders: StoredOrder[]) {
  const CHUNK = 10;
  for (let i = 0; i < orders.length; i += CHUNK) {
    await Promise.all(
      orders.slice(i, i + CHUNK).map((o) =>
        sql`
          INSERT INTO orders (id, store_id, status, total, created_at, updated_at)
          VALUES (${o.id}, ${o.store_id}, ${o.status}, ${o.total}, ${o.created_at}, ${o.updated_at})
          ON CONFLICT (store_id, id) DO UPDATE SET
            status     = EXCLUDED.status,
            total      = EXCLUDED.total,
            updated_at = EXCLUDED.updated_at
        `
      )
    );
  }
}

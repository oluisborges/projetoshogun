/**
 * Cron de sincronização automática.
 * Vercel chama este endpoint via GET, conforme configurado em vercel.json.
 * Protegido pelo header CRON_SECRET que o Vercel injeta automaticamente.
 */
import { NextResponse } from "next/server";
import {
  getAllOrderSummaries,
  getOrderDetailsBatch,
  StoreCredentials,
} from "@/lib/cardapioweb/client";
import {
  initDb,
  ensureDefaultStore,
  getActiveStores,
  getLastSyncedDate,
  setLastSyncedDate,
  upsertOrders,
} from "@/lib/cardapioweb/db";

const BACKFILL_MONTHS = 3;

export async function GET(request: Request) {
  // Verifica secret do Vercel Cron (ignorado em dev)
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await initDb();
  await ensureDefaultStore();

  const stores = await getActiveStores();
  const results: Array<{ store: string; synced: number; ok: boolean; error?: string }> =
    [];

  for (const store of stores) {
    const creds: StoreCredentials = {
      token: store.cw_token,
      baseUrl: store.cw_base_url,
    };

    try {
      const lastSync = await getLastSyncedDate(store.id);
      const startDate =
        lastSync ??
        (() => {
          const d = new Date();
          d.setMonth(d.getMonth() - BACKFILL_MONTHS);
          return d.toISOString();
        })();
      const endDate = new Date().toISOString();

      const { summaries } = await getAllOrderSummaries(
        startDate,
        endDate,
        ["closed", "canceled"],
        creds
      );

      if (summaries.length === 0) {
        await setLastSyncedDate(store.id, endDate);
        results.push({ store: store.id, synced: 0, ok: true });
        continue;
      }

      const hasTotals = summaries.every(
        (s) => s.total !== undefined && s.total !== null
      );

      if (hasTotals) {
        await upsertOrders(
          summaries.map((o) => ({
            id: o.id,
            store_id: store.id,
            status: o.status,
            total: o.total ?? 0,
            created_at: o.created_at,
            updated_at: o.updated_at,
          }))
        );
      } else {
        const details = await getOrderDetailsBatch(
          summaries.map((o) => o.id),
          creds
        );
        await upsertOrders(
          details.map((o) => ({
            id: o.id,
            store_id: store.id,
            status: o.status,
            total: o.total ?? 0,
            created_at: o.created_at,
            updated_at: o.updated_at,
          }))
        );
      }

      await setLastSyncedDate(store.id, endDate);
      results.push({ store: store.id, synced: summaries.length, ok: true });
    } catch (err) {
      results.push({
        store: store.id,
        synced: 0,
        ok: false,
        error: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  return NextResponse.json({ results, ranAt: new Date().toISOString() });
}

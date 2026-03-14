import { NextResponse } from "next/server";
import {
  getAllOrderSummaries,
  getOrderDetailsBatch,
} from "@/lib/cardapioweb/client";
import {
  initDb,
  ensureDefaultStore,
  getLastSyncedDate,
  setLastSyncedDate,
  upsertOrders,
} from "@/lib/cardapioweb/db";

const DEFAULT_BACKFILL_MONTHS = 3;
const DEFAULT_STORE_ID = () =>
  process.env.CARDAPIOWEB_STORE_ID ?? "default";

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("store_id") ?? DEFAULT_STORE_ID();

    await initDb();
    await ensureDefaultStore();

    const lastSync = await getLastSyncedDate(storeId);
    const startDate =
      lastSync ??
      (() => {
        const d = new Date();
        d.setMonth(d.getMonth() - DEFAULT_BACKFILL_MONTHS);
        return d.toISOString();
      })();
    const endDate = new Date().toISOString();

    const { summaries } = await getAllOrderSummaries(startDate, endDate, [
      "closed",
      "canceled",
    ]);

    if (summaries.length === 0) {
      await setLastSyncedDate(storeId, endDate);
      return NextResponse.json({ synced: 0, lastSyncedAt: endDate });
    }

    // Usa totais do sumário se a API já os retorna (evita N+1 de detalhes)
    const hasTotals = summaries.every(
      (s) => s.total !== undefined && s.total !== null
    );

    if (hasTotals) {
      await upsertOrders(
        summaries.map((o) => ({
          id: o.id,
          store_id: storeId,
          status: o.status,
          total: o.total ?? 0,
          created_at: o.created_at,
          updated_at: o.updated_at,
        }))
      );
    } else {
      const details = await getOrderDetailsBatch(summaries.map((o) => o.id));
      await upsertOrders(
        details.map((o) => ({
          id: o.id,
          store_id: storeId,
          status: o.status,
          total: o.total ?? 0,
          created_at: o.created_at,
          updated_at: o.updated_at,
        }))
      );
    }

    await setLastSyncedDate(storeId, endDate);

    return NextResponse.json({
      synced: summaries.length,
      lastSyncedAt: endDate,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("store_id") ?? DEFAULT_STORE_ID();
    const lastSyncedAt = await getLastSyncedDate(storeId);
    return NextResponse.json({ lastSyncedAt });
  } catch {
    return NextResponse.json({ lastSyncedAt: null });
  }
}

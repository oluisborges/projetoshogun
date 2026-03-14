import { NextResponse } from "next/server";
import { getAllOrderSummaries, getOrderDetailsBatch } from "@/lib/cardapioweb/client";
import { getLastSyncedDate, setLastSyncedDate, upsertOrders } from "@/lib/cardapioweb/db";

const DEFAULT_BACKFILL_MONTHS = 12;

export async function POST() {
  try {
    const lastSync = getLastSyncedDate();

    const startDate = lastSync
      ? new Date(lastSync).toISOString()
      : (() => {
          const d = new Date();
          d.setMonth(d.getMonth() - DEFAULT_BACKFILL_MONTHS);
          return d.toISOString();
        })();

    const endDate = new Date().toISOString();

    const { summaries } = await getAllOrderSummaries(startDate, endDate, ["closed", "canceled"]);

    if (summaries.length === 0) {
      setLastSyncedDate(endDate);
      return NextResponse.json({ synced: 0, lastSyncedAt: endDate });
    }

    const details = await getOrderDetailsBatch(summaries.map((o) => o.id));

    upsertOrders(
      details.map((o) => ({
        id: o.id,
        status: o.status,
        total: o.total ?? 0,
        created_at: o.created_at,
        updated_at: o.updated_at,
      }))
    );

    setLastSyncedDate(endDate);

    return NextResponse.json({ synced: details.length, lastSyncedAt: endDate });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  const lastSync = getLastSyncedDate();
  return NextResponse.json({ lastSyncedAt: lastSync });
}

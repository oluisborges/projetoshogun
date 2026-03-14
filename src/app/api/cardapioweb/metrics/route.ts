import { NextResponse } from "next/server";
import { computeMetrics } from "@/lib/cardapioweb/metrics";

const DEFAULT_STORE_ID = () =>
  process.env.CARDAPIOWEB_STORE_ID ?? "default";

function currentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const end = now.toISOString();
  return { start, end };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get("store_id") ?? DEFAULT_STORE_ID();

  const { start: defaultStart, end: defaultEnd } = currentMonthRange();
  const rawStart = searchParams.get("start") ?? defaultStart;
  const rawEnd = searchParams.get("end") ?? defaultEnd;

  const eighteenMonthsAgo = new Date();
  eighteenMonthsAgo.setMonth(eighteenMonthsAgo.getMonth() - 18);
  const startDate = new Date(
    Math.max(new Date(rawStart).getTime(), eighteenMonthsAgo.getTime())
  ).toISOString();
  const endDate =
    rawEnd.length === 10
      ? new Date(rawEnd + "T23:59:59").toISOString()
      : rawEnd;

  try {
    const metrics = await computeMetrics(storeId, startDate, endDate);
    return NextResponse.json(metrics);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

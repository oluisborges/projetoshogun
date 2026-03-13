import { NextResponse } from "next/server";
import { computeMetrics } from "@/lib/cardapioweb/metrics";

function currentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const end = now.toISOString();
  return { start, end };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const { start: defaultStart, end: defaultEnd } = currentMonthRange();
  const startDate = searchParams.get("start") ?? defaultStart;
  const endDate = searchParams.get("end") ?? defaultEnd;

  try {
    const metrics = await computeMetrics(startDate, endDate);
    return NextResponse.json(metrics);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

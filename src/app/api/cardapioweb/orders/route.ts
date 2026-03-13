import { NextResponse } from "next/server";
import { getOrders } from "@/lib/cardapioweb/client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") ?? 1);
  const limit = Number(searchParams.get("limit") ?? 20);

  try {
    const orders = await getOrders(page, limit);
    return NextResponse.json(orders);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

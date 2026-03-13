import { NextResponse } from "next/server";
import { getStoreInfo } from "@/lib/cardapioweb/client";

export async function GET() {
  try {
    const store = await getStoreInfo();
    return NextResponse.json(store);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

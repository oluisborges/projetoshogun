/**
 * CardápioWeb API Client
 * Base: https://integracao.sandbox.cardapioweb.com
 * Auth: Bearer token (Configurações → Integrações → API de Integração)
 */

export interface StoreCredentials {
  token: string;
  baseUrl?: string;
  partnerKey?: string;
}

function defaultCredentials(): StoreCredentials {
  const token = process.env.CARDAPIOWEB_TOKEN;
  if (!token) throw new Error("CARDAPIOWEB_TOKEN não configurado no .env.local");
  return {
    token,
    baseUrl:
      process.env.CARDAPIOWEB_BASE_URL ??
      "https://integracao.sandbox.cardapioweb.com",
    partnerKey: process.env.CARDAPIOWEB_PARTNER_KEY,
  };
}

function buildHeaders(creds: StoreCredentials): Record<string, string> {
  const headers: Record<string, string> = {
    "X-API-KEY": creds.token,
    "Content-Type": "application/json",
  };
  if (creds.partnerKey) headers["X-PARTNER-KEY"] = creds.partnerKey;
  return headers;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function request<T>(
  path: string,
  creds: StoreCredentials,
  noCache = false
): Promise<T> {
  const base = creds.baseUrl ?? "https://integracao.sandbox.cardapioweb.com";
  const delays = [15000, 30000, 60000]; // retry em caso de 429

  for (let attempt = 0; attempt <= delays.length; attempt++) {
    const res = await fetch(`${base}${path}`, {
      headers: buildHeaders(creds),
      next: noCache ? { revalidate: 0 } : { revalidate: 300 },
    });

    if (res.status === 429 && attempt < delays.length) {
      await sleep(delays[attempt]);
      continue;
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`CW API ${res.status} em ${path}: ${text}`);
    }

    return res.json() as Promise<T>;
  }

  throw new Error(`CW API: limite de requisições excedido em ${path}`);
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface OrderSummary {
  id: number;
  status: "waiting_confirmation" | "confirmed" | "closed" | "canceled" | string;
  order_type: "delivery" | "takeout" | "onsite" | "closed_table" | string;
  order_timing: "immediate" | "scheduled" | string;
  sales_channel: string;
  total?: number;
  created_at: string;
  updated_at: string;
}

export interface Pagination {
  current_page: number;
  total_pages: number;
  total_orders: number;
}

export interface OrderHistoryResponse {
  orders: OrderSummary[];
  pagination: Pagination;
}

export interface OrderDetail {
  id: number;
  display_id: number;
  external_display_id: string | null;
  merchant_id: number;
  status: string;
  order_type: string;
  order_timing: string;
  sales_channel: string;
  customer_origin: string | null;
  table_number: string | null;
  estimated_time: number | null;
  cancellation_reason: string | null;
  fiscal_document: string | null;
  observation: string | null;
  delivery_fee: number;
  service_fee: number;
  additional_fee: number;
  total: number;
  created_at: string;
  updated_at: string;
  schedule: unknown | null;
  customer: { id: number; name: string; phone: string } | null;
  delivery_address: unknown | null;
  items: OrderItem[];
  discounts: Discount[];
  payments: Payment[];
}

export interface OrderItem {
  id: number;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  options: unknown[];
}

export interface Discount {
  type: string;
  value: number;
  description: string;
}

export interface Payment {
  method: string;
  status: string;
  value: number;
}

// ─── Funções da API ───────────────────────────────────────────────────────────

/** Histórico de pedidos com paginação. start/end em ISO 8601. */
export async function getOrderHistory(
  startDate: string,
  endDate: string,
  page = 1,
  perPage = 100,
  status: string[] = ["closed", "canceled"],
  creds?: StoreCredentials
): Promise<OrderHistoryResponse> {
  const c = creds ?? defaultCredentials();
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
    page: String(page),
    per_page: String(perPage),
  });
  status.forEach((s) => params.append("status[]", s));

  return request<OrderHistoryResponse>(
    `/api/partner/v1/orders/history?${params}`,
    c,
    true
  );
}

/** Detalhe completo de um pedido (inclui customer e total). */
export async function getOrderDetail(
  orderId: number,
  creds?: StoreCredentials
): Promise<OrderDetail> {
  const c = creds ?? defaultCredentials();
  return request<OrderDetail>(`/api/partner/v1/orders/${orderId}`, c, true);
}

/** Busca TODAS as páginas de um período e retorna a lista completa. */
export async function getAllOrderSummaries(
  startDate: string,
  endDate: string,
  status: string[] = ["closed", "canceled"],
  creds?: StoreCredentials
): Promise<{ summaries: OrderSummary[]; total: number }> {
  const c = creds ?? defaultCredentials();
  const first = await getOrderHistory(startDate, endDate, 1, 100, status, c);
  const allSummaries = [...first.orders];
  const totalPages = first.pagination.total_pages;

  if (totalPages > 1) {
    const pages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
    const results = await Promise.all(
      pages.map((p) => getOrderHistory(startDate, endDate, p, 100, status, c))
    );
    results.forEach((r) => allSummaries.push(...r.orders));
  }

  return { summaries: allSummaries, total: first.pagination.total_orders };
}

/** Busca detalhes de múltiplos pedidos em paralelo (máx 50 simultâneos). */
export async function getOrderDetailsBatch(
  orderIds: number[],
  creds?: StoreCredentials
): Promise<OrderDetail[]> {
  const c = creds ?? defaultCredentials();
  const CONCURRENCY = 50;
  const results: OrderDetail[] = [];

  for (let i = 0; i < orderIds.length; i += CONCURRENCY) {
    const chunk = orderIds.slice(i, i + CONCURRENCY);
    const details = await Promise.all(
      chunk.map((id) => getOrderDetail(id, c))
    );
    results.push(...details);
  }

  return results;
}

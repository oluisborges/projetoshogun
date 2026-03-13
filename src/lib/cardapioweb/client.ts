/**
 * CardápioWeb API Client
 * Docs: https://cardapioweb.stoplight.io/docs/api/gr82prcl4v2jr-introducao
 *
 * Autenticação: token Bearer gerado em Configurações → Integrações → API de Integração
 */

const BASE_URL = "https://api.cardapioweb.com";

function getHeaders() {
  const token = process.env.CARDAPIOWEB_TOKEN;
  if (!token) throw new Error("CARDAPIOWEB_TOKEN não configurado no .env.local");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: getHeaders(),
    next: { revalidate: 300 }, // cache por 5 min (Next.js fetch cache)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CardápioWeb API erro ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface StoreInfo {
  id: number;
  name: string;
  slug: string;
  address: string;
  phone: string;
  logo: string;
  instagram: string;
  openingHours: OpeningHour[];
  paymentMethods: string[];
}

export interface OpeningHour {
  dayOfWeek: string;
  open: string;
  close: string;
}

export interface Catalog {
  categories: Category[];
}

export interface Category {
  id: number;
  name: string;
  description: string;
  products: Product[];
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  promotionalPrice: number | null;
  image: string | null;
  available: boolean;
  addons: Addon[];
}

export interface Addon {
  id: number;
  name: string;
  required: boolean;
  min: number;
  max: number;
  options: AddonOption[];
}

export interface AddonOption {
  id: number;
  name: string;
  price: number;
}

export interface Order {
  id: string;
  status: string;
  createdAt: string;
  total: number;
  customer: {
    name: string;
    phone: string;
  };
  items: OrderItem[];
}

export interface OrderItem {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

// ─── Métodos da API ───────────────────────────────────────────────────────────

const storeId = () => {
  const id = process.env.CARDAPIOWEB_STORE_ID;
  if (!id) throw new Error("CARDAPIOWEB_STORE_ID não configurado no .env.local");
  return id;
};

/** Retorna informações da loja: endereço, horários, pagamentos, etc. */
export async function getStoreInfo(): Promise<StoreInfo> {
  return request<StoreInfo>(`/v1/stores/${storeId()}`);
}

/** Retorna o catálogo completo: categorias, produtos e complementos. */
export async function getCatalog(): Promise<Catalog> {
  return request<Catalog>(`/v1/stores/${storeId()}/catalog`);
}

/** Lista pedidos com paginação. */
export async function getOrders(page = 1, limit = 20): Promise<Order[]> {
  return request<Order[]>(
    `/v1/stores/${storeId()}/orders?page=${page}&limit=${limit}`
  );
}

/** Retorna um pedido específico pelo ID. */
export async function getOrder(orderId: string): Promise<Order> {
  return request<Order>(`/v1/stores/${storeId()}/orders/${orderId}`);
}

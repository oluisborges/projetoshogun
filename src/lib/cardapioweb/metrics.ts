/**
 * Cálculo de métricas de negócio a partir dos pedidos CardápioWeb.
 *
 * Estratégia para novos vs recorrentes:
 *   - Buscamos o histórico do período ANTERIOR (mesma duração) para montar
 *     uma lista de customer IDs já conhecidos.
 *   - Se o customer.id do período atual NÃO existia antes → novo cliente.
 *   - Se já existia → recorrente.
 */

import {
  getAllOrderSummaries,
  getOrderDetailsBatch,
  type OrderDetail,
} from "./client";

export interface DashboardMetrics {
  totalOrders: number;
  revenue: number;
  averageTicket: number;
  newCustomers: number;
  recurringCustomers: number;
  periodStart: string;
  periodEnd: string;
  fetchedAt: string;
}

function subtractDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function periodDurationDays(start: string, end: string): number {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export async function computeMetrics(
  startDate: string,
  endDate: string
): Promise<DashboardMetrics> {
  const durationDays = periodDurationDays(startDate, endDate);

  // Período anterior (mesma duração) para identificar clientes conhecidos
  const prevEnd = subtractDays(startDate, 1);
  const prevStart = subtractDays(prevEnd, durationDays - 1);

  // Busca resumos dos dois períodos em paralelo (apenas closed)
  const [currentResult, previousResult] = await Promise.all([
    getAllOrderSummaries(startDate, endDate, ["closed"]),
    getAllOrderSummaries(prevStart, prevEnd, ["closed"]),
  ]);

  // Busca detalhes completos dos dois períodos em paralelo
  const currentIds = currentResult.summaries.map((o) => o.id);
  const previousIds = previousResult.summaries.map((o) => o.id);

  const [currentDetails, previousDetails] = await Promise.all([
    getOrderDetailsBatch(currentIds),
    getOrderDetailsBatch(previousIds),
  ]);

  // IDs de clientes que compraram no período anterior
  const previousCustomerIds = new Set(
    previousDetails
      .map((o) => o.customer?.id)
      .filter((id): id is number => id != null)
  );

  // Métricas do período atual
  const closedOrders = currentDetails.filter((o) => o.status === "closed");

  const revenue = closedOrders.reduce((sum, o) => sum + (o.total ?? 0), 0);
  const totalOrders = closedOrders.length;
  const averageTicket = totalOrders > 0 ? revenue / totalOrders : 0;

  // Clientes únicos no período atual
  const currentCustomerMap = new Map<number, true>();
  closedOrders.forEach((o) => {
    if (o.customer?.id != null) currentCustomerMap.set(o.customer.id, true);
  });

  let newCustomers = 0;
  let recurringCustomers = 0;

  currentCustomerMap.forEach((_, customerId) => {
    if (previousCustomerIds.has(customerId)) {
      recurringCustomers++;
    } else {
      newCustomers++;
    }
  });

  return {
    totalOrders,
    revenue,
    averageTicket,
    newCustomers,
    recurringCustomers,
    periodStart: startDate,
    periodEnd: endDate,
    fetchedAt: new Date().toISOString(),
  };
}

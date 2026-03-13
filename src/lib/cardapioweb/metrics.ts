/**
 * Cálculo de métricas de negócio a partir dos pedidos CardápioWeb.
 *
 * Novo cliente    = nunca comprou na loja antes do período selecionado.
 * Recorrente      = comprou pelo menos 1x antes do período selecionado.
 *
 * Estratégia: buscamos TODO o histórico disponível ANTES do período
 * selecionado (até 3 anos atrás, em janelas de 6 meses conforme limite da API).
 * O histórico é cacheado por 1 hora pois dados antigos raramente mudam.
 */

import { getAllOrderSummaries, getOrderDetailsBatch } from "./client";
import { cachedFetch } from "./cache";

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

/** Divide um intervalo grande em janelas de no máximo 150 dias (~5 meses). */
function splitIntoWindows(
  from: Date,
  to: Date
): Array<{ start: string; end: string }> {
  const WINDOW_DAYS = 150;
  const windows: Array<{ start: string; end: string }> = [];
  let cursor = new Date(from);

  while (cursor < to) {
    const windowEnd = new Date(cursor);
    windowEnd.setDate(windowEnd.getDate() + WINDOW_DAYS);
    if (windowEnd > to) windowEnd.setTime(to.getTime());

    windows.push({
      start: cursor.toISOString(),
      end: windowEnd.toISOString(),
    });

    cursor = new Date(windowEnd);
    cursor.setDate(cursor.getDate() + 1);
  }

  return windows;
}

/**
 * Retorna o conjunto de customer IDs que compraram ANTES de `beforeDate`.
 * Busca até 3 anos de histórico. Resultado cacheado por 1 hora.
 */
async function getHistoricalCustomerIds(
  beforeDate: string
): Promise<Set<number>> {
  const cacheKey = `historical-customers:${beforeDate.slice(0, 10)}`;

  return cachedFetch(
    cacheKey,
    async () => {
      const periodEnd = new Date(beforeDate);
      periodEnd.setDate(periodEnd.getDate() - 1);

      const periodStart = new Date(beforeDate);
      periodStart.setFullYear(periodStart.getFullYear() - 3);

      if (periodStart >= periodEnd) return new Set<number>();

      const windows = splitIntoWindows(periodStart, periodEnd);

      // Busca todos os resumos de pedidos em todas as janelas
      const allSummaryResults = await Promise.all(
        windows.map((w) => getAllOrderSummaries(w.start, w.end, ["closed"]))
      );

      const allIds = allSummaryResults.flatMap((r) =>
        r.summaries.map((o) => o.id)
      );

      if (allIds.length === 0) return new Set<number>();

      // Busca detalhes para extrair customer.id
      const details = await getOrderDetailsBatch(allIds);

      const customerIds = new Set<number>();
      details.forEach((o) => {
        if (o.customer?.id != null) customerIds.add(o.customer.id);
      });

      return customerIds;
    },
    60 * 60 * 1000 // 1 hora de cache para histórico
  );
}

export async function computeMetrics(
  startDate: string,
  endDate: string
): Promise<DashboardMetrics> {
  // Busca pedidos do período atual e histórico de clientes em paralelo
  const [currentResult, historicalCustomerIds] = await Promise.all([
    getAllOrderSummaries(startDate, endDate, ["closed"]),
    getHistoricalCustomerIds(startDate),
  ]);

  const currentIds = currentResult.summaries.map((o) => o.id);
  const currentDetails = await getOrderDetailsBatch(currentIds);
  const closedOrders = currentDetails.filter((o) => o.status === "closed");

  // Métricas financeiras
  const revenue = closedOrders.reduce((sum, o) => sum + (o.total ?? 0), 0);
  const totalOrders = closedOrders.length;
  const averageTicket = totalOrders > 0 ? revenue / totalOrders : 0;

  // Clientes únicos no período atual
  const uniqueCurrentCustomers = new Set(
    closedOrders
      .map((o) => o.customer?.id)
      .filter((id): id is number => id != null)
  );

  let newCustomers = 0;
  let recurringCustomers = 0;

  uniqueCurrentCustomers.forEach((customerId) => {
    if (historicalCustomerIds.has(customerId)) {
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

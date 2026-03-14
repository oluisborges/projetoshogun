import { getAllOrderSummaries, getOrderDetailsBatch, OrderSummary } from "./client";

export interface DashboardMetrics {
  totalOrders: number;
  revenue: number;
  averageTicket: number;
  periodStart: string;
  periodEnd: string;
  fetchedAt: string;
}

export async function computeMetrics(
  startDate: string,
  endDate: string
): Promise<DashboardMetrics> {
  const { summaries } = await getAllOrderSummaries(startDate, endDate, ["closed"]);

  // Usa total do summary quando disponível; só busca detalhes dos que não têm
  const withTotal: OrderSummary[] = summaries.filter((o) => o.total != null);
  const withoutTotal: OrderSummary[] = summaries.filter((o) => o.total == null);

  const details = withoutTotal.length > 0
    ? await getOrderDetailsBatch(withoutTotal.map((o) => o.id))
    : [];

  const revenueFromSummaries = withTotal.reduce((sum, o) => sum + o.total!, 0);
  const revenueFromDetails = details.reduce((sum, o) => sum + (o.total ?? 0), 0);
  const revenue = revenueFromSummaries + revenueFromDetails;
  const totalOrders = summaries.length;

  return {
    totalOrders,
    revenue,
    averageTicket: totalOrders > 0 ? revenue / totalOrders : 0,
    periodStart: startDate,
    periodEnd: endDate,
    fetchedAt: new Date().toISOString(),
  };
}

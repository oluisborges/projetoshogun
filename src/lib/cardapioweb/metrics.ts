import { getAllOrderSummaries, getOrderDetailsBatch } from "./client";

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
  const details = await getOrderDetailsBatch(summaries.map((o) => o.id));
  const closed = details.filter((o) => o.status === "closed");

  const revenue = closed.reduce((sum, o) => sum + (o.total ?? 0), 0);
  const totalOrders = closed.length;

  return {
    totalOrders,
    revenue,
    averageTicket: totalOrders > 0 ? revenue / totalOrders : 0,
    periodStart: startDate,
    periodEnd: endDate,
    fetchedAt: new Date().toISOString(),
  };
}

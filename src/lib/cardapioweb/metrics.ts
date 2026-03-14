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

  // Se a API retornar total no sumário, usa direto — sem requests adicionais.
  // Caso contrário, busca os detalhes individuais.
  const hasTotals = summaries.length === 0 || summaries[0].total !== undefined;

  let revenue = 0;
  let totalOrders = summaries.length;

  if (hasTotals) {
    revenue = summaries.reduce((sum, o) => sum + (o.total ?? 0), 0);
  } else {
    const details = await getOrderDetailsBatch(summaries.map((o) => o.id));
    const closed = details.filter((o) => o.status === "closed");
    totalOrders = closed.length;
    revenue = closed.reduce((sum, o) => sum + (o.total ?? 0), 0);
  }

  return {
    totalOrders,
    revenue,
    averageTicket: totalOrders > 0 ? revenue / totalOrders : 0,
    periodStart: startDate,
    periodEnd: endDate,
    fetchedAt: new Date().toISOString(),
  };
}

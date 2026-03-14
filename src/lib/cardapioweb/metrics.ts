import { getAllOrderSummaries } from "./client";

export interface DashboardMetrics {
  totalOrders: number;
  periodStart: string;
  periodEnd: string;
  fetchedAt: string;
}

export async function computeMetrics(
  startDate: string,
  endDate: string
): Promise<DashboardMetrics> {
  const { summaries } = await getAllOrderSummaries(startDate, endDate, ["closed"]);

  return {
    totalOrders: summaries.length,
    periodStart: startDate,
    periodEnd: endDate,
    fetchedAt: new Date().toISOString(),
  };
}

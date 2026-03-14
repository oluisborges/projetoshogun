import db, { getLastSyncedDate } from "./db";

export interface DashboardMetrics {
  totalOrders: number;
  revenue: number;
  averageTicket: number;
  periodStart: string;
  periodEnd: string;
  fetchedAt: string;
  lastSyncedAt: string | null;
}

export function computeMetrics(
  startDate: string,
  endDate: string
): DashboardMetrics {
  const row = db
    .prepare(
      `SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as revenue
       FROM orders
       WHERE status = 'closed'
         AND created_at >= ?
         AND created_at <= ?`
    )
    .get(startDate, endDate) as { count: number; revenue: number };

  const totalOrders = row.count;
  const revenue = row.revenue;

  return {
    totalOrders,
    revenue,
    averageTicket: totalOrders > 0 ? revenue / totalOrders : 0,
    periodStart: startDate,
    periodEnd: endDate,
    fetchedAt: new Date().toISOString(),
    lastSyncedAt: getLastSyncedDate(),
  };
}

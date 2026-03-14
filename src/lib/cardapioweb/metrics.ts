import { neon } from "@neondatabase/serverless";
import { getLastSyncedDate } from "./db";

const sql = neon(process.env.DATABASE_URL!);

export interface DashboardMetrics {
  totalOrders: number;
  revenue: number;
  averageTicket: number;
  periodStart: string;
  periodEnd: string;
  fetchedAt: string;
  lastSyncedAt: string | null;
}

export async function computeMetrics(
  storeId: string,
  startDate: string,
  endDate: string
): Promise<DashboardMetrics> {
  const rows = await sql`
    SELECT
      COUNT(*)::int                    AS count,
      COALESCE(SUM(total), 0)::float8  AS revenue
    FROM orders
    WHERE store_id  = ${storeId}
      AND status    = 'closed'
      AND created_at >= ${startDate}
      AND created_at <= ${endDate}
  `;

  const totalOrders = rows[0].count as number;
  const revenue = rows[0].revenue as number;

  return {
    totalOrders,
    revenue,
    averageTicket: totalOrders > 0 ? revenue / totalOrders : 0,
    periodStart: startDate,
    periodEnd: endDate,
    fetchedAt: new Date().toISOString(),
    lastSyncedAt: await getLastSyncedDate(storeId),
  };
}

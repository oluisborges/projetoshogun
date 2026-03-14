import { unstable_cache } from "next/cache";
import { computeMetrics } from "@/lib/cardapioweb/metrics";
import DateRangeForm from "./DateRangeForm";

const getCachedMetrics = unstable_cache(
  (startDate: string, endDate: string) => computeMetrics(startDate, endDate),
  ["cardapioweb-metrics"],
  { revalidate: 5 * 60 } // 5 minutos
);

interface PageProps {
  searchParams: { start?: string; end?: string };
}

function currentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const end = now.toISOString().slice(0, 10);
  return { start, end };
}

export default async function CardapioWebPage({ searchParams }: PageProps) {
  const { start: defaultStart, end: defaultEnd } = currentMonthRange();
  const startDate = searchParams.start ?? defaultStart;
  const endDate = searchParams.end ?? defaultEnd;

  // Limite máximo de 18 meses atrás
  const eighteenMonthsAgo = new Date();
  eighteenMonthsAgo.setMonth(eighteenMonthsAgo.getMonth() - 18);
  const clampedStart = new Date(
    Math.max(new Date(startDate).getTime(), eighteenMonthsAgo.getTime())
  )
    .toISOString()
    .slice(0, 10);

  let metrics = null;
  let error: string | null = null;

  try {
    metrics = await getCachedMetrics(
      new Date(clampedStart).toISOString(),
      new Date(endDate + "T23:59:59").toISOString()
    );
  } catch (err) {
    error = err instanceof Error ? err.message : "Erro ao carregar métricas";
  }

  const fmt = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <main style={{ maxWidth: 1000, margin: "40px auto", padding: "0 24px" }}>
      <a href="/" style={{ color: "#666", fontSize: 14, textDecoration: "none" }}>
        ← Voltar
      </a>
      <h1 style={{ marginTop: 16, marginBottom: 4 }}>CardápioWeb</h1>
      <p style={{ color: "#888", fontSize: 14, marginBottom: 24 }}>
        Dashboard de performance
      </p>

      <DateRangeForm startDate={startDate} endDate={endDate} />

      {error && (
        <div
          style={{
            background: "#fee2e2",
            border: "1px solid #fca5a5",
            borderRadius: 8,
            padding: 16,
            marginBottom: 24,
            color: "#dc2626",
          }}
        >
          <strong>Erro:</strong> {error}
        </div>
      )}

      {metrics && (
        <>
          <div
            style={{
              display: "grid",
              gap: 16,
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              marginBottom: 8,
            }}
          >
            <KpiCard
              label="Pedidos"
              value={String(metrics.totalOrders)}
              color="#2563eb"
            />
            <KpiCard
              label="Faturamento"
              value={fmt(metrics.revenue)}
              color="#16a34a"
            />
            <KpiCard
              label="Ticket médio"
              value={fmt(metrics.averageTicket)}
              color="#9333ea"
            />
            <KpiCard
              label="Novos clientes"
              value={String(metrics.newCustomers)}
              color="#ea580c"
            />
            <KpiCard
              label="Clientes recorrentes"
              value={String(metrics.recurringCustomers)}
              color="#0891b2"
            />
          </div>

          <p style={{ color: "#aaa", fontSize: 12, textAlign: "right", marginTop: 8 }}>
            Atualizado em {new Date(metrics.fetchedAt).toLocaleString("pt-BR")}
            {" · "}
            Recorrente = comprou pelo menos 1x antes do período · Novo = nunca comprou antes
          </p>
        </>
      )}
    </main>
  );
}

function KpiCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e5e5",
        borderRadius: 12,
        padding: "20px 24px",
        borderTop: `4px solid ${color}`,
      }}
    >
      <p style={{ margin: "0 0 8px", color: "#666", fontSize: 13 }}>{label}</p>
      <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color }}>{value}</p>
    </div>
  );
}

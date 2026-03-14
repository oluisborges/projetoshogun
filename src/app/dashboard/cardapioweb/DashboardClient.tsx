"use client";

import { useState } from "react";
import type { DashboardMetrics } from "@/lib/cardapioweb/metrics";

type Preset = "this_month" | "last_month" | "last_7d" | "last_30d";

function getPresetDates(preset: Preset): { start: string; end: string } {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  if (preset === "this_month")
    return { start: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), end: fmt(now) };
  if (preset === "last_month")
    return {
      start: fmt(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
      end: fmt(new Date(now.getFullYear(), now.getMonth(), 0)),
    };
  if (preset === "last_7d")
    return { start: fmt(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)), end: fmt(now) };
  return { start: fmt(new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000)), end: fmt(now) };
}

function currentMonthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

const btnStyle: React.CSSProperties = {
  padding: "6px 12px",
  borderRadius: 6,
  border: "1px solid #d1d5db",
  background: "#f9fafb",
  cursor: "pointer",
  fontSize: 13,
};

export default function DashboardClient() {
  const today = new Date().toISOString().slice(0, 10);
  const [start, setStart] = useState(currentMonthStart());
  const [end, setEnd] = useState(today);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(startDate: string, endDate: string) {
    setLoading(true);
    setError(null);
    setMetrics(null);
    try {
      const res = await fetch(`/api/cardapioweb/metrics?start=${startDate}&end=${endDate}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao carregar métricas");
      setMetrics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar métricas");
    } finally {
      setLoading(false);
    }
  }

  function handlePreset(preset: Preset) {
    const { start: s, end: e } = getPresetDates(preset);
    setStart(s);
    setEnd(e);
    load(s, e);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    load(start, end);
  }

  return (
    <>
      <div
        style={{
          background: "#fff",
          border: "1px solid #e5e5e5",
          borderRadius: 12,
          padding: "16px 20px",
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {(["this_month", "last_month", "last_7d", "last_30d"] as Preset[]).map((p) => (
            <button key={p} style={btnStyle} onClick={() => handlePreset(p)} disabled={loading}>
              {p === "this_month" ? "Mês atual" : p === "last_month" ? "Mês passado" : p === "last_7d" ? "Últimos 7 dias" : "Últimos 30 dias"}
            </button>
          ))}
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
            Início
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 14 }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
            Fim
            <input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 14 }}
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "7px 20px",
              borderRadius: 6,
              border: "none",
              background: loading ? "#93c5fd" : "#2563eb",
              color: "#fff",
              fontWeight: 600,
              fontSize: 14,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Carregando…" : "Filtrar"}
        </button>
        </form>
      </div>

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

      {!metrics && !loading && !error && (
        <p style={{ color: "#aaa", fontSize: 14, textAlign: "center", marginTop: 40 }}>
          Selecione um período e clique em <strong>Filtrar</strong> para carregar os dados.
        </p>
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
            <KpiCard label="Pedidos" value={String(metrics.totalOrders)} color="#2563eb" />
          </div>

          <p style={{ color: "#aaa", fontSize: 12, textAlign: "right", marginTop: 8 }}>
            Atualizado em {new Date(metrics.fetchedAt).toLocaleString("pt-BR")}
          </p>
        </>
      )}
    </>
  );
}

function KpiCard({ label, value, color }: { label: string; value: string; color: string }) {
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

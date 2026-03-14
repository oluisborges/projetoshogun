"use client";

import { useState, useEffect } from "react";
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
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/cardapioweb/sync")
      .then((r) => r.json())
      .then((d) => setLastSyncedAt(d.lastSyncedAt ?? null))
      .catch(() => null);
  }, []);

  async function load(startDate: string, endDate: string) {
    setLoading(true);
    setError(null);
    setMetrics(null);
    try {
      const res = await fetch(`/api/cardapioweb/metrics?start=${startDate}&end=${endDate}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao carregar métricas");
      setMetrics(data);
      setLastSyncedAt(data.lastSyncedAt ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar métricas");
    } finally {
      setLoading(false);
    }
  }

  async function sync() {
    setSyncing(true);
    setSyncStatus(null);
    setError(null);
    try {
      const res = await fetch("/api/cardapioweb/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao sincronizar");
      setSyncStatus(`${data.synced} pedido(s) sincronizados`);
      setLastSyncedAt(data.lastSyncedAt);
      // Recarrega métricas do período atual após sync
      await load(start, end);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao sincronizar");
    } finally {
      setSyncing(false);
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

  const fmt = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <>
      {/* Barra de sincronização */}
      <div
        style={{
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: 10,
          padding: "12px 16px",
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={sync}
          disabled={syncing || loading}
          style={{
            padding: "6px 16px",
            borderRadius: 6,
            border: "none",
            background: syncing ? "#86efac" : "#16a34a",
            color: "#fff",
            fontWeight: 600,
            fontSize: 13,
            cursor: syncing ? "not-allowed" : "pointer",
          }}
        >
          {syncing ? "Sincronizando…" : "Sincronizar pedidos"}
        </button>
        <span style={{ fontSize: 12, color: "#166534" }}>
          {syncStatus
            ? `✓ ${syncStatus}`
            : lastSyncedAt
            ? `Última sync: ${new Date(lastSyncedAt).toLocaleString("pt-BR")}`
            : "Nenhuma sincronização realizada ainda"}
        </span>
      </div>

      {/* Filtros */}
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
            <button key={p} style={btnStyle} onClick={() => handlePreset(p)} disabled={loading || syncing}>
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
            disabled={loading || syncing}
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
          {lastSyncedAt
            ? <>Selecione um período e clique em <strong>Filtrar</strong>.</>
            : <>Clique em <strong>Sincronizar pedidos</strong> primeiro para importar os dados.</>}
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
            <KpiCard label="Faturamento" value={fmt(metrics.revenue)} color="#16a34a" />
            <KpiCard label="Ticket médio" value={fmt(metrics.averageTicket)} color="#9333ea" />
          </div>

          <p style={{ color: "#aaa", fontSize: 12, textAlign: "right", marginTop: 8 }}>
            Dados do banco local · Atualizado em {new Date(metrics.fetchedAt).toLocaleString("pt-BR")}
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

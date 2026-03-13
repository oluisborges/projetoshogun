"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DateRangeForm({
  startDate,
  endDate,
}: {
  startDate: string;
  endDate: string;
}) {
  const router = useRouter();
  const [start, setStart] = useState(startDate);
  const [end, setEnd] = useState(endDate);

  function applyPreset(preset: "this_month" | "last_month" | "last_7d" | "last_30d") {
    const now = new Date();
    let s: Date, e: Date;

    if (preset === "this_month") {
      s = new Date(now.getFullYear(), now.getMonth(), 1);
      e = now;
    } else if (preset === "last_month") {
      s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      e = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (preset === "last_7d") {
      e = now;
      s = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    } else {
      e = now;
      s = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
    }

    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    setStart(fmt(s));
    setEnd(fmt(e));
    router.push(`?start=${fmt(s)}&end=${fmt(e)}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.push(`?start=${start}&end=${end}`);
  }

  const btnStyle: React.CSSProperties = {
    padding: "6px 12px",
    borderRadius: 6,
    border: "1px solid #d1d5db",
    background: "#f9fafb",
    cursor: "pointer",
    fontSize: 13,
  };

  return (
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
        <button style={btnStyle} onClick={() => applyPreset("this_month")}>
          Mês atual
        </button>
        <button style={btnStyle} onClick={() => applyPreset("last_month")}>
          Mês passado
        </button>
        <button style={btnStyle} onClick={() => applyPreset("last_7d")}>
          Últimos 7 dias
        </button>
        <button style={btnStyle} onClick={() => applyPreset("last_30d")}>
          Últimos 30 dias
        </button>
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
          style={{
            padding: "7px 20px",
            borderRadius: 6,
            border: "none",
            background: "#2563eb",
            color: "#fff",
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Filtrar
        </button>
      </form>
    </div>
  );
}

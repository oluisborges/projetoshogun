import Link from "next/link";

export default function Home() {
  return (
    <main style={{ maxWidth: 800, margin: "80px auto", padding: "0 24px" }}>
      <h1 style={{ fontSize: 32, marginBottom: 8 }}>Shogun Dashboard</h1>
      <p style={{ color: "#666", marginBottom: 40 }}>Agência de Performance</p>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
        <Link href="/dashboard/cardapioweb" style={cardStyle}>
          <h2 style={{ margin: "0 0 8px" }}>CardápioWeb</h2>
          <p style={{ margin: 0, color: "#666", fontSize: 14 }}>Catálogo, produtos e pedidos</p>
        </Link>

        <div style={{ ...cardStyle, opacity: 0.5, cursor: "not-allowed" }}>
          <h2 style={{ margin: "0 0 8px" }}>PrefiroDelivery</h2>
          <p style={{ margin: 0, color: "#666", fontSize: 14 }}>Em breve</p>
        </div>

        <div style={{ ...cardStyle, opacity: 0.5, cursor: "not-allowed" }}>
          <h2 style={{ margin: "0 0 8px" }}>Meta Ads</h2>
          <p style={{ margin: 0, color: "#666", fontSize: 14 }}>Em breve</p>
        </div>
      </div>
    </main>
  );
}

const cardStyle: React.CSSProperties = {
  display: "block",
  background: "#fff",
  border: "1px solid #e5e5e5",
  borderRadius: 12,
  padding: 24,
  textDecoration: "none",
  color: "inherit",
  transition: "box-shadow 0.2s",
};

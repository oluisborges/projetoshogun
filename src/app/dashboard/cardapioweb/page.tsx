import DashboardClient from "./DashboardClient";

export default function CardapioWebPage() {
  return (
    <main style={{ maxWidth: 1000, margin: "40px auto", padding: "0 24px" }}>
      <a href="/" style={{ color: "#666", fontSize: 14, textDecoration: "none" }}>
        ← Voltar
      </a>
      <h1 style={{ marginTop: 16, marginBottom: 4 }}>CardápioWeb</h1>
      <p style={{ color: "#888", fontSize: 14, marginBottom: 24 }}>
        Dashboard de performance
      </p>
      <DashboardClient />
    </main>
  );
}

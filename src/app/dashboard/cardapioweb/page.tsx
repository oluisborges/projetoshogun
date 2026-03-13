import { getCatalog, getStoreInfo } from "@/lib/cardapioweb/client";
import type { Product } from "@/lib/cardapioweb/client";

export default async function CardapioWebPage() {
  let storeInfo = null;
  let catalog = null;
  let error: string | null = null;

  try {
    [storeInfo, catalog] = await Promise.all([getStoreInfo(), getCatalog()]);
  } catch (err) {
    error = err instanceof Error ? err.message : "Erro ao carregar dados";
  }

  const totalProducts = catalog?.categories.reduce(
    (acc, cat) => acc + cat.products.length,
    0
  ) ?? 0;

  const availableProducts = catalog?.categories.reduce(
    (acc, cat) => acc + cat.products.filter((p: Product) => p.available).length,
    0
  ) ?? 0;

  return (
    <main style={{ maxWidth: 1000, margin: "40px auto", padding: "0 24px" }}>
      <a href="/" style={{ color: "#666", fontSize: 14, textDecoration: "none" }}>← Voltar</a>
      <h1 style={{ marginTop: 16, marginBottom: 4 }}>CardápioWeb</h1>

      {error && (
        <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, padding: 16, marginBottom: 24, color: "#dc2626" }}>
          <strong>Erro:</strong> {error}
        </div>
      )}

      {storeInfo && (
        <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <h2 style={{ margin: "0 0 12px" }}>{storeInfo.name}</h2>
          <p style={{ margin: "0 0 4px", color: "#666" }}>{storeInfo.address}</p>
          <p style={{ margin: 0, color: "#666" }}>{storeInfo.phone}</p>
        </div>
      )}

      {catalog && (
        <>
          <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 32 }}>
            <StatCard label="Categorias" value={catalog.categories.length} />
            <StatCard label="Total de produtos" value={totalProducts} />
            <StatCard label="Produtos ativos" value={availableProducts} />
          </div>

          <h2 style={{ marginBottom: 16 }}>Catálogo</h2>
          {catalog.categories.map((category) => (
            <div key={category.id} style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 12, padding: 24, marginBottom: 16 }}>
              <h3 style={{ margin: "0 0 16px" }}>{category.name}</h3>
              <div style={{ display: "grid", gap: 12 }}>
                {category.products.map((product) => (
                  <div key={product.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #f0f0f0" }}>
                    <div>
                      <p style={{ margin: "0 0 4px", fontWeight: 500 }}>{product.name}</p>
                      {product.description && (
                        <p style={{ margin: 0, color: "#666", fontSize: 13 }}>{product.description}</p>
                      )}
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 16 }}>
                      {product.promotionalPrice ? (
                        <>
                          <p style={{ margin: "0 0 2px", color: "#999", fontSize: 12, textDecoration: "line-through" }}>
                            R$ {product.price.toFixed(2)}
                          </p>
                          <p style={{ margin: 0, color: "#16a34a", fontWeight: 600 }}>
                            R$ {product.promotionalPrice.toFixed(2)}
                          </p>
                        </>
                      ) : (
                        <p style={{ margin: 0, fontWeight: 600 }}>R$ {product.price.toFixed(2)}</p>
                      )}
                      <span style={{ fontSize: 11, color: product.available ? "#16a34a" : "#dc2626" }}>
                        {product.available ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 12, padding: 20 }}>
      <p style={{ margin: "0 0 4px", color: "#666", fontSize: 13 }}>{label}</p>
      <p style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>{value}</p>
    </div>
  );
}

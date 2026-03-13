import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shogun - Dashboard de Performance",
  description: "Agência de performance — cardápios e Meta Ads",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f5f5f5" }}>
        {children}
      </body>
    </html>
  );
}

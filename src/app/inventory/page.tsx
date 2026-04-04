// Server Component — no "use client" directive
// Fetches product aggregate stats at request time so the header renders
// instantly (no loading flash) and is included in HTML for SEO/LCP.
import { dbGetProducts } from "@/lib/dbAdapter";
import InventoryClient from "./InventoryClient";

function fmtVN(n: number) { return new Intl.NumberFormat("vi-VN").format(n); }

export default async function InventoryPage() {
  // Best-effort SSR stats — if DB is unavailable the client will fill in from Zustand
  const products = await dbGetProducts().catch(() => []);

  const totalValue = products.reduce((s, p) => s + ((p.markdownPrice ?? p.price) || 0) * p.quantity, 0);
  const totalQty   = products.reduce((s, p) => s + p.quantity, 0);
  const onSale     = products.filter(p => !!p.markdownPrice).length;

  const initialStats = [
    { label: "SKU",       value: products.length, color: "var(--blue)" },
    { label: "Tổng tồn",  value: totalQty,         color: "#7c3aed" },
    {
      label: "Giá trị",
      value: totalValue >= 1e9
        ? `${(totalValue / 1e9).toFixed(2)}Tỷ`
        : `${fmtVN(Math.round(totalValue / 1e6))}M`,
      color: "var(--gold)",
    },
    { label: "Đang sale", value: onSale,            color: "#dc2626" },
  ];

  return <InventoryClient initialStats={initialStats} />;
}

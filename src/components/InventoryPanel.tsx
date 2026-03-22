"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/store/useStore";
import { Product } from "@/types";
import ProductFormModal from "./ProductFormModal";
import ExcelImportModal from "./ExcelImportModal";
import QRScannerModal from "./QRScannerModal";

function formatPrice(price?: number) {
  if (!price) return "—";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);
}

export default function InventoryPanel() {
  const { products, deleteProduct, fetchProducts } = useStore();
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("Tất cả");
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [showExcel, setShowExcel] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const categories = ["Tất cả", ...Array.from(new Set(products.map((p) => p.category)))];

  const filtered = products.filter((p) => {
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku || "").toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === "Tất cả" || p.category === filterCat;
    return matchSearch && matchCat;
  });

  const totalQuantity = products.reduce((s, p) => s + p.quantity, 0);
  const totalValue = products.reduce((s, p) => s + (p.price || 0) * p.quantity, 0);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await deleteProduct(id);
    setDeletingId(null);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Stats Bar */}
      <div className="flex gap-px border-b border-border bg-bg-card flex-shrink-0">
        {[
          { label: "Sản phẩm", value: products.length },
          { label: "Tổng SL", value: totalQuantity },
          { label: "Tổng giá trị", value: formatPrice(totalValue) },
          { label: "Danh mục", value: categories.length - 1 },
        ].map(({ label, value }) => (
          <div key={label} className="flex-1 px-6 py-4">
            <p className="text-[10px] tracking-[0.15em] text-text-muted uppercase">{label}</p>
            <p className="text-text-primary text-xl font-light mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border flex-shrink-0">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">⌕</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm sản phẩm, SKU..."
            className="w-full pl-9 pr-4 py-2 bg-bg-card border border-border text-text-primary text-sm rounded-sm focus:outline-none focus:border-gold/60 placeholder:text-text-muted transition-colors"
          />
        </div>

        {/* Category filter */}
        <div className="flex gap-1.5 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              className={`px-3 py-1.5 text-xs tracking-wider rounded-sm whitespace-nowrap transition-all duration-200 ${
                filterCat === cat
                  ? "bg-gold text-text-inverse font-medium"
                  : "bg-bg-card border border-border text-text-secondary hover:border-border-strong"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex gap-2 ml-auto flex-shrink-0">
          <button
            onClick={() => setShowQR(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs tracking-wider text-text-secondary border border-border hover:border-gold/50 hover:text-gold rounded-sm transition-all duration-200"
            title="Quét QR/Barcode"
          >
            <span>⊡</span> QR SCAN
          </button>
          <button
            onClick={() => setShowExcel(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs tracking-wider text-text-secondary border border-border hover:border-border-strong hover:text-text-primary rounded-sm transition-all duration-200"
          >
            <span>⊞</span> IMPORT EXCEL
          </button>
          <button
            onClick={() => { setEditProduct(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 text-xs tracking-wider font-medium text-text-inverse bg-gold hover:bg-gold-light rounded-sm transition-all duration-200"
          >
            <span>+</span> THÊM SẢN PHẨM
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-text-muted">
            <span className="text-5xl opacity-20">◫</span>
            <p className="text-sm">
              {products.length === 0 ? "Chưa có sản phẩm nào." : "Không tìm thấy kết quả."}
            </p>
            {products.length === 0 && (
              <button
                onClick={() => setShowForm(true)}
                className="px-5 py-2 text-xs tracking-wider border border-border hover:border-gold/50 hover:text-gold rounded-sm transition-all"
              >
                THÊM SẢN PHẨM ĐẦU TIÊN
              </button>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 bg-bg-surface z-10">
              <tr className="border-b border-border">
                {["Sản phẩm", "Danh mục", "SKU", "Số lượng", "Đơn giá", ""].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-[10px] tracking-[0.15em] text-text-muted uppercase font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filtered.map((p, i) => (
                  <motion.tr
                    key={p.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: i * 0.03, duration: 0.25 }}
                    className="border-b border-border/50 hover:bg-bg-card/60 transition-colors group"
                  >
                    {/* Product */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-sm overflow-hidden bg-bg-card border border-border flex-shrink-0">
                          {p.imagePath ? (
                            <img src={p.imagePath} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-text-muted text-xs">
                              ◫
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-text-primary text-sm font-light">{p.name}</p>
                          {p.notes && (
                            <p className="text-text-muted text-xs mt-0.5 truncate max-w-[200px]">{p.notes}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 text-xs bg-bg-card border border-border text-text-secondary rounded-sm">
                        {p.category}
                      </span>
                    </td>

                    {/* SKU */}
                    <td className="px-6 py-4 text-text-muted text-xs font-mono">
                      {p.sku || "—"}
                    </td>

                    {/* Quantity */}
                    <td className="px-6 py-4">
                      <span
                        className={`text-sm font-light ${
                          p.quantity === 0
                            ? "text-red-400"
                            : p.quantity <= 5
                            ? "text-yellow-400"
                            : "text-text-primary"
                        }`}
                      >
                        {p.quantity}
                      </span>
                    </td>

                    {/* Price */}
                    <td className="px-6 py-4 text-text-secondary text-sm font-light">
                      {formatPrice(p.price)}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setEditProduct(p); setShowForm(true); }}
                          className="px-3 py-1.5 text-xs tracking-wider text-text-secondary border border-border hover:border-gold/50 hover:text-gold rounded-sm transition-all"
                        >
                          SỬA
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          disabled={deletingId === p.id}
                          className="px-3 py-1.5 text-xs tracking-wider text-text-muted border border-border hover:border-red-500/50 hover:text-red-400 rounded-sm transition-all"
                        >
                          {deletingId === p.id ? "..." : "XÓA"}
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showForm && (
          <ProductFormModal
            product={editProduct}
            onClose={() => { setShowForm(false); setEditProduct(null); }}
          />
        )}
        {showExcel && <ExcelImportModal onClose={() => setShowExcel(false)} />}
        <QRScannerModal open={showQR} onClose={() => setShowQR(false)} />
      </AnimatePresence>
    </div>
  );
}

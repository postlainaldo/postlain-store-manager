"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import * as XLSX from "xlsx";
import { useStore } from "@/store/useStore";
import { ExcelRow } from "@/types";
import { resolveCategory, parseVietnamesePrice } from "@/lib/categoryMapping";

interface Props { onClose: () => void; }

// ─── Column header aliases ────────────────────────────────────────────────────
const FIELD_MAP: Record<string, string> = {
  // ── Name ──────────────────────────────────────────────────────────────────
  "tên": "name", "ten": "name", "name": "name",
  "tên/name": "name", "ten/name": "name",
  "tên sản phẩm": "name", "ten san pham": "name", "tên sp": "name",
  "sản phẩm": "name", "san pham": "name",
  "description": "name", "product name": "name", "product title": "name",
  "mô tả": "name", "mo ta": "name", "style name": "name",
  "style description": "name", "product description": "name",
  "tiêu đề": "name", "tieu de": "name", "item name": "name",
  "tên hàng": "name", "ten hang": "name", "hàng hóa": "name",
  // ── Category ──────────────────────────────────────────────────────────────
  "danh mục": "category", "danh muc": "category", "category": "category",
  "danh mục/category": "category", "danh muc/category": "category",
  "loại": "category", "loai": "category",
  "nhóm hàng": "category", "nhom hang": "category",
  "mh code": "category", "mc code": "category", "mh": "category", "mc": "category",
  "department": "category", "dept": "category", "ph/nhóm hàng": "category",
  "product category": "category", "item category": "category",
  "phân loại": "category", "phan loai": "category",
  // ── Quantity ──────────────────────────────────────────────────────────────
  "số lượng": "quantity", "so luong": "quantity", "quantity": "quantity",
  "sl": "quantity", "số lượng/quantity": "quantity", "so luong/quantity": "quantity",
  "qty": "quantity", "tồn kho": "quantity", "ton kho": "quantity", "stock": "quantity",
  "on hand": "quantity", "available": "quantity", "số lượng tồn": "quantity",
  // ── Full price ────────────────────────────────────────────────────────────
  "giá gốc": "price", "gia goc": "price", "full price": "price",
  "giá gốc/full price": "price", "gia goc/full price": "price",
  "giá niêm yết": "price", "gia niem yet": "price",
  "original price": "price", "regular price": "price", "list price": "price",
  "retail price": "price", "price": "price", "đơn giá": "price", "don gia": "price",
  "giá bán": "price", "gia ban": "price",
  // ── Markdown / sale price ─────────────────────────────────────────────────
  "giá giảm": "markdown", "gia giam": "markdown", "markdown": "markdown",
  "giá giảm/markdown": "markdown", "gia giam/markdown": "markdown",
  "sale price": "markdown", "discount price": "markdown",
  "promo price": "markdown", "selling price": "markdown",
  "giá khuyến mãi": "markdown", "gia khuyen mai": "markdown",
  "current price": "markdown", "actual price": "markdown",
  // ── SKU ───────────────────────────────────────────────────────────────────
  "sku": "sku", "mã sp": "sku", "ma sp": "sku", "barcode": "sku",
  "mã hàng": "sku", "ma hang": "sku", "mã sản phẩm": "sku", "ma san pham": "sku",
  "style": "sku", "style number": "sku", "style no": "sku", "style #": "sku",
  "item code": "sku", "product code": "sku", "article": "sku",
  "upc": "sku", "ean": "sku", "barcode number": "sku",
  "internal reference": "sku", "reference": "sku", "ref": "sku",
  // ── Notes ─────────────────────────────────────────────────────────────────
  "ghi chú": "notes", "ghi chu": "notes", "notes": "notes", "note": "notes",
  "ghi chú/notes": "notes", "ghi chu/notes": "notes",
  "remarks": "notes", "comment": "notes",
};

// Normalize: lowercase, collapse spaces, strip invisible chars
function normalizeKey(key: string): string {
  return key
    .toLowerCase()
    .replace(/\s+/g, " ")     // collapse multiple spaces
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // strip zero-width chars
    .trim();
}

// Fuzzy fallback: strip all spaces and slashes for partial matching
function fuzzyField(key: string): string | null {
  const norm = normalizeKey(key);
  // Direct lookup
  if (FIELD_MAP[norm]) return FIELD_MAP[norm];
  // Try stripping spaces inside
  const compact = norm.replace(/\s/g, "");
  for (const [k, v] of Object.entries(FIELD_MAP)) {
    if (k.replace(/\s/g, "") === compact) return v;
  }
  // Contains-based fallback for common keywords
  if (/tên|ten|name/.test(norm) && !/danh|loại|loai/.test(norm)) return "name";
  if (/danh\s*m[uụ]c|category|nhóm|nhom/.test(norm)) return "category";
  if (/s[oố]\s*l[uư][oợ]ng|quantity|qty|t[oồ]n/.test(norm)) return "quantity";
  if (/gi[aá]\s*gi[aả]m|markdown|sale\s*price/.test(norm)) return "markdown";
  if (/gi[aá]\s*g[oố]c|full\s*price|gi[aá]\s*b[aá]n|price/.test(norm)) return "price";
  if (/sku|barcode|m[aã]\s*(h[aà]ng|sp)/.test(norm)) return "sku";
  if (/ghi\s*ch[uú]|note/.test(norm)) return "notes";
  return null;
}

function mapRow(raw: Record<string, unknown>): ExcelRow {
  const mapped: ExcelRow = {};
  for (const [k, v] of Object.entries(raw)) {
    const field = fuzzyField(k) || normalizeKey(k);
    mapped[field] = v as string | number;
  }
  if (!mapped.name) mapped.name = "Sản phẩm chưa đặt tên";
  if (mapped.category) {
    const resolved = resolveCategory(String(mapped.category));
    mapped.category = resolved.category;
    if (resolved.productType && !mapped.productType) {
      mapped.productType = resolved.productType;
    }
  }
  if (!mapped.category) mapped.category = "Khác";
  return mapped;
}

const fmtVND = (v: unknown) => {
  const n = parseVietnamesePrice(v);
  if (n == null) return "—";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);
};

export default function ExcelImportModal({ onClose }: Props) {
  const { importProducts, fetchProducts } = useStore();
  const [rows, setRows] = useState<ExcelRow[]>([]);
  const [dragging, setDragging] = useState(false);
  const [filename, setFilename] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ updated: number; inserted: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const parseFile = useCallback((file: File) => {
    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target!.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
      setRows(raw.map(mapRow));
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleImport = async () => {
    setImporting(true);
    const now = new Date().toISOString();
    const validRows = rows.map((r) => ({
      id: `prod_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name:          String(r.name || "Sản phẩm"),
      category:      String(r.category || "Khác"),
      quantity:      Number(r.quantity) || 0,
      price:         parseVietnamesePrice(r.price) ?? undefined,
      markdownPrice: parseVietnamesePrice(r.markdown) ?? undefined,
      sku:           r.sku ? String(r.sku) : undefined,
      notes:         r.notes ? String(r.notes) : undefined,
      productType:   r.productType ? String(r.productType) : undefined,
      createdAt: now,
      updatedAt: now,
    }));
    const res = await fetch("/api/products/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validRows),
    });
    if (res.ok) {
      const data = await res.json();
      await fetchProducts();
      setResult({ updated: data.updated, inserted: data.inserted });
    }
    setImporting(false);
    setTimeout(onClose, 2000);
  };

  const HEADERS = ["name", "category", "quantity", "price", "markdown", "sku"];
  const LABELS: Record<string, string> = {
    name: "Tên sản phẩm", category: "Danh mục", quantity: "Số lượng",
    price: "Giá gốc", markdown: "Giá giảm", sku: "SKU",
  };

  // Count how many rows have each field populated
  const fieldCoverage = rows.length > 0
    ? HEADERS.map(h => ({
        h,
        pct: Math.round(rows.filter(r => r[h] != null && r[h] !== "").length / rows.length * 100),
      }))
    : [];

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div className="relative z-10 w-full max-w-4xl bg-white border border-border rounded shadow-2xl max-h-[90vh] flex flex-col"
        initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.97 }} transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border flex-shrink-0">
          <div>
            <p className="text-[10px] tracking-[0.2em] text-text-muted uppercase">Nhập từ file</p>
            <h2 className="text-text-primary font-light text-lg mt-0.5">Import Excel / CSV</h2>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-4">
          {/* Drop Zone */}
          <div
            className={`relative border-2 border-dashed rounded p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
              dragging ? "border-gold bg-gold/5" : rows.length > 0 ? "border-gold/40 bg-bg-card" : "border-border hover:border-gold/50 bg-bg-card"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) parseFile(f); }}
            onClick={() => fileRef.current?.click()}
          >
            {rows.length > 0 ? (
              <>
                <span className="text-gold text-2xl">✓</span>
                <p className="text-text-primary text-sm font-medium">{filename}</p>
                <p className="text-text-muted text-xs">{rows.length} sản phẩm đã đọc</p>
              </>
            ) : (
              <>
                <span className="text-3xl text-text-muted">⊕</span>
                <p className="text-text-primary text-sm">Kéo thả file Excel vào đây hoặc click để chọn</p>
                <p className="text-text-muted text-xs">Hỗ trợ .xlsx, .xls, .csv · Tự động nhận diện mã MH/MC · Đọc cả giá gốc và giá giảm</p>
              </>
            )}
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
              onChange={(e) => e.target.files?.[0] && parseFile(e.target.files[0])} />
          </div>

          {/* Format hint */}
          {rows.length === 0 && (
            <div className="bg-bg-card border border-border rounded p-4">
              <p className="text-[10px] tracking-[0.15em] text-text-muted uppercase mb-3">Cột nhận diện tự động</p>
              <div className="flex flex-wrap gap-2">
                {["Tên / Name", "Danh mục / Category", "Số lượng / Quantity",
                  "Giá Gốc / Full Price", "Giá Giảm / Markdown", "SKU", "Ghi chú / Notes"].map((h) => (
                  <span key={h} className="px-2 py-1 bg-white border border-border text-text-secondary text-xs rounded">
                    {h}
                  </span>
                ))}
              </div>
              <p className="text-[9px] text-text-muted mt-3">
                Mã MH12001–MH12006, MH13001–MH13018, MC14001–MC14092 được tự động chuyển sang tiếng Việt.
                Cả giá gốc và giá giảm đều được lưu.
              </p>
            </div>
          )}

          {/* Coverage bar + Preview */}
          {rows.length > 0 && (
            <>
              {/* Field coverage indicator */}
              <div className="grid grid-cols-6 gap-2">
                {fieldCoverage.map(({ h, pct }) => (
                  <div key={h} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-text-muted truncate">{LABELS[h]}</span>
                      <span className={`text-[9px] font-medium ${pct > 0 ? "text-gold" : "text-red-400"}`}>{pct}%</span>
                    </div>
                    <div className="h-1 bg-border rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: pct > 0 ? "#B8914A" : "#FCACA8" }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Preview table */}
              <div className="overflow-auto rounded border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-bg-card border-b border-border">
                      {HEADERS.map((h) => (
                        <th key={h} className="px-3 py-2.5 text-left text-[10px] tracking-[0.12em] text-text-muted uppercase font-medium whitespace-nowrap">
                          {LABELS[h]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 15).map((row, i) => (
                      <tr key={i} className="border-b border-border/40 hover:bg-bg-card transition-colors">
                        {HEADERS.map((h) => (
                          <td key={h} className="px-3 py-2 text-text-secondary text-xs max-w-[180px] truncate">
                            {h === "price" ? (
                              <span className={parseVietnamesePrice(row[h]) != null ? "text-text-primary" : "text-red-400"}>
                                {fmtVND(row[h])}
                              </span>
                            ) : h === "markdown" ? (
                              <span className={parseVietnamesePrice(row[h]) != null ? "text-gold" : "text-text-muted"}>
                                {fmtVND(row[h])}
                              </span>
                            ) : (
                              <span className={(!row[h] || row[h] === "—") ? "text-text-muted" : ""}>
                                {String(row[h] ?? "—")}
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {rows.length > 15 && (
                      <tr>
                        <td colSpan={HEADERS.length} className="px-3 py-2 text-text-muted text-xs text-center italic">
                          … và {rows.length - 15} sản phẩm nữa
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Summary note */}
              <p className="text-[10px] text-text-muted">
                Cả giá gốc và giá giảm sẽ được lưu cùng lúc vào mỗi sản phẩm.
              </p>
            </>
          )}
        </div>

        {rows.length > 0 && (
          <div className="flex gap-3 px-6 py-4 border-t border-border flex-shrink-0 bg-bg-card">
            <button onClick={onClose}
              className="flex-1 py-2.5 text-sm tracking-wider text-text-secondary border border-border hover:border-border-strong hover:text-text-primary rounded transition-all">
              HỦY
            </button>
            <button onClick={handleImport} disabled={importing || !!result}
              className="flex-1 py-2.5 text-sm tracking-wider font-medium bg-gold hover:bg-gold-light text-white rounded transition-all disabled:opacity-50">
              {result
                ? `✓ +${result.inserted} mới · cập nhật ${result.updated}`
                : importing ? "ĐANG XỬ LÝ..." : `IMPORT ${rows.length} SẢN PHẨM`}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

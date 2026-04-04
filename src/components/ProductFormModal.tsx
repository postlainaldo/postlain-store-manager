"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore, sel } from "@/store/useStore";
import { Product } from "@/types";
import { PRODUCT_TYPES, PRODUCT_GROUPS, PRODUCT_COLORS } from "@/lib/productTypes";
import { playSound } from "@/hooks/useSFX";

interface Props {
  product?: Product | null;
  onClose: () => void;
}

const CATEGORIES = [
  "Áo",
  "Quần",
  "Đầm/Váy",
  "Phụ kiện",
  "Giày dép",
  "Túi xách",
  "Trang sức",
  "Khác",
];

const emptyForm = {
  name: "",
  category: "Áo",
  quantity: 1,
  price: "" as string | number,
  markdownPrice: "" as string | number,
  sku: "",
  notes: "",
  imagePath: "",
  productType: "",
  size: "",
  color: "",
};

export default function ProductFormModal({ product, onClose }: Props) {
  const addProduct    = useStore(sel.addProduct);
  const updateProduct = useStore(sel.updateProduct);
  const [form, setForm] = useState({
    ...emptyForm,
    ...(product
      ? {
          name: product.name,
          category: product.category,
          quantity: product.quantity,
          price: product.price ?? "",
          markdownPrice: product.markdownPrice ?? "",
          sku: product.sku ?? "",
          notes: product.notes ?? "",
          imagePath: product.imagePath ?? "",
          productType: product.productType ?? "",
          size: product.size ?? "",
          color: product.color ?? "",
        }
      : {}),
  });
  const [imagePreview, setImagePreview] = useState<string>(product?.imagePath ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") { playSound("modalClose"); onClose(); } };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (res.ok) {
      const { path } = await res.json();
      setForm((f) => ({ ...f, imagePath: path }));
      setImagePreview(path);
    }
    setUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    playSound("tap");
    const now = new Date().toISOString();
    const productData = {
      ...form,
      price: form.price !== "" ? Number(form.price) : undefined,
      markdownPrice: form.markdownPrice !== "" ? Number(form.markdownPrice) : undefined,
      quantity: Number(form.quantity),
      productType: form.productType || undefined,
      size: form.size || undefined,
      color: form.color || undefined,
    };
    if (product) {
      await updateProduct({ ...product, ...productData, updatedAt: now });
    } else {
      await addProduct({
        id: `prod_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        ...productData,
        createdAt: now,
        updatedAt: now,
      });
    }
    setSaving(false);
    playSound("save");
    onClose();
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => { playSound("modalClose"); onClose(); }} />

      <motion.div
        className="relative z-10 w-full max-w-lg bg-bg-surface border border-border rounded-sm shadow-2xl"
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.97 }}
        transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <p className="text-[10px] tracking-[0.2em] text-text-muted uppercase">
              {product ? "Chỉnh sửa" : "Thêm mới"}
            </p>
            <h2 className="text-text-primary font-light text-lg mt-0.5">Sản phẩm</h2>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Image Upload */}
          <div>
            <label className="block text-[10px] tracking-[0.15em] text-text-muted uppercase mb-2">
              Hình ảnh
            </label>
            <div
              className="relative w-full h-40 border border-dashed border-border rounded-sm bg-bg-card flex items-center justify-center cursor-pointer hover:border-gold/50 transition-colors group overflow-hidden"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) handleImageUpload(file);
              }}
            >
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-text-muted group-hover:text-text-secondary transition-colors">
                  <span className="text-3xl">⊕</span>
                  <span className="text-xs tracking-wide">Kéo thả hoặc click để tải ảnh</span>
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
            />
          </div>

          {/* Name */}
          <div>
            <label className="block text-[10px] tracking-[0.15em] text-text-muted uppercase mb-2">
              Tên sản phẩm *
            </label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full bg-bg-card border border-border text-text-primary px-4 py-2.5 text-sm rounded-sm focus:outline-none focus:border-gold/60 transition-colors placeholder:text-text-muted"
              placeholder="VD: Áo linen oversize POSTLAIN"
            />
          </div>

          {/* Category + Quantity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] tracking-[0.15em] text-text-muted uppercase mb-2">
                Danh mục *
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full bg-bg-card border border-border text-text-primary px-4 py-2.5 text-sm rounded-sm focus:outline-none focus:border-gold/60 transition-colors"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] tracking-[0.15em] text-text-muted uppercase mb-2">
                Số lượng *
              </label>
              <input
                required
                type="number"
                min={0}
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) }))}
                className="w-full bg-bg-card border border-border text-text-primary px-4 py-2.5 text-sm rounded-sm focus:outline-none focus:border-gold/60 transition-colors"
              />
            </div>
          </div>

          {/* Product Type */}
          <div>
            <label className="block text-[10px] tracking-[0.15em] text-text-muted uppercase mb-2">
              Loại sản phẩm
            </label>
            <select
              value={form.productType}
              onChange={(e) => {
                const pt = e.target.value;
                const cfg = pt ? PRODUCT_TYPES[pt] : null;
                setForm((f) => ({ ...f, productType: pt, size: cfg?.hasSize ? f.size : "" }));
              }}
              className="w-full bg-bg-card border border-border text-text-primary px-4 py-2.5 text-sm rounded-sm focus:outline-none focus:border-gold/60 transition-colors"
            >
              <option value="">— Chọn loại —</option>
              {Object.entries(PRODUCT_GROUPS).map(([groupKey, group]) => (
                <optgroup key={groupKey} label={group.label}>
                  {Object.entries(PRODUCT_TYPES)
                    .filter(([, cfg]) => cfg.group === groupKey)
                    .map(([key, cfg]) => (
                      <option key={key} value={key}>{cfg.label}</option>
                    ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Size + Color */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] tracking-[0.15em] text-text-muted uppercase mb-2">
                Size
              </label>
              {form.productType && PRODUCT_TYPES[form.productType]?.hasSize ? (
                <select
                  value={form.size}
                  onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))}
                  className="w-full bg-bg-card border border-border text-text-primary px-4 py-2.5 text-sm rounded-sm focus:outline-none focus:border-gold/60 transition-colors"
                >
                  <option value="">— Chọn size —</option>
                  {(PRODUCT_TYPES[form.productType].shoeSizes ?? []).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              ) : (
                <input
                  value={form.size}
                  onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))}
                  className="w-full bg-bg-card border border-border text-text-primary px-4 py-2.5 text-sm rounded-sm focus:outline-none focus:border-gold/60 transition-colors placeholder:text-text-muted"
                  placeholder="S / M / L / XL"
                />
              )}
            </div>
            <div>
              <label className="block text-[10px] tracking-[0.15em] text-text-muted uppercase mb-2">
                Màu sắc
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PRODUCT_COLORS.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    title={label}
                    onClick={() => setForm((f) => ({ ...f, color: f.color === id ? "" : id }))}
                    className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                      form.color === id ? "border-white scale-110" : "border-transparent"
                    }`}
                    style={{ background: id }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Price + Markdown + SKU */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] tracking-[0.15em] text-text-muted uppercase mb-2">
                Giá gốc (VNĐ)
              </label>
              <input
                type="number"
                min={0}
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                className="w-full bg-bg-card border border-border text-text-primary px-4 py-2.5 text-sm rounded-sm focus:outline-none focus:border-gold/60 transition-colors placeholder:text-text-muted"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-[10px] tracking-[0.15em] text-text-muted uppercase mb-2">
                Giá giảm (VNĐ)
              </label>
              <input
                type="number"
                min={0}
                value={form.markdownPrice}
                onChange={(e) => setForm((f) => ({ ...f, markdownPrice: e.target.value }))}
                className="w-full bg-bg-card border border-border text-text-primary px-4 py-2.5 text-sm rounded-sm focus:outline-none focus:border-gold/60 transition-colors placeholder:text-text-muted"
                placeholder="0"
              />
            </div>
          </div>
          {/* SKU */}
          <div>
            <label className="block text-[10px] tracking-[0.15em] text-text-muted uppercase mb-2">
              SKU
            </label>
            <input
              value={form.sku}
              onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
              className="w-full bg-bg-card border border-border text-text-primary px-4 py-2.5 text-sm rounded-sm focus:outline-none focus:border-gold/60 transition-colors placeholder:text-text-muted"
              placeholder="PL-001"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[10px] tracking-[0.15em] text-text-muted uppercase mb-2">
              Ghi chú
            </label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full bg-bg-card border border-border text-text-primary px-4 py-2.5 text-sm rounded-sm focus:outline-none focus:border-gold/60 transition-colors placeholder:text-text-muted resize-none"
              placeholder="Thêm ghi chú..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-sm tracking-wider text-text-secondary border border-border hover:border-border-strong hover:text-text-primary rounded-sm transition-all duration-200"
            >
              HỦY
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 text-sm tracking-wider text-text-inverse bg-gold hover:bg-gold-light rounded-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {saving ? "ĐANG LƯU..." : product ? "CẬP NHẬT" : "THÊM MỚI"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

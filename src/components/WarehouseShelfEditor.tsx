"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, RoundedBox } from "@react-three/drei";
import { useStore } from "@/store/useStore";
import { WarehouseShelf } from "@/types";
import Product3DViewer from "./Product3DViewer";
import { motion, AnimatePresence } from "framer-motion";

const TIER_COLS = 5;
const TIER_ROWS = 5;

const BOX_COLORS: Record<string, string> = {
  "Giày nữ": "#C49A6C", "Giày nam": "#5A7888", "Bốt nữ": "#C4A080", "Bốt nam": "#6A8094",
  "Sandal nữ": "#D4A090", "Sandal nam": "#8890C4", "Giày trẻ em": "#8DC4A0",
  "Túi nữ": "#9B7060", "Túi nam": "#607080", "Phụ kiện": "#7A8B6B",
  "Trang sức": "#B8A045", "Chăm sóc giày": "#9A9080",
};

// ─── 3D Shelf Scene ────────────────────────────────────────────────────────────
function ShelfBox3D({ color, filled, x, y, z }: { color: string; filled: boolean; x: number; y: number; z: number }) {
  const [hovered, setHovered] = useState(false);
  const hex = color || "#C8BEB4";
  const r = parseInt(hex.slice(1,3),16)/255;
  const g = parseInt(hex.slice(3,5),16)/255;
  const b = parseInt(hex.slice(5,7),16)/255;

  return (
    <group position={[x, y, z]}>
      <RoundedBox
        args={[0.38, 0.28, 0.28]}
        radius={0.02}
        smoothness={3}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial
          color={filled ? [r, g, b] : [0.92, 0.90, 0.87]}
          roughness={filled ? 0.55 : 0.7}
          metalness={filled ? 0.05 : 0}
          opacity={filled ? 1 : 0.6}
          transparent={!filled}
        />
      </RoundedBox>
      {filled && (
        <RoundedBox args={[0.38, 0.04, 0.28]} radius={0.01} smoothness={2} position={[0, 0.16, 0]}>
          <meshStandardMaterial color={[r*0.85, g*0.85, b*0.85]} roughness={0.4} metalness={0.1} />
        </RoundedBox>
      )}
      {!filled && hovered && (
        <RoundedBox args={[0.38, 0.28, 0.28]} radius={0.02} smoothness={3}>
          <meshStandardMaterial color={[0.56, 0.72, 0.87]} transparent opacity={0.18} />
        </RoundedBox>
      )}
    </group>
  );
}

function ShelfFrame3D({ tiers, products, shelfType }: {
  tiers: (string | null)[][];
  products: { id: string; category: string }[];
  shelfType: "shoes" | "bags";
}) {
  const prodMap = new Map(products.map(p => [p.id, p]));
  const accentR = shelfType === "shoes" ? 0.35 : 0.60;
  const accentG = shelfType === "shoes" ? 0.47 : 0.44;
  const accentB = shelfType === "shoes" ? 0.60 : 0.31;

  const COLS = 5, ROWS = 5;
  const slotW = 0.42, slotH = 0.32, slotGap = 0.04;
  const boardH = 0.04;
  const totalW = COLS * (slotW + slotGap) - slotGap;
  const frameDepth = 0.32;

  return (
    <group>
      {/* Side uprights */}
      {[-totalW/2 - 0.06, totalW/2 + 0.06].map((bx, i) => (
        <group key={i}>
          <mesh position={[bx, (ROWS * (slotH + slotGap)) / 2, 0]}>
            <boxGeometry args={[0.05, ROWS * (slotH + slotGap) + 0.2, frameDepth + 0.06]} />
            <meshStandardMaterial color={[0.72, 0.68, 0.62]} roughness={0.5} metalness={0.1} />
          </mesh>
        </group>
      ))}

      {/* Tier boards + slot boxes */}
      {tiers.slice(0, ROWS).map((tier, ti) => {
        const boardY = ti * (slotH + slotGap) + boardH / 2;
        return (
          <group key={ti}>
            {/* Board */}
            <mesh position={[0, boardY - slotH/2 - boardH/2 - 0.01, 0]}>
              <boxGeometry args={[totalW + 0.12, boardH, frameDepth + 0.04]} />
              <meshStandardMaterial color={[accentR*0.7, accentG*0.7, accentB*0.7]} roughness={0.4} metalness={0.15} />
            </mesh>
            {/* Slots */}
            {Array.from({ length: COLS }, (_, col) => {
              return Array.from({ length: ROWS }, (_, rowI) => {
                const slotIdx = rowI * COLS + col;
                const pid = tier[slotIdx] ?? null;
                const prod = pid ? prodMap.get(pid) : null;
                const color = prod ? (BOX_COLORS[prod.category] || "#9A8878") : "";
                const cx = (col - (COLS-1)/2) * (slotW + slotGap);
                const cy = boardY + (rowI - (ROWS-1)/2) * (slotH + slotGap) + 0.06;
                return (
                  <ShelfBox3D key={`${ti}-${col}-${rowI}`}
                    color={color} filled={!!pid} x={cx} y={cy} z={0} />
                );
              });
            })}
          </group>
        );
      })}

      {/* Base */}
      <mesh position={[0, -0.12, 0]}>
        <boxGeometry args={[totalW + 0.24, 0.08, frameDepth + 0.12]} />
        <meshStandardMaterial color={[0.60, 0.56, 0.50]} roughness={0.5} metalness={0.1} />
      </mesh>
    </group>
  );
}

function Scene3D({ shelf, products }: { shelf: WarehouseShelf; products: { id: string; category: string }[] }) {
  return (
    <Canvas
      camera={{ position: [2.8, 2.2, 3.5], fov: 42 }}
      gl={{ antialias: true, alpha: true }}
      style={{ width: "100%", height: "100%" }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[4, 6, 4]} intensity={1.1} castShadow />
        <directionalLight position={[-3, 2, -2]} intensity={0.3} />
        <pointLight position={[0, 4, 2]} intensity={0.4} color="#F0E8D8" />
        <Environment preset="apartment" />
        <ShelfFrame3D tiers={shelf.tiers} products={products} shelfType={shelf.shelfType} />
        <OrbitControls
          enableZoom={true} enablePan={false}
          minPolarAngle={Math.PI * 0.1} maxPolarAngle={Math.PI * 0.75}
          minDistance={2.5} maxDistance={7}
          autoRotate={false}
        />
      </Suspense>
    </Canvas>
  );
}

// ─── Warehouse slot (2D grid) ──────────────────────────────────────────────────
function WarehouseSlot({ productId, shelfId, tierIndex, slotIndex }: {
  productId: string | null; shelfId: string; tierIndex: number; slotIndex: number;
}) {
  const { products, selectedProduct, placeInWarehouse } = useStore();
  const product = productId ? products.find(p => p.id === productId) : null;
  const isPlacementMode = !!selectedProduct;
  const canPlace = isPlacementMode && !product;
  const canRemove = !isPlacementMode && !!product;

  const handleClick = () => {
    if (canPlace && selectedProduct) placeInWarehouse(shelfId, tierIndex, slotIndex, selectedProduct.id);
    else if (canRemove) placeInWarehouse(shelfId, tierIndex, slotIndex, null);
  };

  const boxColor = product ? (BOX_COLORS[product.category] || "#9A8878") : null;

  return (
    <div
      onClick={handleClick}
      title={product
        ? `${product.name} (${product.category}) ×${product.quantity} — click gỡ`
        : isPlacementMode ? "Click để xếp vào đây" : ""}
      className={`relative flex-shrink-0 overflow-hidden select-none transition-all duration-100 ${
        (canPlace || canRemove) ? "cursor-pointer active:scale-95" : "cursor-default"
      } ${canPlace ? "slot-placement-pulse" : ""}`}
      style={{
        width: 52, height: 46,
        borderRadius: 6,
        border: product
          ? `1px solid ${boxColor}55`
          : isPlacementMode
          ? "1px solid rgba(99,179,237,0.55)"
          : "1px solid #E8E4DE",
        background: product
          ? `${boxColor}18`
          : isPlacementMode
          ? "rgba(235,248,255,0.8)"
          : "#F8F6F2",
        boxShadow: product ? `0 2px 6px ${boxColor}20` : "none",
      }}
    >
      {product ? (
        <>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: boxColor || "#B8914A", borderRadius: "6px 6px 0 0" }} />
          <div style={{
            position: "absolute", bottom: 1, left: 0, right: 0,
            display: "flex", alignItems: "center", justifyContent: "center", padding: "0 2px",
          }}>
            <span style={{ fontSize: 6, fontFamily: "monospace", color: `${boxColor}AA`, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%", textAlign: "center" }}>
              {product.sku || product.name.slice(0, 5).toUpperCase()}
            </span>
          </div>
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", paddingBottom: 8, paddingTop: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: boxColor || "#B8914A" }}>
              {product.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div
            style={{
              position: "absolute", inset: 0, opacity: 0, background: "rgba(220,38,38,0.12)",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "opacity 0.1s",
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "0")}
          >
            <span style={{ color: "#EF4444", fontSize: 18, fontWeight: 700, lineHeight: 1 }}>×</span>
          </div>
        </>
      ) : isPlacementMode ? (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 16, color: "rgba(99,179,237,0.5)", lineHeight: 1 }}>+</span>
        </div>
      ) : null}
    </div>
  );
}

// ─── Tier grid (5×5) ──────────────────────────────────────────────────────────
function TierGrid({ tier, tierIndex, shelfId }: {
  tier: (string | null)[]; tierIndex: number; shelfId: string;
}) {
  const { clearWarehouseTier } = useStore();
  const [confirmClear, setConfirmClear] = useState(false);
  const filled = tier.filter(Boolean).length;
  const total = TIER_COLS * TIER_ROWS;
  const fillPct = (filled / total) * 100;
  const accentBlue = "#5A7898";
  const TIER_LABELS = ["Tầng 1 · Thấp nhất", "Tầng 2 · Giữa thấp", "Tầng 3 · Giữa cao", "Tầng 4 · Cao nhất"];

  return (
    <div style={{ border: "1px solid #DDD8D0", borderRadius: 10, overflow: "visible", boxShadow: "0 1px 6px rgba(26,20,16,0.06)" }}>
      {/* Header */}
      <div style={{
        padding: "8px 12px", borderBottom: "1px solid #EAE6E0",
        background: "linear-gradient(180deg,#FFFFFF,#FAFAF8)",
        borderRadius: "10px 10px 0 0",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 22, height: 22, borderRadius: 6, flexShrink: 0,
            background: `${accentBlue}14`, border: `1px solid ${accentBlue}28`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 9, fontWeight: 800, color: accentBlue }}>{tierIndex + 1}</span>
          </div>
          <span style={{ fontSize: 10, fontWeight: 600, color: accentBlue }}>{TIER_LABELS[tierIndex]}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 48, height: 3, background: "#EAE6E0", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ width: `${fillPct}%`, height: "100%", background: accentBlue, opacity: 0.75, borderRadius: 2, transition: "width 0.4s" }} />
            </div>
            <span style={{ fontSize: 9, fontWeight: 600, color: filled > 0 ? accentBlue : "#C8C0B8" }}>{filled}/{total}</span>
          </div>
          {filled > 0 && !confirmClear && (
            <button onClick={() => setConfirmClear(true)}
              style={{ fontSize: 8, color: "rgba(154,144,128,0.5)", cursor: "pointer", background: "none", border: "none", padding: 0 }}
              onMouseEnter={e => (e.currentTarget.style.color = "#F87171")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(154,144,128,0.5)")}
            >Xóa</button>
          )}
          {confirmClear && (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button onClick={() => { clearWarehouseTier(shelfId, tierIndex); setConfirmClear(false); }}
                style={{ fontSize: 8, color: "white", background: "#EF4444", border: "none", borderRadius: 4, padding: "2px 8px", cursor: "pointer", fontWeight: 600 }}>
                OK
              </button>
              <button onClick={() => setConfirmClear(false)}
                style={{ fontSize: 8, color: "#9A9080", background: "none", border: "1px solid #DDD8D0", borderRadius: 4, padding: "2px 8px", cursor: "pointer" }}>
                Hủy
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Slot grid */}
      <div style={{ padding: 10, background: "#F5F2EE", borderRadius: "0 0 10px 10px", overflowX: "auto" }}>
        <div style={{ minWidth: "max-content", display: "inline-block" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {Array.from({ length: TIER_ROWS }, (_, visualRow) => {
              const row = TIER_ROWS - 1 - visualRow;
              return (
                <div key={row} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <div style={{ width: 16, flexShrink: 0, textAlign: "right", fontSize: 7, color: "rgba(154,144,128,0.5)", fontFamily: "monospace" }}>
                    {TIER_ROWS - visualRow}
                  </div>
                  {Array.from({ length: TIER_COLS }, (_, col) => {
                    const slotIndex = row * TIER_COLS + col;
                    return <WarehouseSlot key={slotIndex} productId={tier[slotIndex] ?? null}
                      shelfId={shelfId} tierIndex={tierIndex} slotIndex={slotIndex} />;
                  })}
                </div>
              );
            })}
          </div>
          {/* Column labels */}
          <div style={{ display: "flex", gap: 3, marginTop: 4, marginLeft: 19 }}>
            {Array.from({ length: TIER_COLS }, (_, col) => (
              <div key={col} style={{ width: 52, textAlign: "center", fontSize: 7, color: "rgba(154,144,128,0.45)", fontFamily: "monospace", flexShrink: 0 }}>
                {col + 1}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Shelf panel ───────────────────────────────────────────────────────────────
function ShelfPanel({ shelf, show3D }: { shelf: WarehouseShelf; show3D: boolean }) {
  const { clearWarehouseShelf, renameWarehouseShelf, setWarehouseShelfNotes, products } = useStore();
  const [confirmClear, setConfirmClear] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(shelf.name);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesVal, setNotesVal] = useState(shelf.notes ?? "");
  const nameRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setNameVal(shelf.name); }, [shelf.name]);
  useEffect(() => { setNotesVal(shelf.notes ?? ""); }, [shelf.notes]);
  useEffect(() => { if (editingName) nameRef.current?.focus(); }, [editingName]);
  useEffect(() => { if (editingNotes) notesRef.current?.focus(); }, [editingNotes]);

  const commitName = () => {
    const t = nameVal.trim();
    if (t && t !== shelf.name) renameWarehouseShelf(shelf.id, t);
    else setNameVal(shelf.name);
    setEditingName(false);
  };
  const commitNotes = () => { setWarehouseShelfNotes(shelf.id, notesVal.trim()); setEditingNotes(false); };

  const totalFilled = shelf.tiers.reduce((s, t) => s + t.filter(Boolean).length, 0);
  const totalSlots = shelf.tiers.length * TIER_COLS * TIER_ROWS;
  const fillPct = totalSlots > 0 ? (totalFilled / totalSlots) * 100 : 0;
  const accentColor = shelf.shelfType === "shoes" ? "#5A7898" : "#9A7050";
  const typeLabel = shelf.shelfType === "shoes" ? "KỆ GIÀY" : "KỆ TÚI";

  const prodSubset = products.map(p => ({ id: p.id, category: p.category }));

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "#F5F2EE" }}>
      {/* Header */}
      <div style={{
        padding: "12px 16px 10px 13px",
        borderBottom: "1px solid #EAE6E0",
        borderLeft: `3px solid ${accentColor}`,
        background: "#FFFFFF",
        flexShrink: 0,
        display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        boxShadow: "0 1px 0 #EAE6E0",
      }}>
        <div style={{ flex: 1, minWidth: 0, marginRight: 16 }}>
          <p style={{ fontSize: 7, letterSpacing: "0.3em", textTransform: "uppercase", fontWeight: 700, color: accentColor }}>{typeLabel}</p>
          {editingName ? (
            <input
              ref={nameRef} value={nameVal}
              onChange={e => setNameVal(e.target.value)}
              onBlur={commitName}
              onKeyDown={e => {
                if (e.key === "Enter") commitName();
                if (e.key === "Escape") { setNameVal(shelf.name); setEditingName(false); }
              }}
              style={{
                fontSize: 18, fontWeight: 300, color: "#1A1410", background: "transparent",
                outline: "none", width: "100%", marginTop: 2,
                borderBottom: "1.5px solid rgba(184,145,74,0.5)",
              }}
            />
          ) : (
            <h3
              onClick={() => setEditingName(true)}
              title="Click để đổi tên"
              style={{
                fontSize: 18, fontWeight: 300, color: "#1A1410", marginTop: 2,
                cursor: "text", display: "flex", alignItems: "center", gap: 6,
              }}
            >
              {shelf.name}
              <span style={{ fontSize: 8, color: "#C8C0B8", opacity: 0 }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "0")}>✎</span>
            </h3>
          )}
          <div style={{ marginTop: 4 }}>
            {editingNotes ? (
              <textarea
                ref={notesRef} value={notesVal} rows={2}
                onChange={e => setNotesVal(e.target.value)} onBlur={commitNotes}
                onKeyDown={e => { if (e.key === "Escape") { setNotesVal(shelf.notes ?? ""); setEditingNotes(false); } }}
                placeholder="Ghi chú..."
                style={{
                  fontSize: 9, color: "#6A6050", width: "100%", resize: "none", outline: "none",
                  background: "#F0EDE8", border: "1px solid #DDD8D0", borderRadius: 5,
                  padding: "4px 8px",
                }}
              />
            ) : (
              <p
                onClick={() => setEditingNotes(true)}
                style={{ fontSize: 9, color: "#9A9080", cursor: "text", minHeight: 14 }}
              >
                {shelf.notes ? shelf.notes : <span style={{ fontStyle: "italic", opacity: 0.5 }}>+ ghi chú...</span>}
              </p>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 7, color: "#9A9080", letterSpacing: "0.2em", fontWeight: 600 }}>ĐANG LƯU</p>
            <p style={{ fontSize: 18, fontWeight: 300, color: accentColor, lineHeight: 1 }}>
              {totalFilled}
              <span style={{ fontSize: 11, color: "#9A9080" }}>/{totalSlots}</span>
            </p>
          </div>
          {confirmClear ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 9, color: "#9A9080" }}>Xóa tất cả?</span>
              <button
                onClick={() => { clearWarehouseShelf(shelf.id); setConfirmClear(false); }}
                style={{ padding: "4px 10px", fontSize: 8, color: "white", background: "#EF4444", border: "none", borderRadius: 5, cursor: "pointer", fontWeight: 600 }}
              >OK</button>
              <button
                onClick={() => setConfirmClear(false)}
                style={{ padding: "4px 10px", fontSize: 8, color: "#9A9080", background: "none", border: "1px solid #DDD8D0", borderRadius: 5, cursor: "pointer" }}
              >HỦY</button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmClear(true)}
              style={{
                fontSize: 9, color: "rgba(154,144,128,0.5)", padding: "5px 10px",
                border: "1px solid #EAE6E0", borderRadius: 6, background: "#F9F7F4", cursor: "pointer",
                transition: "all 0.1s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#F87171"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(220,38,38,0.3)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(154,144,128,0.5)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#EAE6E0"; }}
            >
              Xóa kệ
            </button>
          )}
        </div>
      </div>

      {/* Fill progress */}
      <div style={{ height: 3, background: "#EAE6E0", flexShrink: 0 }}>
        <div style={{ width: `${fillPct}%`, height: "100%", background: accentColor, transition: "width 0.6s ease" }} />
      </div>

      {/* Split: 3D preview (top) + 2D grid (bottom) OR full 2D grid */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {/* 3D preview panel */}
        {show3D && (
          <div style={{ flexShrink: 0, height: 240, borderBottom: "1px solid #EAE6E0", background: "#1A1A20", position: "relative" }}>
            <div style={{ position: "absolute", top: 8, left: 12, zIndex: 1, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 7, letterSpacing: "0.3em", color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>3D PREVIEW</span>
              <span style={{ fontSize: 7, color: "rgba(255,255,255,0.25)" }}>· drag to rotate</span>
            </div>
            <Scene3D shelf={shelf} products={prodSubset} />
          </div>
        )}

        {/* 2D tier grid list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          {[...shelf.tiers].reverse().map((tier, reversedIdx) => {
            const ti = shelf.tiers.length - 1 - reversedIdx;
            return <TierGrid key={ti} tier={tier} tierIndex={ti} shelfId={shelf.id} />;
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function WarehouseShelfEditor() {
  const { warehouseShelves, selectedProduct } = useStore();
  const [shelfIndex, setShelfIndex] = useState(0);
  const [show3D, setShow3D] = useState(true);

  const total = warehouseShelves.length;
  const idx = Math.max(0, Math.min(shelfIndex, total - 1));
  const shelf = warehouseShelves[idx] ?? null;

  const goLeft  = () => setShelfIndex(i => Math.max(0, i - 1));
  const goRight = () => setShelfIndex(i => Math.min(total - 1, i + 1));

  const shelfGroup = shelf ? (shelf.shelfType === "shoes" ? "Kệ Giày" : "Kệ Túi") : "";
  const groupColor = shelf?.shelfType === "shoes" ? "#5A7898" : "#9A7050";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "#F0EDE8" }}>

      {/* Placement hint */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            style={{ overflow: "hidden", flexShrink: 0 }}
          >
            <div style={{
              padding: "8px 16px", borderBottom: "1px solid rgba(90,120,152,0.2)",
              background: "rgba(90,120,152,0.06)",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#5A7898", flexShrink: 0, animation: "pulseBlue 2s ease-in-out infinite" }} />
              <p style={{ fontSize: 10, color: "#5A7898" }}>
                <span style={{ fontWeight: 600 }}>{selectedProduct.name}</span>
                <span style={{ opacity: 0.6, marginLeft: 6 }}>— click ô để xếp vào kho</span>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 16px", borderBottom: "1px solid #DDD8D0",
        background: "#FFFFFF", flexShrink: 0,
        boxShadow: "0 1px 0 #EAE6E0",
      }}>
        {/* Prev button */}
        <button
          onClick={goLeft} disabled={idx === 0}
          style={{
            width: 38, height: 38, borderRadius: 8, border: "none",
            background: idx === 0 ? "#F5F2EE" : "#1A1410",
            color: idx === 0 ? "#C8C0B8" : "#FFFFFF",
            fontSize: 16, cursor: idx === 0 ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, transition: "all 0.15s",
            boxShadow: idx === 0 ? "none" : "0 2px 8px rgba(26,20,16,0.2)",
          }}
        >←</button>

        {/* Center info */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: 1, marginLeft: 12, marginRight: 12 }}>
          <span style={{ fontSize: 8, letterSpacing: "0.22em", textTransform: "uppercase", fontWeight: 700, color: groupColor }}>{shelfGroup}</span>
          <span style={{ fontSize: 16, fontWeight: 400, color: "#1A1410", lineHeight: 1 }}>{shelf?.name ?? "—"}</span>
          {/* Dot indicators */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
            {warehouseShelves.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setShelfIndex(i)}
                style={{
                  width: i === idx ? 18 : 6, height: 6, borderRadius: 3,
                  background: i === idx ? (s.shelfType === "shoes" ? "#5A7898" : "#9A7050") : "#C8C0B8",
                  border: "none", cursor: "pointer", padding: 0,
                  transition: "all 0.2s",
                }}
              />
            ))}
          </div>
          <span style={{ fontSize: 8, color: "#9A9080", fontWeight: 500 }}>{idx + 1} / {total}</span>
        </div>

        {/* Right controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {/* 3D toggle */}
          <button
            onClick={() => setShow3D(v => !v)}
            title={show3D ? "Ẩn 3D preview" : "Hiện 3D preview"}
            style={{
              width: 38, height: 38, borderRadius: 8,
              border: "1px solid",
              borderColor: show3D ? groupColor + "60" : "#DDD8D0",
              background: show3D ? groupColor + "12" : "#F5F2EE",
              color: show3D ? groupColor : "#9A9080",
              fontSize: 15, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s",
            }}
          >◈</button>

          {/* Next button */}
          <button
            onClick={goRight} disabled={idx === total - 1}
            style={{
              width: 38, height: 38, borderRadius: 8, border: "none",
              background: idx === total - 1 ? "#F5F2EE" : "#1A1410",
              color: idx === total - 1 ? "#C8C0B8" : "#FFFFFF",
              fontSize: 16, cursor: idx === total - 1 ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, transition: "all 0.15s",
              boxShadow: idx === total - 1 ? "none" : "0 2px 8px rgba(26,20,16,0.2)",
            }}
          >→</button>
        </div>
      </div>

      {/* Shelf content */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", minWidth: 0 }}>
        <div style={{ flex: 1, overflow: "hidden" }}>
          {shelf ? (
            <ShelfPanel shelf={shelf} show3D={show3D} />
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
              <p style={{ fontSize: 11, color: "#9A9080" }}>Kho trống</p>
            </div>
          )}
        </div>
        {selectedProduct && (
          <div style={{
            width: 160, flexShrink: 0, borderLeft: "1px solid #EAE6E0",
            background: "linear-gradient(180deg,#FFFFFF,#F9F7F4)", overflow: "hidden",
          }}>
            <Product3DViewer product={selectedProduct} />
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useMemo, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, RoundedBox } from "@react-three/drei";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/store/useStore";
import { Product, StoreSubsection, WarehouseShelf } from "@/types";

// ─── Color helpers ─────────────────────────────────────────────────────────────
const CAT_COLOR: Record<string, string> = {
  "women": "#C9856A", "men": "#5A7898", "kids": "#7BAF6A",
  "acc": "#9B7DC8", "sale": "#C8A84A", "phụ kiện": "#9B7DC8", "chăm sóc": "#8A9870",
};
function catColor(cat?: string): string {
  if (!cat) return "#B8914A";
  const lc = cat.toLowerCase();
  for (const [k, v] of Object.entries(CAT_COLOR)) if (lc.includes(k)) return v;
  return "#8A8078";
}
const BOX_COLORS: Record<string, string> = {
  "Giày nữ": "#C49A6C", "Giày nam": "#5A7888", "Bốt nữ": "#C4A080", "Bốt nam": "#6A8094",
  "Sandal nữ": "#D4A090", "Sandal nam": "#8890C4", "Giày trẻ em": "#8DC4A0",
  "Túi nữ": "#9B7060", "Túi nam": "#607080", "Phụ kiện": "#7A8B6B",
  "Trang sức": "#B8A045", "Chăm sóc giày": "#9A9080",
};
const SECTION_ACCENT: Record<string, string> = {
  wall_woman: "#B8914A", wall_man: "#5A7898",
  center_woman: "#A87848", center_man: "#486888",
  acc: "#6A8868", window: "#8868A8",
};
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0,2),16)/255, parseInt(h.slice(2,4),16)/255, parseInt(h.slice(4,6),16)/255];
}

// ─── Box slot (single product cube) ───────────────────────────────────────────
function BoxSlot({ pos, color, filled, w, h, d }: {
  pos: [number,number,number]; color: string; filled: boolean; w: number; h: number; d: number;
}) {
  const [hov, setHov] = useState(false);
  if (!filled) {
    return (
      <mesh position={pos}>
        <boxGeometry args={[w*0.9, h*0.88, d*0.9]} />
        <meshStandardMaterial color="#EDEAE5" roughness={0.85} transparent opacity={0.35} />
      </mesh>
    );
  }
  const rgb = hexToRgb(color);
  return (
    <group position={pos}>
      <RoundedBox args={[w*0.9, h*0.88, d*0.9]} radius={0.012} smoothness={2}
        onPointerOver={() => setHov(true)} onPointerOut={() => setHov(false)}>
        <meshStandardMaterial
          color={rgb} roughness={0.5} metalness={0.05}
          emissive={hov ? rgb : [0,0,0]} emissiveIntensity={hov ? 0.15 : 0}
        />
      </RoundedBox>
      {/* top stripe */}
      <mesh position={[0, h*0.455, 0]}>
        <boxGeometry args={[w*0.9, 0.014, d*0.9]} />
        <meshStandardMaterial color={[rgb[0]*0.65, rgb[1]*0.65, rgb[2]*0.65]} roughness={0.3} metalness={0.2} />
      </mesh>
    </group>
  );
}

// ─── Shelf board (horizontal plank) ───────────────────────────────────────────
function Board({ cx, cy, cz, w, d, color }: { cx:number;cy:number;cz:number;w:number;d:number;color:[number,number,number] }) {
  return (
    <mesh position={[cx, cy, cz]}>
      <boxGeometry args={[w, 0.035, d]} />
      <meshStandardMaterial color={color} roughness={0.45} metalness={0.12} />
    </mesh>
  );
}

// ─── Store planogram 3D ────────────────────────────────────────────────────────
// Layout: rows stack top→bottom (Y axis). Each row has N slots side by side (X axis). Depth = Z.
function StoreSub3D({ sub, prodMap }: { sub: StoreSubsection; prodMap: Map<string, Product> }) {
  const rows = sub.rows;
  const maxSlots = Math.max(...rows.map(r => r.products.length), 1);

  // Slot dimensions (metres)
  const SW = 0.30, SH = 0.38, SD = 0.22, GAP_X = 0.025, GAP_Y = 0.045;
  const BOARD_H = 0.035;
  const totalW = maxSlots * SW + (maxSlots - 1) * GAP_X + 0.06;
  const totalH = rows.length * (SH + GAP_Y + BOARD_H);

  // back wall
  return (
    <group position={[0, 0, 0]}>
      {/* Back panel */}
      <mesh position={[0, totalH / 2, -(SD / 2 + 0.03)]}>
        <boxGeometry args={[totalW + 0.1, totalH + 0.15, 0.03]} />
        <meshStandardMaterial color={[0.93, 0.91, 0.87]} roughness={0.95} />
      </mesh>
      {/* Side uprights */}
      {([-totalW/2 - 0.04, totalW/2 + 0.04] as number[]).map((bx, i) => (
        <mesh key={i} position={[bx, totalH/2, 0]}>
          <boxGeometry args={[0.04, totalH + 0.1, SD + 0.08]} />
          <meshStandardMaterial color={[0.75, 0.72, 0.68]} roughness={0.5} metalness={0.1} />
        </mesh>
      ))}

      {rows.map((row, ri) => {
        const baseY = ri * (SH + GAP_Y + BOARD_H);
        const isShort = row.type === "short";
        const boardColor: [number,number,number] = isShort ? [0.75, 0.62, 0.44] : [0.76, 0.73, 0.69];
        const rowW = row.products.length * SW + (row.products.length - 1) * GAP_X;
        if (row.type === "image") {
          return (
            <group key={ri} position={[0, baseY, 0]}>
              <Board cx={0} cy={-BOARD_H/2} cz={0} w={totalW} d={SD + 0.04} color={[0.73,0.70,0.67]} />
              <mesh position={[0, SH/2, 0]}>
                <boxGeometry args={[totalW - 0.06, SH * 0.6, 0.015]} />
                <meshStandardMaterial color={[0.88,0.85,0.80]} roughness={0.9} transparent opacity={0.6} />
              </mesh>
            </group>
          );
        }
        return (
          <group key={ri} position={[0, baseY, 0]}>
            {/* Board below row */}
            <Board cx={0} cy={-BOARD_H/2} cz={0} w={rowW + 0.04} d={SD + 0.04} color={boardColor} />
            {/* Slots */}
            {row.products.map((pid, si) => {
              const prod = pid ? prodMap.get(pid) : null;
              const cc = prod ? catColor(prod.category) : "#D4D0CB";
              const cx = (si - (row.products.length - 1) / 2) * (SW + GAP_X);
              return (
                <BoxSlot key={si}
                  pos={[cx, SH/2 + 0.01, 0]}
                  color={cc} filled={!!prod} w={SW} h={SH} d={SD} />
              );
            })}
          </group>
        );
      })}

      {/* Base floor */}
      <mesh position={[0, -0.06, 0]}>
        <boxGeometry args={[totalW + 0.1, 0.06, SD + 0.1]} />
        <meshStandardMaterial color={[0.62, 0.59, 0.55]} roughness={0.6} metalness={0.1} />
      </mesh>
    </group>
  );
}

// ─── Warehouse shelf 3D ────────────────────────────────────────────────────────
// Layout: 4 tiers stack on Y axis. Each tier: 5 cols (X) × 5 rows (just 1 deep on Z — front face view).
// We render only the FRONT face of each tier (1 slot deep) to avoid z-fighting.
// For depth feel we add a back panel per tier.
function WarehouseShelf3D({ shelf, prodMap }: { shelf: WarehouseShelf; prodMap: Map<string, Product> }) {
  const COLS = 5;
  const accent = shelf.shelfType === "shoes" ? "#5A7898" : "#9A7050";
  const [acR, acG, acB] = hexToRgb(accent);

  // slot dims — wide flat shoe boxes
  const SW = 0.40, SH = 0.22, SD = 0.30;
  const GAP_X = 0.025, GAP_Y = 0.05;
  const BOARD_H = 0.04;
  const tierStep = SH + GAP_Y + BOARD_H; // total height per tier

  const totalW = COLS * SW + (COLS - 1) * GAP_X;
  const totalH = shelf.tiers.length * tierStep;

  return (
    <group>
      {/* Side uprights */}
      {([-totalW/2 - 0.06, totalW/2 + 0.06] as number[]).map((bx, i) => (
        <mesh key={i} position={[bx, totalH/2, 0]}>
          <boxGeometry args={[0.05, totalH + 0.18, SD + 0.1]} />
          <meshStandardMaterial color={[acR*0.55, acG*0.55, acB*0.55]} roughness={0.4} metalness={0.2} />
        </mesh>
      ))}
      {/* Back panel */}
      <mesh position={[0, totalH/2, -(SD/2 + 0.025)]}>
        <boxGeometry args={[totalW + 0.24, totalH + 0.18, 0.025]} />
        <meshStandardMaterial color={[acR*0.38, acG*0.38, acB*0.38]} roughness={0.5} metalness={0.15} />
      </mesh>

      {shelf.tiers.map((tier, ti) => {
        const baseY = ti * tierStep;
        return (
          <group key={ti} position={[0, baseY, 0]}>
            {/* Tier board */}
            <mesh position={[0, -BOARD_H/2, 0]}>
              <boxGeometry args={[totalW + 0.12, BOARD_H, SD + 0.06]} />
              <meshStandardMaterial color={[acR*0.68, acG*0.68, acB*0.68]} roughness={0.38} metalness={0.18} />
            </mesh>
            {/* Only render front row (row 0) of each tier as 3D boxes */}
            {Array.from({ length: COLS }, (_, col) => {
              // front-most row = row 0 (slotIdx 0..4)
              const slotIdx = 0 * COLS + col;
              const pid = tier[slotIdx] ?? null;
              const prod = pid ? prodMap.get(pid) : null;
              const cc = prod ? (BOX_COLORS[prod.category] || "#9A8878") : "#D4D0CB";
              const cx = (col - (COLS-1)/2) * (SW + GAP_X);
              return (
                <BoxSlot key={col}
                  pos={[cx, SH/2 + 0.01, 0]}
                  color={cc} filled={!!pid} w={SW} h={SH} d={SD} />
              );
            })}
            {/* Behind rows: depth illusion panels */}
            {[1, 2, 3, 4].map(rowI => (
              <mesh key={rowI} position={[0, SH/2, -(rowI * (SD * 0.55))]}>
                <boxGeometry args={[totalW + 0.04, SH * 0.9, 0.01]} />
                <meshStandardMaterial
                  color={[acR*0.55 + 0.35, acG*0.55 + 0.35, acB*0.55 + 0.35]}
                  roughness={0.8} transparent opacity={0.18 - rowI * 0.03}
                />
              </mesh>
            ))}
          </group>
        );
      })}

      {/* Base */}
      <mesh position={[0, -0.07, 0]}>
        <boxGeometry args={[totalW + 0.24, 0.08, SD + 0.14]} />
        <meshStandardMaterial color={[0.52, 0.49, 0.45]} roughness={0.55} metalness={0.12} />
      </mesh>
    </group>
  );
}

// ─── Canvas wrapper ────────────────────────────────────────────────────────────
function Scene3DCanvas({ children, camY = 1.4 }: { children: React.ReactNode; camY?: number }) {
  return (
    <Canvas
      camera={{ position: [2.4, camY + 1.6, 3.6], fov: 44 }}
      gl={{ antialias: true, alpha: true }}
      style={{ width: "100%", height: "100%" }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.75} />
        <directionalLight position={[3, 8, 5]} intensity={1.2} castShadow />
        <directionalLight position={[-2, 4, -1]} intensity={0.35} />
        <pointLight position={[0, 3, 3]} intensity={0.4} />
        <Environment preset="apartment" />
        {children}
        <OrbitControls
          enablePan={false} enableZoom={true}
          minPolarAngle={0.1} maxPolarAngle={Math.PI * 0.68}
          minDistance={2.0} maxDistance={10}
          target={[0, camY, 0]}
        />
      </Suspense>
    </Canvas>
  );
}

// ─── 2D planogram flat view ────────────────────────────────────────────────────
function StoreSub2D({ sub, prodMap }: { sub: StoreSubsection; prodMap: Map<string, Product> }) {
  const rows = sub.rows;
  const maxSlots = Math.max(...rows.map(r => r.products.length), 1);
  const SLOT_W = Math.max(60, Math.min(96, Math.floor(680 / maxSlots)));
  const SLOT_H = 54;
  const GAP = 3, LABEL_W = 46;

  return (
    <div style={{ overflowX: "auto", paddingBottom: 4 }}>
      <div style={{
        display: "inline-flex", flexDirection: "column", gap: GAP,
        padding: "18px 14px 14px",
        background: "#FFFFFF", border: "1px solid #E8E4DE", borderRadius: 10,
        boxShadow: "0 4px 16px rgba(26,20,16,0.08)", minWidth: "max-content", position: "relative",
      }}>
        <div style={{ position:"absolute", top:0, left:10, right:10, height:5, background:"linear-gradient(90deg,#C8BEB4,#E8E0D8,#C8BEB4)", borderRadius:"0 0 4px 4px" }} />
        {rows.map((row, ri) => {
          const filled = row.products.filter(Boolean).length;
          if (row.type === "image") return (
            <div key={ri} style={{ display:"flex", gap:GAP }}>
              <div style={{ width:LABEL_W, flexShrink:0 }} />
              <div style={{ height:34, width:maxSlots*(SLOT_W+GAP)-GAP, border:"1.5px dashed #D8D0C8", borderRadius:5, display:"flex", alignItems:"center", justifyContent:"center", background:"#F8F5F0" }}>
                <span style={{ fontSize:8, color:"#B8A898", letterSpacing:"0.15em" }}>IMAGE</span>
              </div>
            </div>
          );
          const isShort = row.type === "short";
          return (
            <div key={ri} style={{ display:"flex", alignItems:"flex-end", gap:GAP }}>
              <div style={{ width:LABEL_W, flexShrink:0, display:"flex", flexDirection:"column", alignItems:"flex-end", paddingRight:6, paddingBottom:8 }}>
                <span style={{ fontSize:8, fontWeight:700, color:isShort?"#A87848":"#8A8078", letterSpacing:"0.08em" }}>{isShort?"NGẮN":"DÀI"}</span>
                <span style={{ fontSize:7, marginTop:2, color:filled>0?"#B8914A":"#C8C0B8" }}>{filled}/{row.products.length}</span>
              </div>
              <div>
                <div style={{ display:"flex", gap:GAP }}>
                  {row.products.map((pid, si) => {
                    const prod = pid ? prodMap.get(pid) : null;
                    const cc = prod ? catColor(prod.category) : null;
                    return (
                      <div key={si} style={{
                        width:SLOT_W, height:SLOT_H, flexShrink:0, borderRadius:5, position:"relative", overflow:"hidden",
                        border:prod?`1px solid ${cc}50`:"1px solid #E8E4DE",
                        background:prod?`${cc}10`:"#FAF8F5",
                      }}>
                        {prod && (
                          <>
                            <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:cc||"#B8914A" }} />
                            <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", paddingTop:4, flexDirection:"column" }}>
                              <span style={{ fontSize:Math.max(7,Math.min(9,SLOT_W/9)), color:"#2A2420", fontWeight:500, textAlign:"center", padding:"0 3px", lineHeight:1.25 }}>
                                {prod.name.length>11?prod.name.slice(0,11)+"…":prod.name}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop:3, height:5, borderRadius:3, background:isShort?"linear-gradient(90deg,#C8A880,#E8C898,#C8A880)":"linear-gradient(90deg,#C8C0B8,#E0D8D0,#C8C0B8)", boxShadow:"0 1px 2px rgba(26,20,16,0.07)" }} />
              </div>
            </div>
          );
        })}
        <div style={{ position:"absolute", bottom:0, left:10, right:10, height:5, background:"linear-gradient(90deg,#C8BEB4,#E8E0D8,#C8BEB4)", borderRadius:"4px 4px 0 0" }} />
      </div>
    </div>
  );
}

// ─── 2D warehouse view ─────────────────────────────────────────────────────────
function WarehouseSub2D({ shelf, prodMap }: { shelf: WarehouseShelf; prodMap: Map<string, Product> }) {
  const COLS = 5, ROWS = 5;
  const SLOT_W = 74, SLOT_H = 36;
  const COL_GAP = 4, ROW_GAP = 3;
  const accent = shelf.shelfType === "shoes" ? "#5A7898" : "#9A7050";
  const tierLabels = ["Tầng 1", "Tầng 2", "Tầng 3", "Tầng 4"];

  return (
    <div style={{ overflowX: "auto", paddingBottom: 4 }}>
      <div style={{
        display:"inline-flex", flexDirection:"column", gap:10,
        padding:"18px 14px 14px",
        background:"#FFFFFF", border:"1px solid #E8E4DE", borderRadius:10,
        boxShadow:"0 4px 16px rgba(26,20,16,0.08)", minWidth:"max-content", position:"relative",
      }}>
        <div style={{ position:"absolute", top:0, left:10, right:10, height:5, background:`linear-gradient(90deg,${accent}70,${accent}BB,${accent}70)`, borderRadius:"0 0 4px 4px" }} />
        {[...shelf.tiers].reverse().map((tier, revIdx) => {
          const ti = shelf.tiers.length - 1 - revIdx;
          const filled = tier.filter(Boolean).length;
          return (
            <div key={ti} style={{ display:"flex", alignItems:"flex-end", gap:8 }}>
              <div style={{ width:60, flexShrink:0, display:"flex", flexDirection:"column", alignItems:"flex-end", paddingRight:8, paddingBottom:5 }}>
                <div style={{ width:20, height:20, borderRadius:4, background:`${accent}14`, border:`1px solid ${accent}28`, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:3 }}>
                  <span style={{ fontSize:9, fontWeight:800, color:accent }}>{ti+1}</span>
                </div>
                <span style={{ fontSize:7, color:"#9A9080", textAlign:"right", lineHeight:1.3 }}>{tierLabels[ti]}</span>
                <span style={{ fontSize:8, marginTop:2, fontWeight:600, color:filled>0?accent:"#C8C0B8" }}>{filled}/25</span>
              </div>
              <div style={{ position:"relative" }}>
                <div style={{ display:"flex", gap:COL_GAP }}>
                  {Array.from({ length:COLS }, (_, col) => (
                    <div key={col} style={{ display:"flex", flexDirection:"column", gap:ROW_GAP }}>
                      {Array.from({ length:ROWS }, (_, rowI) => {
                        const vi = ROWS - 1 - rowI;
                        const idx = vi * COLS + col;
                        const pid = tier[idx] ?? null;
                        const prod = pid ? prodMap.get(pid) : null;
                        const cc = prod ? (BOX_COLORS[prod.category]||"#9A8878") : null;
                        return (
                          <div key={idx} style={{
                            width:SLOT_W, height:SLOT_H, borderRadius:4,
                            border:prod?`1px solid ${cc}50`:"1px solid #E8E4DE",
                            background:prod?`${cc}10`:"#FAF8F5",
                            position:"relative", overflow:"hidden",
                            display:"flex", alignItems:"center", justifyContent:"center",
                          }}>
                            {prod && (
                              <>
                                <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:cc||"#B8914A" }} />
                                <span style={{ fontSize:9, fontWeight:600, color:cc||"#B8914A", marginTop:2 }}>
                                  {prod.name.charAt(0).toUpperCase()}
                                </span>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
                <div style={{ marginTop:3, height:5, borderRadius:3, background:`linear-gradient(90deg,${accent}40,${accent}88,${accent}40)`, boxShadow:"0 1px 2px rgba(26,20,16,0.07)" }} />
              </div>
            </div>
          );
        })}
        <div style={{ position:"absolute", bottom:0, left:10, right:10, height:5, background:`linear-gradient(90deg,${accent}70,${accent}BB,${accent}70)`, borderRadius:"5px 5px 0 0" }} />
      </div>
    </div>
  );
}

// ─── Sidebar button ────────────────────────────────────────────────────────────
function SidebarBtn({ label, filled, total, accent, isSelected, onClick }: {
  label: string; filled: number; total: number; accent: string; isSelected: boolean; onClick: () => void;
}) {
  const pct = total > 0 ? (filled / total) * 100 : 0;
  return (
    <button onClick={onClick} style={{
      width:"100%", textAlign:"left", padding:"9px 12px",
      display:"flex", flexDirection:"column", gap:4,
      background:isSelected?"#F5F2EE":"transparent",
      borderLeft:`2.5px solid ${isSelected?accent:"transparent"}`,
      paddingLeft:isSelected?9.5:12,
      border:"none", cursor:"pointer", transition:"background 0.1s",
    }}>
      <span style={{ fontSize:10.5, lineHeight:1.3, color:isSelected?"#1A1410":"#9A9080", fontWeight:isSelected?600:400 }}>{label}</span>
      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
        <div style={{ flex:1, height:3, borderRadius:2, background:"#EAE6E0", overflow:"hidden" }}>
          <div style={{ width:`${pct}%`, height:"100%", background:filled>0?accent:"transparent", borderRadius:2, opacity:0.8, transition:"width 0.4s" }} />
        </div>
        <span style={{ fontSize:8, color:filled>0?accent:"#C8C0B8", fontWeight:600, flexShrink:0 }}>{filled}/{total}</span>
      </div>
    </button>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ShelfViewer3D({ activeSubTab = "display" }: { activeSubTab?: "display" | "warehouse" }) {
  const { storeSections, warehouseShelves, products } = useStore();
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [selectedWHId, setSelectedWHId]       = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen]   = useState(false);
  const [viewMode, setViewMode]               = useState<"2d" | "3d">("2d");

  const prodMap = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);

  const storeGroups = useMemo(() => {
    const map = new Map<string, { name: string; type: string; subs: { id: string; name: string; sub: StoreSubsection }[] }>();
    for (const sec of storeSections) {
      if (!map.has(sec.id)) map.set(sec.id, { name: sec.name, type: sec.sectionType, subs: [] });
      for (const sub of sec.subsections) map.get(sec.id)!.subs.push({ id: sub.id, name: sub.name, sub });
    }
    return [...map.values()];
  }, [storeSections]);

  const storeSubs = useMemo(() => storeGroups.flatMap(g => g.subs), [storeGroups]);
  const selectedStoreSub = storeSubs.find(s => s.id === selectedStoreId) ?? storeSubs[0] ?? null;
  const selectedWHShelf  = warehouseShelves.find(s => s.id === selectedWHId) ?? warehouseShelves[0] ?? null;

  function storeSubStats(sub: StoreSubsection) {
    return {
      total:  sub.rows.reduce((s, r) => s + r.products.length, 0),
      filled: sub.rows.reduce((s, r) => s + r.products.filter(Boolean).length, 0),
    };
  }
  function warehouseStats(shelf: WarehouseShelf) {
    return { total: shelf.tiers.length * 25, filled: shelf.tiers.reduce((s, t) => s + t.filter(Boolean).length, 0) };
  }

  const accent = activeSubTab === "display"
    ? (selectedStoreSub ? (SECTION_ACCENT[storeGroups.find(g => g.subs.some(s => s.id === selectedStoreSub.id))?.type ?? ""] ?? "#B8914A") : "#B8914A")
    : (selectedWHShelf?.shelfType === "shoes" ? "#5A7898" : "#9A7050");

  const headerLabel = activeSubTab === "display" ? (selectedStoreSub?.name ?? "—") : (selectedWHShelf?.name ?? "—");
  const headerSub   = activeSubTab === "display"
    ? (storeGroups.find(g => g.subs.some(s => s.id === selectedStoreSub?.id))?.name ?? "SÀN TRƯNG BÀY")
    : (selectedWHShelf?.shelfType === "shoes" ? "KỆ GIÀY" : "KỆ TÚI");

  const stats = activeSubTab === "display"
    ? (selectedStoreSub ? storeSubStats(selectedStoreSub.sub) : { filled: 0, total: 0 })
    : (selectedWHShelf  ? warehouseStats(selectedWHShelf)     : { filled: 0, total: 0 });
  const pct = stats.total > 0 ? Math.round(stats.filled / stats.total * 100) : 0;

  // camera Y target = half of total shelf height (tierStep = SH+GAP_Y+BOARD_H = 0.22+0.05+0.04 = 0.31)
  const camYTarget = activeSubTab === "warehouse" && selectedWHShelf
    ? (selectedWHShelf.tiers.length * 0.31) / 2
    : 1.2;

  const LEGEND = activeSubTab === "display"
    ? [{ l: "Women", c: "#C9856A" }, { l: "Men", c: "#5A7898" }, { l: "Kids", c: "#7BAF6A" }, { l: "Acc", c: "#9B7DC8" }, { l: "Sale", c: "#C8A84A" }]
    : [{ l: "Giày nữ", c: "#C49A6C" }, { l: "Giày nam", c: "#5A7888" }, { l: "Túi nữ", c: "#9B7060" }, { l: "Túi nam", c: "#607080" }];

  return (
    <div style={{ display:"flex", height:"100%", width:"100%", overflow:"hidden", background:"#F5F2EE" }}>

      {/* ── Sidebar (desktop) ── */}
      <div className="hidden md:flex flex-col border-r border-border bg-white overflow-hidden flex-shrink-0"
        style={{ width: 196, boxShadow: "1px 0 0 #EAE6E0" }}>
        <div style={{ padding:"10px 12px 8px", borderBottom:"1px solid #EAE6E0", background:"linear-gradient(180deg,#FFFFFF,#FAFAF8)", flexShrink:0 }}>
          <p style={{ fontSize:7, letterSpacing:"0.3em", fontWeight:700, color:accent, textTransform:"uppercase" }}>
            {activeSubTab === "display" ? "KHU VỰC" : "KHO"}
          </p>
        </div>
        <div style={{ flex:1, overflowY:"auto" }}>
          <AnimatePresence mode="wait">
            {activeSubTab === "display" && (
              <motion.div key="sd" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.1 }}>
                {storeGroups.map(group => {
                  const gAcc = SECTION_ACCENT[group.type] ?? "#B8914A";
                  return (
                    <div key={group.name}>
                      <div style={{ padding:"6px 12px", borderBottom:"1px solid #EAE6E0", borderTop:"1px solid #EAE6E0", background:"#F9F7F4" }}>
                        <p style={{ fontSize:8, letterSpacing:"0.2em", fontWeight:700, color:gAcc, textTransform:"uppercase" }}>{group.name}</p>
                      </div>
                      {group.subs.map(({ id, name, sub }) => {
                        const { filled, total } = storeSubStats(sub);
                        return <SidebarBtn key={id} label={name} filled={filled} total={total} accent={gAcc}
                          isSelected={selectedStoreSub?.id === id} onClick={() => setSelectedStoreId(id)} />;
                      })}
                    </div>
                  );
                })}
              </motion.div>
            )}
            {activeSubTab === "warehouse" && (
              <motion.div key="sw" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.1 }}>
                {["shoes","bags"].map(type => {
                  const list = warehouseShelves.filter(s => s.shelfType === type);
                  if (!list.length) return null;
                  const acc = type === "shoes" ? "#5A7898" : "#9A7050";
                  return (
                    <div key={type}>
                      <div style={{ padding:"6px 12px", borderBottom:"1px solid #EAE6E0", borderTop:"1px solid #EAE6E0", background:"#F9F7F4" }}>
                        <p style={{ fontSize:8, letterSpacing:"0.2em", fontWeight:700, color:acc, textTransform:"uppercase" }}>
                          {type==="shoes"?"KỆ GIÀY":"KỆ TÚI"}
                        </p>
                      </div>
                      {list.map(shelf => {
                        const { filled, total } = warehouseStats(shelf);
                        return <SidebarBtn key={shelf.id} label={shelf.name} filled={filled} total={total} accent={acc}
                          isSelected={selectedWHShelf?.id === shelf.id} onClick={() => setSelectedWHId(shelf.id)} />;
                      })}
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Main ── */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0 }}>

        {/* Header bar */}
        <div style={{
          padding:"10px 16px 10px 13px", borderBottom:"1px solid #EAE6E0",
          background:"#FFFFFF", flexShrink:0,
          display:"flex", alignItems:"center", justifyContent:"space-between",
          borderLeft:`3px solid ${accent}`, boxShadow:"0 1px 0 #EAE6E0",
        }}>
          {/* Mobile trigger */}
          <button className="md:hidden" style={{ background:"none", border:"none", cursor:"pointer", padding:0, flex:1, display:"flex", alignItems:"center", gap:8, textAlign:"left" }}
            onClick={() => setMobileMenuOpen(v => !v)}>
            <div style={{ minWidth:0, flex:1 }}>
              <p style={{ fontSize:7, letterSpacing:"0.22em", textTransform:"uppercase", fontWeight:700, color:accent }}>{headerSub}</p>
              <p style={{ fontSize:14, fontWeight:500, color:"#1A1410", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{headerLabel}</p>
            </div>
            <motion.span animate={{ rotate:mobileMenuOpen?180:0 }} style={{ fontSize:10, color:"#9A9080", flexShrink:0 }}>▼</motion.span>
          </button>
          {/* Desktop title */}
          <div className="hidden md:block" style={{ minWidth:0, flex:1 }}>
            <p style={{ fontSize:7, letterSpacing:"0.22em", textTransform:"uppercase", fontWeight:700, color:accent }}>{headerSub}</p>
            <p style={{ fontSize:15, fontWeight:400, color:"#1A1410", marginTop:2 }}>{headerLabel}</p>
          </div>

          {/* Right controls */}
          <div style={{ display:"flex", alignItems:"center", gap:12, flexShrink:0, marginLeft:16 }}>
            {/* 2D/3D toggle */}
            <div style={{ display:"flex", background:"#F0EDE8", border:"1px solid #DDD8D0", borderRadius:7, padding:3, gap:2 }}>
              {(["2d","3d"] as const).map(m => (
                <button key={m} onClick={() => setViewMode(m)} style={{
                  padding:"4px 11px", borderRadius:5, border:"none",
                  fontSize:9, fontWeight:700, letterSpacing:"0.1em",
                  background:viewMode===m?"#1A1410":"transparent",
                  color:viewMode===m?"#FFFFFF":"#9A9080",
                  cursor:"pointer", transition:"all 0.15s",
                  boxShadow:viewMode===m?"0 1px 4px rgba(0,0,0,0.2)":"none",
                }}>{m.toUpperCase()}</button>
              ))}
            </div>
            {/* Stats */}
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div className="hidden sm:block" style={{ textAlign:"right" }}>
                <p style={{ fontSize:18, fontWeight:300, color:accent, lineHeight:1 }}>
                  {stats.filled}<span style={{ fontSize:11, color:"#9A9080", fontWeight:400 }}>/{stats.total}</span>
                </p>
                <p style={{ fontSize:7, color:"#9A9080", marginTop:2, letterSpacing:"0.2em", fontWeight:500 }}>SẢN PHẨM</p>
              </div>
              <div style={{ position:"relative", width:40, height:40 }}>
                <svg width="40" height="40" style={{ transform:"rotate(-90deg)" }}>
                  <circle cx="20" cy="20" r="16" fill="none" stroke="#EAE6E0" strokeWidth="3" />
                  <circle cx="20" cy="20" r="16" fill="none" stroke={accent} strokeWidth="3"
                    strokeDasharray={`${2*Math.PI*16*pct/100} ${2*Math.PI*16}`}
                    strokeLinecap="round" style={{ transition:"stroke-dasharray 0.5s ease" }} />
                </svg>
                <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:700, color:accent }}>
                  {pct}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile dropdown */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }}
              transition={{ duration:0.15 }}
              className="md:hidden flex-shrink-0 border-b border-border bg-white overflow-y-auto"
              style={{ maxHeight:"52vh", boxShadow:"0 8px 24px rgba(26,20,16,0.12)", zIndex:30 }}
            >
              {activeSubTab === "display" && storeGroups.map(group => {
                const gAcc = SECTION_ACCENT[group.type] ?? "#B8914A";
                return (
                  <div key={group.name}>
                    <div style={{ padding:"8px 16px", background:"#F9F7F4", borderBottom:"1px solid #EAE6E0" }}>
                      <p style={{ fontSize:9, letterSpacing:"0.18em", fontWeight:700, color:gAcc, textTransform:"uppercase" }}>{group.name}</p>
                    </div>
                    {group.subs.map(({ id, name, sub }) => {
                      const { filled, total } = storeSubStats(sub);
                      const isSel = selectedStoreSub?.id === id;
                      return (
                        <button key={id} onClick={() => { setSelectedStoreId(id); setMobileMenuOpen(false); }}
                          style={{
                            width:"100%", textAlign:"left", padding:"12px 20px",
                            display:"flex", alignItems:"center", justifyContent:"space-between",
                            borderBottom:"1px solid rgba(220,216,208,0.25)",
                            borderLeft:`3px solid ${isSel?gAcc:"transparent"}`,
                            paddingLeft:isSel?17:20,
                            background:isSel?"#F9F7F4":"transparent",
                            border:"none", cursor:"pointer",
                          }}>
                          <span style={{ fontSize:14, color:isSel?"#1A1410":"#9A9080", fontWeight:isSel?600:400 }}>{name}</span>
                          <span style={{ fontSize:10, marginLeft:12, flexShrink:0, fontWeight:500, color:filled>0?gAcc:"#C8C0B8" }}>{filled}/{total}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
              {activeSubTab === "warehouse" && warehouseShelves.map(shelf => {
                const wAcc = shelf.shelfType === "shoes" ? "#5A7898" : "#9A7050";
                const { filled, total } = warehouseStats(shelf);
                const isSel = selectedWHShelf?.id === shelf.id;
                return (
                  <button key={shelf.id} onClick={() => { setSelectedWHId(shelf.id); setMobileMenuOpen(false); }}
                    style={{
                      width:"100%", textAlign:"left", padding:"12px 20px",
                      display:"flex", alignItems:"center", justifyContent:"space-between",
                      borderBottom:"1px solid rgba(220,216,208,0.25)",
                      borderLeft:`3px solid ${isSel?wAcc:"transparent"}`,
                      paddingLeft:isSel?17:20,
                      background:isSel?"#F9F7F4":"transparent",
                      border:"none", cursor:"pointer",
                    }}>
                    <span style={{ fontSize:14, color:isSel?"#1A1410":"#9A9080", fontWeight:isSel?600:400 }}>{shelf.name}</span>
                    <span style={{ fontSize:10, marginLeft:12, flexShrink:0, fontWeight:500, color:filled>0?wAcc:"#C8C0B8" }}>{filled}/{total}</span>
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Legend */}
        <div className="hidden md:flex" style={{ padding:"5px 16px", borderBottom:"1px solid rgba(220,216,208,0.5)", background:"#FAFAF8", flexShrink:0, alignItems:"center", gap:12, flexWrap:"wrap" }}>
          <span style={{ fontSize:7, color:"#9A9080", letterSpacing:"0.25em", fontWeight:600, textTransform:"uppercase" }}>Màu:</span>
          {LEGEND.map(({ l, c }) => (
            <div key={l} style={{ display:"flex", alignItems:"center", gap:5 }}>
              <div style={{ width:8, height:8, borderRadius:2, background:c }} />
              <span style={{ fontSize:8, color:"#9A9080" }}>{l}</span>
            </div>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex:1, overflow:viewMode==="3d"?"hidden":"auto", padding:viewMode==="3d"?0:20 }}>
          <AnimatePresence mode="wait">
            {viewMode === "3d" ? (
              <motion.div key="3d" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                style={{ width:"100%", height:"100%", background:"#0C0C10" }}
              >
                {activeSubTab === "display" && selectedStoreSub ? (
                  <Scene3DCanvas camY={camYTarget}>
                    <StoreSub3D sub={selectedStoreSub.sub} prodMap={prodMap} />
                  </Scene3DCanvas>
                ) : activeSubTab === "warehouse" && selectedWHShelf ? (
                  <Scene3DCanvas camY={camYTarget}>
                    <WarehouseShelf3D shelf={selectedWHShelf} prodMap={prodMap} />
                  </Scene3DCanvas>
                ) : (
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%" }}>
                    <p style={{ color:"rgba(255,255,255,0.25)", fontSize:12 }}>Chọn kệ bên trái</p>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div key="2d" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
                {activeSubTab === "display"
                  ? (selectedStoreSub ? <StoreSub2D sub={selectedStoreSub.sub} prodMap={prodMap} /> : <Empty label="Chọn kệ trưng bày bên trái" />)
                  : (selectedWHShelf  ? <WarehouseSub2D shelf={selectedWHShelf} prodMap={prodMap} /> : <Empty label="Chọn kệ kho bên trái" />)
                }
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:200, gap:12, color:"#9A9080" }}>
      <span style={{ fontSize:36, opacity:0.1 }}>◫</span>
      <p style={{ fontSize:10, letterSpacing:"0.2em", textTransform:"uppercase", fontWeight:500 }}>{label}</p>
    </div>
  );
}

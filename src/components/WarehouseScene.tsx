"use client";

import { useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import WASDControls from "./WASDControls";
import * as THREE from "three";
import { useStore } from "@/store/useStore";
import { WarehouseShelf } from "@/types";

// ─── Box layout constants ──────────────────────────────────────────────────────
const BW = 0.52;   // box width
const BH = 0.30;   // box height
const BD = 0.36;   // box depth
const COL_GAP = 0.60;
const TIER_GAP = 0.38;
const SHELF_THICK = 0.048;
const SHELF_D = 0.82;
const SHELF_W = 5 * COL_GAP + 0.20;  // 5 columns

const BOX_COLORS: Record<string, string> = {
  "Giày nữ": "#C49A6C", "Giày nam": "#5A7888", "Bốt nữ": "#C4A080",
  "Bốt nam": "#6A8094", "Sandal nữ": "#D4A090", "Sandal nam": "#8890C4",
  "Giày trẻ em": "#8DC4A0", "Sandal trẻ em": "#A0D4B8",
  "Túi nữ": "#9B7060", "Túi nam": "#607080", "Phụ kiện": "#7A8B6B",
  "Trang sức": "#B8A045", "Giày dép": "#C4A882", "Túi xách": "#8D7B6B",
};
const DEFAULT_BOX = "#B0A090";

// ─── Single shoe box with label + barcode ─────────────────────────────────────
function ShoeBox({ color, sku, facing }: { color: string; sku: string; facing: number }) {
  const fz = facing;  // +1 = facing camera (front), -1 = facing back
  return (
    <group>
      {/* Box body */}
      <mesh>
        <boxGeometry args={[BW, BH, BD]} />
        <meshStandardMaterial color={color} roughness={0.88} metalness={0.01} />
      </mesh>
      {/* White label on front face */}
      <mesh position={[0, 0, fz * (BD / 2 + 0.003)]}>
        <planeGeometry args={[BW - 0.08, BH * 0.78]} />
        <meshStandardMaterial color="#F8F4EE" roughness={0.9} />
      </mesh>
      {/* Barcode lines */}
      {Array.from({ length: 14 }, (_, i) => {
        const w = i % 3 === 0 ? 0.012 : 0.006;
        const x = -0.11 + i * 0.016;
        return (
          <mesh key={i} position={[x, -BH * 0.14, fz * (BD / 2 + 0.007)]}>
            <planeGeometry args={[w, BH * 0.28]} />
            <meshStandardMaterial color="#1A1A1A" />
          </mesh>
        );
      })}
      {/* SKU text */}
      <Text
        position={[0, BH * 0.22, fz * (BD / 2 + 0.008)]}
        fontSize={0.055}
        color="#2A2A2A"
        anchorX="center"
        anchorY="middle"
        maxWidth={BW - 0.1}
        font={undefined}
      >
        {sku.slice(0, 8).toUpperCase()}
      </Text>
    </group>
  );
}

// ─── Metal shelf unit (1 shelf = 4 tiers × 5 cols × 5 rows) ──────────────────
function WarehouseShelfUnit({
  shelf,
  position,
  rotation,
  onHover,
  isHovered,
}: {
  shelf: WarehouseShelf;
  position: [number, number, number];
  rotation: [number, number, number];
  onHover: (id: string | null) => void;
  isHovered: boolean;
}) {
  const { products } = useStore();
  const { gl } = useThree();
  const [localHov, setLocalHov] = useState(false);

  const facing = Math.cos(rotation[1]) >= 0 ? 1 : -1;
  const numTiers = shelf.tiers.length;
  const shelfH = numTiers * TIER_GAP + SHELF_THICK * (numTiers + 1) + 0.22;

  // Build a flat list of boxes to render (front row = col 0..4, row 0 = row closest to front)
  const tiers = shelf.tiers.map((tier) => {
    // Each tier = 25 slots (5cols × 5rows). We show the front 5 slots (row 0: indices 0-4)
    const frontRow = tier.slice(0, 5);
    return frontRow;
  });

  return (
    <group
      position={position}
      rotation={rotation}
      onPointerOver={(e) => { e.stopPropagation(); setLocalHov(true); onHover(shelf.id); gl.domElement.style.cursor = "pointer"; }}
      onPointerOut={() => { setLocalHov(false); onHover(null); gl.domElement.style.cursor = "default"; }}
    >
      {/* Metal upright frames */}
      {([-1, 1] as const).map((s) => (
        <mesh key={`up${s}`} position={[s * (SHELF_W / 2 + 0.06), shelfH / 2 - 0.1, 0]}>
          <boxGeometry args={[0.055, shelfH, SHELF_D + 0.06]} />
          <meshStandardMaterial color="#2E3A48" roughness={0.40} metalness={0.78} />
        </mesh>
      ))}
      {/* Back uprights */}
      {([-1, 1] as const).map((s) => (
        <mesh key={`bup${s}`} position={[s * (SHELF_W / 2 + 0.06), shelfH / 2 - 0.1, -SHELF_D / 2 + 0.04]}>
          <boxGeometry args={[0.03, shelfH, 0.04]} />
          <meshStandardMaterial color="#2E3A48" roughness={0.40} metalness={0.78} />
        </mesh>
      ))}

      {/* Tier boards + boxes */}
      {Array.from({ length: numTiers }, (_, ti) => {
        const boardY = ti * TIER_GAP + SHELF_THICK;
        return (
          <group key={ti}>
            {/* Shelf board */}
            <mesh position={[0, boardY, 0]}>
              <boxGeometry args={[SHELF_W + 0.12, SHELF_THICK, SHELF_D]} />
              <meshStandardMaterial color="#3A4858" roughness={0.44} metalness={0.70} />
            </mesh>
            {/* Boxes on this tier */}
            {tiers[ti].map((productId, ci) => {
              if (!productId) return null;
              const product = products.find((p) => p.id === productId);
              if (!product) return null;
              const colX = (ci - 2) * COL_GAP;
              const boxY = boardY + SHELF_THICK / 2 + BH / 2;
              const boxColor = BOX_COLORS[product.category] ?? DEFAULT_BOX;
              const sku = product.sku || product.name.slice(0, 6);
              return (
                <group key={ci} position={[colX, boxY, -0.05]}>
                  <ShoeBox color={boxColor} sku={sku} facing={facing} />
                </group>
              );
            })}
          </group>
        );
      })}

      {/* Top board */}
      <mesh position={[0, numTiers * TIER_GAP + SHELF_THICK, 0]}>
        <boxGeometry args={[SHELF_W + 0.12, SHELF_THICK, SHELF_D]} />
        <meshStandardMaterial color="#3A4858" roughness={0.44} metalness={0.70} />
      </mesh>

      {/* Shelf name label (on the side frame) */}
      <Text
        position={[0, shelfH + 0.12, 0]}
        fontSize={0.13}
        color={isHovered ? "#7AA0C8" : "#3A5060"}
        anchorX="center"
        anchorY="middle"
        font={undefined}
      >
        {shelf.name}
      </Text>
      {shelf.notes && isHovered && (
        <Text
          position={[0, shelfH + 0.28, 0]}
          fontSize={0.09}
          color="#4A6070"
          anchorX="center"
          anchorY="middle"
          maxWidth={SHELF_W}
          font={undefined}
        >
          {shelf.notes}
        </Text>
      )}

      {/* Hover outline effect */}
      {localHov && (
        <mesh position={[0, shelfH / 2 - 0.1, 0]}>
          <boxGeometry args={[SHELF_W + 0.28, shelfH + 0.04, SHELF_D + 0.14]} />
          <meshStandardMaterial color="#7AA0C8" transparent opacity={0.06} wireframe={false} />
        </mesh>
      )}
    </group>
  );
}

// ─── Full warehouse scene ──────────────────────────────────────────────────────
function WarehouseContent({ onHover, hoveredId }: { onHover: (id: string | null) => void; hoveredId: string | null }) {
  const { warehouseShelves } = useStore();

  const SHELF_SPACING = 4.2;  // center-to-center X spacing
  const AISLE = 3.0;          // aisle width between facing rows

  // ─── Shoe shelves: 14 total, 7 per row, 2 rows ─────────────────────────────
  const shoeShelfZ1 = -AISLE / 2 - 0.5;   // row 1 (facing +Z = toward aisle)
  const shoeShelfZ2 = -AISLE / 2 - SHELF_D - 0.9;  // row 2 (facing +Z = toward aisle)
  const shoeXStart = -(3 * SHELF_SPACING);

  // Row 1: shoes 0-6, Row 2: shoes 7-13
  const shoeRow1 = warehouseShelves.filter((s) => s.shelfType === "shoes").slice(0, 7);
  const shoeRow2 = warehouseShelves.filter((s) => s.shelfType === "shoes").slice(7, 14);

  // ─── Bag shelves: 8 total, 4 per row, 2 rows ───────────────────────────────
  const bagShelfZ1 = AISLE / 2 + 0.5;
  const bagShelfZ2 = AISLE / 2 + SHELF_D + 0.9;
  const bagXStart = -(1.5 * SHELF_SPACING);

  const bagRow1 = warehouseShelves.filter((s) => s.shelfType === "bags").slice(0, 4);
  const bagRow2 = warehouseShelves.filter((s) => s.shelfType === "bags").slice(4, 8);

  const shelfH = 4 * TIER_GAP + SHELF_THICK * 5 + 0.22;
  const floorY = -0.05;

  // Aisle labels
  const aisleZ = (shoeShelfZ1 + bagShelfZ1) / 2;

  return (
    <group>
      {/* Concrete floor */}
      <mesh position={[0, floorY, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[80, 50]} />
        <meshStandardMaterial color="#111418" roughness={0.96} />
      </mesh>

      {/* Floor grid lines */}
      {Array.from({ length: 16 }, (_, i) => (
        <mesh key={`gx${i}`} position={[(i - 7.5) * 4, floorY + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.02, 50]} />
          <meshStandardMaterial color="#181C20" />
        </mesh>
      ))}
      {Array.from({ length: 12 }, (_, i) => (
        <mesh key={`gz${i}`} position={[0, floorY + 0.001, (i - 5.5) * 4]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[80, 0.02]} />
          <meshStandardMaterial color="#181C20" />
        </mesh>
      ))}

      {/* Ceiling */}
      <mesh position={[0, shelfH + 2.8, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[80, 50]} />
        <meshStandardMaterial color="#0E1014" roughness={0.98} />
      </mesh>

      {/* Section label: KỆ GIÀY */}
      <Text position={[0, shelfH + 0.7, shoeShelfZ1 + 0.5]} fontSize={0.22} color="#2A3848"
        anchorX="center" anchorY="middle" letterSpacing={0.2} font={undefined}>
        KỆ GIÀY
      </Text>
      {/* Section label: KỆ TÚI */}
      <Text position={[0, shelfH + 0.7, bagShelfZ1 - 0.5]} fontSize={0.22} color="#2A3848"
        anchorX="center" anchorY="middle" letterSpacing={0.2} font={undefined}>
        KỆ TÚI
      </Text>

      {/* ── Shoe row 1 (7 shelves, facing toward aisle/camera) ──────────────── */}
      {shoeRow1.map((shelf, i) => (
        <WarehouseShelfUnit
          key={shelf.id}
          shelf={shelf}
          position={[shoeXStart + i * SHELF_SPACING, floorY, shoeShelfZ1]}
          rotation={[0, 0, 0]}
          onHover={onHover}
          isHovered={hoveredId === shelf.id}
        />
      ))}

      {/* ── Shoe row 2 (7 shelves, facing toward aisle) ─────────────────────── */}
      {shoeRow2.map((shelf, i) => (
        <WarehouseShelfUnit
          key={shelf.id}
          shelf={shelf}
          position={[shoeXStart + i * SHELF_SPACING, floorY, shoeShelfZ2]}
          rotation={[0, Math.PI, 0]}
          onHover={onHover}
          isHovered={hoveredId === shelf.id}
        />
      ))}

      {/* ── Bag row 1 (4 shelves) ────────────────────────────────────────────── */}
      {bagRow1.map((shelf, i) => (
        <WarehouseShelfUnit
          key={shelf.id}
          shelf={shelf}
          position={[bagXStart + i * SHELF_SPACING, floorY, bagShelfZ1]}
          rotation={[0, Math.PI, 0]}
          onHover={onHover}
          isHovered={hoveredId === shelf.id}
        />
      ))}

      {/* ── Bag row 2 (4 shelves) ────────────────────────────────────────────── */}
      {bagRow2.map((shelf, i) => (
        <WarehouseShelfUnit
          key={shelf.id}
          shelf={shelf}
          position={[bagXStart + i * SHELF_SPACING, floorY, bagShelfZ2]}
          rotation={[0, 0, 0]}
          onHover={onHover}
          isHovered={hoveredId === shelf.id}
        />
      ))}
    </group>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function WarehouseScene() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [mode, setMode] = useState<"orbit" | "wasd">("orbit");

  return (
    <div className="relative w-full h-full">
    <Canvas
      camera={{ position: [0, 7, 18], fov: 52 }}
      gl={{ antialias: true, alpha: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 2.2 }}
      shadows
      style={{ width: "100%", height: "100%" }}
    >
      <color attach="background" args={["#0E1218"]} />

      {/* Strong industrial warehouse lighting */}
      <ambientLight intensity={0.55} color="#C8D8E8" />
      <directionalLight position={[0, 14, 6]} intensity={1.2} color="#D8E8F4" castShadow />
      <directionalLight position={[0, 8, -6]} intensity={0.5} color="#B8C8D8" />

      {/* Row lighting strips */}
      {[-12, -6, 0, 6, 12].map((x) => (
        <group key={x}>
          <spotLight position={[x, 7, -4]} intensity={110} angle={0.55} penumbra={0.50}
            color="#EAF4FF" castShadow />
          <spotLight position={[x, 7, 2.5]} intensity={90} angle={0.55} penumbra={0.50}
            color="#EAF4FF" castShadow />
        </group>
      ))}
      <pointLight position={[0, 5, 0]} intensity={30} color="#C8E0F8" />
      <pointLight position={[-8, 4, -1]} intensity={20} color="#D8ECF8" />
      <pointLight position={[8, 4, -1]} intensity={20} color="#D8ECF8" />

      <WarehouseContent onHover={setHoveredId} hoveredId={hoveredId} />

      {mode === "orbit" ? (
        <OrbitControls
          enablePan
          maxPolarAngle={Math.PI / 2.1}
          minPolarAngle={Math.PI / 8}
          minDistance={4}
          maxDistance={40}
          target={[0, 1.5, 0]}
          enableDamping
          dampingFactor={0.06}
        />
      ) : (
        <WASDControls speed={6} minY={0.5} maxY={14} minZ={-18} maxZ={22} minX={-20} maxX={20} />
      )}
    </Canvas>
    {/* Mode switcher */}
    <div className="absolute bottom-3 right-3 z-10 flex gap-1.5">
      <button onClick={() => setMode("orbit")}
        className={`px-2.5 py-1 text-[9px] tracking-wider rounded-sm border transition-all ${
          mode === "orbit"
            ? "bg-white/20 text-white border-white/30 shadow-sm"
            : "bg-black/20 text-white/60 border-white/10 hover:bg-white/20"
        }`}>
        🖱 XOAY
      </button>
      <button onClick={() => setMode("wasd")}
        className={`px-2.5 py-1 text-[9px] tracking-wider rounded-sm border transition-all ${
          mode === "wasd"
            ? "bg-white/20 text-white border-white/30 shadow-sm"
            : "bg-black/20 text-white/60 border-white/10 hover:bg-white/20"
        }`}>
        ⌨ WASD
      </button>
    </div>
    {mode === "wasd" && (
      <div className="absolute bottom-3 left-3 z-10 pointer-events-none">
        <div className="bg-black/55 backdrop-blur-sm border border-white/10 rounded-sm px-3 py-2 min-w-[160px]">
          <p className="text-[8px] text-white/50 tracking-widest uppercase mb-1.5">Điều khiển</p>
          <div className="grid grid-cols-3 gap-0.5 text-center mb-1.5">
            {["", "W", ""].map((k, i) => <span key={i} className={`text-[8px] px-1.5 py-0.5 rounded ${k ? "bg-white/15 border border-white/20 text-white/80 font-medium" : ""}`}>{k}</span>)}
            {["A", "S", "D"].map(k => <span key={k} className="text-[8px] px-1.5 py-0.5 rounded bg-white/15 border border-white/20 text-white/80 font-medium">{k}</span>)}
          </div>
          <div className="flex flex-col gap-0.5 text-[7px] text-white/45">
            <span><kbd className="bg-white/10 border border-white/15 px-1 rounded text-[7px] text-white/70">Space</kbd> Lên · <kbd className="bg-white/10 border border-white/15 px-1 rounded text-[7px] text-white/70">Shift</kbd> Xuống</span>
            <span><kbd className="bg-white/10 border border-white/15 px-1 rounded text-[7px] text-white/70">Q</kbd> Trái · <kbd className="bg-white/10 border border-white/15 px-1 rounded text-[7px] text-white/70">E</kbd> Phải</span>
            <span><kbd className="bg-white/10 border border-white/15 px-1 rounded text-[7px] text-white/70">R</kbd> Lên · <kbd className="bg-white/10 border border-white/15 px-1 rounded text-[7px] text-white/70">F</kbd> Xuống (nhìn)</span>
            <span>Kéo chuột để xoay tự do</span>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}

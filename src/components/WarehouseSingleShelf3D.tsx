"use client";

import { useState, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";
import { useStore } from "@/store/useStore";
import { WarehouseShelf } from "@/types";

const BW = 0.32;
const BH = 0.18;
const BD = 0.28;
const COL_GAP = 0.36;
const TIER_GAP = 0.30;
const SHELF_THICK = 0.042;
const SHELF_D = 0.80;
const SHELF_W = 5 * COL_GAP + 0.10;
const NUM_COLS = 5;

const CATEGORY_COLORS: Record<string, string> = {
  "Giày nữ": "#C49A6C", "Giày nam": "#5A6878", "Bốt nữ": "#C4A080",
  "Bốt nam": "#6A8094", "Sandal nữ": "#D4A090", "Sandal nam": "#8890C4",
  "Túi nữ": "#9B7060", "Túi nam": "#607080", "Phụ kiện": "#7A8B6B",
  "Trang sức": "#B8A045",
};

function ShelfProduct({ category, color }: { category: string; color: string }) {
  const dk = new THREE.Color(color).lerp(new THREE.Color("#1A0800"), 0.35).getStyle();
  const lt = new THREE.Color(color).lerp(new THREE.Color("#FFFFFF"), 0.4).getStyle();
  const isBag = category.includes("Túi");
  const isAcc = category.includes("Phụ") || category.includes("Trang");

  if (isBag) return (
    <group scale={[0.68, 0.68, 0.68]}>
      <mesh>
        <boxGeometry args={[BW * 1.1, BH * 1.4, BD * 0.9]} />
        <meshStandardMaterial color={color} roughness={0.35} />
      </mesh>
      <mesh position={[-(BW * 0.18), BH * 0.82, 0]}>
        <torusGeometry args={[BH * 0.42, 0.025, 8, 16, Math.PI]} />
        <meshStandardMaterial color={dk} roughness={0.4} />
      </mesh>
      <mesh position={[BW * 0.18, BH * 0.82, 0]}>
        <torusGeometry args={[BH * 0.42, 0.025, 8, 16, Math.PI]} />
        <meshStandardMaterial color={dk} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0, BD * 0.46]}>
        <boxGeometry args={[BW * 0.28, BH * 0.1, 0.02]} />
        <meshStandardMaterial color="#C9A96E" roughness={0.1} metalness={0.9} />
      </mesh>
    </group>
  );

  if (isAcc) return (
    <group scale={[0.72, 0.72, 0.72]}>
      <mesh>
        <torusGeometry args={[BW * 0.3, 0.06, 14, 32]} />
        <meshStandardMaterial color={color} roughness={0.1} metalness={0.85} />
      </mesh>
    </group>
  );

  return (
    <group>
      {/* Main box body */}
      <mesh>
        <boxGeometry args={[BW, BH, BD]} />
        <meshStandardMaterial color={color} roughness={0.75} />
      </mesh>
      {/* Front label face — slightly lighter */}
      <mesh position={[0, 0, BD / 2 + 0.002]}>
        <planeGeometry args={[BW - 0.04, BH - 0.03]} />
        <meshStandardMaterial color="#F8F4EE" roughness={0.85} />
      </mesh>
      {/* Color stripe on top */}
      <mesh position={[0, BH / 2 + 0.002, 0]}>
        <planeGeometry args={[BW - 0.04, BD - 0.04]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      {/* Gold accent line on front */}
      <mesh position={[0, BH * 0.3, BD / 2 + 0.003]}>
        <planeGeometry args={[BW * 0.55, 0.008]} />
        <meshStandardMaterial color="#C9A96E" roughness={0.1} metalness={0.9} />
      </mesh>
    </group>
  );
}

function SingleShelf3D({ shelf }: { shelf: WarehouseShelf }) {
  const { products } = useStore();
  const numTiers = shelf.tiers.length;
  const shelfH = numTiers * TIER_GAP + SHELF_THICK * (numTiers + 1) + 0.22;
  const accentColor = shelf.shelfType === "shoes" ? "#5A7898" : "#9A7050";
  const tierLabels = ["T4", "T3", "T2", "T1"];

  return (
    <group>
      {([-1, 1] as const).map(s => (
        <mesh key={`up${s}`} position={[s * (SHELF_W / 2 + 0.045), shelfH / 2, 0]}>
          <boxGeometry args={[0.042, shelfH + 0.08, SHELF_D + 0.06]} />
          <meshStandardMaterial color="#D4CEC8" roughness={0.35} metalness={0.72} />
        </mesh>
      ))}
      <mesh position={[0, shelfH / 2, -SHELF_D / 2 + 0.02]}>
        <boxGeometry args={[SHELF_W + 0.08, shelfH + 0.02, 0.025]} />
        <meshStandardMaterial color="#E8E4E0" roughness={0.55} />
      </mesh>
      {Array.from({ length: numTiers }, (_, ti) => {
        const boardY = ti * TIER_GAP + SHELF_THICK;
        const tier = shelf.tiers[ti];
        return (
          <group key={ti}>
            <mesh position={[0, boardY, 0]}>
              <boxGeometry args={[SHELF_W + 0.08, SHELF_THICK, SHELF_D]} />
              <meshStandardMaterial color="#F0ECE8" roughness={0.28} metalness={0.04} />
            </mesh>
            <mesh position={[0, boardY + SHELF_THICK / 2 + 0.005, SHELF_D / 2 - 0.008]}>
              <boxGeometry args={[SHELF_W, 0.008, 0.008]} />
              <meshStandardMaterial color="#FFFEF2" emissive="#FFFEF2" emissiveIntensity={3.5} />
            </mesh>
            {Array.from({ length: 5 }, (_, row) =>
              Array.from({ length: NUM_COLS }, (_, col) => {
                const slotIndex = row * NUM_COLS + col;
                const productId = tier[slotIndex];
                if (!productId) return null;
                const product = products.find(p => p.id === productId);
                if (!product) return null;
                const colX = (col - (NUM_COLS - 1) / 2) * COL_GAP;
                const rowZ = SHELF_D / 2 - BD * 0.55 - row * (BD + 0.02);
                const productY = boardY + SHELF_THICK / 2 + BH * 0.5;
                const catColor = CATEGORY_COLORS[product.category] ?? "#B0A090";
                return (
                  <group key={slotIndex} position={[colX, productY, rowZ]}>
                    <ShelfProduct category={product.category} color={catColor} />
                  </group>
                );
              })
            )}
            <Text
              position={[SHELF_W / 2 + 0.16, boardY + TIER_GAP / 2, 0]}
              fontSize={0.07}
              color="#9A9080"
              anchorX="left"
              anchorY="middle"
              font={undefined}
            >
              {tierLabels[ti] ?? `T${ti + 1}`}
            </Text>
          </group>
        );
      })}
      <mesh position={[0, numTiers * TIER_GAP + SHELF_THICK, 0]}>
        <boxGeometry args={[SHELF_W + 0.08, SHELF_THICK, SHELF_D]} />
        <meshStandardMaterial color="#F0ECE8" roughness={0.28} metalness={0.04} />
      </mesh>
      <Text
        position={[0, shelfH + 0.18, 0]}
        fontSize={0.14}
        color={accentColor}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.08}
        font={undefined}
      >
        {shelf.name.toUpperCase()}
      </Text>
      {shelf.notes && (
        <Text
          position={[0, shelfH + 0.36, 0]}
          fontSize={0.09}
          color="#9A9080"
          anchorX="center"
          anchorY="middle"
          maxWidth={SHELF_W}
          font={undefined}
        >
          {shelf.notes}
        </Text>
      )}
    </group>
  );
}

function SceneEnvironment() {
  return (
    <group>
      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 20]} />
        <meshStandardMaterial color="#C8945A" roughness={0.55} metalness={0.04} />
      </mesh>
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} position={[(i - 3.5) * 1.4, -0.018, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.01, 20]} />
          <meshStandardMaterial color="#B07840" />
        </mesh>
      ))}
      <mesh position={[0, 3, -3.8]}>
        <planeGeometry args={[30, 8]} />
        <meshStandardMaterial color="#F0EDE8" roughness={0.88} />
      </mesh>
      <mesh position={[-7, 3, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[20, 8]} />
        <meshStandardMaterial color="#EDEAE5" roughness={0.88} />
      </mesh>
    </group>
  );
}

export default function WarehouseSingleShelf3D({ shelves, initialIndex = 0 }: {
  shelves: WarehouseShelf[];
  initialIndex?: number;
}) {
  const [shelfIndex, setShelfIndex] = useState(initialIndex);
  const total = shelves.length;
  const idx = Math.max(0, Math.min(shelfIndex, total - 1));
  const shelf = shelves[idx];

  if (!shelf) return (
    <div className="flex h-full items-center justify-center text-text-muted text-sm">Kho trống</div>
  );

  const numTiers = shelf.tiers.length;
  const shelfH = numTiers * TIER_GAP + SHELF_THICK * (numTiers + 1) + 0.22;
  const camY = shelfH * 0.55;
  const camZ = shelfH * 1.95 + 1.2;
  const shelfGroup = shelf.shelfType === "shoes" ? "Kệ Giày" : "Kệ Túi";
  const groupColor = shelf.shelfType === "shoes" ? "#5A7898" : "#9A7050";
  const totalFilled = shelf.tiers.reduce((s, t) => s + t.filter(Boolean).length, 0);
  const totalSlots = shelf.tiers.length * 25;
  const fillPct = totalSlots > 0 ? Math.round((totalFilled / totalSlots) * 100) : 0;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-bg-base">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-bg-surface flex-shrink-0">
        <button
          onClick={() => setShelfIndex(i => Math.max(0, i - 1))}
          disabled={idx === 0}
          className={`flex items-center justify-center w-10 h-10 rounded-sm border text-xl font-light transition-all ${
            idx === 0
              ? "border-border/30 text-text-muted/30 cursor-not-allowed"
              : "border-border hover:border-border-strong text-text-muted hover:text-text-primary hover:bg-bg-card active:scale-95"
          }`}
        >←</button>

        <div className="flex flex-col items-center gap-0.5 flex-1 mx-4">
          <span className="text-[8px] tracking-[0.22em] uppercase font-medium" style={{ color: groupColor }}>{shelfGroup}</span>
          <span className="text-text-primary font-light text-lg leading-tight">{shelf.name}</span>
          <div className="flex items-center gap-1 mt-0.5">
            {shelves.map((s, i) => (
              <button key={s.id} onClick={() => setShelfIndex(i)}
                className="rounded-full transition-all"
                style={{
                  width: i === idx ? 16 : 6,
                  height: 6,
                  background: i === idx
                    ? (s.shelfType === "shoes" ? "#5A7898" : "#9A7050")
                    : "#C8C0B8",
                }}
              />
            ))}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-[8px] text-text-muted">{idx + 1} / {total}</span>
            <span className="text-[8px]" style={{ color: groupColor }}>{fillPct}% đầy</span>
          </div>
        </div>

        <button
          onClick={() => setShelfIndex(i => Math.min(total - 1, i + 1))}
          disabled={idx === total - 1}
          className={`flex items-center justify-center w-10 h-10 rounded-sm border text-xl font-light transition-all ${
            idx === total - 1
              ? "border-border/30 text-text-muted/30 cursor-not-allowed"
              : "border-border hover:border-border-strong text-text-muted hover:text-text-primary hover:bg-bg-card active:scale-95"
          }`}
        >→</button>
      </div>

      <div className="flex-1 relative overflow-hidden" style={{ minHeight: 0 }}>
        <Canvas
          camera={{ position: [0.8, camY, camZ], fov: 50 }}
          gl={{ antialias: true, alpha: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.4 }}
          shadows
          style={{ width: "100%", height: "100%" }}
        >
          <color attach="background" args={["#F2EFEB"]} />
          <ambientLight intensity={0.9} color="#FFF8F2" />
          <directionalLight position={[3, 6, 4]} intensity={0.85} color="#FFFFFF" castShadow />
          <directionalLight position={[-2, 4, 2]} intensity={0.4} color="#FFF4EE" />
          <pointLight position={[0, shelfH + 0.8, 2.2]} intensity={18} color="#FFFAF2" />
          <pointLight position={[-1.5, shelfH * 0.5, 2]} intensity={8} color="#FFFFFF" />
          <pointLight position={[1.5, shelfH * 0.5, 2]} intensity={8} color="#FFFFFF" />

          <SceneEnvironment />
          <Suspense fallback={null}>
            <SingleShelf3D shelf={shelf} />
          </Suspense>

          <OrbitControls
            enablePan={false}
            maxPolarAngle={Math.PI / 1.95}
            minPolarAngle={Math.PI / 8}
            minDistance={1.8}
            maxDistance={8}
            target={[0, shelfH * 0.45, 0]}
            enableDamping
            dampingFactor={0.06}
          />
        </Canvas>

        <div className="absolute top-3 right-3 pointer-events-none">
          <div className="bg-white/80 backdrop-blur-sm border border-border rounded-sm px-3 py-2 shadow-sm">
            <p className="text-[7px] text-text-muted tracking-widest uppercase mb-1">Sức chứa</p>
            <div className="w-20 h-1 bg-border rounded-full overflow-hidden mb-0.5">
              <div className="h-full rounded-full" style={{ width: `${fillPct}%`, background: groupColor, opacity: 0.8 }} />
            </div>
            <p className="text-[9px]" style={{ color: groupColor }}>{totalFilled}/{totalSlots} ô</p>
          </div>
        </div>

        <div className="absolute bottom-3 right-3 pointer-events-none">
          <p className="text-[7px] text-text-muted/70 tracking-widest bg-white/50 px-2 py-1 rounded-sm backdrop-blur-sm">
            Kéo để xoay · Scroll zoom
          </p>
        </div>
      </div>
    </div>
  );
}

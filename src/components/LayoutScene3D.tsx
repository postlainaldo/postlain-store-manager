"use client";

/**
 * LayoutScene3D — renders the 3D store from storeLayout Zustand state.
 *
 * Block sizes (Minecraft 1 unit = 1 metre):
 *   floor tile  = 1×0.15×1 m  (thin slab on ground)
 *   wall block  = 1×3.2×1  m  (full height solid)
 *
 * Coordinate mapping (2D editor → 3D world):
 *   2D x (col*gridSize) → 3D x = col*gridSize + gridSize/2 − roomW/2
 *   2D y (row*gridSize) → 3D z = row*gridSize + gridSize/2 − roomD/2
 */

import React, { useRef, useEffect, useMemo } from "react";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { useStore } from "@/store/useStore";
import { LayoutItem, LayoutItemType } from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────
export const FLOOR_H   = 0.15;   // floor slab height
export const WALL_H    = 3.20;   // wall block height
export const SHELF_H   = 2.47;   // real shelf height (247cm)
export const SHELF_D   = 0.40;   // real shelf depth (40cm)
export const WALL_COLOR = "#E8650A"; // orange wall

// ─── Helpers ─────────────────────────────────────────────────────────────────
function toRad(deg: number) { return (deg * Math.PI) / 180; }

/** Convert 2D layout item (top-left x,y in metres) → 3D world centre */
function to3D(x: number, y: number, w: number, h: number, roomW: number, roomD: number) {
  return {
    x: x + w / 2 - roomW / 2,
    z: y + h / 2 - roomD / 2,
  };
}

// ─── InstancedMesh grid (1 draw call per cell type) ──────────────────────────
const _m4 = new THREE.Matrix4();

function GridFloor({
  grid, gridSize, roomW, roomD,
}: {
  grid: import("@/types").FloorCellType[][];
  gridSize: number;
  roomW: number;
  roomD: number;
}) {
  let nFloor = 0, nWall = 0;
  grid.forEach(row => row.forEach(c => {
    if (c === "floor") nFloor++;
    else if (c === "wall") nWall++;
  }));

  const floorRef = useRef<THREE.InstancedMesh>(null);
  const wallRef  = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    let fi = 0, wi = 0;
    grid.forEach((row, ri) => {
      row.forEach((cell, ci) => {
        if (cell === "empty") return;
        const wx = ci * gridSize + gridSize / 2 - roomW / 2;
        const wz = ri * gridSize + gridSize / 2 - roomD / 2;
        if (cell === "floor" && floorRef.current) {
          _m4.setPosition(wx, FLOOR_H / 2, wz);
          floorRef.current.setMatrixAt(fi++, _m4);
        } else if (cell === "wall" && wallRef.current) {
          _m4.setPosition(wx, WALL_H / 2, wz);
          wallRef.current.setMatrixAt(wi++, _m4);
        }
      });
    });
    if (floorRef.current) {
      floorRef.current.count = fi;
      floorRef.current.instanceMatrix.needsUpdate = true;
    }
    if (wallRef.current) {
      wallRef.current.count = wi;
      wallRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [grid, gridSize, roomW, roomD]);

  if (nFloor === 0 && nWall === 0) return null;

  return (
    <group>
      {nFloor > 0 && (
        <instancedMesh ref={floorRef} args={[undefined, undefined, nFloor]} receiveShadow>
          {/* Full 1×1×1 cube so it looks like a real Minecraft block */}
          <boxGeometry args={[gridSize - 0.02, FLOOR_H, gridSize - 0.02]} />
          <meshStandardMaterial color="#C8B47A" roughness={0.75} />
        </instancedMesh>
      )}
      {nWall > 0 && (
        <instancedMesh ref={wallRef} args={[undefined, undefined, nWall]} castShadow>
          <boxGeometry args={[gridSize, WALL_H, gridSize]} />
          <meshStandardMaterial color={WALL_COLOR} roughness={0.65} />
        </instancedMesh>
      )}
    </group>
  );
}

// ─── 3D item components ───────────────────────────────────────────────────────
interface Item3DProps { item: LayoutItem; roomW: number; roomD: number; }

// WallShelf ───────────────────────────────────────────────────────────────────
// Real dims: height=2.47m, depth=0.40m, width driven by item.w
// 5 tiers, spaced 0.43m each (247cm / 5 ≈ 49cm per tier)
function WallShelf3D({ item, roomW, roomD }: Item3DProps) {
  const { x: wx, z: wz } = to3D(item.x, item.y, item.w, item.h, roomW, roomD);
  const pw  = item.w;          // width from layout item
  const pd  = SHELF_D;         // depth 0.40m
  const shH = SHELF_H;         // 2.47m
  const TIERS   = 5;
  const tierGap = shH / TIERS; // ~0.494m per tier

  return (
    <group position={[wx, 0, wz]} rotation={[0, toRad(item.rotation), 0]}>
      {/* Back panel */}
      <mesh position={[0, shH / 2, -pd / 2 + 0.025]}>
        <boxGeometry args={[pw, shH, 0.04]} />
        <meshStandardMaterial color="#EFEFED" roughness={0.35} />
      </mesh>
      {/* Left + right uprights */}
      {([-pw / 2 + 0.02, pw / 2 - 0.02] as const).map((xOff, i) => (
        <mesh key={i} position={[xOff, shH / 2, 0]}>
          <boxGeometry args={[0.04, shH, pd]} />
          <meshStandardMaterial color="#D8D5D0" roughness={0.30} metalness={0.06} />
        </mesh>
      ))}
      {/* Tier shelves */}
      {Array.from({ length: TIERS }, (_, ti) => {
        const sy = 0.15 + ti * tierGap;
        return (
          <group key={ti}>
            {/* Shelf board */}
            <mesh position={[0, sy, 0]}>
              <boxGeometry args={[pw - 0.06, 0.022, pd - 0.04]} />
              <meshStandardMaterial color="#F2EFE8" roughness={0.20} metalness={0.02} />
            </mesh>
            {/* LED strip at front edge */}
            <mesh position={[0, sy + 0.013, pd / 2 - 0.03]}>
              <boxGeometry args={[pw - 0.10, 0.006, 0.007]} />
              <meshStandardMaterial color="#FFFEF0" emissive="#FFFEF0" emissiveIntensity={2.5} />
            </mesh>
          </group>
        );
      })}
      {/* Label */}
      <Text position={[0, shH + 0.12, 0]} fontSize={0.09} color="#7A7268" anchorX="center" anchorY="middle" font={undefined}>
        {item.label}
      </Text>
    </group>
  );
}

// IslandShelf = Warehouse rack (4 tiers × 25 boxes = 100 boxes total) ────────
// Real dims: 1.20m wide × 0.30m deep × 2.20m tall, 0.50m per tier
function IslandShelf3D({ item, roomW, roomD }: Item3DProps) {
  const { x: wx, z: wz } = to3D(item.x, item.y, item.w, item.h, roomW, roomD);
  const { warehouseShelves, products } = useStore();
  // width/depth driven by layout item (already set to 1.20/0.30 in preset)
  const pw = item.w;
  const pd = item.h;

  // Each tier = COLS × ROWS flat boxes
  const TIERS = 4;
  const COLS  = item.shelfCols ?? 4;
  const ROWS  = item.shelfRows ?? 5;
  const TIER_H = 0.50;   // 50cm per tier (real spec)
  const rackH  = TIERS * TIER_H;  // 2.00m (top beam at 2.20m)
  const boxW   = (pw - 0.10) / COLS;
  const boxD   = (pd - 0.10) / ROWS;

  // Linked warehouse shelf
  const shelf = warehouseShelves.find(s => s.id === item.warehouseShelfId);

  // Build box colours from products
  const boxColors = useMemo(() => {
    if (!shelf) return [];
    return shelf.tiers.map(tier =>
      Array.from({ length: 25 }, (_, si) => {
        const pid = tier[si];
        if (!pid) return null;
        const p = products.find(x => x.id === pid);
        return p?.color ?? "#C8B898";
      })
    );
  }, [shelf, products]);

  return (
    <group position={[wx, 0, wz]} rotation={[0, toRad(item.rotation), 0]}>
      {/* 4 steel uprights */}
      {([-pw / 2 + 0.03, pw / 2 - 0.03] as const).map((xo, xi) =>
        ([-pd / 2 + 0.03, pd / 2 - 0.03] as const).map((zo, zi) => (
          <mesh key={`${xi}-${zi}`} position={[xo, rackH / 2, zo]}>
            <boxGeometry args={[0.05, rackH + 0.06, 0.05]} />
            <meshStandardMaterial color="#7A9CB8" roughness={0.35} metalness={0.70} />
          </mesh>
        ))
      )}
      {/* Tier shelves + boxes */}
      {Array.from({ length: TIERS }, (_, ti) => {
        const sy = ti * TIER_H;
        return (
          <group key={ti}>
            {/* Shelf board */}
            <mesh position={[0, sy + 0.016, 0]}>
              <boxGeometry args={[pw - 0.04, 0.032, pd - 0.04]} />
              <meshStandardMaterial color="#D4C8B0" roughness={0.55} />
            </mesh>
            {/* Cross beams front/back */}
            {([-pd / 2 + 0.03, pd / 2 - 0.03] as const).map((zo, bi) => (
              <mesh key={bi} position={[0, sy, zo]}>
                <boxGeometry args={[pw - 0.02, 0.030, 0.030]} />
                <meshStandardMaterial color="#5A8098" roughness={0.40} metalness={0.75} />
              </mesh>
            ))}
            {/* 25 box slots (5 cols × 5 rows) */}
            {Array.from({ length: COLS }, (_, ci) =>
              Array.from({ length: ROWS }, (_, ri) => {
                const slotIdx = ti < (boxColors?.length ?? 0) ? ci * ROWS + ri : -1;
                const col = slotIdx >= 0 ? boxColors[ti]?.[slotIdx] : null;
                const bx = -pw / 2 + 0.05 + ci * boxW + boxW / 2;
                const bz = -pd / 2 + 0.05 + ri * boxD + boxD / 2;
                return (
                  <mesh key={`${ci}-${ri}`} position={[bx, sy + 0.032 + (TIER_H - 0.10) / 2, bz]}>
                    <boxGeometry args={[boxW - 0.03, TIER_H - 0.10, boxD - 0.03]} />
                    <meshStandardMaterial
                      color={col ?? "#C0B090"}
                      roughness={0.65}
                      opacity={col ? 1 : 0.35}
                      transparent={!col}
                    />
                  </mesh>
                );
              })
            )}
          </group>
        );
      })}
      {/* Top beam */}
      <mesh position={[0, rackH + 0.03, 0]}>
        <boxGeometry args={[pw - 0.02, 0.04, pd - 0.02]} />
        <meshStandardMaterial color="#5A8098" roughness={0.40} metalness={0.75} />
      </mesh>
      <Text position={[0, rackH + 0.18, 0]} fontSize={0.10} color="#5A7898" anchorX="center" anchorY="middle" font={undefined}>
        {item.label}{shelf ? ` — ${shelf.name}` : " (chưa gán kệ)"}
      </Text>
    </group>
  );
}

// Tower ───────────────────────────────────────────────────────────────────────
function Tower3D({ item, roomW, roomD }: Item3DProps) {
  const { x: wx, z: wz } = to3D(item.x, item.y, item.w, item.h, roomW, roomD);
  const r = Math.min(item.w, item.h) / 2;
  return (
    <group position={[wx, 0, wz]} rotation={[0, toRad(item.rotation), 0]}>
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[r + 0.06, r + 0.10, 0.10, 24]} />
        <meshStandardMaterial color="#1A1816" roughness={0.45} />
      </mesh>
      <mesh position={[0, 1.15, 0]}>
        <cylinderGeometry args={[r, r, 2.20, 24]} />
        <meshStandardMaterial color="#222020" roughness={0.55} />
      </mesh>
      {Array.from({ length: 5 }, (_, i) => {
        const ay = 0.35 + i * 0.38;
        const angle = (i * 72 * Math.PI) / 180;
        return (
          <mesh key={i} position={[Math.cos(angle) * (r + 0.12), ay, Math.sin(angle) * (r + 0.12)]}
            rotation={[0, -angle, 0]}>
            <boxGeometry args={[0.25, 0.016, 0.04]} />
            <meshStandardMaterial color="#383634" roughness={0.62} metalness={0.30} />
          </mesh>
        );
      })}
      <Text position={[0, 2.50, 0]} fontSize={0.10} color="#9A8A7A" anchorX="center" anchorY="middle" font={undefined}>
        {item.label}
      </Text>
    </group>
  );
}

// ACC Panel — 1 trục giữa + 3 cánh × 2 mặt ──────────────────────────────────
function AccPanel3D({ item, roomW, roomD }: Item3DProps) {
  const { x: wx, z: wz } = to3D(item.x, item.y, item.w, item.h, roomW, roomD);
  const POLE_H  = 1.85;
  const ARM_LEN = 0.52;   // distance from pole centre to face centre
  const FACE_W  = 0.46;
  const FACE_H  = 1.38;
  const ARM_DEG = [0, 120, 240];

  return (
    <group position={[wx, 0, wz]} rotation={[0, toRad(item.rotation), 0]}>
      {/* Base disc */}
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.16, 0.20, 0.08, 16]} />
        <meshStandardMaterial color="#1A1816" roughness={0.45} metalness={0.35} />
      </mesh>

      {/* Central pole */}
      <mesh position={[0, POLE_H / 2, 0]}>
        <cylinderGeometry args={[0.028, 0.028, POLE_H, 12]} />
        <meshStandardMaterial color="#2A2826" roughness={0.38} metalness={0.68} />
      </mesh>

      {/* 3 arms */}
      {ARM_DEG.map((deg) => {
        const rad = toRad(deg);
        const sx = Math.sin(rad);
        const sz = Math.cos(rad);
        const armMidX = sx * ARM_LEN * 0.5;
        const armMidZ = sz * ARM_LEN * 0.5;
        const faceCX  = sx * ARM_LEN;
        const faceCZ  = sz * ARM_LEN;
        const faceCXb = sx * (ARM_LEN - 0.12);
        const faceCZb = sz * (ARM_LEN - 0.12);

        return (
          <group key={deg}>
            {/* Horizontal arm rod */}
            <mesh position={[armMidX, POLE_H * 0.74, armMidZ]} rotation={[0, -rad, 0]}>
              <boxGeometry args={[ARM_LEN, 0.022, 0.022]} />
              <meshStandardMaterial color="#3A3836" roughness={0.40} metalness={0.62} />
            </mesh>

            {/* Face A — outward side */}
            <mesh position={[faceCX, POLE_H * 0.50, faceCZ]} rotation={[0, -rad, 0]}>
              <boxGeometry args={[FACE_W, FACE_H, 0.036]} />
              <meshStandardMaterial color="#28205A" roughness={0.52} metalness={0.10} />
            </mesh>

            {/* Face B — back of same arm (rotated 180°) */}
            <mesh position={[faceCXb, POLE_H * 0.50, faceCZb]} rotation={[0, -rad + Math.PI, 0]}>
              <boxGeometry args={[FACE_W, FACE_H, 0.036]} />
              <meshStandardMaterial color="#201850" roughness={0.52} metalness={0.10} />
            </mesh>

            {/* Hook bars on Face A */}
            {Array.from({ length: 4 }, (_, j) => (
              <mesh key={j}
                position={[faceCX + sz * 0.04, 0.28 + j * (FACE_H * 0.24), faceCZ - sx * 0.04]}
                rotation={[Math.PI / 2, 0, -rad]}>
                <cylinderGeometry args={[0.007, 0.007, 0.10, 6]} />
                <meshStandardMaterial color="#888898" roughness={0.22} metalness={0.88} />
              </mesh>
            ))}
          </group>
        );
      })}

      {/* Top cap */}
      <mesh position={[0, POLE_H + 0.025, 0]}>
        <sphereGeometry args={[0.038, 8, 8]} />
        <meshStandardMaterial color="#2A2826" roughness={0.28} metalness={0.72} />
      </mesh>

      <Text position={[0, POLE_H + 0.18, 0]} fontSize={0.10} color="#9A8A7A" anchorX="center" anchorY="middle" font={undefined}>
        {item.label}
      </Text>
    </group>
  );
}

// Cashier ─────────────────────────────────────────────────────────────────────
function Cashier3D({ item, roomW, roomD }: Item3DProps) {
  const { x: wx, z: wz } = to3D(item.x, item.y, item.w, item.h, roomW, roomD);
  const pw = item.w; const pd = item.h;
  return (
    <group position={[wx, 0, wz]} rotation={[0, toRad(item.rotation), 0]}>
      <mesh position={[0, 0.52, 0]}>
        <boxGeometry args={[pw, 1.04, pd]} />
        <meshStandardMaterial color="#1A1816" roughness={0.45} />
      </mesh>
      <mesh position={[0, 1.05, 0]}>
        <boxGeometry args={[pw + 0.04, 0.04, pd + 0.04]} />
        <meshStandardMaterial color="#2A2826" roughness={0.28} metalness={0.18} />
      </mesh>
      <mesh position={[pw * 0.2, 1.30, -pd * 0.1]}>
        <boxGeometry args={[0.36, 0.26, 0.04]} />
        <meshStandardMaterial color="#111010" roughness={0.30} />
      </mesh>
      <mesh position={[pw * 0.2, 1.30, -pd * 0.1 + 0.025]}>
        <boxGeometry args={[0.32, 0.22, 0.005]} />
        <meshStandardMaterial color="#2A3A5A" emissive="#2A3A5A" emissiveIntensity={1.8} />
      </mesh>
      <Text position={[0, 1.55, pd * 0.5 + 0.05]} fontSize={0.09} color="#8A8A9A" anchorX="center" anchorY="middle" font={undefined}>
        {item.label}
      </Text>
    </group>
  );
}

// Shoecare ────────────────────────────────────────────────────────────────────
function Shoecare3D({ item, roomW, roomD }: Item3DProps) {
  const { x: wx, z: wz } = to3D(item.x, item.y, item.w, item.h, roomW, roomD);
  const pw = item.w; const pd = item.h;
  return (
    <group position={[wx, 0, wz]} rotation={[0, toRad(item.rotation), 0]}>
      <mesh position={[0, 0.40, 0]}>
        <boxGeometry args={[pw, 0.80, pd]} />
        <meshStandardMaterial color="#1E1C1A" roughness={0.50} />
      </mesh>
      <mesh position={[0, 0.81, 0]}>
        <boxGeometry args={[pw + 0.03, 0.03, pd + 0.03]} />
        <meshStandardMaterial color="#2A2826" roughness={0.30} metalness={0.15} />
      </mesh>
      {Array.from({ length: Math.floor(pw / 0.14) }, (_, i) => (
        <mesh key={i} position={[-pw / 2 + 0.09 + i * 0.14, 1.0, 0]}>
          <cylinderGeometry args={[0.03, 0.04, 0.22, 8]} />
          <meshStandardMaterial color="#3A3830" roughness={0.40} />
        </mesh>
      ))}
      <Text position={[0, 1.10, pd * 0.5 + 0.05]} fontSize={0.09} color="#8A8A7A" anchorX="center" anchorY="middle" font={undefined}>
        {item.label}
      </Text>
    </group>
  );
}

// Column ──────────────────────────────────────────────────────────────────────
function Column3D({ item, roomW, roomD }: Item3DProps) {
  const { x: wx, z: wz } = to3D(item.x, item.y, item.w, item.h, roomW, roomD);
  const r = Math.min(item.w, item.h) / 2;
  return (
    <group position={[wx, 0, wz]}>
      <mesh position={[0, 2.1, 0]}>
        <cylinderGeometry args={[r, r, 4.2, 16]} />
        <meshStandardMaterial color={item.color ?? "#9A9890"} roughness={0.38} metalness={0.08} />
      </mesh>
      {[0.06, 4.14].map((y, i) => (
        <mesh key={i} position={[0, y, 0]}>
          <boxGeometry args={[r * 2.4, 0.12, r * 2.4]} />
          <meshStandardMaterial color="#8A8880" roughness={0.42} />
        </mesh>
      ))}
    </group>
  );
}

// Window ──────────────────────────────────────────────────────────────────────
function Window3D({ item, roomW, roomD }: Item3DProps) {
  const { x: wx, z: wz } = to3D(item.x, item.y, item.w, item.h, roomW, roomD);
  const pw = item.w;
  const paneH = WALL_H * 0.55;
  const transomH = WALL_H * 0.28;
  return (
    <group position={[wx, 0, wz]} rotation={[0, toRad(item.rotation), 0]}>
      {/* Frame */}
      <mesh position={[0, WALL_H / 2, 0]}>
        <boxGeometry args={[pw, WALL_H, 0.15]} />
        <meshStandardMaterial color="#4A4840" roughness={0.42} metalness={0.18} />
      </mesh>
      {/* Upper glass pane */}
      <mesh position={[0, WALL_H * 0.67, 0.01]}>
        <boxGeometry args={[pw - 0.14, paneH, 0.04]} />
        <meshStandardMaterial color="#88CCFF" roughness={0.04} metalness={0.08} opacity={0.52} transparent />
      </mesh>
      {/* Lower transom */}
      <mesh position={[0, WALL_H * 0.20, 0.01]}>
        <boxGeometry args={[pw - 0.14, transomH, 0.04]} />
        <meshStandardMaterial color="#88CCFF" roughness={0.04} metalness={0.08} opacity={0.42} transparent />
      </mesh>
      {/* Horizontal divider rail */}
      <mesh position={[0, WALL_H * 0.40, 0.04]}>
        <boxGeometry args={[pw - 0.08, 0.055, 0.07]} />
        <meshStandardMaterial color="#3A3830" roughness={0.40} />
      </mesh>
      {/* Vertical mullion */}
      <mesh position={[0, WALL_H / 2 + 0.08, 0.04]}>
        <boxGeometry args={[0.055, WALL_H * 0.85, 0.07]} />
        <meshStandardMaterial color="#3A3830" roughness={0.40} />
      </mesh>
      {/* Window sill */}
      <mesh position={[0, 0.88, 0.10]}>
        <boxGeometry args={[pw + 0.04, 0.055, 0.22]} />
        <meshStandardMaterial color="#E0DDD5" roughness={0.28} />
      </mesh>
    </group>
  );
}

// Zone label ──────────────────────────────────────────────────────────────────
function Note3D({ item, roomW, roomD }: Item3DProps) {
  const { x: wx, z: wz } = to3D(item.x, item.y, item.w, item.h, roomW, roomD);
  return (
    <group position={[wx, 0, wz]} rotation={[0, toRad(item.rotation), 0]}>
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[item.w, item.h]} />
        <meshStandardMaterial color={item.color ?? "#F5EFD8"} roughness={0.80} opacity={0.45} transparent />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(item.w, 0.01, item.h)]} />
        <lineBasicMaterial color={item.color ?? "#C9A96E"} opacity={0.55} transparent />
      </lineSegments>
      <Text position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.22}
        color="#7A6848" anchorX="center" anchorY="middle" font={undefined} maxWidth={item.w - 0.3}>
        {item.label}
      </Text>
    </group>
  );
}

// Dispatch ────────────────────────────────────────────────────────────────────
function Item3D(props: Item3DProps) {
  const map: Partial<Record<LayoutItemType, React.ComponentType<Item3DProps>>> = {
    wall_shelf:   WallShelf3D,
    island_shelf: IslandShelf3D,
    tower:        Tower3D,
    acc_panel:    AccPanel3D,
    cashier:      Cashier3D,
    shoecare:     Shoecare3D,
    column:       Column3D,
    window:       Window3D,
    zone:         Note3D,
  };
  const C = map[props.item.type];
  return C ? <C {...props} /> : null;
}

// ─── Empty hint ───────────────────────────────────────────────────────────────
function EmptyHint() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#1A1816" roughness={0.95} />
      </mesh>
    </group>
  );
}

// ─── Main export ───────────────────────────────────────────────────────────────
export default function LayoutScene3D() {
  const { storeLayout } = useStore();
  const { roomW, roomD, gridSize, items } = storeLayout;
  const grid = storeLayout.grid ?? [];

  const hasContent = items.length > 0 || grid.some(row => row.some(c => c !== "empty"));
  if (!hasContent) return <EmptyHint />;

  return (
    <group>
      <GridFloor grid={grid} gridSize={gridSize} roomW={roomW} roomD={roomD} />
      {items.map(item => (
        <Item3D key={item.id} item={item} roomW={roomW} roomD={roomD} />
      ))}
    </group>
  );
}

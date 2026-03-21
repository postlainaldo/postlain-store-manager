"use client";

/**
 * StoreFloorScene — Minecraft-style 3D store builder
 * Optimized: single raycaster per frame, pointer-lock look, voxel aesthetic
 */

import { Suspense, useState, useRef, useEffect, useCallback, memo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useStore } from "@/store/useStore";
import { LayoutItemType, FloorCellType } from "@/types";
import LayoutScene3D from "@/components/LayoutScene3D";

// ─── Item definitions ──────────────────────────────────────────────────────────

type ItemId =
  | "floor" | "wall" | "erase"
  | "wall_shelf" | "island_shelf" | "tower"
  | "acc_panel" | "cashier" | "shoecare" | "window" | "column";

interface BuildItem {
  id: ItemId;
  label: string;
  color: string;      // block face color for the icon
  color2?: string;    // secondary color
  category: "tile" | "furniture";
  w?: number; h?: number; // furniture footprint in metres
}

const ITEMS: BuildItem[] = [
  { id: "floor",        label: "Sàn",       color: "#C8B580", color2: "#A0905A", category: "tile" },
  { id: "wall",         label: "Tường",     color: "#7A7060", color2: "#5A5248", category: "tile" },
  { id: "erase",        label: "Xóa",       color: "#C84830", color2: "#902018", category: "tile" },
  { id: "wall_shelf",   label: "Kệ tường",  color: "#D0C0A0", color2: "#A89070", category: "furniture", w: 2, h: 0.4 },
  { id: "island_shelf", label: "Kệ đảo",    color: "#7A9CB8", color2: "#4A6880", category: "furniture", w: 2.5, h: 1.0 },
  { id: "tower",        label: "Tháp",      color: "#3A3834", color2: "#1E1C1A", category: "furniture", w: 0.7, h: 0.7 },
  { id: "acc_panel",    label: "Kệ ACC",    color: "#6050A0", color2: "#402880", category: "furniture", w: 1.0, h: 1.0 },
  { id: "cashier",      label: "Thu ngân",  color: "#181614", color2: "#0A0808", category: "furniture", w: 1.8, h: 0.7 },
  { id: "shoecare",     label: "Shoecare",  color: "#1E1C1A", color2: "#3A3836", category: "furniture", w: 0.9, h: 0.5 },
  { id: "window",       label: "Cửa sổ",    color: "#88CCFF", color2: "#4499CC", category: "furniture", w: 4.0, h: 0.15 },
  { id: "column",       label: "Cột",       color: "#9A9888", color2: "#7A7868", category: "furniture", w: 0.4, h: 0.4 },
];

const HOTBAR = ITEMS.slice(0, 10);

// ─── Minecraft-style block icon (drawn on <canvas>) ───────────────────────────

const BlockIcon = memo(function BlockIcon({
  item, size = 44, selected,
}: { item: BuildItem; size?: number; selected?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const s = size;
    cv.width = s; cv.height = s;
    ctx.clearRect(0, 0, s, s);

    const c1 = item.color;
    const c2 = item.color2 ?? "#555";

    if (item.id === "erase") {
      // Red X
      ctx.fillStyle = "#C84830";
      ctx.beginPath(); ctx.roundRect(2, 2, s - 4, s - 4, 4); ctx.fill();
      ctx.strokeStyle = "#FF6050"; ctx.lineWidth = 3; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(s * 0.25, s * 0.25); ctx.lineTo(s * 0.75, s * 0.75); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s * 0.75, s * 0.25); ctx.lineTo(s * 0.25, s * 0.75); ctx.stroke();
      return;
    }

    // Isometric block face
    const p = s * 0.08; // padding
    const W = s - p * 2;
    const H = s - p * 2;
    const ox = p, oy = p;

    // Top face (lighter)
    const topC = lighten(c1, 0.28);
    const leftC = c1;
    const rightC = darken(c1, 0.22);

    // Isometric projection ratios
    const tw = W;         // top face width
    const th = H * 0.30;  // top face height
    const bh = H * 0.55;  // body height
    const bw = W * 0.50;  // side width

    // Top face
    ctx.fillStyle = topC;
    ctx.beginPath();
    ctx.moveTo(ox + tw * 0.5, oy);
    ctx.lineTo(ox + tw, oy + th);
    ctx.lineTo(ox + tw * 0.5, oy + th * 2);
    ctx.lineTo(ox, oy + th);
    ctx.closePath(); ctx.fill();

    // Left face
    ctx.fillStyle = leftC;
    ctx.beginPath();
    ctx.moveTo(ox, oy + th);
    ctx.lineTo(ox + bw, oy + th + th * 0.5);
    ctx.lineTo(ox + bw, oy + th + th * 0.5 + bh);
    ctx.lineTo(ox, oy + th + bh);
    ctx.closePath(); ctx.fill();

    // Right face
    ctx.fillStyle = rightC;
    ctx.beginPath();
    ctx.moveTo(ox + bw, oy + th + th * 0.5);
    ctx.lineTo(ox + tw, oy + th);
    ctx.lineTo(ox + tw, oy + th + bh);
    ctx.lineTo(ox + bw, oy + th + th * 0.5 + bh);
    ctx.closePath(); ctx.fill();

    // Grid lines on left face (for tile blocks)
    if (item.category === "tile") {
      ctx.strokeStyle = "rgba(0,0,0,0.18)";
      ctx.lineWidth = 0.8;
      for (let i = 1; i < 3; i++) {
        const y = oy + th + th * 0.5 + bh * (i / 3);
        ctx.beginPath();
        ctx.moveTo(ox, oy + th + bh * (i / 3));
        ctx.lineTo(ox + bw, y); ctx.stroke();
      }
    }

    // Subtle edge outline
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ox + tw * 0.5, oy);
    ctx.lineTo(ox + tw, oy + th);
    ctx.lineTo(ox + tw, oy + th + bh);
    ctx.lineTo(ox + bw, oy + th + th * 0.5 + bh);
    ctx.lineTo(ox, oy + th + bh);
    ctx.lineTo(ox, oy + th);
    ctx.closePath(); ctx.stroke();

    // Selection highlight
    if (selected) {
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ox + tw * 0.5, oy);
      ctx.lineTo(ox + tw, oy + th);
      ctx.lineTo(ox + tw, oy + th + bh);
      ctx.lineTo(ox + bw, oy + th + th * 0.5 + bh);
      ctx.lineTo(ox, oy + th + bh);
      ctx.lineTo(ox, oy + th);
      ctx.closePath(); ctx.stroke();
    }
  }, [item, size, selected]);

  return <canvas ref={canvasRef} width={size} height={size} style={{ imageRendering: "pixelated" }} />;
});

function lighten(hex: string, amt: number): string {
  const c = new THREE.Color(hex);
  return c.lerp(new THREE.Color("#ffffff"), amt).getStyle();
}
function darken(hex: string, amt: number): string {
  const c = new THREE.Color(hex);
  return c.lerp(new THREE.Color("#000000"), amt).getStyle();
}

// ─── Shared raycaster result (updated once per frame by a single component) ───

// Raw world-space hit (not snapped) — consumers snap to their own grid
interface RayHit { wx: number; wz: number; valid: boolean }
const rayHit: RayHit = { wx: 0, wz: 0, valid: false };

// How many grid cells per "tile block" (floor/wall paint region)
const TILE_BLOCK = 4;

// Snap raw world coord to nearest cell centre given gridSize and room offset
function snapToCell(v: number, gridSize: number, roomHalf: number): number {
  const col = Math.floor((v + roomHalf) / gridSize);
  return col * gridSize + gridSize / 2 - roomHalf;
}

// Snap to the CENTRE of a TILE_BLOCK × TILE_BLOCK region
function snapToTileBlock(v: number, gridSize: number, roomHalf: number): number {
  const col = Math.floor((v + roomHalf) / gridSize);
  const baseCol = Math.floor(col / TILE_BLOCK) * TILE_BLOCK;
  return baseCol * gridSize + (TILE_BLOCK * gridSize) / 2 - roomHalf;
}

function RaycastUpdater() {
  const { camera, raycaster } = useThree();
  const plane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const target = useRef(new THREE.Vector3());
  const center = useRef(new THREE.Vector2(0, 0));

  useFrame(() => {
    raycaster.setFromCamera(center.current, camera);
    const hit = raycaster.ray.intersectPlane(plane.current, target.current);
    if (hit) {
      rayHit.wx = target.current.x;
      rayHit.wz = target.current.z;
      rayHit.valid = true;
    } else {
      rayHit.valid = false;
    }
  });

  return null;
}

// Must match LayoutScene3D constants exactly
const FLOOR_H_GHOST = 0.15;
const WALL_H_GHOST  = 3.20;

// ─── Ghost block preview ───────────────────────────────────────────────────────

function GhostBlock({ itemId }: { itemId: ItemId }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { storeLayout } = useStore();
  const isWall  = itemId === "wall";
  const blockH  = isWall ? WALL_H_GHOST : FLOOR_H_GHOST;
  const item    = ITEMS.find(i => i.id === itemId);
  const col     = item?.color ?? "#FFFFFF";
  const fw = item?.w ?? 1;
  const fh = item?.h ?? 1;
  const isFurn = item?.category === "furniture";
  const isTile = item?.category === "tile";

  useFrame(() => {
    if (!meshRef.current) return;
    if (!rayHit.valid) { meshRef.current.visible = false; return; }
    const { gridSize, roomW, roomD } = storeLayout;
    let cx: number, cz: number;
    if (isTile) {
      cx = snapToTileBlock(rayHit.wx, gridSize, roomW / 2);
      cz = snapToTileBlock(rayHit.wz, gridSize, roomD / 2);
    } else {
      cx = snapToCell(rayHit.wx, gridSize, roomW / 2);
      cz = snapToCell(rayHit.wz, gridSize, roomD / 2);
    }
    const y = isFurn ? 0.5 : blockH / 2;
    meshRef.current.position.set(cx, y, cz);
    meshRef.current.visible = true;
  });

  if (itemId === "erase") return null;

  const tileSize = (storeLayout.gridSize ?? 1) * TILE_BLOCK;

  return (
    <mesh ref={meshRef} visible={false}>
      <boxGeometry args={[
        isTile ? tileSize - 0.04 : (isFurn ? fw - 0.05 : 0.98),
        isFurn ? 1.0 : blockH,
        isTile ? tileSize - 0.04 : (isFurn ? fh - 0.05 : 0.98),
      ]} />
      <meshStandardMaterial color={col} transparent opacity={0.50} depthWrite={false} />
    </mesh>
  );
}

// ─── Block highlight wireframe ─────────────────────────────────────────────────

function BlockHighlight({ itemId }: { itemId: ItemId }) {
  const groupRef = useRef<THREE.Group>(null);
  const { storeLayout } = useStore();
  const item = ITEMS.find(i => i.id === itemId);
  const isTile = item?.category === "tile";
  const tileSize = (storeLayout.gridSize ?? 1) * TILE_BLOCK;

  useFrame(() => {
    if (!groupRef.current) return;
    if (!rayHit.valid) { groupRef.current.visible = false; return; }
    const { gridSize, roomW, roomD } = storeLayout;
    let cx: number, cz: number;
    if (isTile) {
      cx = snapToTileBlock(rayHit.wx, gridSize, roomW / 2);
      cz = snapToTileBlock(rayHit.wz, gridSize, roomD / 2);
    } else {
      cx = snapToCell(rayHit.wx, gridSize, roomW / 2);
      cz = snapToCell(rayHit.wz, gridSize, roomD / 2);
    }
    groupRef.current.position.set(cx, FLOOR_H_GHOST, cz);
    groupRef.current.visible = true;
  });

  const sz = isTile ? tileSize + 0.04 : 1.04;

  return (
    <group ref={groupRef} visible={false}>
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(sz, 0.04, sz)]} />
        <lineBasicMaterial color="#FFFFFF" opacity={0.55} transparent />
      </lineSegments>
    </group>
  );
}

// ─── Minecraft Controls (pointer lock) ────────────────────────────────────────

function MinecraftControls({
  speed, sensitivity, onPosChange, onPlace, onRemove, onLockChange,
}: {
  speed: number; sensitivity: number;
  onPosChange: (x: number, z: number) => void;
  onPlace: () => void;
  onRemove: () => void;
  onLockChange: (v: boolean) => void;
}) {
  const { camera, gl } = useThree();
  const keys = useRef<Set<string>>(new Set());
  const euler = useRef(new THREE.Euler(0, 0, 0, "YXZ"));
  const bobT = useRef(0);
  const locked = useRef(false);
  const sensRef = useRef(sensitivity);
  const speedRef = useRef(speed);
  sensRef.current = sensitivity;
  speedRef.current = speed;

  useEffect(() => {
    euler.current.setFromQuaternion(camera.quaternion, "YXZ");
  }, [camera]);

  useEffect(() => {
    const cv = gl.domElement;

    const handleLockChange = () => {
      const isLocked = document.pointerLockElement === cv;
      locked.current = isLocked;
      onLockChange(isLocked);
    };
    const onLockError = () => { locked.current = false; };

    let breakInterval: ReturnType<typeof setInterval> | null = null;

    const onMd = (e: MouseEvent) => {
      if (!locked.current) { cv.requestPointerLock(); return; }
      if (e.button === 0) {
        onPlace();
      } else if (e.button === 2) {
        onRemove();
        breakInterval = setInterval(() => onRemove(), 120);
      }
    };
    const onMu = (e: MouseEvent) => {
      if (e.button === 2 && breakInterval) { clearInterval(breakInterval); breakInterval = null; }
    };
    const onCtx = (e: MouseEvent) => { e.preventDefault(); };

    const kd = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code)) e.preventDefault();
      keys.current.add(e.code);
    };
    const ku = (e: KeyboardEvent) => keys.current.delete(e.code);

    const mm = (e: MouseEvent) => {
      if (!locked.current) return;
      const s = sensRef.current * 0.001;
      euler.current.y -= e.movementX * s;
      euler.current.x = THREE.MathUtils.clamp(euler.current.x - e.movementY * s, -1.48, 1.48);
      camera.quaternion.setFromEuler(euler.current);
    };

    document.addEventListener("pointerlockchange", handleLockChange);
    document.addEventListener("pointerlockerror", onLockError);
    cv.addEventListener("mousedown", onMd);
    cv.addEventListener("mouseup", onMu);
    cv.addEventListener("contextmenu", onCtx);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    window.addEventListener("mousemove", mm);
    return () => {
      if (breakInterval) clearInterval(breakInterval);
      document.removeEventListener("pointerlockchange", handleLockChange);
      document.removeEventListener("pointerlockerror", onLockError);
      cv.removeEventListener("mousedown", onMd);
      cv.removeEventListener("mouseup", onMu);
      cv.removeEventListener("contextmenu", onCtx);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      window.removeEventListener("mousemove", mm);
    };
  }, [camera, gl, onPlace, onRemove, onLockChange]);

  useFrame((_, dt) => {
    if (!locked.current) return;
    const k = keys.current;
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const rgt = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    fwd.y = 0; fwd.normalize(); rgt.y = 0; rgt.normalize();

    const vel = new THREE.Vector3();
    const sprint = k.has("ShiftLeft") || k.has("ShiftRight") ? 2.2 : 1;
    if (k.has("KeyW") || k.has("ArrowUp"))    vel.addScaledVector(fwd,  1);
    if (k.has("KeyS") || k.has("ArrowDown"))  vel.addScaledVector(fwd, -1);
    if (k.has("KeyA") || k.has("ArrowLeft"))  vel.addScaledVector(rgt, -1);
    if (k.has("KeyD") || k.has("ArrowRight")) vel.addScaledVector(rgt,  1);

    const isMoving = vel.lengthSq() > 0;
    if (isMoving) {
      vel.normalize().multiplyScalar(speedRef.current * sprint * dt);
      camera.position.add(vel);
    }

    onPosChange(camera.position.x, camera.position.z);

    // Head bob
    const eyeH = 1.62;
    if (isMoving) {
      bobT.current += dt * 8;
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, eyeH + Math.sin(bobT.current) * 0.028, 0.2);
    } else {
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, eyeH, 0.14);
    }
  });

  return null;
}

// ─── Sky + lighting (Minecraft day look) ──────────────────────────────────────

function MinecraftSky() {
  return (
    <>
      {/* Sky gradient background via meshes */}
      <ambientLight intensity={0.85} color="#C8DEFF" />
      <directionalLight
        position={[20, 35, 15]}
        intensity={2.2}
        color="#FFF8E8"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.5}
        shadow-camera-far={80}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />
      <directionalLight position={[-10, 15, -8]} intensity={0.35} color="#AABBFF" />
    </>
  );
}

// ─── Ground plane ─────────────────────────────────────────────────────────────

function GroundPlane() {
  return (
    <>
      {/* Grass base */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[300, 300]} />
        <meshStandardMaterial color="#5A8A3A" roughness={0.95} />
      </mesh>
      {/* Grid lines */}
      <gridHelper args={[80, 80, "#4A7A2A", "#4A7A2A"]} position={[0, 0.001, 0]} />
    </>
  );
}

// ─── Crosshair (exact Minecraft style) ────────────────────────────────────────

function Crosshair() {
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
      {/* Outer shadow for contrast */}
      <div className="relative" style={{ width: 26, height: 26 }}>
        {/* Horizontal */}
        <div style={{
          position: "absolute", top: "50%", left: 0, right: 0,
          height: 2, background: "rgba(0,0,0,0.55)",
          transform: "translateY(-50%) scaleY(3)", filter: "blur(0px)",
        }} />
        <div style={{
          position: "absolute", top: "50%", left: 3, right: 3,
          height: 2, background: "white",
          transform: "translateY(-50%)",
        }} />
        {/* Vertical */}
        <div style={{
          position: "absolute", left: "50%", top: 0, bottom: 0,
          width: 2, background: "rgba(0,0,0,0.55)",
          transform: "translateX(-50%) scaleX(3)", filter: "blur(0px)",
        }} />
        <div style={{
          position: "absolute", left: "50%", top: 3, bottom: 3,
          width: 2, background: "white",
          transform: "translateX(-50%)",
        }} />
      </div>
    </div>
  );
}

// ─── Hotbar (Minecraft pixel style) ───────────────────────────────────────────

const HotbarHUD = memo(function HotbarHUD({
  items, selected, onSelect,
}: {
  items: BuildItem[]; selected: number; onSelect: (i: number) => void;
}) {
  return (
    <div
      className="absolute bottom-4 left-1/2 z-20 select-none pointer-events-none"
      style={{ transform: "translateX(-50%)" }}
    >
      {/* Minecraft-style hotbar background */}
      <div style={{
        display: "flex", gap: 2, padding: "3px 3px",
        background: "rgba(0,0,0,0.55)",
        border: "2px solid rgba(255,255,255,0.22)",
        borderRadius: 4,
        boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.8), 0 2px 8px rgba(0,0,0,0.6)",
        imageRendering: "pixelated",
      }}>
        {items.map((item, i) => (
          <div
            key={item.id}
            style={{
              position: "relative",
              width: 50, height: 50,
              background: i === selected
                ? "rgba(140,140,255,0.25)"
                : "rgba(0,0,0,0.30)",
              border: i === selected
                ? "2px solid rgba(255,255,255,0.85)"
                : "2px solid rgba(80,80,80,0.60)",
              borderRadius: 3,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              boxShadow: i === selected
                ? "inset 0 0 0 1px rgba(255,255,255,0.3), 0 0 6px rgba(200,200,255,0.4)"
                : "inset 0 0 0 1px rgba(0,0,0,0.4)",
              cursor: "pointer",
            }}
            onClick={() => onSelect(i)}
          >
            {/* Slot number */}
            <span style={{
              position: "absolute", top: 1, left: 3,
              fontSize: 9, color: "rgba(255,255,255,0.60)",
              fontFamily: "monospace", lineHeight: 1, userSelect: "none",
              textShadow: "1px 1px 0 rgba(0,0,0,0.8)",
            }}>{i + 1}</span>
            {/* Block icon */}
            <BlockIcon item={item} size={36} selected={i === selected} />
          </div>
        ))}
      </div>
      {/* Item name tooltip */}
      <div style={{
        textAlign: "center", marginTop: 4,
        fontSize: 11, color: "rgba(255,255,255,0.85)",
        fontFamily: "monospace", letterSpacing: "0.06em",
        textShadow: "1px 1px 2px rgba(0,0,0,0.9)",
      }}>
        {items[selected]?.label}
      </div>
    </div>
  );
});

// ─── Inventory (E key) ────────────────────────────────────────────────────────

const InventoryScreen = memo(function InventoryScreen({
  onClose, onSelect,
}: {
  onClose: () => void;
  onSelect: (item: BuildItem) => void;
}) {
  const tiles = ITEMS.filter(i => i.category === "tile");
  const furns = ITEMS.filter(i => i.category === "furniture");

  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 30,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.72)", backdropFilter: "blur(4px)",
    }}>
      <div style={{
        background: "#1C1A18",
        border: "2px solid rgba(255,255,255,0.18)",
        borderRadius: 6,
        padding: "20px 24px",
        width: 480,
        maxHeight: "80vh",
        overflowY: "auto",
        fontFamily: "monospace",
        boxShadow: "0 8px 32px rgba(0,0,0,0.8)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", letterSpacing: "0.2em", textTransform: "uppercase" }}>
            Kho đồ
          </span>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 18, cursor: "pointer" }}
          >✕</button>
        </div>

        {/* Tiles */}
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 8 }}>
          Ô sàn &amp; tường
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6, marginBottom: 16 }}>
          {tiles.map(item => (
            <InvSlot key={item.id} item={item} onSelect={() => { onSelect(item); onClose(); }} />
          ))}
        </div>

        {/* Furniture */}
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 8 }}>
          Nội thất cửa hàng
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6 }}>
          {furns.map(item => (
            <InvSlot key={item.id} item={item} onSelect={() => { onSelect(item); onClose(); }} />
          ))}
        </div>
      </div>
    </div>
  );
});

function InvSlot({ item, onSelect }: { item: BuildItem; onSelect: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "8px 4px 6px",
        background: hov ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.35)",
        border: `1px solid ${hov ? "rgba(255,255,255,0.35)" : "rgba(80,80,80,0.5)"}`,
        borderRadius: 4, cursor: "pointer", transition: "all 0.1s",
        gap: 4,
      }}
    >
      <BlockIcon item={item} size={38} />
      <span style={{ fontSize: 8, color: "rgba(255,255,255,0.55)", textAlign: "center", lineHeight: 1.2 }}>
        {item.label}
        {item.w && <><br /><span style={{ color: "rgba(255,255,255,0.28)" }}>{item.w}×{item.h}m</span></>}
      </span>
    </div>
  );
}

// ─── ESC / Settings menu ──────────────────────────────────────────────────────

const EscMenu = memo(function EscMenu({
  speed, sensitivity, fov, onSpeedChange, onSensitivityChange, onFovChange, onResume, onLoadPreset,
}: {
  speed: number; sensitivity: number; fov: number;
  onSpeedChange: (v: number) => void;
  onSensitivityChange: (v: number) => void;
  onFovChange: (v: number) => void;
  onResume: () => void;
  onLoadPreset: () => void;
}) {
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 30,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.65)", backdropFilter: "blur(3px)",
    }}>
      <div style={{
        background: "#1C1A18", border: "2px solid rgba(255,255,255,0.15)",
        borderRadius: 6, padding: "24px 28px", width: 360, maxHeight: "90vh", overflowY: "auto",
        fontFamily: "monospace", boxShadow: "0 8px 32px rgba(0,0,0,0.8)",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 9, color: "rgba(201,169,110,0.55)", letterSpacing: "0.4em", textTransform: "uppercase" }}>POSTLAIN</div>
          <div style={{ fontSize: 18, color: "rgba(255,255,255,0.85)", fontWeight: "bold", letterSpacing: "0.12em", marginTop: 2 }}>
            STORE BUILDER
          </div>
        </div>

        <McButton onClick={onResume} accent>▶ Tiếp tục chơi</McButton>
        <McButton onClick={onLoadPreset}>🗺 Tải bản đồ cửa hàng POSTLAIN</McButton>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", margin: "14px 0 12px" }} />

        {/* Settings title */}
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.30)", letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 12 }}>
          ⚙ Cài đặt
        </div>

        <McSlider label="FOV (Góc nhìn)" value={fov} min={60} max={110} step={1}
          left="Hẹp" right="Rộng" onChange={onFovChange} />
        <McSlider label="Tốc độ di chuyển" value={speed} min={1} max={15} step={0.5}
          left="Chậm" right="Nhanh" onChange={onSpeedChange} />
        <McSlider label="Độ nhạy chuột" value={sensitivity} min={0.5} max={5} step={0.1}
          left="Thấp" right="Cao" onChange={onSensitivityChange} />

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", margin: "14px 0 12px" }} />

        {/* Keys reference */}
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.30)", letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: 10 }}>
          ⌨ Phím tắt
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "7px 18px", fontSize: 9, color: "rgba(255,255,255,0.52)" }}>
          {([
            ["WASD", "Di chuyển"],
            ["Shift", "Chạy nhanh ×2"],
            ["Chuột trái", "Đặt block/nội thất"],
            ["Chuột phải", "Xóa block/nội thất"],
            ["E", "Mở kho đồ"],
            ["1 – 9", "Chọn ô hotbar"],
            ["Scroll", "Đổi ô hotbar"],
            ["ESC", "Menu này"],
          ] as [string, string][]).map(([k, v]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Key>{k}</Key><span>{v}</span>
            </div>
          ))}
        </div>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", margin: "14px 0 12px" }} />

        {/* Tips */}
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.30)", letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: 8 }}>
          💡 Mẹo
        </div>
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.42)", lineHeight: 1.7 }}>
          • Đặt <Key>Kệ đảo</Key> sẽ hỏi gán kệ kho nào<br />
          • Dùng <Key>BỐ TRÍ 2D</Key> để vẽ mặt bằng tổng thể<br />
          • Block <Key>Sàn</Key> và <Key>Tường</Key> đồng bộ cả 2D lẫn 3D
        </div>
      </div>
    </div>
  );
});

function McButton({ children, onClick, accent }: { children: React.ReactNode; onClick: () => void; accent?: boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: "100%", padding: "10px 0", marginBottom: 6,
        background: hov
          ? (accent ? "rgba(201,169,110,0.30)" : "rgba(255,255,255,0.12)")
          : (accent ? "rgba(201,169,110,0.12)" : "rgba(255,255,255,0.06)"),
        border: `1px solid ${accent ? "rgba(201,169,110,0.45)" : "rgba(255,255,255,0.18)"}`,
        borderRadius: 3,
        color: accent ? "#C9A96E" : "rgba(255,255,255,0.75)",
        fontSize: 11, fontFamily: "monospace", letterSpacing: "0.15em", textTransform: "uppercase",
        cursor: "pointer", transition: "all 0.12s",
      }}
    >{children}</button>
  );
}

function McSlider({ label, value, min, max, step, left, right, onChange }: {
  label: string; value: number; min: number; max: number; step: number;
  left: string; right: string; onChange: (v: number) => void;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.60)" }}>{label}</span>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.85)", fontWeight: "bold" }}>{value.toFixed(1)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: "#C9A96E" }} />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: "rgba(255,255,255,0.22)", marginTop: 2 }}>
        <span>{left}</span><span>{right}</span>
      </div>
    </div>
  );
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      display: "inline-block", padding: "1px 5px",
      background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.22)",
      borderRadius: 2, fontSize: 8, color: "rgba(255,255,255,0.70)",
      fontFamily: "monospace",
    }}>{children}</span>
  );
}

// ─── Click-to-start overlay ────────────────────────────────────────────────────

function ClickToEnter() {
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 25,
      display: "flex", alignItems: "center", justifyContent: "center",
      pointerEvents: "none",
    }}>
      <div style={{ textAlign: "center", fontFamily: "monospace" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🎮</div>
        <div style={{ fontSize: 15, color: "rgba(255,255,255,0.90)", fontWeight: "bold", letterSpacing: "0.15em", textTransform: "uppercase", textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>
          Store Builder
        </div>
        <div style={{ marginTop: 10, fontSize: 11, color: "rgba(255,255,255,0.55)", letterSpacing: "0.06em", textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
          Nhấp vào màn hình để bắt đầu
        </div>
        <div style={{ marginTop: 8, fontSize: 9, color: "rgba(255,255,255,0.28)", letterSpacing: "0.12em" }}>
          WASD di chuyển · Chuột nhìn · E kho đồ · ESC menu
        </div>
      </div>
    </div>
  );
}

// ─── Minimap ──────────────────────────────────────────────────────────────────

const Minimap = memo(function Minimap({ px, pz }: { px: number; pz: number }) {
  const { storeLayout } = useStore();
  const { grid, gridSize, roomW, roomD } = storeLayout;
  const MW = 96, MH = 86;
  const cols = Math.max(1, Math.round(roomW / gridSize));
  const rows = Math.max(1, Math.round(roomD / gridSize));
  const cellW = MW / cols;
  const cellH = MH / rows;
  const dotX = ((px + roomW / 2) / roomW) * MW;
  const dotY = ((pz + roomD / 2) / roomD) * MH;

  return (
    <div style={{
      position: "absolute", top: 12, right: 12, zIndex: 20, pointerEvents: "none",
    }}>
      <div style={{
        background: "rgba(0,0,0,0.65)",
        border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: 4, padding: 6,
        boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
      }}>
        <div style={{ fontSize: 7, color: "rgba(255,255,255,0.40)", letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: 4, fontFamily: "monospace" }}>
          Mặt bằng
        </div>
        <div style={{ position: "relative", width: MW, height: MH, background: "rgba(90,138,58,0.25)", borderRadius: 2, overflow: "hidden" }}>
          {grid.map((row, ri) =>
            row.map((cell, ci) => {
              if (cell === "empty") return null;
              return (
                <div key={`${ri}-${ci}`} style={{
                  position: "absolute",
                  left: ci * cellW, top: ri * cellH,
                  width: cellW, height: cellH,
                  background: cell === "floor" ? "rgba(200,181,128,0.85)" : "rgba(90,80,68,0.95)",
                }} />
              );
            })
          )}
          {/* Player triangle */}
          <div style={{
            position: "absolute",
            left: dotX - 4, top: dotY - 4,
            width: 8, height: 8,
            borderRadius: "50%",
            background: "#C9A96E",
            boxShadow: "0 0 5px #C9A96E, 0 0 2px #fff6",
          }} />
        </div>
      </div>
    </div>
  );
});

// ─── Shelf Picker Modal (for island_shelf placement) ─────────────────────────

interface PendingPlacement {
  wx: number; wz: number;
  itemDef: BuildItem;
}

const ShelfPickerModal = memo(function ShelfPickerModal({
  pending,
  onConfirm,
  onCancel,
}: {
  pending: PendingPlacement;
  onConfirm: (shelfId: string | null, cols: number, rows: number) => void;
  onCancel: () => void;
}) {
  const { warehouseShelves } = useStore();
  const shoes = warehouseShelves.filter(s => s.shelfType === "shoes");
  const bags  = warehouseShelves.filter(s => s.shelfType === "bags");
  const [shelfCols, setShelfCols] = useState(5);
  const [shelfRows, setShelfRows] = useState(5);

  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 35,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)",
    }}>
      <div style={{
        background: "#1C1A18", border: "2px solid rgba(255,255,255,0.15)",
        borderRadius: 6, padding: "22px 26px", width: 440,
        maxHeight: "90vh", overflowY: "auto",
        fontFamily: "monospace", boxShadow: "0 8px 32px rgba(0,0,0,0.8)",
      }}>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.82)", letterSpacing: "0.15em", marginBottom: 4 }}>
          Cấu hình kệ đảo
        </div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 14 }}>
          Gán kệ kho và chọn số ô cho {pending.itemDef.label}
        </div>

        {/* Size configurator */}
        <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 4, padding: "10px 12px", marginBottom: 14 }}>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.40)", letterSpacing: "0.25em", textTransform: "uppercase", marginBottom: 10 }}>
            Kích thước mỗi tầng
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ flex: 1 }}>
              <McSlider label={`Cột: ${shelfCols}`} value={shelfCols} min={2} max={8} step={1}
                left="2" right="8" onChange={setShelfCols} />
            </div>
            <div style={{ flex: 1 }}>
              <McSlider label={`Hàng: ${shelfRows}`} value={shelfRows} min={2} max={8} step={1}
                left="2" right="8" onChange={setShelfRows} />
            </div>
          </div>
          <div style={{ fontSize: 9, color: "rgba(201,169,110,0.70)", marginTop: 4 }}>
            → {shelfCols}×{shelfRows} ô/tầng · 4 tầng = {shelfCols * shelfRows * 4} ô tổng
          </div>
        </div>

        {/* No link option */}
        <button onClick={() => onConfirm(null, shelfCols, shelfRows)} style={slotBtn(false)}>
          <span style={{ fontSize: 18 }}>📦</span>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.55)" }}>Kệ trống (chưa gán)</span>
        </button>

        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.28)", letterSpacing: "0.25em", margin: "12px 0 8px" }}>
          KỆ GIÀY
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 12 }}>
          {shoes.map(s => (
            <ShelfBtn key={s.id} shelf={s} onClick={() => onConfirm(s.id, shelfCols, shelfRows)} />
          ))}
        </div>

        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.28)", letterSpacing: "0.25em", margin: "0 0 8px" }}>
          KỆ TÚI
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 16 }}>
          {bags.map(s => (
            <ShelfBtn key={s.id} shelf={s} onClick={() => onConfirm(s.id, shelfCols, shelfRows)} />
          ))}
        </div>

        <button onClick={onCancel} style={slotBtn(false)}>
          <span style={{ fontSize: 10, color: "rgba(255,100,100,0.7)" }}>✕ Huỷ</span>
        </button>
      </div>
    </div>
  );
});

function slotBtn(active: boolean): React.CSSProperties {
  return {
    width: "100%", display: "flex", alignItems: "center", gap: 10,
    padding: "8px 12px", marginBottom: 4,
    background: active ? "rgba(201,169,110,0.15)" : "rgba(255,255,255,0.05)",
    border: `1px solid ${active ? "rgba(201,169,110,0.4)" : "rgba(255,255,255,0.12)"}`,
    borderRadius: 4, cursor: "pointer", color: "white",
    fontFamily: "monospace",
  };
}

function ShelfBtn({ shelf, onClick }: { shelf: import("@/types").WarehouseShelf; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  const used = shelf.tiers.reduce((sum, t) => sum + t.filter(Boolean).length, 0);
  const total = shelf.tiers.length * 25;
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
        padding: "8px 4px", cursor: "pointer",
        background: hov ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.35)",
        border: `1px solid ${hov ? "rgba(255,255,255,0.30)" : "rgba(80,80,80,0.45)"}`,
        borderRadius: 4, transition: "all 0.1s",
      }}
    >
      <span style={{ fontSize: 9, color: "rgba(255,255,255,0.80)", fontFamily: "monospace" }}>{shelf.name}</span>
      <span style={{ fontSize: 8, color: used > 0 ? "#C9A96E" : "rgba(255,255,255,0.25)" }}>
        {used}/{total}
      </span>
    </button>
  );
}

// ─── MAIN EXPORT ───────────────────────────────────────────────────────────────

export default function StoreFloorScene() {
  const { storeLayout, paintCells, addLayoutItem, removeLayoutItem, loadPresetLayout } = useStore();

  const [locked, setLocked] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [showEsc, setShowEsc] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [speed, setSpeed] = useState(6);
  const [sensitivity, setSensitivity] = useState(2.0);
  const [fov, setFov] = useState(70);
  const [pendingShelf, setPendingShelf] = useState<PendingPlacement | null>(null);
  const playerPos = useRef({ x: 0, z: 2 });
  const [playerTick, setPlayerTick] = useState(0);
  const rafRef = useRef<number | null>(null);
  const lockedRef = useRef(false);

  const selectedItem = HOTBAR[selectedSlot] ?? HOTBAR[0];

  // Keyboard shortcuts
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === "Escape") {
        if (lockedRef.current) document.exitPointerLock();
        if (showInventory) { setShowInventory(false); return; }
        setShowEsc(v => !v);
        return;
      }
      if (e.code === "KeyE" && lockedRef.current) {
        e.preventDefault();
        document.exitPointerLock();
        setShowInventory(true);
        return;
      }
      for (let n = 1; n <= 9; n++) {
        if (e.code === `Digit${n}`) { setSelectedSlot(n - 1); return; }
      }
    };
    const wh = (e: WheelEvent) => {
      if (!lockedRef.current) return;
      setSelectedSlot(s => ((s + (e.deltaY > 0 ? 1 : -1)) + HOTBAR.length) % HOTBAR.length);
    };
    window.addEventListener("keydown", kd);
    window.addEventListener("wheel", wh, { passive: true });
    return () => { window.removeEventListener("keydown", kd); window.removeEventListener("wheel", wh); };
  }, [showInventory]);

  const handleLockChange = useCallback((v: boolean) => {
    lockedRef.current = v;
    setLocked(v);
  }, []);

  // Raw world pos → grid col/row (same formula as snapToCell)
  const worldToGrid = useCallback((wx: number, wz: number) => {
    const { roomW, roomD, gridSize } = storeLayout;
    const col = Math.floor((wx + roomW / 2) / gridSize);
    const row = Math.floor((wz + roomD / 2) / gridSize);
    return { col, row };
  }, [storeLayout]);

  // Actually place an item (called directly or after shelf picker)
  const doPlace = useCallback((
    wx: number, wz: number, itemDef: BuildItem,
    warehouseShelfId?: string, shelfCols?: number, shelfRows?: number,
  ) => {
    const { roomW, roomD } = storeLayout;
    if (itemDef.category === "tile") {
      const { col, row } = worldToGrid(wx, wz);
      const baseCol = Math.floor(col / TILE_BLOCK) * TILE_BLOCK;
      const baseRow = Math.floor(row / TILE_BLOCK) * TILE_BLOCK;
      const cellType: FloorCellType = itemDef.id === "floor" ? "floor" : "wall";
      const cells: { row: number; col: number; cellType: FloorCellType }[] = [];
      for (let r = baseRow; r < baseRow + TILE_BLOCK; r++)
        for (let c = baseCol; c < baseCol + TILE_BLOCK; c++)
          cells.push({ row: r, col: c, cellType });
      paintCells(cells);
    } else {
      const w = itemDef.w ?? 1, h = itemDef.h ?? 1;
      addLayoutItem({
        id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        type: itemDef.id as LayoutItemType,
        x: wx + roomW / 2 - w / 2,
        y: wz + roomD / 2 - h / 2,
        w, h, rotation: 0,
        label: itemDef.label,
        ...(warehouseShelfId ? { warehouseShelfId } : {}),
        ...(shelfCols ? { shelfCols } : {}),
        ...(shelfRows ? { shelfRows } : {}),
        ...(shelfCols && shelfRows ? { capacity: shelfCols * shelfRows * 4 } : {}),
      });
    }
  }, [storeLayout, paintCells, addLayoutItem, worldToGrid]);

  // Place block/furniture at crosshair world position
  const handlePlace = useCallback(() => {
    if (!rayHit.valid) return;
    const wx = rayHit.wx, wz = rayHit.wz;
    const item = HOTBAR[selectedSlot];
    if (!item || item.id === "erase") return;

    // island_shelf needs shelf picker
    if (item.id === "island_shelf") {
      document.exitPointerLock();
      setPendingShelf({ wx, wz, itemDef: item });
      return;
    }
    doPlace(wx, wz, item);
  }, [selectedSlot, doPlace]);

  // Remove block/furniture at crosshair
  const handleRemove = useCallback(() => {
    if (!rayHit.valid) return;
    const { roomW, roomD } = storeLayout;
    const wx = rayHit.wx, wz = rayHit.wz;
    const { col, row } = worldToGrid(wx, wz);

    if (storeLayout.grid[row]?.[col] && storeLayout.grid[row][col] !== "empty") {
      // Erase the entire TILE_BLOCK × TILE_BLOCK region
      const baseCol = Math.floor(col / TILE_BLOCK) * TILE_BLOCK;
      const baseRow = Math.floor(row / TILE_BLOCK) * TILE_BLOCK;
      const cells: { row: number; col: number; cellType: FloorCellType }[] = [];
      for (let r = baseRow; r < baseRow + TILE_BLOCK; r++)
        for (let c = baseCol; c < baseCol + TILE_BLOCK; c++)
          cells.push({ row: r, col: c, cellType: "empty" });
      paintCells(cells);
      return;
    }
    // Remove nearest furniture
    const nearest = storeLayout.items.reduce<{ id: string; dist: number } | null>((best, it) => {
      const cx = it.x + it.w / 2 - roomW / 2;
      const cz = it.y + it.h / 2 - roomD / 2;
      const dist = Math.hypot(cx - wx, cz - wz);
      return dist < 2.0 && (!best || dist < best.dist) ? { id: it.id, dist } : best;
    }, null);
    if (nearest) removeLayoutItem(nearest.id);
  }, [storeLayout, paintCells, removeLayoutItem, worldToGrid]);

  const handlePosChange = useCallback((x: number, z: number) => {
    playerPos.current = { x, z };
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        setPlayerTick(n => n + 1);
      });
    }
  }, []);

  const handleResume = useCallback(() => {
    setShowEsc(false);
  }, []);

  // Re-request pointer lock after closing overlays — only if user had entered game
  const relock = useCallback(() => {
    if (!lockedRef.current && !locked) return; // never locked yet, skip
    setTimeout(() => {
      try { document.querySelector("canvas")?.requestPointerLock(); } catch { /* ignore SecurityError */ }
    }, 100);
  }, [locked]);

  const handleInventorySelect = useCallback((item: BuildItem) => {
    const idx = HOTBAR.findIndex(h => h.id === item.id);
    if (idx >= 0) setSelectedSlot(idx);
    setShowInventory(false);
    relock();
  }, [relock]);

  // Shelf picker handlers
  const handleShelfConfirm = useCallback((shelfId: string | null, cols: number, rows: number) => {
    if (pendingShelf) {
      doPlace(pendingShelf.wx, pendingShelf.wz, pendingShelf.itemDef, shelfId ?? undefined, cols, rows);
    }
    setPendingShelf(null);
    relock();
  }, [pendingShelf, doPlace, relock]);

  const handleShelfCancel = useCallback(() => {
    setPendingShelf(null);
    relock();
  }, [relock]);

  const overlayVisible = showInventory || showEsc || !!pendingShelf;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", background: "#7EC8E3" }}>
      <Canvas
        camera={{ position: [0, 1.62, 2], fov }}
        gl={{
          antialias: false,
          alpha: false,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
          powerPreference: "high-performance",
        }}
        shadows={false}
        frameloop="always"
        performance={{ min: 0.5 }}
        style={{ width: "100%", height: "100%" }}
      >
        <color attach="background" args={["#7EC8E3"]} />
        <fog attach="fog" args={["#ABD8EE", 30, 70]} />

        <MinecraftSky />
        <GroundPlane />
        <RaycastUpdater />

        <Suspense fallback={null}>
          <LayoutScene3D />
        </Suspense>

        {locked && !overlayVisible && (
          <>
            <GhostBlock itemId={selectedItem.id} />
            <BlockHighlight itemId={selectedItem.id} />
          </>
        )}

        <MinecraftControls
          speed={speed}
          sensitivity={sensitivity}
          onLockChange={handleLockChange}
          onPlace={handlePlace}
          onRemove={handleRemove}
          onPosChange={handlePosChange}
        />
      </Canvas>

      {/* Crosshair */}
      {locked && !overlayVisible && <Crosshair />}

      {/* Click-to-enter */}
      {!locked && !overlayVisible && <ClickToEnter />}

      {/* Hotbar */}
      {!overlayVisible && (
        <HotbarHUD items={HOTBAR} selected={selectedSlot} onSelect={setSelectedSlot} />
      )}

      {/* Minimap (always visible) */}
      <Minimap px={playerPos.current.x} pz={playerPos.current.z} />

      {/* Inventory */}
      {showInventory && (
        <InventoryScreen onClose={() => setShowInventory(false)} onSelect={handleInventorySelect} />
      )}

      {/* ESC menu */}
      {showEsc && (
        <EscMenu
          speed={speed} sensitivity={sensitivity} fov={fov}
          onSpeedChange={setSpeed} onSensitivityChange={setSensitivity} onFovChange={setFov}
          onResume={handleResume}
          onLoadPreset={() => { loadPresetLayout(); setShowEsc(false); }}
        />
      )}

      {/* Shelf picker */}
      {pendingShelf && (
        <ShelfPickerModal
          pending={pendingShelf}
          onConfirm={handleShelfConfirm}
          onCancel={handleShelfCancel}
        />
      )}
    </div>
  );
}

"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useStore } from "@/store/useStore";
import { LayoutItem, LayoutItemType, LayoutZone, FloorCellType } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────
type PaintTool = "floor" | "wall" | "erase" | "furniture" | "zone";

interface FurnitureDef {
  type: LayoutItemType;
  label: string;
  defaultW: number;
  defaultH: number;
  description: string;
}

interface DragState {
  type: "palette" | "canvas";
  furnitureType?: LayoutItemType;
  itemId?: string;
  offsetX?: number;
  offsetY?: number;
  ghostCol: number;
  ghostRow: number;
}

interface ZonePoint {
  col: number;
  row: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const BASE_TILE = 48;
const ZONE_COLORS = ["#6B8E5A", "#5A6B8E", "#8E6B5A", "#8E5A6B", "#5A8E7A", "#7A5A8E"];

const C = {
  canvasBg:      "#1A1816",
  emptyTile:     "#2A2824",
  floorFill:     "#C8B890",
  floorBorder:   "#A89870",
  wallTop:       "#4A4440",
  wallFront:     "#2A2420",
  sidebarBg:     "#141210",
  sidebarItem:   "#1E1C1A",
  accent:        "#C9A96E",
  hoverOverlay:  "rgba(100,200,220,0.35)",
  selectionGlow: "#C9A96E",
  statusBg:      "#0E0C0A",
  text:          "#E8E4DC",
  textMuted:     "#7A7268",
  textDim:       "#4A4844",
  panelBg:       "#141210",
  panelBorder:   "#2A2824",
} as const;

const FURNITURE: FurnitureDef[] = [
  { type: "wall_shelf",   label: "Kệ tường",          defaultW: 3, defaultH: 1, description: "Kệ gắn tường" },
  { type: "island_shelf", label: "Kệ kho 25 hộp",     defaultW: 3, defaultH: 1, description: "5 tầng × 5 vị trí" },
  { type: "tower",        label: "Tháp trưng bày",    defaultW: 1, defaultH: 1, description: "Tháp tròn" },
  { type: "acc_panel",    label: "Kệ ACC lục giác",   defaultW: 1, defaultH: 1, description: "Spinner xoay" },
  { type: "cashier",      label: "Quầy cashier",      defaultW: 2, defaultH: 1, description: "Quầy thu ngân" },
  { type: "shoecare",     label: "Quầy shoecare",     defaultW: 1, defaultH: 1, description: "Chăm sóc giày" },
  { type: "column",       label: "Cột",               defaultW: 1, defaultH: 1, description: "Cột kết cấu" },
];

const FUR_MAP = Object.fromEntries(FURNITURE.map(d => [d.type, d])) as Record<LayoutItemType, FurnitureDef>;

function uid() { return `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`; }

// ─── SVG Palette Previews ─────────────────────────────────────────────────────
function PaletteIcon({ type }: { type: LayoutItemType }) {
  const s = 40;
  const stroke = C.accent;
  const fill = "rgba(201,169,110,0.18)";
  const dark = "rgba(201,169,110,0.5)";

  switch (type) {
    case "wall_shelf":
      return (
        <svg width={s} height={s} viewBox="0 0 40 40">
          <rect x="3" y="12" width="34" height="16" rx="2" fill={fill} stroke={stroke} strokeWidth="1.5"/>
          {[10,17,24,31].map(x => (
            <line key={x} x1={x} y1="12" x2={x} y2="28" stroke={dark} strokeWidth="1"/>
          ))}
          <rect x="3" y="12" width="34" height="3" fill={dark}/>
        </svg>
      );
    case "island_shelf":
      return (
        <svg width={s} height={s} viewBox="0 0 40 40">
          <rect x="4" y="8" width="32" height="24" rx="2" fill={fill} stroke={stroke} strokeWidth="1.5"/>
          {[11,18,25,32].map(x => (
            <line key={x} x1={x} y1="8" x2={x} y2="32" stroke={dark} strokeWidth="1"/>
          ))}
          {[14,20,26].map(y => (
            <line key={y} x1="4" y1={y} x2="36" y2={y} stroke={dark} strokeWidth="0.8"/>
          ))}
        </svg>
      );
    case "tower":
      return (
        <svg width={s} height={s} viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="16" fill={fill} stroke={stroke} strokeWidth="1.5"/>
          <circle cx="20" cy="20" r="9" fill="none" stroke={dark} strokeWidth="1.5"/>
          <circle cx="20" cy="20" r="3" fill={stroke}/>
        </svg>
      );
    case "acc_panel": {
      const pts = Array.from({length:6},(_,i) => {
        const a = Math.PI/180 * (60*i - 30);
        return `${20+15*Math.cos(a)},${20+15*Math.sin(a)}`;
      }).join(" ");
      const inner = Array.from({length:6},(_,i) => {
        const a = Math.PI/180 * (60*i - 30);
        return `${20+8*Math.cos(a)},${20+8*Math.sin(a)}`;
      }).join(" ");
      return (
        <svg width={s} height={s} viewBox="0 0 40 40">
          <polygon points={pts} fill={fill} stroke={stroke} strokeWidth="1.5"/>
          <polygon points={inner} fill="none" stroke={dark} strokeWidth="1"/>
        </svg>
      );
    }
    case "cashier":
      return (
        <svg width={s} height={s} viewBox="0 0 40 40">
          <path d="M5 10 L35 10 L35 22 L22 22 L22 30 L5 30 Z" fill={fill} stroke={stroke} strokeWidth="1.5"/>
          <rect x="8" y="14" width="10" height="6" rx="1" fill={dark}/>
          <line x1="22" y1="10" x2="22" y2="22" stroke={dark} strokeWidth="1.5"/>
        </svg>
      );
    case "shoecare":
      return (
        <svg width={s} height={s} viewBox="0 0 40 40">
          <rect x="7" y="10" width="26" height="20" rx="2" fill={fill} stroke={stroke} strokeWidth="1.5"/>
          <line x1="10" y1="13" x2="30" y2="27" stroke={dark} strokeWidth="1.5"/>
          <line x1="30" y1="13" x2="10" y2="27" stroke={dark} strokeWidth="1.5"/>
        </svg>
      );
    case "column":
      return (
        <svg width={s} height={s} viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="14" fill={fill} stroke={stroke} strokeWidth="1.5"/>
          <circle cx="20" cy="20" r="7" fill={dark}/>
        </svg>
      );
    default:
      return <svg width={s} height={s} viewBox="0 0 40 40"><rect x="5" y="5" width="30" height="30" fill={fill} stroke={stroke} strokeWidth="1.5"/></svg>;
  }
}

// ─── Canvas drawing helpers ───────────────────────────────────────────────────
function drawFloorTile(ctx: CanvasRenderingContext2D, px: number, py: number, tileSize: number) {
  ctx.fillStyle = C.floorFill;
  ctx.fillRect(px + 0.5, py + 0.5, tileSize - 1, tileSize - 1);
  ctx.strokeStyle = C.floorBorder;
  ctx.lineWidth = 0.5;
  ctx.strokeRect(px + 0.5, py + 0.5, tileSize - 1, tileSize - 1);
  // Top-left inner highlight for depth
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(px + 1, py + 1, tileSize - 2, 2);
  ctx.fillRect(px + 1, py + 1, 2, tileSize - 2);
}

function drawWallTile(ctx: CanvasRenderingContext2D, px: number, py: number, tileSize: number) {
  // Front face
  ctx.fillStyle = C.wallFront;
  ctx.fillRect(px, py, tileSize, tileSize);
  // Top face (lighter, smaller — fake isometric)
  const topH = Math.max(4, tileSize * 0.1);
  ctx.fillStyle = C.wallTop;
  ctx.fillRect(px, py, tileSize, topH);
  // Right shadow
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(px + tileSize - 3, py + topH, 3, tileSize - topH);
  ctx.strokeStyle = "#1A1614";
  ctx.lineWidth = 0.5;
  ctx.strokeRect(px + 0.5, py + 0.5, tileSize - 1, tileSize - 1);
}

function drawEmptyTile(ctx: CanvasRenderingContext2D, px: number, py: number, tileSize: number) {
  ctx.fillStyle = C.emptyTile;
  ctx.fillRect(px, py, tileSize, tileSize);
  ctx.strokeStyle = "rgba(255,255,255,0.03)";
  ctx.lineWidth = 0.5;
  ctx.strokeRect(px + 0.5, py + 0.5, tileSize - 1, tileSize - 1);
}

function drawFurnitureShape(
  ctx: CanvasRenderingContext2D,
  type: LayoutItemType,
  px: number, py: number, pw: number, ph: number,
  color: string | undefined,
  alpha: number,
  selected: boolean,
  rotation: number,
) {
  ctx.save();
  ctx.globalAlpha = alpha;

  const cx = px + pw / 2;
  const cy = py + ph / 2;
  ctx.translate(cx, cy);
  ctx.rotate((rotation * Math.PI) / 180);
  const x = -pw / 2;
  const y = -ph / 2;
  const w = pw;
  const h = ph;

  if (selected) {
    ctx.shadowColor = C.selectionGlow;
    ctx.shadowBlur = 12;
  }

  const baseColor = color ?? getFurnitureBaseColor(type);
  const strokeCol = lighten(baseColor, 40);

  switch (type) {
    case "wall_shelf": {
      ctx.fillStyle = baseColor;
      roundRect(ctx, x, y, w, h, 3);
      ctx.fill();
      ctx.strokeStyle = strokeCol;
      ctx.lineWidth = 1.5;
      roundRect(ctx, x, y, w, h, 3);
      ctx.stroke();
      // Shelf lines
      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.lineWidth = 1;
      const step = w / Math.max(1, Math.round(w / 20));
      for (let lx = x + step; lx < x + w - 2; lx += step) {
        ctx.beginPath(); ctx.moveTo(lx, y + 2); ctx.lineTo(lx, y + h - 2); ctx.stroke();
      }
      // Top rail
      ctx.fillStyle = lighten(baseColor, 20);
      ctx.fillRect(x, y, w, Math.max(4, h * 0.15));
      break;
    }
    case "island_shelf": {
      ctx.fillStyle = baseColor;
      roundRect(ctx, x, y, w, h, 3);
      ctx.fill();
      ctx.strokeStyle = strokeCol;
      ctx.lineWidth = 1.5;
      roundRect(ctx, x, y, w, h, 3);
      ctx.stroke();
      // Bay grid
      ctx.strokeStyle = "rgba(0,0,0,0.3)";
      ctx.lineWidth = 1;
      const bays = 5;
      for (let i = 1; i < bays; i++) {
        const bx = x + (w / bays) * i;
        ctx.beginPath(); ctx.moveTo(bx, y + 2); ctx.lineTo(bx, y + h - 2); ctx.stroke();
      }
      const tiers = 3;
      for (let i = 1; i < tiers; i++) {
        const by = y + (h / tiers) * i;
        ctx.beginPath(); ctx.moveTo(x + 2, by); ctx.lineTo(x + w - 2, by); ctx.stroke();
      }
      break;
    }
    case "tower": {
      const r = Math.min(w, h) / 2 - 1;
      ctx.fillStyle = baseColor;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = strokeCol; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = "rgba(0,0,0,0.3)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = strokeCol;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.15, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case "acc_panel": {
      const r2 = Math.min(w, h) / 2 - 2;
      hexPath(ctx, 0, 0, r2); ctx.fillStyle = baseColor; ctx.fill();
      ctx.strokeStyle = strokeCol; ctx.lineWidth = 1.5; hexPath(ctx, 0, 0, r2); ctx.stroke();
      hexPath(ctx, 0, 0, r2 * 0.55); ctx.strokeStyle = "rgba(0,0,0,0.25)"; ctx.lineWidth = 1; ctx.stroke();
      break;
    }
    case "cashier": {
      // L-shape
      const arm = w * 0.4;
      ctx.fillStyle = baseColor;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w, y + h * 0.55);
      ctx.lineTo(x + arm, y + h * 0.55);
      ctx.lineTo(x + arm, y + h);
      ctx.lineTo(x, y + h);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = strokeCol; ctx.lineWidth = 1.5; ctx.stroke();
      // Screen
      ctx.fillStyle = "rgba(100,200,255,0.4)";
      ctx.fillRect(x + 3, y + 3, w * 0.3, h * 0.35);
      break;
    }
    case "shoecare": {
      ctx.fillStyle = baseColor;
      roundRect(ctx, x, y, w, h, 3);
      ctx.fill();
      ctx.strokeStyle = strokeCol; ctx.lineWidth = 1.5;
      roundRect(ctx, x, y, w, h, 3); ctx.stroke();
      ctx.strokeStyle = "rgba(255,160,50,0.6)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x + 4, y + 4); ctx.lineTo(x + w - 4, y + h - 4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + w - 4, y + 4); ctx.lineTo(x + 4, y + h - 4); ctx.stroke();
      break;
    }
    case "column": {
      const rc = Math.min(w, h) / 2 - 1;
      ctx.fillStyle = baseColor;
      ctx.beginPath(); ctx.arc(0, 0, rc, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = strokeCol; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, rc, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = lighten(baseColor, 30);
      ctx.beginPath(); ctx.arc(-rc * 0.2, -rc * 0.2, rc * 0.3, 0, Math.PI * 2); ctx.fill();
      break;
    }
    default: {
      ctx.fillStyle = baseColor;
      roundRect(ctx, x, y, w, h, 3); ctx.fill();
      ctx.strokeStyle = strokeCol; ctx.lineWidth = 1.5;
      roundRect(ctx, x, y, w, h, 3); ctx.stroke();
    }
  }

  // Label
  if (alpha > 0.5 && (w > 24 || h > 24)) {
    ctx.shadowColor = "transparent"; ctx.shadowBlur = 0;
    ctx.font = `bold ${Math.min(11, Math.max(8, Math.min(w, h) * 0.18))}px 'Segoe UI', sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const def = FUR_MAP[type];
    if (def) ctx.fillText(def.label, 0, 0);
  }

  ctx.restore();
}

function getFurnitureBaseColor(type: LayoutItemType): string {
  const map: Record<LayoutItemType, string> = {
    wall_shelf:   "#A89880",
    island_shelf: "#4A7A98",
    tower:        "#2A2826",
    acc_panel:    "#3A3060",
    cashier:      "#1A1816",
    shoecare:     "#2E1C0A",
    column:       "#9A9890",
    window:       "#88CCFF",
    zone:         "#6B8E5A",
  };
  return map[type] ?? "#666";
}

function lighten(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  const clamp = (n: number) => Math.min(255, Math.max(0, n));
  return `rgb(${clamp(r+amount)},${clamp(g+amount)},${clamp(b+amount)})`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function hexPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    const px = cx + r * Math.cos(a);
    const py = cy + r * Math.sin(a);
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function StoreLayoutEditor() {
  const storeLayout   = useStore(s => s.storeLayout);
  const addLayoutItem = useStore(s => s.addLayoutItem);
  const updateLayoutItem = useStore(s => s.updateLayoutItem);
  const removeLayoutItem = useStore(s => s.removeLayoutItem);
  const setLayoutRoom = useStore(s => s.setLayoutRoom);
  const clearLayout        = useStore(s => s.clearLayout);
  const loadPresetLayout   = useStore(s => s.loadPresetLayout);
  const paintCells    = useStore(s => s.paintCells);
  const addZone       = useStore(s => s.addZone);
  const removeZone    = useStore(s => s.removeZone);

  const { grid, items, zones, roomW, roomD } = storeLayout;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── View state
  const [zoom, setZoom] = useState(1.0);
  const [panX, setPanX] = useState(24);
  const [panY, setPanY] = useState(24);
  const panRef = useRef({ x: 24, y: 24 });

  // ── Tool state
  const [activeTool, setActiveTool] = useState<PaintTool>("floor");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [hoverCell, setHoverCell] = useState<{ col: number; row: number } | null>(null);

  // ── Drag state (ref for perf)
  const dragRef = useRef<DragState | null>(null);
  const [ghostDrag, setGhostDrag] = useState<{ col: number; row: number; type: LayoutItemType } | null>(null);

  // ── Paint drag
  const paintingRef = useRef(false);
  const spaceHeldRef = useRef(false);

  // ── Pan drag
  const panDragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  // ── Zone drawing
  const [zonePoints, setZonePoints] = useState<ZonePoint[]>([]);
  const [zoneColorIdx, setZoneColorIdx] = useState(0);

  // ── Room size inputs
  const [roomWInput, setRoomWInput] = useState(String(roomW));
  const [roomDInput, setRoomDInput] = useState(String(roomD));

  // ── Selected item label edit
  const [editLabel, setEditLabel] = useState("");

  const selectedItem = items.find(i => i.id === selectedItemId) ?? null;

  useEffect(() => {
    if (selectedItem) setEditLabel(selectedItem.label);
  }, [selectedItem]);

  // ── tileSize
  const tileSize = BASE_TILE * zoom;
  const cols = grid[0]?.length ?? 0;
  const rows = grid.length;

  // ─── Canvas render ──────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = C.canvasBg;
    ctx.fillRect(0, 0, W, H);

    const ts = tileSize;
    const offX = panX;
    const offY = panY;

    // Grid tiles
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const px = offX + c * ts;
        const py = offY + r * ts;
        if (px + ts < 0 || py + ts < 0 || px > W || py > H) continue;
        const cell = grid[r][c];
        if (cell === "floor") drawFloorTile(ctx, px, py, ts);
        else if (cell === "wall") drawWallTile(ctx, px, py, ts);
        else drawEmptyTile(ctx, px, py, ts);
      }
    }

    // Grid border
    ctx.strokeStyle = "rgba(201,169,110,0.25)";
    ctx.lineWidth = 2;
    ctx.strokeRect(offX, offY, cols * ts, rows * ts);

    // Zones
    for (const zone of zones ?? []) {
      if (zone.points.length < 2) continue;
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = zone.color;
      ctx.beginPath();
      zone.points.forEach(([c, r], i) => {
        const px = offX + c * ts + ts / 2;
        const py = offY + r * ts + ts / 2;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = zone.color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      // Label
      const cx2 = zone.points.reduce((s, [c]) => s + c, 0) / zone.points.length;
      const cy2 = zone.points.reduce((s, [, r]) => s + r, 0) / zone.points.length;
      ctx.font = "bold 11px 'Segoe UI', sans-serif";
      ctx.fillStyle = zone.color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(zone.label, offX + cx2 * ts + ts / 2, offY + cy2 * ts + ts / 2);
      ctx.restore();
    }

    // Zone being drawn
    if (activeTool === "zone" && zonePoints.length > 0) {
      ctx.save();
      ctx.strokeStyle = ZONE_COLORS[zoneColorIdx];
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      zonePoints.forEach(({ col: c, row: r }, i) => {
        const px = offX + c * ts + ts / 2;
        const py = offY + r * ts + ts / 2;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      });
      if (hoverCell) ctx.lineTo(offX + hoverCell.col * ts + ts / 2, offY + hoverCell.row * ts + ts / 2);
      ctx.stroke();
      ctx.setLineDash([]);
      zonePoints.forEach(({ col: c, row: r }) => {
        ctx.fillStyle = ZONE_COLORS[zoneColorIdx];
        ctx.beginPath();
        ctx.arc(offX + c * ts + ts / 2, offY + r * ts + ts / 2, 4, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }

    // Furniture items
    for (const item of items) {
      const px = offX + item.x * ts;
      const py = offY + item.y * ts;
      const pw = item.w * ts;
      const ph = item.h * ts;
      if (px + pw < 0 || py + ph < 0 || px > W || py > H) continue;
      const isSelected = item.id === selectedItemId;
      drawFurnitureShape(ctx, item.type, px, py, pw, ph, item.color, 1.0, isSelected, item.rotation);
    }

    // Ghost drag preview
    if (ghostDrag) {
      const gDef = FUR_MAP[ghostDrag.type];
      if (gDef) {
        const px = offX + ghostDrag.col * ts;
        const py = offY + ghostDrag.row * ts;
        const pw = gDef.defaultW * ts;
        const ph = gDef.defaultH * ts;
        drawFurnitureShape(ctx, ghostDrag.type, px, py, pw, ph, undefined, 0.5, false, 0);
        ctx.save();
        ctx.strokeStyle = C.accent;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(px, py, pw, ph);
        ctx.setLineDash([]);
        ctx.restore();
      }
    }

    // Hover highlight
    if (hoverCell && activeTool !== "zone") {
      const { col: hc, row: hr } = hoverCell;
      if (hc >= 0 && hc < cols && hr >= 0 && hr < rows) {
        ctx.fillStyle = C.hoverOverlay;
        ctx.fillRect(offX + hc * ts, offY + hr * ts, ts, ts);
      }
    }

    // Coordinates ruler tick marks
    ctx.save();
    ctx.font = `${Math.max(8, ts * 0.2)}px 'Segoe UI', monospace`;
    ctx.fillStyle = C.textMuted;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let c = 0; c <= cols; c += Math.max(1, Math.floor(2 / zoom))) {
      const px = offX + c * ts;
      if (px < 0 || px > W) continue;
      ctx.fillText(String(c), px, offY - 14);
      ctx.fillStyle = "rgba(201,169,110,0.12)";
      ctx.fillRect(px, offY, 1, rows * ts);
      ctx.fillStyle = C.textMuted;
    }
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    for (let r = 0; r <= rows; r += Math.max(1, Math.floor(2 / zoom))) {
      const py = offY + r * ts;
      if (py < 0 || py > H) continue;
      ctx.fillText(String(r), offX - 20, py);
      ctx.fillStyle = "rgba(201,169,110,0.08)";
      ctx.fillRect(offX, py, cols * ts, 1);
      ctx.fillStyle = C.textMuted;
    }
    ctx.restore();

  }, [grid, items, zones, tileSize, panX, panY, hoverCell, selectedItemId, activeTool, zonePoints, zoneColorIdx, ghostDrag, cols, rows]);

  // ─── Canvas resize ──────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ro = new ResizeObserver(() => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    });
    ro.observe(container);
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    return () => ro.disconnect();
  }, []);

  // ─── Mouse coordinate helpers ───────────────────────────────────────────────
  const canvasToGrid = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { col: 0, row: 0, canvasX: 0, canvasY: 0 };
    const rect = canvas.getBoundingClientRect();
    const canvasX = clientX - rect.left;
    const canvasY = clientY - rect.top;
    const ts = BASE_TILE * zoom;
    const col = Math.floor((canvasX - panX) / ts);
    const row = Math.floor((canvasY - panY) / ts);
    return { col, row, canvasX, canvasY };
  }, [zoom, panX, panY]);

  // ─── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      if (e.key === " ") { spaceHeldRef.current = true; e.preventDefault(); }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedItemId) { removeLayoutItem(selectedItemId); setSelectedItemId(null); }
      }
      if (e.key === "Escape") { setSelectedItemId(null); setZonePoints([]); }
      if (e.key === "f" || e.key === "F") setActiveTool("floor");
      if (e.key === "w" || e.key === "W") setActiveTool("wall");
      if (e.key === "e" || e.key === "E") setActiveTool("erase");
      if (e.key === "z" || e.key === "Z") setActiveTool("zone");
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === " ") spaceHeldRef.current = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [selectedItemId, removeLayoutItem]);

  // ─── Canvas mouse events ────────────────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const { col, row, canvasX, canvasY } = canvasToGrid(e.clientX, e.clientY);

    // Middle mouse or space+left = pan
    if (e.button === 1 || (e.button === 0 && spaceHeldRef.current)) {
      panDragRef.current = { startX: canvasX, startY: canvasY, origX: panX, origY: panY };
      e.preventDefault();
      return;
    }

    // Right click = pan as well
    if (e.button === 2) {
      panDragRef.current = { startX: canvasX, startY: canvasY, origX: panX, origY: panY };
      e.preventDefault();
      return;
    }

    if (e.button !== 0) return;

    if (activeTool === "floor" || activeTool === "wall" || activeTool === "erase") {
      paintingRef.current = true;
      const cellType: FloorCellType = activeTool === "floor" ? "floor" : activeTool === "wall" ? "wall" : "empty";
      if (col >= 0 && col < cols && row >= 0 && row < rows) {
        paintCells([{ row, col, cellType }]);
      }
      return;
    }

    if (activeTool === "furniture") {
      // Check if clicking existing item
      const ts = BASE_TILE * zoom;
      const clicked = items.find(item => {
        const ix = panX + item.x * ts;
        const iy = panY + item.y * ts;
        const iw = item.w * ts;
        const ih = item.h * ts;
        return canvasX >= ix && canvasX <= ix + iw && canvasY >= iy && canvasY <= iy + ih;
      });
      if (clicked) {
        setSelectedItemId(clicked.id);
        const ix = panX + clicked.x * ts;
        const iy = panY + clicked.y * ts;
        dragRef.current = {
          type: "canvas",
          itemId: clicked.id,
          offsetX: canvasX - ix,
          offsetY: canvasY - iy,
          ghostCol: Math.floor(clicked.x),
          ghostRow: Math.floor(clicked.y),
        };
      } else {
        setSelectedItemId(null);
      }
      return;
    }

    if (activeTool === "zone") {
      if (col >= 0 && col < cols && row >= 0 && row < rows) {
        setZonePoints(prev => [...prev, { col, row }]);
      }
    }
  }, [activeTool, canvasToGrid, cols, rows, items, panX, panY, zoom, paintCells]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const { col, row, canvasX, canvasY } = canvasToGrid(e.clientX, e.clientY);
    setHoverCell({ col, row });

    // Pan
    if (panDragRef.current) {
      const dx = canvasX - panDragRef.current.startX;
      const dy = canvasY - panDragRef.current.startY;
      const nx = panDragRef.current.origX + dx;
      const ny = panDragRef.current.origY + dy;
      setPanX(nx);
      setPanY(ny);
      panRef.current = { x: nx, y: ny };
      return;
    }

    // Paint drag
    if (paintingRef.current && (activeTool === "floor" || activeTool === "wall" || activeTool === "erase")) {
      const cellType: FloorCellType = activeTool === "floor" ? "floor" : activeTool === "wall" ? "wall" : "empty";
      if (col >= 0 && col < cols && row >= 0 && row < rows) {
        paintCells([{ row, col, cellType }]);
      }
      return;
    }

    // Furniture drag (canvas item)
    if (dragRef.current?.type === "canvas" && dragRef.current.itemId) {
      const ts = BASE_TILE * zoom;
      const item = items.find(i => i.id === dragRef.current!.itemId);
      if (item) {
        const newX = (canvasX - panX - (dragRef.current.offsetX ?? 0)) / ts;
        const newY = (canvasY - panY - (dragRef.current.offsetY ?? 0)) / ts;
        const snapX = Math.max(0, Math.min(cols - item.w, Math.round(newX)));
        const snapY = Math.max(0, Math.min(rows - item.h, Math.round(newY)));
        setGhostDrag({ col: snapX, row: snapY, type: item.type });
        dragRef.current.ghostCol = snapX;
        dragRef.current.ghostRow = snapY;
      }
    }

    // Palette ghost drag
    if (dragRef.current?.type === "palette" && dragRef.current.furnitureType) {
      const def = FUR_MAP[dragRef.current.furnitureType];
      if (def) {
        const snapCol = Math.max(0, Math.min(cols - def.defaultW, col));
        const snapRow = Math.max(0, Math.min(rows - def.defaultH, row));
        setGhostDrag({ col: snapCol, row: snapRow, type: dragRef.current.furnitureType });
        dragRef.current.ghostCol = snapCol;
        dragRef.current.ghostRow = snapRow;
      }
    }
  }, [canvasToGrid, activeTool, cols, rows, items, panX, panY, zoom, paintCells]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    panDragRef.current = null;
    paintingRef.current = false;

    if (dragRef.current?.type === "canvas" && dragRef.current.itemId) {
      const { itemId, ghostCol, ghostRow } = dragRef.current;
      updateLayoutItem(itemId, { x: ghostCol, y: ghostRow });
      setGhostDrag(null);
      dragRef.current = null;
      return;
    }

    if (dragRef.current?.type === "palette" && dragRef.current.furnitureType) {
      const { furnitureType, ghostCol, ghostRow } = dragRef.current;
      const def = FUR_MAP[furnitureType];
      if (def) {
        const newItem: LayoutItem = {
          id: uid(),
          type: furnitureType,
          x: ghostCol,
          y: ghostRow,
          w: def.defaultW,
          h: def.defaultH,
          rotation: 0,
          label: def.label,
        };
        addLayoutItem(newItem);
        setSelectedItemId(newItem.id);
        setActiveTool("furniture");
      }
      setGhostDrag(null);
      dragRef.current = null;
    }

    if (e.button === 2 && activeTool === "zone" && zonePoints.length >= 3) {
      // Close zone on right click
      finishZone();
    }
  }, [activeTool, zonePoints, addLayoutItem, updateLayoutItem]);

  const handleMouseLeave = useCallback(() => {
    setHoverCell(null);
    paintingRef.current = false;
    if (!dragRef.current?.type) panDragRef.current = null;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const { canvasX, canvasY } = canvasToGrid(e.clientX, e.clientY);
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newZoom = Math.max(0.3, Math.min(3.0, zoom + delta));
    const scale = newZoom / zoom;
    const newPanX = canvasX - (canvasX - panX) * scale;
    const newPanY = canvasY - (canvasY - panY) * scale;
    setZoom(newZoom);
    setPanX(newPanX);
    setPanY(newPanY);
    panRef.current = { x: newPanX, y: newPanY };
  }, [zoom, panX, panY, canvasToGrid]);

  // ─── Palette drag start ─────────────────────────────────────────────────────
  const handlePaletteDragStart = useCallback((type: LayoutItemType) => {
    dragRef.current = { type: "palette", furnitureType: type, ghostCol: 0, ghostRow: 0 };
    setActiveTool("furniture");
  }, []);

  // ─── Zone finish ───────────────────────────────────────────────────────────
  const finishZone = useCallback(() => {
    if (zonePoints.length < 3) return;
    const newZone: LayoutZone = {
      id: uid(),
      label: `Khu ${(zones?.length ?? 0) + 1}`,
      color: ZONE_COLORS[zoneColorIdx % ZONE_COLORS.length],
      points: zonePoints.map(p => [p.col, p.row]),
    };
    addZone(newZone);
    setZonePoints([]);
    setZoneColorIdx(i => (i + 1) % ZONE_COLORS.length);
  }, [zonePoints, zones, zoneColorIdx, addZone]);

  // ─── Room size change ───────────────────────────────────────────────────────
  const applyRoomSize = useCallback(() => {
    const w = Math.max(4, Math.min(40, Number(roomWInput) || roomW));
    const d = Math.max(4, Math.min(30, Number(roomDInput) || roomD));
    setLayoutRoom(w, d);
    setRoomWInput(String(w));
    setRoomDInput(String(d));
  }, [roomWInput, roomDInput, roomW, roomD, setLayoutRoom]);

  // ─── Rotation ───────────────────────────────────────────────────────────────
  const rotateSelected = useCallback((deg: number) => {
    if (!selectedItemId) return;
    const item = items.find(i => i.id === selectedItemId);
    if (!item) return;
    updateLayoutItem(selectedItemId, { rotation: ((item.rotation ?? 0) + deg + 360) % 360 });
  }, [selectedItemId, items, updateLayoutItem]);

  // ─── Tool palette entries ───────────────────────────────────────────────────
  const paintTools = [
    { tool: "floor" as PaintTool, label: "Nền sàn", hotkey: "F", color: C.floorFill },
    { tool: "wall"  as PaintTool, label: "Tường",   hotkey: "W", color: C.wallTop },
    { tool: "erase" as PaintTool, label: "Xoá",     hotkey: "E", color: C.emptyTile },
  ];

  const cursorStyle = spaceHeldRef.current || panDragRef.current
    ? "grab"
    : activeTool === "furniture" ? "crosshair"
    : activeTool === "zone" ? "cell"
    : "crosshair";

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      width: "100%",
      height: "100%",
      minHeight: 600,
      background: C.canvasBg,
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: C.text,
      userSelect: "none",
    }}>
      {/* ── Top status bar ───────────────────────────────────────────────────── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "6px 16px",
        background: C.statusBg,
        borderBottom: `1px solid ${C.panelBorder}`,
        fontSize: 11,
        color: C.textMuted,
        flexShrink: 0,
      }}>
        <span style={{ color: C.accent, fontWeight: 700, fontSize: 12 }}>
          {activeTool === "floor" ? "TÔ NỀN" :
           activeTool === "wall"  ? "VẼ TƯỜNG" :
           activeTool === "erase" ? "XOÁ Ô" :
           activeTool === "furniture" ? "NỘI THẤT" : "KHU VỰC"}
        </span>
        <span style={{ color: C.panelBorder }}>|</span>
        <span>
          {hoverCell
            ? `Col ${hoverCell.col}, Row ${hoverCell.row}`
            : "Hover để xem toạ độ"}
        </span>
        <span style={{ color: C.panelBorder }}>|</span>
        <span>{items.length} đồ vật · {zones?.length ?? 0} khu vực</span>
        <span style={{ color: C.panelBorder }}>|</span>
        <span>Zoom {Math.round(zoom * 100)}%</span>
        {items.length > 0 && (
          <>
            <span style={{ color: C.panelBorder }}>|</span>
            <span style={{
              background: "rgba(201,169,110,0.15)",
              border: `1px solid ${C.accent}`,
              color: C.accent,
              borderRadius: 4,
              padding: "1px 7px",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1,
            }}>SYNC 3D</span>
          </>
        )}
        <span style={{ marginLeft: "auto", color: C.textDim, fontSize: 10 }}>
          F=Nền · W=Tường · E=Xoá · Z=Zone · Del=Xoá chọn · Scroll=Zoom · Chuột phải=Pan
        </span>
      </div>

      {/* ── Main layout ─────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>

        {/* ── Left sidebar ─────────────────────────────────────────────────── */}
        <div style={{
          width: 200,
          background: C.sidebarBg,
          borderRight: `1px solid ${C.panelBorder}`,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          flexShrink: 0,
        }}>

          {/* Section: TÔ NỀN */}
          <SectionHeader label="TÔ NỀN" />
          <div style={{ padding: "4px 8px" }}>
            {paintTools.map(pt => (
              <ToolButton
                key={pt.tool}
                active={activeTool === pt.tool}
                onClick={() => setActiveTool(pt.tool)}
                hotkey={pt.hotkey}
                label={pt.label}
              >
                <div style={{
                  width: 28, height: 28,
                  background: pt.color,
                  border: `2px solid ${pt.tool === "floor" ? C.floorBorder : pt.tool === "wall" ? "#1A1614" : "#333"}`,
                  borderRadius: 4,
                  flexShrink: 0,
                }} />
              </ToolButton>
            ))}
          </div>

          {/* Section: NỘI THẤT */}
          <SectionHeader label="NỘI THẤT" />
          <div style={{ padding: "4px 8px" }}>
            {FURNITURE.map(def => (
              <ToolButton
                key={def.type}
                active={activeTool === "furniture"}
                onClick={() => setActiveTool("furniture")}
                hotkey=""
                label={def.label}
                onMouseDown={() => handlePaletteDragStart(def.type)}
              >
                <PaletteIcon type={def.type} />
              </ToolButton>
            ))}
          </div>

          {/* Section: KHU VỰC */}
          <SectionHeader label="KHU VỰC" />
          <div style={{ padding: "4px 8px" }}>
            <ToolButton
              active={activeTool === "zone"}
              onClick={() => { setActiveTool("zone"); setZonePoints([]); }}
              hotkey="Z"
              label="Vẽ vùng"
            >
              <div style={{ width: 28, height: 28, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width={28} height={28} viewBox="0 0 28 28">
                  <polygon points="6,22 14,4 22,22" fill={`${ZONE_COLORS[zoneColorIdx]}44`} stroke={ZONE_COLORS[zoneColorIdx]} strokeWidth="1.5" strokeDasharray="3,2"/>
                  {[[6,22],[14,4],[22,22]].map(([cx,cy],i) => (
                    <circle key={i} cx={cx} cy={cy} r={2.5} fill={ZONE_COLORS[zoneColorIdx]}/>
                  ))}
                </svg>
              </div>
            </ToolButton>
            {activeTool === "zone" && zonePoints.length >= 3 && (
              <button
                onClick={finishZone}
                style={{
                  width: "100%",
                  marginTop: 4,
                  padding: "6px 0",
                  background: `${ZONE_COLORS[zoneColorIdx]}33`,
                  border: `1px solid ${ZONE_COLORS[zoneColorIdx]}`,
                  color: ZONE_COLORS[zoneColorIdx],
                  borderRadius: 4,
                  fontSize: 11,
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                Đóng vùng ({zonePoints.length} điểm)
              </button>
            )}
            {/* Zone list */}
            {(zones ?? []).map(z => (
              <div key={z.id} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "3px 6px",
                marginTop: 2,
                background: C.sidebarItem,
                borderRadius: 4,
                fontSize: 11,
              }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: z.color, flexShrink: 0 }}/>
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: C.text }}>{z.label}</span>
                <button
                  onClick={() => removeZone(z.id)}
                  style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 13, padding: 0, lineHeight: 1 }}
                >×</button>
              </div>
            ))}
          </div>

          {/* Room size */}
          <SectionHeader label="PHÒNG" />
          <div style={{ padding: "6px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 10, color: C.textMuted, width: 32 }}>Rộng</span>
              <input
                value={roomWInput}
                onChange={e => setRoomWInput(e.target.value)}
                onBlur={applyRoomSize}
                onKeyDown={e => e.key === "Enter" && applyRoomSize()}
                style={inputStyle}
                type="number" min={4} max={40}
              />
              <span style={{ fontSize: 10, color: C.textMuted }}>m</span>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 10, color: C.textMuted, width: 32 }}>Sâu</span>
              <input
                value={roomDInput}
                onChange={e => setRoomDInput(e.target.value)}
                onBlur={applyRoomSize}
                onKeyDown={e => e.key === "Enter" && applyRoomSize()}
                style={inputStyle}
                type="number" min={4} max={30}
              />
              <span style={{ fontSize: 10, color: C.textMuted }}>m</span>
            </div>
          </div>

          {/* Zoom controls */}
          <div style={{ padding: "4px 10px 2px", display: "flex", gap: 4 }}>
            <ZoomBtn label="−" onClick={() => setZoom(z => Math.max(0.3, +(z - 0.15).toFixed(2)))} />
            <ZoomBtn label={`${Math.round(zoom * 100)}%`} onClick={() => { setZoom(1); setPanX(24); setPanY(24); }} />
            <ZoomBtn label="+" onClick={() => setZoom(z => Math.min(3.0, +(z + 0.15).toFixed(2)))} />
          </div>

          {/* Preset + Clear */}
          <div style={{ padding: "6px 10px 10px", marginTop: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
            <button
              onClick={() => { if (window.confirm("Tải bản đồ POSTLAIN? Layout hiện tại sẽ bị ghi đè.")) { loadPresetLayout(); setSelectedItemId(null); setZonePoints([]); } }}
              style={{
                width: "100%", padding: "7px 0",
                background: "rgba(60,120,60,0.18)",
                border: "1px solid rgba(80,180,80,0.35)",
                color: "rgba(100,220,100,0.95)",
                borderRadius: 5, fontSize: 11, cursor: "pointer", fontWeight: 600,
              }}
            >
              🗺 Tải bản đồ POSTLAIN
            </button>
            <button
              onClick={() => { if (window.confirm("Xoá toàn bộ layout?")) { clearLayout(); setSelectedItemId(null); setZonePoints([]); } }}
              style={{
                width: "100%", padding: "7px 0",
                background: "rgba(180,60,60,0.12)",
                border: "1px solid rgba(180,60,60,0.3)",
                color: "rgba(220,100,100,0.9)",
                borderRadius: 5, fontSize: 11, cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Xoá tất cả
            </button>
          </div>
        </div>

        {/* ── Canvas area ──────────────────────────────────────────────────── */}
        <div
          ref={containerRef}
          style={{ flex: 1, position: "relative", overflow: "hidden", background: C.canvasBg }}
        >
          <canvas
            ref={canvasRef}
            style={{ display: "block", cursor: cursorStyle }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onWheel={handleWheel}
            onContextMenu={e => e.preventDefault()}
          />
        </div>

        {/* ── Right panel (selected item) ───────────────────────────────────── */}
        {selectedItem && (
          <div style={{
            width: 220,
            background: C.panelBg,
            borderLeft: `1px solid ${C.panelBorder}`,
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
            overflowY: "auto",
          }}>
            <div style={{
              padding: "12px 14px 8px",
              borderBottom: `1px solid ${C.panelBorder}`,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}>
              <div style={{ width: 44, height: 44, flexShrink: 0 }}>
                <PaletteIcon type={selectedItem.type} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 2 }}>
                  {FUR_MAP[selectedItem.type]?.description ?? ""}
                </div>
                <div style={{ fontSize: 13, color: C.accent, fontWeight: 700 }}>
                  {FUR_MAP[selectedItem.type]?.label ?? selectedItem.type}
                </div>
              </div>
            </div>

            <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Label */}
              <PropertyField label="Tên nhãn">
                <input
                  value={editLabel}
                  onChange={e => setEditLabel(e.target.value)}
                  onBlur={() => updateLayoutItem(selectedItem.id, { label: editLabel })}
                  onKeyDown={e => e.key === "Enter" && updateLayoutItem(selectedItem.id, { label: editLabel })}
                  style={{ ...inputStyle, width: "100%" }}
                />
              </PropertyField>

              {/* Position */}
              <PropertyField label="Vị trí (X, Y)">
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    type="number"
                    value={selectedItem.x}
                    onChange={e => updateLayoutItem(selectedItem.id, { x: Math.max(0, Number(e.target.value)) })}
                    style={{ ...inputStyle, width: "50%" }}
                  />
                  <input
                    type="number"
                    value={selectedItem.y}
                    onChange={e => updateLayoutItem(selectedItem.id, { y: Math.max(0, Number(e.target.value)) })}
                    style={{ ...inputStyle, width: "50%" }}
                  />
                </div>
              </PropertyField>

              {/* Size */}
              <PropertyField label="Kích thước (W × H)">
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    type="number"
                    value={selectedItem.w}
                    min={1}
                    onChange={e => updateLayoutItem(selectedItem.id, { w: Math.max(1, Number(e.target.value)) })}
                    style={{ ...inputStyle, width: "50%" }}
                  />
                  <input
                    type="number"
                    value={selectedItem.h}
                    min={1}
                    onChange={e => updateLayoutItem(selectedItem.id, { h: Math.max(1, Number(e.target.value)) })}
                    style={{ ...inputStyle, width: "50%" }}
                  />
                </div>
              </PropertyField>

              {/* Rotation */}
              <PropertyField label={`Xoay: ${selectedItem.rotation}°`}>
                <div style={{ display: "flex", gap: 6 }}>
                  {[-90, 90, 180].map(deg => (
                    <button
                      key={deg}
                      onClick={() => rotateSelected(deg)}
                      style={{
                        flex: 1, padding: "5px 0",
                        background: C.sidebarItem,
                        border: `1px solid ${C.panelBorder}`,
                        color: C.text,
                        borderRadius: 4, fontSize: 11, cursor: "pointer",
                      }}
                    >
                      {deg > 0 ? `+${deg}°` : `${deg}°`}
                    </button>
                  ))}
                </div>
              </PropertyField>

              {/* Color picker */}
              <PropertyField label="Màu sắc">
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="color"
                    value={selectedItem.color ?? getFurnitureBaseColor(selectedItem.type)}
                    onChange={e => updateLayoutItem(selectedItem.id, { color: e.target.value })}
                    style={{ width: 36, height: 28, border: "none", background: "none", cursor: "pointer", padding: 0 }}
                  />
                  {selectedItem.color && (
                    <button
                      onClick={() => updateLayoutItem(selectedItem.id, { color: undefined })}
                      style={{ fontSize: 10, color: C.textMuted, background: "none", border: "none", cursor: "pointer" }}
                    >
                      Đặt lại
                    </button>
                  )}
                </div>
              </PropertyField>

              {/* Island shelf capacity info */}
              {selectedItem.type === "island_shelf" && (
                <div style={{
                  background: "rgba(74,122,152,0.12)",
                  border: "1px solid rgba(74,122,152,0.3)",
                  borderRadius: 6,
                  padding: "8px 10px",
                }}>
                  <div style={{ fontSize: 11, color: "#4A7A98", fontWeight: 700, marginBottom: 6 }}>
                    Sức chứa kệ kho
                  </div>
                  <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 6 }}>
                    5 tầng × 5 vị trí = <span style={{ color: C.text, fontWeight: 700 }}>25 hộp</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 2 }}>
                    {Array.from({ length: 25 }).map((_, i) => (
                      <div key={i} style={{
                        height: 10,
                        background: "rgba(74,122,152,0.35)",
                        border: "1px solid rgba(74,122,152,0.5)",
                        borderRadius: 1,
                      }} />
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              <PropertyField label="Ghi chú">
                <textarea
                  value={selectedItem.notes ?? ""}
                  onChange={e => updateLayoutItem(selectedItem.id, { notes: e.target.value })}
                  rows={2}
                  style={{
                    ...inputStyle,
                    width: "100%",
                    resize: "none",
                    fontFamily: "inherit",
                  }}
                />
              </PropertyField>

              {/* Delete */}
              <button
                onClick={() => { removeLayoutItem(selectedItem.id); setSelectedItemId(null); }}
                style={{
                  padding: "7px 0",
                  background: "rgba(180,60,60,0.1)",
                  border: "1px solid rgba(180,60,60,0.3)",
                  color: "rgba(220,100,100,0.9)",
                  borderRadius: 5, fontSize: 11,
                  cursor: "pointer", fontWeight: 600,
                  marginTop: 4,
                }}
              >
                Xoá đồ vật này
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function SectionHeader({ label }: { label: string }) {
  return (
    <div style={{
      padding: "10px 12px 4px",
      fontSize: 9,
      fontWeight: 800,
      letterSpacing: "0.12em",
      color: C.textDim,
      textTransform: "uppercase" as const,
    }}>
      {label}
    </div>
  );
}

function ToolButton({
  active, onClick, onMouseDown, hotkey, label, children,
}: {
  active: boolean;
  onClick: () => void;
  onMouseDown?: () => void;
  hotkey: string;
  label: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      onClick={onClick}
      onMouseDown={onMouseDown}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "5px 6px",
        marginBottom: 2,
        borderRadius: 5,
        background: active ? "rgba(201,169,110,0.1)" : "transparent",
        borderLeft: active ? `3px solid ${C.accent}` : "3px solid transparent",
        cursor: "pointer",
        transition: "background 0.1s",
      }}
      onMouseEnter={e => {
        if (!active) (e.currentTarget as HTMLDivElement).style.background = C.sidebarItem;
      }}
      onMouseLeave={e => {
        if (!active) (e.currentTarget as HTMLDivElement).style.background = "transparent";
      }}
    >
      <div style={{ flexShrink: 0, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {children}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: active ? C.accent : C.text, fontWeight: active ? 700 : 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {label}
        </div>
      </div>
      {hotkey && (
        <div style={{
          fontSize: 9,
          color: C.textDim,
          background: "rgba(255,255,255,0.05)",
          border: `1px solid ${C.panelBorder}`,
          borderRadius: 3,
          padding: "1px 4px",
          flexShrink: 0,
          fontFamily: "monospace",
        }}>
          {hotkey}
        </div>
      )}
    </div>
  );
}

function PropertyField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 4, fontWeight: 600 }}>{label}</div>
      {children}
    </div>
  );
}

function ZoomBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: "4px 0",
        background: C.sidebarItem,
        border: `1px solid ${C.panelBorder}`,
        color: C.text,
        borderRadius: 4,
        fontSize: 11,
        cursor: "pointer",
        fontFamily: "monospace",
      }}
    >
      {label}
    </button>
  );
}

const inputStyle: React.CSSProperties = {
  background: "#0E0C0A",
  border: `1px solid #2A2824`,
  color: "#E8E4DC",
  borderRadius: 4,
  padding: "4px 7px",
  fontSize: 11,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

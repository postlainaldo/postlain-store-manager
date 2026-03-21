export interface Product {
  id: string;
  name: string;
  category: string;
  quantity: number;
  price?: number;          // giá gốc / full price
  markdownPrice?: number;  // giá giảm / markdown price
  sku?: string;
  imagePath?: string;
  notes?: string;
  productType?: string;  // key from PRODUCT_TYPES catalog
  size?: string;         // shoe size e.g. "38"
  color?: string;        // hex color e.g. "#C4956A"
  createdAt: string;
  updatedAt: string;
}

export type ShelfLayout = Record<number, string | null>;

export type Tab = "inventory" | "display";

export interface ExcelRow {
  name?: string;
  category?: string;
  quantity?: number | string;
  price?: number | string;
  markdown?: number | string;
  sku?: string;
  notes?: string;
  [key: string]: unknown;
}

// ─── Store Floor (SÀN) types ──────────────────────────────────────────────────
export type ShelfRowType = "long" | "short" | "image";

export interface StoreShelfRow {
  type: ShelfRowType; // for display label: DÀI / NGẮN / TRANH
  products: (string | null)[]; // capacity = products.length
}

export interface StoreSubsection {
  id: string;
  name: string;
  rows: StoreShelfRow[];
}

export type StoreSectionType =
  | "wall_woman"
  | "wall_man"
  | "center_woman"
  | "center_man"
  | "acc"
  | "window";

export interface StoreSection {
  id: string;
  name: string;
  sectionType: StoreSectionType;
  subsections: StoreSubsection[];
}

// ─── Store Layout 2D (KHÔNG GIAN) ─────────────────────────────────────────────
// Each item placed on the 2D floor plan canvas
export type LayoutItemType =
  | "wall_shelf"      // Kệ tường (mounts on wall)
  | "island_shelf"    // Kệ kho đảo (25 thùng, 5 tầng × 5 vị trí)
  | "tower"           // Tháp trưng bày
  | "acc_panel"       // Kệ ACC 3 cánh
  | "cashier"         // Quầy thu ngân
  | "shoecare"        // Quầy shoecare
  | "column"          // Cột
  | "window"          // Cửa sổ
  | "zone";           // Vùng / khu vực (polygon label)

export type FloorCellType = "floor" | "wall" | "empty";

export interface LayoutItem {
  id: string;
  type: LayoutItemType;
  // Position in metres from store top-left corner
  x: number;          // metres from left wall
  y: number;          // metres from front wall (y=0 = front)
  // Size in metres
  w: number;
  h: number;
  // Visual
  rotation: number;   // degrees: 0, 90, 180, 270
  label: string;
  color?: string;     // custom colour override
  notes?: string;
  // island_shelf specific
  capacity?: number;      // default 25 for island_shelf
  warehouseShelfId?: string; // links to WarehouseShelf.id (e.g. "shoes_01")
  shelfCols?: number;     // columns of slots per tier (default 5)
  shelfRows?: number;     // rows of slots per tier (default 5)
}

// Zone = a named polygon drawn by connecting points on the grid
export interface LayoutZone {
  id: string;
  label: string;
  color: string;
  // Array of [col, row] grid coordinates (integers)
  points: [number, number][];
}

export interface StoreLayoutConfig {
  // Room dimensions in metres
  roomW: number;      // width (left-right)
  roomD: number;      // depth (front-back)
  gridSize: number;   // metres per grid cell (default 1.0)
  // Paint grid: "floor" = walkable, "wall" = painted wall, "empty" = default
  grid: FloorCellType[][];   // [row][col], size = roomD/gridSize × roomW/gridSize
  items: LayoutItem[];
  zones: LayoutZone[];
}

// ─── Warehouse (KHO) types ─────────────────────────────────────────────────────
export interface WarehouseShelf {
  id: string;
  name: string; // "Giày 01", "Túi 03", etc.
  shelfType: "shoes" | "bags";
  number: number;
  notes?: string;
  tiers: (string | null)[][]; // 4 tiers, each = 25 slots (5 cols × 5 rows, flat)
}

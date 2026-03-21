import type { StoreShelfRow, StoreSubsection, StoreSection, WarehouseShelf, StoreLayoutConfig, FloorCellType, LayoutItem } from "@/types";

// ─── Row builders ─────────────────────────────────────────────────────────────
const longRow = (): StoreShelfRow => ({ type: "long", products: Array(8).fill(null) });
const shortRow = (): StoreShelfRow => ({ type: "short", products: Array(3).fill(null) });
const imageRow = (): StoreShelfRow => ({ type: "image", products: [] });
const customRow = (cap: number): StoreShelfRow => ({
  type: cap >= 6 ? "long" : "short",
  products: Array(cap).fill(null),
});

function parsePattern(pattern: string): StoreShelfRow[] {
  return [...pattern].map((c) => {
    if (c === "L") return longRow();
    if (c === "S") return shortRow();
    return imageRow(); // "I" = image/tranh
  });
}

function sub(id: string, name: string, rowsOrPattern: string | StoreShelfRow[]): StoreSubsection {
  return {
    id,
    name,
    rows: typeof rowsOrPattern === "string" ? parsePattern(rowsOrPattern) : rowsOrPattern,
  };
}

// ─── Full store section definitions ──────────────────────────────────────────
export const INITIAL_STORE_SECTIONS: StoreSection[] = [
  // ── KỆ NỮ (wall shelves, right side of store) ─────────────────────────────
  {
    id: "woman_wall",
    name: "KỆ NỮ",
    sectionType: "wall_woman",
    subsections: [
      // DRESS: DÀI, DÀI, DÀI, DÀI, NGẮN, DÀI, DÀI, NGẮN, DÀI
      sub("woman_dress", "DRESS", "LLLLSLLSL"),
      // CASUAL: DÀI, DÀI, DÀI, DÀI, DÀI, NGẮN, DÀI, NGẮN, DÀI
      sub("woman_casual", "CASUAL SANDALS", "LLLLLSLSL"),
      // SNEAKER/ATH: DÀI ×6, TRANH
      sub("woman_ath", "SNEAKER / ATH", "LLLLLLI"),
      // HANDBAG PHỤ: 7 NGẮN
      sub("woman_handbag1", "HANDBAG PHỤ", "SSSSSSS"),
      // HANDBAG PHỤ 2: DÀI ×5, TRANH
      sub("woman_handbag2", "HANDBAG PHỤ 2", "LLLLLI"),
      // SALE 1: DÀI, DÀI, DÀI, NGẮN, DÀI, NGẮN, DÀI
      sub("woman_sale1", "SALE 1", "LLLSLSL"),
      // SALE 2: DÀI, DÀI, DÀI, NGẮN, DÀI, DÀI, DÀI
      sub("woman_sale2", "SALE 2", "LLLSLLL"),
    ],
  },

  // ── WOMAN CENTER UNIT (3 cột × 5 tầng) ────────────────────────────────────
  {
    id: "center_woman",
    name: "WOMAN CENTER",
    sectionType: "center_woman",
    subsections: [
      sub("wcu", "WOMAN CENTER UNIT", Array(5).fill(null).map(() => customRow(3))),
    ],
  },

  // ── ACC CENTER UNIT (6 mặt × 50 sản phẩm) ─────────────────────────────────
  {
    id: "acc_center",
    name: "ACC CENTER",
    sectionType: "acc",
    subsections: Array.from({ length: 6 }, (_, i) =>
      sub(`acc_${i + 1}`, `MẶT ${i + 1}`, Array(10).fill(null).map(() => customRow(5)))
    ),
  },

  // ── MAN CENTER UNIT (3 cột × 5 tầng) ──────────────────────────────────────
  {
    id: "center_man",
    name: "MAN CENTER",
    sectionType: "center_man",
    subsections: [
      sub("mcu", "MAN CENTER UNIT", Array(5).fill(null).map(() => customRow(3))),
    ],
  },

  // ── KỆ NAM (wall shelves, left side of store) ──────────────────────────────
  {
    id: "man_wall",
    name: "KỆ NAM",
    sectionType: "wall_man",
    subsections: [
      // HANDBAG: DÀI, DÀI, DÀI, DÀI, NGẮN, DÀI
      sub("man_handbag", "HANDBAG", "LLLLSL"),
      // DRESS + CASUAL: DÀI, DÀI, DÀI, NGẮN, DÀI, NGẮN, DÀI, TRANH
      sub("man_dress", "DRESS + CASUAL", "LLLSLSLI"),
      // ATH + BAG: 7 DÀI
      sub("man_ath", "ATH + BAG", "LLLLLLL"),
    ],
  },

  // ── WINDOW ─────────────────────────────────────────────────────────────────
  {
    id: "window",
    name: "WINDOW",
    sectionType: "window",
    subsections: [
      // WINDOW NỮ PHẢI: 3 kệ × 4 ngăn × 6 sản phẩm → 12 rows × 6 slots
      sub(
        "win_woman_side",
        "WINDOW NỮ PHẢI",
        Array(12).fill(null).map(() => customRow(6))
      ),
      // WINDOW NỮ TRƯỚC: 3 cột × 4 sản phẩm → 4 rows × 3 slots
      sub(
        "win_woman_front",
        "WINDOW NỮ TRƯỚC",
        Array(4).fill(null).map(() => customRow(3))
      ),
      // WINDOW NAM TRƯỚC: 3 cột × 4 sản phẩm → 4 rows × 3 slots
      sub(
        "win_man_front",
        "WINDOW NAM TRƯỚC",
        Array(4).fill(null).map(() => customRow(3))
      ),
    ],
  },
];

// ─── Warehouse layout: 14 kệ giày + 8 kệ túi ────────────────────────────────
function makeWarehouseShelf(
  type: "shoes" | "bags",
  number: number
): WarehouseShelf {
  return {
    id: `${type}_${String(number).padStart(2, "0")}`,
    name: `${type === "shoes" ? "Giày" : "Túi"} ${String(number).padStart(2, "0")}`,
    shelfType: type,
    number,
    // 4 tiers, each = 25 slots (5 cols × 5 rows)
    tiers: Array.from({ length: 4 }, () => Array(25).fill(null)),
  };
}

export const INITIAL_WAREHOUSE: WarehouseShelf[] = [
  ...Array.from({ length: 14 }, (_, i) => makeWarehouseShelf("shoes", i + 1)),
  ...Array.from({ length: 8 }, (_, i) => makeWarehouseShelf("bags", i + 1)),
];

// ─── Preset store map (built from actual floor plan) ──────────────────────────
// Real-world dimensions (1 unit = 1 metre):
//   Display room: W=6.50m × D=5.30m
//   Warehouse behind: adds ~4.80m depth → total D = 5.30 + 4.80 = 10.10m
//   gridSize = 0.50m → cols = 13, rows = 21
//
// Shelf real sizes (metres):
//   wall_shelf standard : w=1.15, depth(h in 2D)=0.40, height 3D=2.47
//   wall_shelf handbag  : w=0.43, depth=0.40
//   wall_shelf window_r : w=1.40, depth=0.40
//   island_shelf (kho)  : w=1.20, depth=0.30, 3D height=2.20, tier=0.50
//   window sill         : w=1.40 (NỮ) / 1.40 (NAM)
//   cashier             : w=1.50, d=0.60
//   shoecare            : w=1.15, d=0.45
//   acc_panel center    : w=0.50, d=0.50, h=1.30
//   bục window cao      : 0.50×0.50, H=0.78
//   bục window thấp     : 0.50×0.50, H=0.55
//   bục center cao      : 0.70×0.70, H=0.95
//   bục center thấp     : 0.70×0.70, H=0.65

let _itemId = 0;
function id(prefix: string): string {
  return `preset_${prefix}_${++_itemId}`;
}

export function buildPresetLayout(): StoreLayoutConfig {
  _itemId = 0;

  // Grid: 0.5m cells
  // Display: 6.50m wide → 13 cols; total depth: 5.30+4.80 = 10.10m → 21 rows (but use 10.5 → 21 rows)
  const GS = 0.5;
  // Total layout: 6.5m wide × 10.5m deep (display + warehouse)
  const W = 6.5;
  const D = 10.5;
  const COLS = Math.round(W / GS); // 13
  const ROWS = Math.round(D / GS); // 21

  const grid: FloorCellType[][] = Array.from({ length: ROWS }, () =>
    Array(COLS).fill("empty") as FloorCellType[]
  );

  function floorCells(r0: number, c0: number, r1: number, c1: number) {
    for (let r = r0; r < r1; r++)
      for (let c = c0; c < c1; c++)
        if (r >= 0 && r < ROWS && c >= 0 && c < COLS) grid[r][c] = "floor";
  }

  // ── Display area: rows 0-10 (0→5.0m depth), full width ──────────────────
  // rows 0..10 = 0→5.0m  (display room = 5.3m → rows 0..10 plus half)
  floorCells(0, 0, 11, COLS);   // display room floor

  // ── Warehouse area: rows 11-20 (5.0→10.5m) ─────────────────────────────
  // Warehouse is behind the display room; corridors 1.0m wide (2 cells)
  // Left aisle: cols 0-1 (0→1.0m)   Right aisle: cols 11-13 (5.5→6.5m)
  // Shelf zones: cols 2-11 split by 1m aisle in middle (cols 4-6 aisle)
  floorCells(11, 0, ROWS, COLS); // all warehouse cells walkable

  // ── Items ──────────────────────────────────────────────────────────────────
  const items: LayoutItem[] = [];

  function item(
    type: LayoutItem["type"],
    x: number, y: number, w: number, h: number,
    label: string,
    extra: Partial<LayoutItem> = {}
  ): LayoutItem {
    const it: LayoutItem = { id: id(type), type, x, y, w, h, rotation: 0, label, ...extra };
    items.push(it);
    return it;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // FRONT GLASS WALL (y=0) — windows along x=0→6.5
  // Total front: 6.50m. Windows each 1.40m; split: NỮ left, NAM right
  // CỬA KÍNH NỮ: x=0.0→1.4, window faces into store (faces +z)
  // CỔNG VÀO: x=1.4→5.1 (entrances, 3.7m gap)
  // CỬA KÍNH NAM: x=5.1→6.5
  // ════════════════════════════════════════════════════════════════════════════
  item("window", 0.0,  0.0, 1.40, 0.15, "CỬA KÍNH NỮ",  { rotation: 0 });
  item("zone",   1.4,  0.0, 3.70, 1.00, "CỔNG VÀO",      { color: "#4488FF" });
  item("window", 5.10, 0.0, 1.40, 0.15, "CỬA KÍNH NAM",  { rotation: 0 });

  // ════════════════════════════════════════════════════════════════════════════
  // KỆ WINDOW NỮ BÊN PHẢI (left wall x=0, faces right → rotation=90)
  // Real: 3 kệ × 1.40m ngang, depth=0.40m, mounted along left wall x=0
  // y positions: 0.40, 1.85, 3.30 (spacing ~1.45m = shelf+aisle)
  // ════════════════════════════════════════════════════════════════════════════
  item("wall_shelf", 0.0, 0.40, 0.40, 1.40, "KỆ WINDOW 1", { rotation: 90 });
  item("wall_shelf", 0.0, 1.85, 0.40, 1.40, "KỆ WINDOW 2", { rotation: 90 });
  item("wall_shelf", 0.0, 3.30, 0.40, 1.40, "KỆ WINDOW 3", { rotation: 90 });

  // ════════════════════════════════════════════════════════════════════════════
  // KỆ NAM (right wall x≈6.1, faces left → rotation=270)
  // 4 wall shelves 1.15m wide × 0.40m deep along right wall
  // ════════════════════════════════════════════════════════════════════════════
  item("wall_shelf", 6.10, 0.40, 0.40, 1.15, "KỆ NAM 1 (HANDBAG)",     { rotation: 270 });
  item("wall_shelf", 6.10, 1.60, 0.40, 1.15, "KỆ NAM 2 (DRESS+CASUAL)", { rotation: 270 });
  item("wall_shelf", 6.10, 2.80, 0.40, 1.15, "KỆ NAM 3 (ATH+BAG)",      { rotation: 270 });
  item("wall_shelf", 6.10, 4.00, 0.40, 1.15, "KỆ NAM 4 (SALE)",         { rotation: 270 });

  // ════════════════════════════════════════════════════════════════════════════
  // FRONT WALL SHELVES — KỆ THẤP / CAO below windows, facing into store (rotation=0)
  // Below CỬA KÍNH NỮ (x=0→1.4), y=0.40m from front, 3 slots of 0.43m each
  // ════════════════════════════════════════════════════════════════════════════
  item("wall_shelf", 0.00, 0.40, 1.15, 0.40, "KỆ THẤP NỮ", { rotation: 0 });

  // Below CỬA KÍNH NAM (x=5.1→6.5), same layout mirrored
  item("wall_shelf", 5.10, 0.40, 1.15, 0.40, "KỆ THẤP NAM", { rotation: 0 });

  // ════════════════════════════════════════════════════════════════════════════
  // CENTER UNIT NỮ — bục + kệ giữa cửa hàng bên trái
  // x=1.50→2.90 (1.40m wide zone), y=1.20→3.50
  // Bục cao: 0.70×0.70, H=0.95; bục thấp: 0.70×0.70, H=0.65
  // ════════════════════════════════════════════════════════════════════════════
  item("tower",      1.60, 1.20, 0.70, 0.70, "BỤC CAO NỮ");
  item("wall_shelf", 1.55, 2.00, 1.15, 0.40, "KỆ TRUNG NỮ");
  item("wall_shelf", 1.55, 2.50, 1.15, 0.40, "KỆ CAO NỮ");
  item("zone",       1.50, 1.20, 1.40, 2.30, "CENTER UNIT NỮ", { color: "#887760" });

  // ════════════════════════════════════════════════════════════════════════════
  // KỆ ACC CENTER — trục giữa, y=1.80→3.10 (x=3.00)
  // Tấm ACC: CAO 1.30m, NGANG 0.50m
  // ════════════════════════════════════════════════════════════════════════════
  item("acc_panel", 2.90, 1.80, 0.50, 0.50, "KỆ ACC");

  // ════════════════════════════════════════════════════════════════════════════
  // CENTER UNIT NAM — bục + kệ giữa cửa hàng bên phải
  // x=3.50→4.90 (1.40m wide zone), y=1.20→3.50
  // ════════════════════════════════════════════════════════════════════════════
  item("tower",      3.60, 1.20, 0.70, 0.70, "BỤC CAO NAM");
  item("wall_shelf", 3.55, 2.00, 1.15, 0.40, "KỆ TRUNG NAM");
  item("wall_shelf", 3.55, 2.50, 1.15, 0.40, "KỆ CAO NAM");
  item("zone",       3.50, 1.20, 1.40, 2.30, "CENTER UNIT NAM", { color: "#606878" });

  // ════════════════════════════════════════════════════════════════════════════
  // BÀN CASHIER + QUẦY CASHIER — y≈3.80, x=2.00→4.50
  // Cashier: w=1.50, d=0.60
  // ════════════════════════════════════════════════════════════════════════════
  item("cashier", 2.00, 3.80, 1.50, 0.60, "BÀN CASHIER");
  item("cashier", 3.50, 3.80, 1.00, 0.60, "QUẦY CASHIER");

  // ════════════════════════════════════════════════════════════════════════════
  // BOTTOM SHELVES — KỆ NỮ y≈4.50 (row of 3 × 1.15m shelves)
  // Facing toward entrance (rotation=0, south face)
  // ════════════════════════════════════════════════════════════════════════════
  item("wall_shelf", 0.00, 4.50, 1.15, 0.40, "KỆ DRESS NỮ",   { rotation: 0 });
  item("wall_shelf", 1.20, 4.50, 1.15, 0.40, "KỆ CASUAL NỮ",  { rotation: 0 });
  item("wall_shelf", 2.40, 4.50, 1.15, 0.40, "KỆ SNEAKER NỮ", { rotation: 0 });

  // QUẦY SHOECARE — right side y≈4.50
  item("shoecare",   3.80, 4.50, 1.15, 0.45, "QUẦY SHOECARE");

  // Bottom right — KỆ SNEAKER NỮ right side
  item("wall_shelf", 5.00, 4.50, 1.15, 0.40, "KỆ SNEAKER NAM", { rotation: 0 });

  // ════════════════════════════════════════════════════════════════════════════
  // CỬA KHO (warehouse door) — centre back wall at y=5.00
  // Real: 1.00m wide × 1.30m deep
  // ════════════════════════════════════════════════════════════════════════════
  item("zone", 2.75, 5.00, 1.00, 0.50, "CỬA KHO", { color: "#228B22" });

  // ════════════════════════════════════════════════════════════════════════════
  // STAFF PLACE + TỦ ACC (left side of warehouse entrance)
  // ════════════════════════════════════════════════════════════════════════════
  item("zone",    0.00, 5.30, 1.50, 1.50, "STAFF PLACE", { color: "#335533" });
  item("cashier", 0.00, 6.90, 1.50, 0.50, "TỦ ACC");

  // ════════════════════════════════════════════════════════════════════════════
  // WAREHOUSE — KỆ GIÀY 1-14 + KỆ TÚI 1-6
  // Each shelf: w=1.20m, depth(h)=0.30m, 4 tiers × 0.50m = 2.20m tall
  // Aisle between rows: 1.00m
  // Layout: 2 parallel rows facing each other with 1m aisle between
  //   Row A (left):  x=0.00, faces right  (rotation=90)
  //   Aisle:         x=1.20→2.20
  //   Row B (right): x=2.20, faces left   (rotation=270)
  //
  // Warehouse starts at y=5.30
  // ════════════════════════════════════════════════════════════════════════════
  const WY = 5.50;   // warehouse start y
  const SW = 1.20;   // shelf width
  const SD = 0.30;   // shelf depth (2D h)
  const SG = 1.30;   // gap between shelf starts (shelf 1.20 + aisle 0.10 gap)

  // LEFT COLUMN (x=0.00, faces right=90°): KỆ GIÀY 1,2,3,4,5,6,7
  for (let i = 0; i < 7; i++) {
    item("island_shelf", 0.00, WY + i * SG, SD, SW, `KỆ GIÀY ${i + 1}`, {
      rotation: 90,
      warehouseShelfId: `shoes_${String(i + 1).padStart(2, "0")}`,
      shelfCols: 4, shelfRows: 5,
    });
  }

  // RIGHT COLUMN (x=2.20, faces left=270°): KỆ GIÀY 8,9,10,11,12,13,14
  for (let i = 0; i < 7; i++) {
    item("island_shelf", 2.20, WY + i * SG, SD, SW, `KỆ GIÀY ${i + 8}`, {
      rotation: 270,
      warehouseShelfId: `shoes_${String(i + 8).padStart(2, "0")}`,
      shelfCols: 4, shelfRows: 5,
    });
  }

  // KỆ TÚI — right side of warehouse (x=3.50, facing left)
  for (let i = 0; i < 6; i++) {
    item("island_shelf", 3.50, WY + i * SG, SD, SW, `KỆ TÚI ${i + 1}`, {
      rotation: 270,
      warehouseShelfId: `bags_${String(i + 1).padStart(2, "0")}`,
      shelfCols: 4, shelfRows: 5,
    });
  }

  // ĐƯỜNG ĐI KHO (aisle zone labels)
  item("zone", 1.20, WY, 1.00, SG * 7, "ĐƯỜNG ĐI KHO", { color: "#C8B47A" });

  return { roomW: W, roomD: D, gridSize: GS, grid, items, zones: [] };
}

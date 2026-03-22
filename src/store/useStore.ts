import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Product, ShelfLayout, Tab, StoreSection, WarehouseShelf, StoreLayoutConfig, LayoutItem, LayoutZone, FloorCellType } from "@/types";
// LayoutZone used in zone actions below
import { INITIAL_STORE_SECTIONS, INITIAL_WAREHOUSE, buildPresetLayout } from "@/lib/storeLayout";

function makeGrid(rows: number, cols: number): FloorCellType[][] {
  return Array.from({ length: rows }, () => Array(cols).fill("empty") as FloorCellType[]);
}

const INIT_COLS = 18; // roomW / gridSize
const INIT_ROWS = 12; // roomD / gridSize

const INITIAL_LAYOUT: StoreLayoutConfig = {
  roomW: 18,
  roomD: 12,
  gridSize: 1.0,
  grid: makeGrid(INIT_ROWS, INIT_COLS),
  items: [],
  zones: [],
};

export interface ShelfConfig {
  rows: number;
  cols: number;
  maxInventory: number;
}

export type UserRole = "admin" | "manager" | "staff";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  passwordHash: string; // simple: store plain pin in dev
  createdAt: string;
  active: boolean;
}

interface StoreState {
  // ── Auth ─────────────────────────────────────────────────────────────────
  users: AppUser[];
  currentUser: AppUser | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  addUser: (u: Omit<AppUser, "id" | "createdAt">) => void;
  updateUser: (id: string, changes: Partial<Omit<AppUser, "id" | "createdAt">>) => void;
  removeUser: (id: string) => void;
  changePassword: (userId: string, newPassword: string) => void;

  // ── Product inventory ────────────────────────────────────────────────────
  products: Product[];
  selectedProduct: Product | null;
  activeTab: Tab;
  shelfConfig: ShelfConfig;

  // ── Store settings ───────────────────────────────────────────────────────
  storeName: string;
  storeAddress: string;
  storePhone: string;
  storeEmail: string;
  setStoreSetting: (key: "storeName" | "storeAddress" | "storePhone" | "storeEmail", value: string) => void;

  // ── Notify settings ──────────────────────────────────────────────────────
  notifyLowStock: boolean;
  notifyMovement: boolean;
  notifyDaily: boolean;
  notifyPush: boolean;
  lowStockThreshold: number;
  setNotifySetting: (key: "notifyLowStock" | "notifyMovement" | "notifyDaily" | "notifyPush", value: boolean) => void;
  setLowStockThreshold: (value: number) => void;

  // ── UI settings ───────────────────────────────────────────────────────────
  uiCompact: boolean;
  uiAnimations: boolean;
  uiDensity: "comfortable" | "compact";
  setUISetting: (key: "uiCompact" | "uiAnimations", value: boolean) => void;
  setUIDensity: (value: "comfortable" | "compact") => void;

  // ── Legacy 3D display layout ─────────────────────────────────────────────
  shelfLayout: ShelfLayout;

  // ── Store floor sections (SÀN — 2D planogram) ───────────────────────────
  storeSections: StoreSection[];

  // ── Warehouse shelves (KHO) ───────────────────────────────────────────────
  warehouseShelves: WarehouseShelf[];

  // ── Store layout 2D (KHÔNG GIAN) ─────────────────────────────────────────
  storeLayout: StoreLayoutConfig;

  // ── Product CRUD ──────────────────────────────────────────────────────────
  setProducts: (products: Product[]) => void;
  fetchProducts: () => Promise<void>;
  addProduct: (product: Product) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  importProducts: (products: Omit<Product, "id" | "createdAt" | "updatedAt">[]) => Promise<void>;

  // ── Legacy 3D placement ───────────────────────────────────────────────────
  placeProduct: (slotIndex: number, productId: string | null) => void;
  selectProduct: (product: Product | null) => void;
  setActiveTab: (tab: Tab) => void;
  setShelfConfig: (config: ShelfConfig) => void;
  clearShelfLayout: () => void;

  // ── Store floor actions ───────────────────────────────────────────────────
  placeInSection: (
    sectionId: string,
    subsectionId: string,
    rowIndex: number,
    slotIndex: number,
    productId: string | null
  ) => void;
  clearSubsection: (sectionId: string, subsectionId: string) => void;
  resetStoreSections: () => void;
  addSubsectionRow: (sectionId: string, subsectionId: string, type: "long" | "short" | "image", slots: number) => void;
  removeSubsectionRow: (sectionId: string, subsectionId: string, rowIndex: number) => void;

  // ── Store layout 2D actions ───────────────────────────────────────────────
  loadPresetLayout: () => void;
  addLayoutItem: (item: LayoutItem) => void;
  updateLayoutItem: (id: string, changes: Partial<LayoutItem>) => void;
  removeLayoutItem: (id: string) => void;
  setLayoutRoom: (w: number, d: number) => void;
  clearLayout: () => void;
  paintCell: (row: number, col: number, cellType: FloorCellType) => void;
  paintCells: (cells: { row: number; col: number; cellType: FloorCellType }[]) => void;
  addZone: (zone: LayoutZone) => void;
  removeZone: (id: string) => void;
  updateZone: (id: string, changes: Partial<LayoutZone>) => void;

  // ── DB sync ───────────────────────────────────────────────────────────────
  fetchDbState: () => Promise<void>;

  // ── Warehouse actions ─────────────────────────────────────────────────────
  placeInWarehouse: (
    shelfId: string,
    tierIndex: number,
    slotIndex: number,
    productId: string | null
  ) => void;
  clearWarehouseTier: (shelfId: string, tierIndex: number) => void;
  clearWarehouseShelf: (shelfId: string) => void;
  removeWarehouseShelf: (shelfId: string) => void;
  addWarehouseShelf: (shelfType: "shoes" | "bags") => void;
  renameWarehouseShelf: (shelfId: string, name: string) => void;
  setWarehouseShelfNotes: (shelfId: string, notes: string) => void;
}

const DEFAULT_ADMIN: AppUser = {
  id: "user_admin",
  name: "Admin",
  email: "admin",
  role: "admin",
  passwordHash: "Aldo@123",
  createdAt: new Date().toISOString(),
  active: true,
};

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      // ── Auth ──────────────────────────────────────────────────────────────
      users: [DEFAULT_ADMIN],
      currentUser: null,
      login: (username, password) => {
        // Hard-coded admin bypass — luôn hoạt động bất kể localStorage
        if (
          (username.toLowerCase() === "admin" || username.toLowerCase() === DEFAULT_ADMIN.email.toLowerCase()) &&
          password === DEFAULT_ADMIN.passwordHash
        ) {
          set({ currentUser: DEFAULT_ADMIN });
          return true;
        }
        // Match các user khác theo email hoặc name
        const u = get().users.find(x =>
          x.id !== "user_admin" &&
          (x.email.toLowerCase() === username.toLowerCase() || x.name.toLowerCase() === username.toLowerCase())
          && x.passwordHash === password && x.active
        );
        if (u) { set({ currentUser: u }); return true; }
        return false;
      },
      logout: () => set({ currentUser: null }),
      addUser: (u) => set(s => ({
        users: [...s.users, { ...u, id: `user_${Date.now()}`, createdAt: new Date().toISOString() }],
      })),
      updateUser: (id, changes) => set(s => ({
        users: s.users.map(u => u.id === id ? { ...u, ...changes } : u),
        currentUser: s.currentUser?.id === id ? { ...s.currentUser!, ...changes } : s.currentUser,
      })),
      removeUser: (id) => set(s => ({ users: s.users.filter(u => u.id !== id) })),
      changePassword: (userId, newPassword) => set(s => ({
        users: s.users.map(u => u.id === userId ? { ...u, passwordHash: newPassword } : u),
      })),

      products: [],
      shelfLayout: {},
      selectedProduct: null,
      activeTab: "inventory",
      shelfConfig: { rows: 3, cols: 4, maxInventory: 0 },
      storeSections: INITIAL_STORE_SECTIONS,
      warehouseShelves: INITIAL_WAREHOUSE,
      storeLayout: INITIAL_LAYOUT,
      storeName: "ALDO — Vincom Đồng Khởi",
      storeAddress: "72 Lê Thánh Tôn, Q.1, TP.HCM",
      storePhone: "+84 28 3822 1234",
      storeEmail: "store.hcm@aldo.com",
      setStoreSetting: (key, value) => set({ [key]: value }),
      notifyLowStock: true,
      notifyMovement: true,
      notifyDaily: false,
      notifyPush: true,
      lowStockThreshold: 5,
      setNotifySetting: (key, value) => set({ [key]: value }),
      setLowStockThreshold: (value) => set({ lowStockThreshold: value }),
      uiCompact: false,
      uiAnimations: true,
      uiDensity: "comfortable",
      setUISetting: (key, value) => set({ [key]: value }),
      setUIDensity: (value) => set({ uiDensity: value }),

      // ── Product CRUD ──────────────────────────────────────────────────────
      setProducts: (products) => set({ products }),

      fetchProducts: async () => {
        const res = await fetch("/api/products");
        if (res.ok) set({ products: await res.json() });
      },

      addProduct: async (product) => {
        const res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(product),
        });
        if (res.ok) {
          const saved = await res.json();
          set((s) => ({ products: [...s.products, saved] }));
        }
      },

      updateProduct: async (product) => {
        const res = await fetch("/api/products", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(product),
        });
        if (res.ok) {
          const updated = await res.json();
          set((s) => ({
            products: s.products.map((p) => (p.id === updated.id ? updated : p)),
          }));
        }
      },

      deleteProduct: async (id) => {
        const res = await fetch("/api/products", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        if (res.ok) {
          set((s) => ({
            products: s.products.filter((p) => p.id !== id),
            shelfLayout: Object.fromEntries(
              Object.entries(s.shelfLayout).map(([k, v]) => [k, v === id ? null : v])
            ),
            // Remove from store sections
            storeSections: s.storeSections.map((sec) => ({
              ...sec,
              subsections: sec.subsections.map((sub) => ({
                ...sub,
                rows: sub.rows.map((row) => ({
                  ...row,
                  products: row.products.map((pid) => (pid === id ? null : pid)),
                })),
              })),
            })),
            // Remove from warehouse
            warehouseShelves: s.warehouseShelves.map((shelf) => ({
              ...shelf,
              tiers: shelf.tiers.map((tier) => tier.map((pid) => (pid === id ? null : pid))),
            })),
          }));
        }
      },

      importProducts: async (rows) => {
        const now = new Date().toISOString();
        const newProducts: Product[] = rows.map((row) => ({
          ...row,
          id: `prod_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          quantity: Number(row.quantity) || 0,
          price: row.price ? Number(row.price) : undefined,
          markdownPrice: row.markdownPrice ? Number(row.markdownPrice) : undefined,
          createdAt: now,
          updatedAt: now,
        }));
        const res = await fetch("/api/products/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newProducts),
        });
        if (res.ok) {
          const { products: upserted } = await res.json();
          // Re-fetch all to get consistent state (handles both inserts and updates)
          const allRes = await fetch("/api/products");
          if (allRes.ok) set({ products: await allRes.json() });
          else set((s) => {
            // Fallback: merge upserted into existing
            const updatedMap = new Map(upserted.map((p: Product) => [p.id, p]));
            const merged = s.products.map((p: Product) => updatedMap.get(p.id) ?? p);
            const existingIds = new Set(s.products.map((p: Product) => p.id));
            const inserted = upserted.filter((p: Product) => !existingIds.has(p.id));
            return { products: [...merged, ...inserted] };
          });
        }
      },

      // ── Legacy 3D ─────────────────────────────────────────────────────────
      placeProduct: (slotIndex, productId) =>
        set((s) => ({
          shelfLayout: { ...s.shelfLayout, [slotIndex]: productId },
          selectedProduct: productId ? null : s.selectedProduct,
        })),

      selectProduct: (product) => set({ selectedProduct: product }),
      setActiveTab: (tab) => set({ activeTab: tab }),

      setShelfConfig: (config) =>
        set((s) => ({
          shelfConfig: config,
          shelfLayout: Object.fromEntries(
            Object.entries(s.shelfLayout).filter(
              ([k]) => Number(k) < config.rows * config.cols
            )
          ),
        })),

      clearShelfLayout: () => set({ shelfLayout: {} }),

      // ── Store floor actions ───────────────────────────────────────────────
      placeInSection: (sectionId, subsectionId, rowIndex, slotIndex, productId) => {
        set((s) => ({
          selectedProduct: productId ? null : s.selectedProduct,
          storeSections: s.storeSections.map((sec) => {
            if (sec.id !== sectionId) return sec;
            return {
              ...sec,
              subsections: sec.subsections.map((sub) => {
                if (sub.id !== subsectionId) return sub;
                const rows = sub.rows.map((row, ri) => {
                  if (ri !== rowIndex) return row;
                  const products = [...row.products];
                  products[slotIndex] = productId;
                  return { ...row, products };
                });
                return { ...sub, rows };
              }),
            };
          }),
        }));
        fetch("/api/placements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shelfId: sectionId,
            tier: rowIndex,
            position: slotIndex,
            label: subsectionId,
            productId,
          }),
        }).catch(() => {});
      },

      clearSubsection: (sectionId, subsectionId) =>
        set((s) => ({
          storeSections: s.storeSections.map((sec) => {
            if (sec.id !== sectionId) return sec;
            return {
              ...sec,
              subsections: sec.subsections.map((sub) => {
                if (sub.id !== subsectionId) return sub;
                return {
                  ...sub,
                  rows: sub.rows.map((row) => ({
                    ...row,
                    products: Array(row.products.length).fill(null),
                  })),
                };
              }),
            };
          }),
        })),

      resetStoreSections: () => set({ storeSections: INITIAL_STORE_SECTIONS }),

      addSubsectionRow: (sectionId, subsectionId, type, slots) =>
        set((s) => ({
          storeSections: s.storeSections.map((sec) => {
            if (sec.id !== sectionId) return sec;
            return {
              ...sec,
              subsections: sec.subsections.map((sub) => {
                if (sub.id !== subsectionId) return sub;
                const newRow = { type, products: Array(type === "image" ? 0 : slots).fill(null) };
                return { ...sub, rows: [...sub.rows, newRow] };
              }),
            };
          }),
        })),

      removeSubsectionRow: (sectionId, subsectionId, rowIndex) =>
        set((s) => ({
          storeSections: s.storeSections.map((sec) => {
            if (sec.id !== sectionId) return sec;
            return {
              ...sec,
              subsections: sec.subsections.map((sub) => {
                if (sub.id !== subsectionId) return sub;
                return { ...sub, rows: sub.rows.filter((_, i) => i !== rowIndex) };
              }),
            };
          }),
        })),

      // ── Store layout 2D actions ───────────────────────────────────────────
      loadPresetLayout: () => set({ storeLayout: buildPresetLayout() }),

      addLayoutItem: (item) =>
        set((s) => ({ storeLayout: { ...s.storeLayout, items: [...s.storeLayout.items, item] } })),
      updateLayoutItem: (id, changes) =>
        set((s) => ({
          storeLayout: {
            ...s.storeLayout,
            items: s.storeLayout.items.map((it) => it.id === id ? { ...it, ...changes } : it),
          },
        })),
      removeLayoutItem: (id) =>
        set((s) => ({
          storeLayout: { ...s.storeLayout, items: s.storeLayout.items.filter((it) => it.id !== id) },
        })),
      setLayoutRoom: (w, d) =>
        set((s) => {
          const gs = s.storeLayout.gridSize;
          const cols = Math.round(w / gs);
          const rows = Math.round(d / gs);
          const oldGrid = s.storeLayout.grid;
          const newGrid: FloorCellType[][] = Array.from({ length: rows }, (_, r) =>
            Array.from({ length: cols }, (_, c) => oldGrid[r]?.[c] ?? "empty")
          );
          return { storeLayout: { ...s.storeLayout, roomW: w, roomD: d, grid: newGrid } };
        }),
      clearLayout: () =>
        set((s) => ({
          storeLayout: {
            ...s.storeLayout, items: [], zones: [],
            grid: makeGrid(
              Math.round(s.storeLayout.roomD / s.storeLayout.gridSize),
              Math.round(s.storeLayout.roomW / s.storeLayout.gridSize),
            ),
          },
        })),
      paintCell: (row, col, cellType) =>
        set((s) => {
          const grid = s.storeLayout.grid.map((r, ri) =>
            ri === row ? r.map((c, ci) => ci === col ? cellType : c) : r
          );
          return { storeLayout: { ...s.storeLayout, grid } };
        }),
      paintCells: (cells) =>
        set((s) => {
          const grid = s.storeLayout.grid.map(r => [...r]);
          cells.forEach(({ row, col, cellType }) => {
            if (grid[row] && col < grid[row].length) grid[row][col] = cellType;
          });
          return { storeLayout: { ...s.storeLayout, grid } };
        }),
      addZone: (zone) =>
        set((s) => ({ storeLayout: { ...s.storeLayout, zones: [...(s.storeLayout.zones ?? []), zone] } })),
      removeZone: (id) =>
        set((s) => ({ storeLayout: { ...s.storeLayout, zones: (s.storeLayout.zones ?? []).filter(z => z.id !== id) } })),
      updateZone: (id, changes) =>
        set((s) => ({
          storeLayout: {
            ...s.storeLayout,
            zones: (s.storeLayout.zones ?? []).map(z => z.id === id ? { ...z, ...changes } : z),
          },
        })),

      // ── DB sync ───────────────────────────────────────────────────────────
      fetchDbState: async () => {
        try {
          const res = await fetch("/api/state");
          if (!res.ok) return;
          const { products, warehouseShelves } = await res.json();
          set({ products, warehouseShelves });
        } catch {
          // silently fail (e.g. during static export)
        }
      },

      // ── Warehouse actions ─────────────────────────────────────────────────
      placeInWarehouse: (shelfId, tierIndex, slotIndex, productId) => {
        set((s) => ({
          selectedProduct: productId ? null : s.selectedProduct,
          warehouseShelves: s.warehouseShelves.map((shelf) => {
            if (shelf.id !== shelfId) return shelf;
            const tiers = shelf.tiers.map((tier, ti) => {
              if (ti !== tierIndex) return tier;
              const updated = [...tier];
              updated[slotIndex] = productId;
              return updated;
            });
            return { ...shelf, tiers };
          }),
        }));
        fetch("/api/placements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shelfId, tier: tierIndex, position: slotIndex, productId }),
        }).catch(() => {});
      },

      clearWarehouseTier: (shelfId, tierIndex) =>
        set((s) => ({
          warehouseShelves: s.warehouseShelves.map((shelf) => {
            if (shelf.id !== shelfId) return shelf;
            const tiers = shelf.tiers.map((tier, ti) =>
              ti === tierIndex ? Array(25).fill(null) : tier
            );
            return { ...shelf, tiers };
          }),
        })),

      clearWarehouseShelf: (shelfId) =>
        set((s) => ({
          warehouseShelves: s.warehouseShelves.map((shelf) =>
            shelf.id === shelfId
              ? { ...shelf, tiers: Array(4).fill(null).map(() => Array(25).fill(null)) }
              : shelf
          ),
        })),

      removeWarehouseShelf: (shelfId) =>
        set((s) => ({
          warehouseShelves: s.warehouseShelves.filter((shelf) => shelf.id !== shelfId),
        })),

      addWarehouseShelf: (shelfType) =>
        set((s) => {
          const sameType = s.warehouseShelves.filter(sh => sh.shelfType === shelfType);
          const num = sameType.length + 1;
          const name = shelfType === "shoes" ? `Kệ Giày ${num}` : `Kệ Túi ${num}`;
          const newShelf: WarehouseShelf = {
            id: `shelf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name,
            shelfType,
            number: num,
            tiers: Array(4).fill(null).map(() => Array(25).fill(null)),
            notes: "",
          };
          return { warehouseShelves: [...s.warehouseShelves, newShelf] };
        }),

      renameWarehouseShelf: (shelfId, name) =>
        set((s) => ({
          warehouseShelves: s.warehouseShelves.map((shelf) =>
            shelf.id === shelfId ? { ...shelf, name } : shelf
          ),
        })),

      setWarehouseShelfNotes: (shelfId, notes) =>
        set((s) => ({
          warehouseShelves: s.warehouseShelves.map((shelf) =>
            shelf.id === shelfId ? { ...shelf, notes } : shelf
          ),
        })),
    }),
    {
      name: "postlain-store-v2",
      partialize: (s) => ({
        shelfLayout: s.shelfLayout,
        shelfConfig: s.shelfConfig,
        storeSections: s.storeSections,
        warehouseShelves: s.warehouseShelves,
        storeLayout: s.storeLayout,
        storeName: s.storeName,
        storeAddress: s.storeAddress,
        storePhone: s.storePhone,
        storeEmail: s.storeEmail,
        notifyLowStock: s.notifyLowStock,
        notifyMovement: s.notifyMovement,
        notifyDaily: s.notifyDaily,
        notifyPush: s.notifyPush,
        lowStockThreshold: s.lowStockThreshold,
        uiCompact: s.uiCompact,
        uiAnimations: s.uiAnimations,
        uiDensity: s.uiDensity,
        users: s.users,
        currentUser: s.currentUser,
      }),
      skipHydration: true,
    }
  )
);

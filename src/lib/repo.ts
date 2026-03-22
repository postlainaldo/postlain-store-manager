/**
 * Postlain — Data Repository
 * All DB read/write operations. Server-side only.
 */

import getDb from "./database";
import type { Product } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DbShelf {
  id: string;
  name: string;
  type: "WAREHOUSE" | "DISPLAY";
  subType: string | null;
  sortOrder: number;
}

export interface DbSlot {
  id: string;
  shelfId: string;
  tier: number;
  position: number;
  label: string;
}

export interface DbPlacement {
  id: string;
  productId: string;
  slotId: string;
  placedAt: string;
  updatedAt: string;
}

export interface SlotWithProduct extends DbSlot {
  productId: string | null;
  product: Product | null;
}

// ─── Products ─────────────────────────────────────────────────────────────────

export function getAllProducts(): Product[] {
  const db = getDb();
  return db.prepare("SELECT * FROM products ORDER BY name").all() as Product[];
}

export function getProductById(id: string): Product | null {
  const db = getDb();
  return (db.prepare("SELECT * FROM products WHERE id = ?").get(id) as Product) ?? null;
}

export function upsertProduct(p: Product): Product {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO products (id,name,sku,category,productType,quantity,price,markdownPrice,color,size,imagePath,notes,createdAt,updatedAt)
    VALUES (@id,@name,@sku,@category,@productType,@quantity,@price,@markdownPrice,@color,@size,@imagePath,@notes,@createdAt,@updatedAt)
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name, sku=excluded.sku, category=excluded.category,
      productType=excluded.productType, quantity=excluded.quantity,
      price=excluded.price, markdownPrice=excluded.markdownPrice,
      color=excluded.color, size=excluded.size,
      imagePath=excluded.imagePath, notes=excluded.notes,
      updatedAt=excluded.updatedAt
  `).run({ ...p, createdAt: p.createdAt ?? now, updatedAt: now });
  return getProductById(p.id)!;
}

export function insertProduct(p: Product): Product {
  return upsertProduct(p);
}

export function updateProduct(p: Product): Product {
  return upsertProduct(p);
}

export function deleteProduct(id: string): void {
  getDb().prepare("DELETE FROM products WHERE id = ?").run(id);
}

export function deleteProducts(ids: string[]): void {
  const db = getDb();
  const del = db.prepare("DELETE FROM products WHERE id = ?");
  const tx = db.transaction((ids: string[]) => ids.forEach(id => del.run(id)));
  tx(ids);
}

export function bulkUpsertProducts(rows: Product[]): { inserted: number; updated: number; products: Product[] } {
  const db = getDb();
  let inserted = 0, updated = 0;
  const now = new Date().toISOString();

  const tx = db.transaction(() => {
    for (const row of rows) {
      // Match by SKU first, then by (name + category)
      const existing = row.sku
        ? db.prepare("SELECT id FROM products WHERE sku = ? COLLATE NOCASE").get(row.sku) as { id: string } | undefined
        : db.prepare("SELECT id FROM products WHERE name = ? AND category = ? COLLATE NOCASE").get(row.name, row.category) as { id: string } | undefined;

      if (existing) {
        // Sản phẩm đã tồn tại → chỉ cập nhật số lượng (quantity)
        db.prepare(`UPDATE products SET quantity=?, updatedAt=? WHERE id=?`)
          .run(row.quantity, now, existing.id);
        updated++;
      } else {
        // Sản phẩm mới → thêm đầy đủ thông tin
        db.prepare(`INSERT OR IGNORE INTO products(id,name,sku,category,productType,quantity,price,markdownPrice,color,size,imagePath,notes,createdAt,updatedAt)
          VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
          .run(row.id, row.name, row.sku ?? null, row.category, row.productType ?? null, row.quantity, row.price ?? null, row.markdownPrice ?? null, row.color ?? null, row.size ?? null, row.imagePath ?? null, row.notes ?? null, row.createdAt ?? now, now);
        inserted++;
      }
    }
  });
  tx();

  const products = getAllProducts();
  return { inserted, updated, products };
}

// ─── Shelves ──────────────────────────────────────────────────────────────────

export function getAllShelves(): DbShelf[] {
  return getDb().prepare("SELECT * FROM shelves ORDER BY sortOrder, name").all() as DbShelf[];
}

export function upsertShelf(s: DbShelf): void {
  getDb().prepare(`
    INSERT INTO shelves(id,name,type,subType,sortOrder)
    VALUES(@id,@name,@type,@subType,@sortOrder)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name, type=excluded.type, subType=excluded.subType, sortOrder=excluded.sortOrder
  `).run(s);
}

// ─── Slots ────────────────────────────────────────────────────────────────────

export function getSlotsByShelf(shelfId: string): DbSlot[] {
  return getDb().prepare("SELECT * FROM slots WHERE shelfId = ? ORDER BY tier, position").all(shelfId) as DbSlot[];
}

export function getAllSlots(): DbSlot[] {
  return getDb().prepare("SELECT * FROM slots ORDER BY shelfId, tier, position").all() as DbSlot[];
}

export function upsertSlot(slot: DbSlot): DbSlot {
  const db = getDb();
  db.prepare(`
    INSERT INTO slots(id,shelfId,tier,position,label)
    VALUES(@id,@shelfId,@tier,@position,@label)
    ON CONFLICT(shelfId,tier,position,label) DO UPDATE SET id=excluded.id
  `).run(slot);
  return db.prepare("SELECT * FROM slots WHERE id = ?").get(slot.id) as DbSlot;
}

// ─── Placements ───────────────────────────────────────────────────────────────

export function getAllPlacements(): DbPlacement[] {
  return getDb().prepare("SELECT * FROM placements").all() as DbPlacement[];
}

export function getPlacement(slotId: string): DbPlacement | null {
  return (getDb().prepare("SELECT * FROM placements WHERE slotId = ?").get(slotId) as DbPlacement) ?? null;
}

export function getPlacementByProduct(productId: string): DbPlacement[] {
  return getDb().prepare("SELECT * FROM placements WHERE productId = ?").all(productId) as DbPlacement[];
}

export function setPlacement(slotId: string, productId: string | null): void {
  const db = getDb();
  if (!productId) {
    db.prepare("DELETE FROM placements WHERE slotId = ?").run(slotId);
    return;
  }
  const now = new Date().toISOString();
  const id = `pl_${slotId}_${productId}`.slice(0, 60);
  db.prepare(`
    INSERT INTO placements(id,productId,slotId,placedAt,updatedAt)
    VALUES(?,?,?,?,?)
    ON CONFLICT(slotId) DO UPDATE SET productId=excluded.productId, updatedAt=excluded.updatedAt
  `).run(id, productId, slotId, now, now);
}

/**
 * Returns the full warehouse map:
 * shelfId -> tier -> [productId | null, ...]
 */
export function getWarehouseMap(): Record<string, (string | null)[][]> {
  const db = getDb();
  const shelves = db.prepare("SELECT * FROM shelves WHERE type='WAREHOUSE' ORDER BY sortOrder, name").all() as DbShelf[];
  const result: Record<string, (string | null)[][]> = {};

  for (const shelf of shelves) {
    const slots = db.prepare("SELECT s.*, p.productId FROM slots s LEFT JOIN placements p ON p.slotId=s.id WHERE s.shelfId=? ORDER BY s.tier, s.position").all(shelf.id) as (DbSlot & { productId: string | null })[];
    // Rebuild 4 tiers × 25 slots
    const tiers: (string | null)[][] = Array.from({ length: 4 }, () => Array(25).fill(null));
    for (const slot of slots) {
      if (slot.tier < 4 && slot.position < 25) {
        tiers[slot.tier][slot.position] = slot.productId;
      }
    }
    result[shelf.id] = tiers;
  }
  return result;
}

/**
 * Returns the full display map:
 * sectionId -> subsectionId -> rowIndex -> [productId | null, ...]
 */
export function getDisplayMap(): Record<string, Record<string, (string | null)[][]>> {
  const db = getDb();
  const shelves = db.prepare("SELECT * FROM shelves WHERE type='DISPLAY' ORDER BY sortOrder").all() as DbShelf[];
  const result: Record<string, Record<string, (string | null)[][]>> = {};

  for (const shelf of shelves) {
    const slots = db.prepare(`
      SELECT s.*, p.productId FROM slots s
      LEFT JOIN placements p ON p.slotId = s.id
      WHERE s.shelfId = ?
      ORDER BY s.label, s.tier, s.position
    `).all(shelf.id) as (DbSlot & { productId: string | null })[];

    if (!result[shelf.id]) result[shelf.id] = {};

    for (const slot of slots) {
      const subId = slot.label;
      if (!result[shelf.id][subId]) result[shelf.id][subId] = [];
      while (result[shelf.id][subId].length <= slot.tier) {
        result[shelf.id][subId].push([]);
      }
      while (result[shelf.id][subId][slot.tier].length <= slot.position) {
        result[shelf.id][subId][slot.tier].push(null);
      }
      result[shelf.id][subId][slot.tier][slot.position] = slot.productId ?? null;
    }
  }
  return result;
}

// ─── Slot lookup (for UI sync) ────────────────────────────────────────────────

export function findSlotId(shelfId: string, tier: number, position: number, label = ""): string | null {
  const row = getDb().prepare("SELECT id FROM slots WHERE shelfId=? AND tier=? AND position=? AND label=?").get(shelfId, tier, position, label) as { id: string } | undefined;
  return row?.id ?? null;
}

export function getOrCreateSlot(shelfId: string, tier: number, position: number, label = ""): string {
  const existing = findSlotId(shelfId, tier, position, label);
  if (existing) return existing;
  const id = `slot_${shelfId}_${tier}_${position}_${label}`.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 64);
  getDb().prepare("INSERT OR IGNORE INTO slots(id,shelfId,tier,position,label) VALUES(?,?,?,?,?)").run(id, shelfId, tier, position, label);
  return id;
}

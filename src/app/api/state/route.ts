/**
 * GET /api/state
 *
 * Returns the full DB-backed app state needed to hydrate the UI:
 *  - products[]
 *  - warehouseShelves[] (matching WarehouseShelf shape from @/types)
 *  - storeSections[] placements (productId per slot)
 *
 * The UI calls this once on mount and merges into Zustand.
 */

import { NextResponse } from "next/server";
import getDb from "@/lib/database";
import { getAllShelves } from "@/lib/repo";
import { dbGetProducts } from "@/lib/dbAdapter";

export async function GET() {
  const db = getDb();
  const products = await dbGetProducts();
  const shelves  = getAllShelves();

  // ── Build warehouseShelves in the shape WarehouseShelf expects ──────────────
  const warehouseShelves = shelves
    .filter(s => s.type === "WAREHOUSE")
    .map(shelf => {
      // 4 tiers × 25 slots
      const tiers: (string | null)[][] = Array.from({ length: 4 }, () => Array(25).fill(null));

      const rows = db.prepare(`
        SELECT sl.tier, sl.position, p.productId
        FROM slots sl
        LEFT JOIN placements p ON p.slotId = sl.id
        WHERE sl.shelfId = ?
        ORDER BY sl.tier, sl.position
      `).all(shelf.id) as { tier: number; position: number; productId: string | null }[];

      for (const r of rows) {
        if (r.tier < 4 && r.position < 25) {
          tiers[r.tier][r.position] = r.productId ?? null;
        }
      }

      return {
        id: shelf.id,
        name: shelf.name,
        shelfType: (shelf.subType ?? "shoes") as "shoes" | "bags",
        number: parseInt(shelf.name.match(/\d+/)?.[0] ?? "1"),
        tiers,
        notes: "",
      };
    });

  // ── Build display section placements ────────────────────────────────────────
  // Returns: Record<sectionId, Record<subsectionId, Record<rowIdx, Record<slotIdx, productId>>>>
  const displayShelves = shelves.filter(s => s.type === "DISPLAY");
  const displayPlacements: Record<string, Record<string, Record<number, Record<number, string>>>> = {};

  for (const shelf of displayShelves) {
    const rows = db.prepare(`
      SELECT sl.label, sl.tier, sl.position, p.productId
      FROM slots sl
      LEFT JOIN placements p ON p.slotId = sl.id
      WHERE sl.shelfId = ? AND p.productId IS NOT NULL
    `).all(shelf.id) as { label: string; tier: number; position: number; productId: string }[];

    if (!displayPlacements[shelf.id]) displayPlacements[shelf.id] = {};
    for (const r of rows) {
      if (!displayPlacements[shelf.id][r.label]) displayPlacements[shelf.id][r.label] = {};
      if (!displayPlacements[shelf.id][r.label][r.tier]) displayPlacements[shelf.id][r.label][r.tier] = {};
      displayPlacements[shelf.id][r.label][r.tier][r.position] = r.productId;
    }
  }

  return NextResponse.json({ products, warehouseShelves, displayPlacements });
}

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { setActiveStore } from "@/lib/supabase";
import { getStoreId } from "@/lib/storeContext";

export type StoreConfig = {
  id: string;
  name: string;
  description: string;
  color: string;
  accentColor: string;
  active: boolean;
};

const STORES_PATH = path.join(process.cwd(), "data", "stores.json");

function readStores(): StoreConfig[] {
  try {
    return JSON.parse(fs.readFileSync(STORES_PATH, "utf-8"));
  } catch {
    return [];
  }
}

function writeStores(stores: StoreConfig[]) {
  fs.writeFileSync(STORES_PATH, JSON.stringify(stores, null, 2));
}

// GET /api/stores — danh sách store active (public)
export async function GET() {
  const stores = readStores().filter(s => s.active);
  return NextResponse.json(stores);
}

// POST /api/stores — thêm store mới (admin only — validate ở client)
export async function POST(req: NextRequest) {
  setActiveStore(getStoreId(req));
  const body = await req.json();
  const { id, name, description, color, accentColor } = body;
  if (!id || !name) return NextResponse.json({ error: "id và name bắt buộc" }, { status: 400 });

  const stores = readStores();
  if (stores.find(s => s.id === id))
    return NextResponse.json({ error: "Store ID đã tồn tại" }, { status: 409 });

  const newStore: StoreConfig = {
    id: id.toLowerCase().replace(/[^a-z0-9_-]/g, ""),
    name,
    description: description ?? "",
    color: color ?? "#0c1a2e",
    accentColor: accentColor ?? "#c9a55a",
    active: true,
  };
  stores.push(newStore);
  writeStores(stores);
  return NextResponse.json(newStore, { status: 201 });
}

// PATCH /api/stores — cập nhật store
export async function PATCH(req: NextRequest) {
  setActiveStore(getStoreId(req));
  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "id bắt buộc" }, { status: 400 });

  const stores = readStores();
  const idx = stores.findIndex(s => s.id === id);
  if (idx === -1) return NextResponse.json({ error: "Không tìm thấy store" }, { status: 404 });

  stores[idx] = { ...stores[idx], ...updates };
  writeStores(stores);
  return NextResponse.json(stores[idx]);
}

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { Product } from "@/types";

const DATA_DIR = join(process.cwd(), "data");
const PRODUCTS_FILE = join(DATA_DIR, "products.json");

function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

export function readProducts(): Product[] {
  ensureDir();
  if (!existsSync(PRODUCTS_FILE)) return [];
  try {
    const raw = readFileSync(PRODUCTS_FILE, "utf-8");
    return JSON.parse(raw) as Product[];
  } catch {
    return [];
  }
}

export function writeProducts(products: Product[]): void {
  ensureDir();
  writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));
}

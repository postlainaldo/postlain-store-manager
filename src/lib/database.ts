/**
 * Postlain Store Manager — SQLite Database Layer
 * Uses better-sqlite3 (synchronous, no ORM overhead)
 *
 * Schema:
 *   products   — product catalog
 *   shelves    — warehouse & display shelf definitions
 *   slots      — individual positions within a shelf
 *   placements — which product is in which slot
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// ─── Singleton ────────────────────────────────────────────────────────────────

// Vercel serverless: dùng /tmp (ephemeral nhưng đủ dùng trong session)
// Local dev: dùng ./data/postlain.db (persistent)
const isVercel = process.env.VERCEL === "1";
const DB_PATH = isVercel
  ? "/tmp/postlain.db"
  : path.join(process.cwd(), "data", "postlain.db");

// Ensure data directory exists (không cần tạo /tmp, đã có sẵn trên Vercel)
if (!isVercel) {
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
}

// Module-level singleton (Next.js hot-reload safe via globalThis cache)
declare global {
  // eslint-disable-next-line no-var
  var __postlainDb: Database.Database | undefined;
}

function getDb(): Database.Database {
  if (globalThis.__postlainDb) return globalThis.__postlainDb;
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  initSchema(db);
  globalThis.__postlainDb = db;
  return db;
}

// ─── Schema Init ─────────────────────────────────────────────────────────────

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      sku           TEXT UNIQUE,
      category      TEXT NOT NULL DEFAULT '',
      productType   TEXT,
      quantity      INTEGER NOT NULL DEFAULT 0,
      price         REAL,
      markdownPrice REAL,
      color         TEXT,
      size          TEXT,
      imagePath     TEXT,
      notes         TEXT,
      createdAt     TEXT NOT NULL,
      updatedAt     TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS shelves (
      id        TEXT PRIMARY KEY,
      name      TEXT NOT NULL,
      type      TEXT NOT NULL CHECK(type IN ('WAREHOUSE','DISPLAY')),
      subType   TEXT,
      sortOrder INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS slots (
      id        TEXT PRIMARY KEY,
      shelfId   TEXT NOT NULL REFERENCES shelves(id) ON DELETE CASCADE,
      tier      INTEGER NOT NULL,
      position  INTEGER NOT NULL,
      label     TEXT NOT NULL DEFAULT '',
      UNIQUE(shelfId, tier, position, label)
    );

    CREATE TABLE IF NOT EXISTS placements (
      id        TEXT PRIMARY KEY,
      productId TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      slotId    TEXT NOT NULL UNIQUE REFERENCES slots(id) ON DELETE CASCADE,
      placedAt  TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id           TEXT PRIMARY KEY,
      name         TEXT NOT NULL,
      username     TEXT NOT NULL UNIQUE,
      passwordHash TEXT NOT NULL,
      role         TEXT NOT NULL DEFAULT 'staff',
      active       INTEGER NOT NULL DEFAULT 1,
      createdAt    TEXT NOT NULL
    );

    -- Default admin (chỉ insert nếu chưa có)
    INSERT OR IGNORE INTO users (id, name, username, passwordHash, role, active, createdAt)
    VALUES ('user_admin', 'Admin', 'admin', 'Aldo@123', 'admin', 1, datetime('now'));

    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
    CREATE INDEX IF NOT EXISTS idx_products_sku      ON products(sku);
    CREATE INDEX IF NOT EXISTS idx_slots_shelf       ON slots(shelfId);
    CREATE INDEX IF NOT EXISTS idx_placements_prod   ON placements(productId);
    CREATE INDEX IF NOT EXISTS idx_placements_slot   ON placements(slotId);
    CREATE INDEX IF NOT EXISTS idx_users_username    ON users(username);
  `);
}

export default getDb;

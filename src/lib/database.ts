/**
 * Postlain Store Manager — SQLite Database Layer
 * Uses better-sqlite3 (synchronous, no ORM overhead)
 *
 * Multi-tenant: mỗi store có file DB riêng: ./data/{storeId}.db
 * Fallback về "postlain" nếu không có STORE_ID env.
 * DATA_DIR env var (set trong Coolify volume mount) cho phép dùng volume ngoài.
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// ─── Singleton map — 1 connection per storeId ─────────────────────────────────

const dataDir = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

declare global {
  // eslint-disable-next-line no-var
  var __storeDbMap: Map<string, Database.Database> | undefined;
}
if (!globalThis.__storeDbMap) globalThis.__storeDbMap = new Map();

function getDb(storeId?: string): Database.Database {
  const id  = storeId ?? process.env.STORE_ID ?? "postlain";
  const map = globalThis.__storeDbMap!;
  if (map.has(id)) return map.get(id)!;

  const dbPath = path.join(dataDir, `${id}.db`);
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  initSchema(db);
  migrateSchema(db);
  map.set(id, db);
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

    -- Default admin (only insert if not already present)
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

// ─── Migrations ───────────────────────────────────────────────────────────────

function migrateSchema(db: Database.Database) {
  // ── users: profile columns ──────────────────────────────────────────────────
  const userCols = colNames(db, "users");
  if (!userCols.includes("avatar"))   db.exec("ALTER TABLE users ADD COLUMN avatar TEXT");
  if (!userCols.includes("status"))   db.exec("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'online'");
  if (!userCols.includes("bio"))      db.exec("ALTER TABLE users ADD COLUMN bio TEXT DEFAULT ''");
  if (!userCols.includes("phone"))        db.exec("ALTER TABLE users ADD COLUMN phone TEXT DEFAULT ''");
  if (!userCols.includes("fullName"))     db.exec("ALTER TABLE users ADD COLUMN fullName TEXT DEFAULT ''");
  if (!userCols.includes("employeeCode")) db.exec("ALTER TABLE users ADD COLUMN employeeCode TEXT DEFAULT ''");

  // ── chat system ─────────────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_rooms (
      id        TEXT PRIMARY KEY,
      name      TEXT NOT NULL,
      type      TEXT NOT NULL DEFAULT 'channel',
      createdBy TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id        TEXT PRIMARY KEY,
      roomId    TEXT NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
      userId    TEXT NOT NULL,
      userName  TEXT NOT NULL,
      content   TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_chat_msg_room ON chat_messages(roomId, createdAt DESC);

    INSERT OR IGNORE INTO chat_rooms (id, name, type, createdBy, createdAt)
    VALUES ('room_general', 'Chung', 'channel', 'user_admin', datetime('now'));
    INSERT OR IGNORE INTO chat_rooms (id, name, type, createdBy, createdAt)
    VALUES ('room_announce', 'Thông Báo', 'announce', 'user_admin', datetime('now'));
  `);

  // chat_messages: incremental column additions
  const msgCols = colNames(db, "chat_messages");
  if (!msgCols.includes("deletedAt")) db.exec("ALTER TABLE chat_messages ADD COLUMN deletedAt TEXT");
  if (!msgCols.includes("mediaUrl"))  db.exec("ALTER TABLE chat_messages ADD COLUMN mediaUrl TEXT");
  if (!msgCols.includes("mediaType")) db.exec("ALTER TABLE chat_messages ADD COLUMN mediaType TEXT");
  if (!msgCols.includes("replyToId")) db.exec("ALTER TABLE chat_messages ADD COLUMN replyToId TEXT");
  if (!msgCols.includes("reactions")) db.exec("ALTER TABLE chat_messages ADD COLUMN reactions TEXT DEFAULT '{}'");
  if (!msgCols.includes("editedAt"))  db.exec("ALTER TABLE chat_messages ADD COLUMN editedAt TEXT");
  if (!msgCols.includes("pinnedAt"))  db.exec("ALTER TABLE chat_messages ADD COLUMN pinnedAt TEXT");
  if (!msgCols.includes("pinnedBy"))  db.exec("ALTER TABLE chat_messages ADD COLUMN pinnedBy TEXT");

  // chat_rooms: incremental column additions
  const roomCols = colNames(db, "chat_rooms");
  if (!roomCols.includes("icon"))    db.exec("ALTER TABLE chat_rooms ADD COLUMN icon TEXT DEFAULT ''");
  if (!roomCols.includes("color"))   db.exec("ALTER TABLE chat_rooms ADD COLUMN color TEXT DEFAULT ''");

  // ── notifications + push subscriptions ─────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id        TEXT PRIMARY KEY,
      title     TEXT NOT NULL,
      body      TEXT NOT NULL,
      type      TEXT NOT NULL DEFAULT 'info',
      createdBy TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      pinned    INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_notif_created ON notifications(createdAt DESC);

    CREATE TABLE IF NOT EXISTS push_subs (
      id         TEXT PRIMARY KEY,
      userId     TEXT NOT NULL,
      endpoint   TEXT NOT NULL UNIQUE,
      p256dh     TEXT NOT NULL,
      auth       TEXT NOT NULL,
      createdAt  TEXT NOT NULL
    );
  `);

  // ── inventory movements ─────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS movements (
      id          TEXT PRIMARY KEY,
      productId   TEXT,
      productName TEXT NOT NULL,
      variant     TEXT NOT NULL DEFAULT '',
      type        TEXT NOT NULL,
      fromLoc     TEXT,
      toLoc       TEXT,
      qty         INTEGER NOT NULL DEFAULT 0,
      byUser      TEXT NOT NULL DEFAULT '',
      createdAt   TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_movements_created ON movements(createdAt DESC);
  `);

  // ── activity feed ───────────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS activity (
      id        TEXT PRIMARY KEY,
      userId    TEXT NOT NULL,
      userName  TEXT NOT NULL,
      type      TEXT NOT NULL,
      content   TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_activity_created ON activity(createdAt DESC);
  `);

  // ── POS + Customers ─────────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id          TEXT PRIMARY KEY,
      odooId      INTEGER UNIQUE,
      name        TEXT NOT NULL,
      phone       TEXT,
      email       TEXT,
      street      TEXT,
      totalOrders INTEGER NOT NULL DEFAULT 0,
      totalSpent  REAL NOT NULL DEFAULT 0,
      lastOrderAt TEXT,
      createdAt   TEXT NOT NULL,
      updatedAt   TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_customers_odoo ON customers(odooId);
    CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

    CREATE TABLE IF NOT EXISTS pos_orders (
      id            TEXT PRIMARY KEY,
      odooId        INTEGER UNIQUE,
      name          TEXT NOT NULL,
      sessionName   TEXT,
      customerId    TEXT,
      customerName  TEXT,
      state         TEXT NOT NULL DEFAULT 'done',
      amountTotal   REAL NOT NULL DEFAULT 0,
      amountTax     REAL NOT NULL DEFAULT 0,
      amountPaid    REAL NOT NULL DEFAULT 0,
      lineCount     INTEGER NOT NULL DEFAULT 0,
      createdAt     TEXT NOT NULL,
      updatedAt     TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_pos_orders_created ON pos_orders(createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_pos_orders_customer ON pos_orders(customerId);

    CREATE TABLE IF NOT EXISTS pos_order_lines (
      id          TEXT PRIMARY KEY,
      orderId     TEXT NOT NULL REFERENCES pos_orders(id) ON DELETE CASCADE,
      odooId      INTEGER UNIQUE,
      productId   TEXT,
      productName TEXT NOT NULL,
      sku         TEXT,
      qty         REAL NOT NULL DEFAULT 1,
      priceUnit   REAL NOT NULL DEFAULT 0,
      discount    REAL NOT NULL DEFAULT 0,
      priceSubtotal REAL NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_pos_lines_order ON pos_order_lines(orderId);
    CREATE INDEX IF NOT EXISTS idx_pos_lines_product ON pos_order_lines(productId);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_reports (
      id          TEXT PRIMARY KEY,
      date        TEXT NOT NULL,
      shift       TEXT NOT NULL DEFAULT 'end',
      -- Revenue from POS (auto-filled)
      revTotal    REAL NOT NULL DEFAULT 0,
      revCash     REAL NOT NULL DEFAULT 0,
      revCard     REAL NOT NULL DEFAULT 0,
      revTransfer REAL NOT NULL DEFAULT 0,
      revVnpay    REAL NOT NULL DEFAULT 0,
      revMomo     REAL NOT NULL DEFAULT 0,
      revUrbox    REAL NOT NULL DEFAULT 0,
      revNinja    REAL NOT NULL DEFAULT 0,
      revOther    REAL NOT NULL DEFAULT 0,
      -- Category breakdown
      revHB       REAL NOT NULL DEFAULT 0,
      revSC       REAL NOT NULL DEFAULT 0,
      revACC      REAL NOT NULL DEFAULT 0,
      -- Traffic & conversion (manual input)
      traffic     INTEGER NOT NULL DEFAULT 0,
      bills       INTEGER NOT NULL DEFAULT 0,
      qtyTotal    INTEGER NOT NULL DEFAULT 0,
      -- Calculated (stored for history)
      conversion  REAL NOT NULL DEFAULT 0,
      aov         REAL NOT NULL DEFAULT 0,
      ipt         REAL NOT NULL DEFAULT 0,
      -- Daily target
      targetDay   REAL NOT NULL DEFAULT 0,
      -- Notes
      note        TEXT NOT NULL DEFAULT '',
      preparedBy  TEXT NOT NULL DEFAULT '',
      createdAt   TEXT NOT NULL,
      updatedAt   TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_daily_reports_date ON daily_reports(date);
  `);

}

function colNames(db: Database.Database, table: string): string[] {
  try {
    return (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map(c => c.name);
  } catch {
    return [];
  }
}

export default getDb;

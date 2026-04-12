-- Postlain Store Manager — Supabase PostgreSQL Schema
-- Run this once in Supabase Dashboard > SQL Editor

-- ─── Users ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  username      TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'staff',
  active        INTEGER NOT NULL DEFAULT 1,
  "createdAt"   TEXT NOT NULL,
  avatar        TEXT,
  status        TEXT DEFAULT 'online',
  bio           TEXT DEFAULT '',
  phone         TEXT DEFAULT '',
  "fullName"    TEXT DEFAULT ''
);

-- Default admin
INSERT INTO users (id, name, username, "passwordHash", role, active, "createdAt")
VALUES ('user_admin', 'Admin', 'admin', 'Aldo@123', 'admin', 1, NOW()::TEXT)
ON CONFLICT (id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- ─── Products ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  sku             TEXT UNIQUE,
  category        TEXT NOT NULL DEFAULT '',
  "productType"   TEXT,
  quantity        INTEGER NOT NULL DEFAULT 0,
  price           REAL,
  "markdownPrice" REAL,
  color           TEXT,
  size            TEXT,
  "imagePath"     TEXT,
  notes           TEXT,
  "createdAt"     TEXT NOT NULL,
  "updatedAt"     TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

-- ─── Chat Rooms ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_rooms (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'channel',
  "createdBy" TEXT NOT NULL,
  "createdAt" TEXT NOT NULL
);

INSERT INTO chat_rooms (id, name, type, "createdBy", "createdAt")
VALUES ('room_general', 'Chung', 'channel', 'user_admin', NOW()::TEXT)
ON CONFLICT (id) DO NOTHING;

INSERT INTO chat_rooms (id, name, type, "createdBy", "createdAt")
VALUES ('room_announce', 'Thông Báo', 'announce', 'user_admin', NOW()::TEXT)
ON CONFLICT (id) DO NOTHING;

-- ─── Chat Messages ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
  id          TEXT PRIMARY KEY,
  "roomId"    TEXT NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  "userId"    TEXT NOT NULL,
  "userName"  TEXT NOT NULL,
  content     TEXT NOT NULL DEFAULT '',
  "createdAt" TEXT NOT NULL,
  "deletedAt" TEXT,
  "mediaUrl"  TEXT,
  "mediaType" TEXT,
  "replyToId" TEXT,
  reactions   TEXT DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_chat_msg_room ON chat_messages("roomId", "createdAt" DESC);

-- ─── Notifications ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'info',
  "createdBy" TEXT NOT NULL,
  "createdAt" TEXT NOT NULL,
  pinned      INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_notif_created ON notifications("createdAt" DESC);

-- ─── Push Subscriptions ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subs (
  id          TEXT PRIMARY KEY,
  "userId"    TEXT NOT NULL,
  endpoint    TEXT NOT NULL UNIQUE,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  "createdAt" TEXT NOT NULL
);

-- ─── Inventory Movements ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS movements (
  id            TEXT PRIMARY KEY,
  "productId"   TEXT,
  "productName" TEXT NOT NULL,
  variant       TEXT NOT NULL DEFAULT '',
  type          TEXT NOT NULL,
  "fromLoc"     TEXT,
  "toLoc"       TEXT,
  qty           INTEGER NOT NULL DEFAULT 0,
  "byUser"      TEXT NOT NULL DEFAULT '',
  "createdAt"   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_movements_created ON movements("createdAt" DESC);

-- ─── Activity Feed ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity (
  id          TEXT PRIMARY KEY,
  "userId"    TEXT NOT NULL,
  "userName"  TEXT NOT NULL,
  type        TEXT NOT NULL,
  content     TEXT NOT NULL,
  "createdAt" TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_activity_created ON activity("createdAt" DESC);

-- ─── Shelves & Placements ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shelves (
  id        TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  type      TEXT NOT NULL,
  "subType" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS slots (
  id        TEXT PRIMARY KEY,
  "shelfId" TEXT NOT NULL REFERENCES shelves(id) ON DELETE CASCADE,
  tier      INTEGER NOT NULL,
  position  INTEGER NOT NULL,
  label     TEXT NOT NULL DEFAULT '',
  UNIQUE("shelfId", tier, position, label)
);

CREATE TABLE IF NOT EXISTS placements (
  id          TEXT PRIMARY KEY,
  "productId" TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  "slotId"    TEXT NOT NULL UNIQUE REFERENCES slots(id) ON DELETE CASCADE,
  "placedAt"  TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL
);

-- ─── Storage Bucket for Chat Media ───────────────────────────────────────────
-- Run this separately in Supabase Dashboard > Storage > New Bucket
-- Name: chat-media, Public: true
-- (The app will auto-create it on first upload if it doesn't exist)

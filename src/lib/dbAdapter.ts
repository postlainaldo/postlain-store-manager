/**
 * Postlain Store Manager — Database Adapter
 *
 * Abstracts over SQLite (local dev) and Supabase PostgreSQL (Vercel).
 * All API routes should use these functions instead of calling getDb() directly.
 *
 * WHY: SQLite /tmp on Vercel resets on cold starts → data loss.
 *      Supabase provides persistent PostgreSQL storage for free.
 */

import { IS_SUPABASE, getSupabase } from "./supabase";
import getDb from "./database";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DBUser = {
  id: string;
  name: string;
  username: string;
  passwordHash: string;
  role: string;
  active: number;
  createdAt: string;
  avatar?: string | null;
  status?: string | null;
  bio?: string | null;
  phone?: string | null;
  fullName?: string | null;
};

export type DBProduct = {
  id: string;
  name: string;
  sku?: string | null;
  category: string;
  productType?: string | null;
  quantity: number;
  price?: number | null;
  markdownPrice?: number | null;
  color?: string | null;
  size?: string | null;
  imagePath?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DBMessage = {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
  deletedAt?: string | null;
  editedAt?: string | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
  replyToId?: string | null;
  reactions?: string | null;
  pinnedAt?: string | null;
  pinnedBy?: string | null;
  revokedAt?: string | null;
};

export type DBRoom = {
  id: string;
  name: string;
  type: string;
  createdBy: string;
  createdAt: string;
  memberIds?: string | null; // JSON array of user IDs; null = open to all
};

export type DBNotification = {
  id: string;
  title: string;
  body: string;
  type: string;
  createdBy: string;
  createdAt: string;
  pinned: number;
};

export type DBMovement = {
  id: string;
  productId?: string | null;
  productName: string;
  variant: string;
  type: string;
  fromLoc?: string | null;
  toLoc?: string | null;
  qty: number;
  byUser: string;
  createdAt: string;
};

export type DBPushSub = {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  createdAt: string;
};

// ─── Schema Init (Supabase) ───────────────────────────────────────────────────

let supabaseInited = false;

export async function ensureSupabaseSchema() {
  if (!IS_SUPABASE || supabaseInited) return;
  supabaseInited = true;
  const sb = getSupabase();

  // Use Supabase's rpc to run raw SQL for schema creation
  // Tables created via SQL editor in Supabase dashboard or this init call
  const createSQL = `
    CREATE TABLE IF NOT EXISTS users (
      id           TEXT PRIMARY KEY,
      name         TEXT NOT NULL,
      username     TEXT NOT NULL UNIQUE,
      "passwordHash" TEXT NOT NULL,
      role         TEXT NOT NULL DEFAULT 'staff',
      active       INTEGER NOT NULL DEFAULT 1,
      "createdAt"  TEXT NOT NULL,
      avatar       TEXT,
      status       TEXT DEFAULT 'online',
      bio          TEXT DEFAULT '',
      phone        TEXT DEFAULT '',
      "fullName"   TEXT DEFAULT ''
    );

    INSERT INTO users (id, name, username, "passwordHash", role, active, "createdAt")
    VALUES ('user_admin', 'Admin', 'admin', 'Aldo@123', 'admin', 1, NOW()::TEXT)
    ON CONFLICT (id) DO NOTHING;

    CREATE TABLE IF NOT EXISTS products (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      sku           TEXT UNIQUE,
      category      TEXT NOT NULL DEFAULT '',
      "productType" TEXT,
      quantity      INTEGER NOT NULL DEFAULT 0,
      price         REAL,
      "markdownPrice" REAL,
      color         TEXT,
      size          TEXT,
      "imagePath"   TEXT,
      notes         TEXT,
      "createdAt"   TEXT NOT NULL,
      "updatedAt"   TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_rooms (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      type       TEXT NOT NULL DEFAULT 'channel',
      "createdBy" TEXT NOT NULL,
      "createdAt" TEXT NOT NULL
    );

    INSERT INTO chat_rooms (id, name, type, "createdBy", "createdAt")
    VALUES ('room_general', 'Chung', 'channel', 'user_admin', NOW()::TEXT)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO chat_rooms (id, name, type, "createdBy", "createdAt")
    VALUES ('room_announce', 'Thông Báo', 'announce', 'user_admin', NOW()::TEXT)
    ON CONFLICT (id) DO NOTHING;

    CREATE TABLE IF NOT EXISTS chat_messages (
      id          TEXT PRIMARY KEY,
      "roomId"    TEXT NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
      "userId"    TEXT NOT NULL,
      "userName"  TEXT NOT NULL,
      content     TEXT NOT NULL DEFAULT '',
      "createdAt" TEXT NOT NULL,
      "deletedAt" TEXT,
      "editedAt"  TEXT,
      "mediaUrl"  TEXT,
      "mediaType" TEXT,
      "replyToId" TEXT,
      reactions   TEXT DEFAULT '{}',
      "pinnedAt"  TEXT,
      "pinnedBy"  TEXT,
      "revokedAt" TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_chat_msg_room ON chat_messages("roomId", "createdAt" DESC);
    ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS "editedAt" TEXT;
    ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS "pinnedAt" TEXT;
    ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS "pinnedBy" TEXT;
    ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS "revokedAt" TEXT;
    ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS "memberIds" TEXT;

    CREATE TABLE IF NOT EXISTS chat_read_receipts (
      "roomId"     TEXT NOT NULL,
      "userId"     TEXT NOT NULL,
      "lastReadAt" TEXT NOT NULL,
      PRIMARY KEY ("roomId", "userId")
    );

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

    CREATE TABLE IF NOT EXISTS push_subs (
      id          TEXT PRIMARY KEY,
      "userId"    TEXT NOT NULL,
      endpoint    TEXT NOT NULL UNIQUE,
      p256dh      TEXT NOT NULL,
      auth        TEXT NOT NULL,
      "createdAt" TEXT NOT NULL
    );

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

    CREATE TABLE IF NOT EXISTS shelves (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      type        TEXT NOT NULL CHECK(type IN ('WAREHOUSE','DISPLAY')),
      "subType"   TEXT,
      "sortOrder" INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS slots (
      id        TEXT PRIMARY KEY,
      "shelfId" TEXT NOT NULL REFERENCES shelves(id) ON DELETE CASCADE,
      tier      INTEGER NOT NULL DEFAULT 0,
      position  INTEGER NOT NULL DEFAULT 0,
      label     TEXT NOT NULL DEFAULT '',
      UNIQUE("shelfId", tier, position, label)
    );
    CREATE INDEX IF NOT EXISTS idx_slots_shelf ON slots("shelfId", tier, position);

    CREATE TABLE IF NOT EXISTS placements (
      id          TEXT PRIMARY KEY,
      "productId" TEXT NOT NULL,
      "slotId"    TEXT NOT NULL UNIQUE REFERENCES slots(id) ON DELETE CASCADE,
      "placedAt"  TEXT NOT NULL,
      "updatedAt" TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_placements_slot ON placements("slotId");
    CREATE INDEX IF NOT EXISTS idx_placements_product ON placements("productId");

    CREATE TABLE IF NOT EXISTS app_settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS customers (
      id            TEXT PRIMARY KEY,
      "odooId"      INTEGER UNIQUE,
      name          TEXT NOT NULL,
      phone         TEXT,
      email         TEXT,
      street        TEXT,
      "totalOrders" INTEGER NOT NULL DEFAULT 0,
      "totalSpent"  REAL NOT NULL DEFAULT 0,
      "lastOrderAt" TEXT,
      "createdAt"   TEXT NOT NULL,
      "updatedAt"   TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

    CREATE TABLE IF NOT EXISTS pos_orders (
      id              TEXT PRIMARY KEY,
      "odooId"        INTEGER UNIQUE,
      name            TEXT NOT NULL,
      "sessionName"   TEXT,
      "customerId"    TEXT,
      "customerName"  TEXT,
      state           TEXT NOT NULL DEFAULT 'done',
      "amountTotal"   REAL NOT NULL DEFAULT 0,
      "amountTax"     REAL NOT NULL DEFAULT 0,
      "amountPaid"    REAL NOT NULL DEFAULT 0,
      "lineCount"     INTEGER NOT NULL DEFAULT 0,
      "createdAt"     TEXT NOT NULL,
      "updatedAt"     TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_pos_orders_created ON pos_orders("createdAt" DESC);
    CREATE INDEX IF NOT EXISTS idx_pos_orders_customer ON pos_orders("customerId");

    CREATE TABLE IF NOT EXISTS pos_order_lines (
      id               TEXT PRIMARY KEY,
      "orderId"        TEXT NOT NULL REFERENCES pos_orders(id) ON DELETE CASCADE,
      "odooId"         INTEGER UNIQUE,
      "productId"      TEXT,
      "productName"    TEXT NOT NULL,
      sku              TEXT,
      qty              REAL NOT NULL DEFAULT 1,
      "priceUnit"      REAL NOT NULL DEFAULT 0,
      discount         REAL NOT NULL DEFAULT 0,
      "priceSubtotal"  REAL NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_pos_lines_order ON pos_order_lines("orderId");

    CREATE TABLE IF NOT EXISTS shift_templates (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      "startTime" TEXT NOT NULL,
      "endTime"   TEXT NOT NULL,
      color       TEXT NOT NULL DEFAULT '#0ea5e9',
      "maxStaff"  INTEGER NOT NULL DEFAULT 3,
      "createdAt" TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS shift_slots (
      id           TEXT PRIMARY KEY,
      "templateId" TEXT,
      date         TEXT NOT NULL,
      name         TEXT NOT NULL DEFAULT '',
      "startTime"  TEXT NOT NULL,
      "endTime"    TEXT NOT NULL,
      color        TEXT NOT NULL DEFAULT '#0ea5e9',
      "maxStaff"   INTEGER NOT NULL DEFAULT 3,
      note         TEXT,
      "createdAt"  TEXT NOT NULL,
      "updatedAt"  TEXT NOT NULL
    );
    ALTER TABLE shift_slots ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
    CREATE INDEX IF NOT EXISTS idx_shift_slots_date ON shift_slots(date);

    CREATE TABLE IF NOT EXISTS shift_registrations (
      id          TEXT PRIMARY KEY,
      "slotId"    TEXT NOT NULL REFERENCES shift_slots(id) ON DELETE CASCADE,
      "userId"    TEXT NOT NULL,
      "userName"  TEXT NOT NULL,
      status      TEXT NOT NULL DEFAULT 'pending',
      note        TEXT,
      "createdAt" TEXT NOT NULL,
      "updatedAt" TEXT NOT NULL,
      UNIQUE("slotId", "userId")
    );
    CREATE INDEX IF NOT EXISTS idx_shift_reg_slot ON shift_registrations("slotId");
    CREATE INDEX IF NOT EXISTS idx_shift_reg_user ON shift_registrations("userId");
  `;

  try {
    await sb.rpc("exec_sql", { sql: createSQL });
  } catch {
    // rpc may not exist — tables likely already created via Supabase dashboard
    // This is a best-effort init; tables must be created manually if this fails
  }
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function dbGetUsers(): Promise<DBUser[]> {
  if (IS_SUPABASE) {
    const sb = getSupabase();
    const { data } = await sb
      .from("users")
      .select("id, name, username, role, active, createdAt, avatar, status, bio, phone, fullName")
      .order("createdAt");
    return (data ?? []) as DBUser[];
  }
  return getDb().prepare("SELECT id, name, username, role, active, createdAt, avatar, status, bio, phone, fullName FROM users ORDER BY createdAt").all() as DBUser[];
}

export async function dbGetUserByCredentials(username: string, password: string): Promise<DBUser | null> {
  if (IS_SUPABASE) {
    const sb = getSupabase();
    const { data } = await sb
      .from("users")
      .select("id, name, username, role, active")
      .eq("username", username.toLowerCase())
      .eq("passwordHash", password)
      .single();
    return data as DBUser | null;
  }
  return getDb().prepare(
    "SELECT id, name, username, role, active FROM users WHERE username = ? AND passwordHash = ? COLLATE NOCASE"
  ).get(username.trim().toLowerCase(), password) as DBUser | null;
}

export async function dbGetUserById(id: string): Promise<DBUser | null> {
  if (IS_SUPABASE) {
    const sb = getSupabase();
    const { data } = await sb.from("users").select("*").eq("id", id).single();
    return data as DBUser | null;
  }
  return getDb().prepare("SELECT * FROM users WHERE id = ?").get(id) as DBUser | null;
}

export async function dbCreateUser(user: {
  id: string; name: string; username: string; password: string;
  role: string; createdAt: string;
}): Promise<void> {
  if (IS_SUPABASE) {
    const sb = getSupabase();
    await sb.from("users").insert({
      id: user.id, name: user.name, username: user.username.toLowerCase(),
      passwordHash: user.password, role: user.role, active: 1, createdAt: user.createdAt,
    });
    return;
  }
  getDb().prepare(
    "INSERT INTO users (id, name, username, passwordHash, role, active, createdAt) VALUES (?,?,?,?,?,?,?)"
  ).run(user.id, user.name, user.username.toLowerCase(), user.password, user.role, 1, user.createdAt);
}

export async function dbUpdateUser(id: string, fields: {
  name?: string; username?: string; password?: string; role?: string; active?: number;
  avatar?: string; status?: string; bio?: string; phone?: string; fullName?: string;
}): Promise<void> {
  if (IS_SUPABASE) {
    const sb = getSupabase();
    const update: Record<string, unknown> = {};
    if (fields.name !== undefined) update.name = fields.name;
    if (fields.username !== undefined) update.username = fields.username.toLowerCase();
    if (fields.password !== undefined) update.passwordHash = fields.password;
    if (fields.role !== undefined) update.role = fields.role;
    if (fields.active !== undefined) update.active = fields.active;
    if (fields.avatar !== undefined) update.avatar = fields.avatar;
    if (fields.status !== undefined) update.status = fields.status;
    if (fields.bio !== undefined) update.bio = fields.bio;
    if (fields.phone !== undefined) update.phone = fields.phone;
    if (fields.fullName !== undefined) update.fullName = fields.fullName;
    await sb.from("users").update(update).eq("id", id);
    return;
  }
  const db = getDb();
  if (fields.password) {
    db.prepare("UPDATE users SET name=?, username=?, passwordHash=?, role=?, active=? WHERE id=?")
      .run(fields.name, fields.username?.toLowerCase(), fields.password, fields.role, fields.active ?? 1, id);
  } else {
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (fields.name !== undefined) { sets.push("name=?"); vals.push(fields.name); }
    if (fields.username !== undefined) { sets.push("username=?"); vals.push(fields.username.toLowerCase()); }
    if (fields.role !== undefined) { sets.push("role=?"); vals.push(fields.role); }
    if (fields.active !== undefined) { sets.push("active=?"); vals.push(fields.active); }
    if (fields.avatar !== undefined) { sets.push("avatar=?"); vals.push(fields.avatar); }
    if (fields.status !== undefined) { sets.push("status=?"); vals.push(fields.status); }
    if (fields.bio !== undefined) { sets.push("bio=?"); vals.push(fields.bio); }
    if (fields.phone !== undefined) { sets.push("phone=?"); vals.push(fields.phone); }
    if (fields.fullName !== undefined) { sets.push("fullName=?"); vals.push(fields.fullName); }
    if (sets.length) {
      vals.push(id);
      db.prepare(`UPDATE users SET ${sets.join(",")} WHERE id=?`).run(...vals);
    }
  }
}

export async function dbDeleteUser(id: string): Promise<void> {
  if (IS_SUPABASE) {
    await getSupabase().from("users").delete().eq("id", id);
    return;
  }
  getDb().prepare("DELETE FROM users WHERE id = ?").run(id);
}

// ─── Products ─────────────────────────────────────────────────────────────────

export async function dbGetProducts(): Promise<DBProduct[]> {
  if (IS_SUPABASE) {
    // Supabase default limit is 1000 rows — paginate to get all
    const PAGE = 1000;
    const all: DBProduct[] = [];
    let from = 0;
    while (true) {
      const { data } = await getSupabase()
        .from("products")
        .select("*")
        .order("createdAt")
        .range(from, from + PAGE - 1);
      if (!data?.length) break;
      all.push(...(data as DBProduct[]));
      if (data.length < PAGE) break;
      from += PAGE;
    }
    return all;
  }
  return getDb().prepare("SELECT * FROM products ORDER BY createdAt").all() as DBProduct[];
}

export async function dbGetProductBySku(sku: string): Promise<DBProduct | null> {
  const s = sku.trim();
  if (IS_SUPABASE) {
    // Try exact SKU first (EAN barcode), then internal ref stored in notes
    const { data } = await getSupabase()
      .from("products").select("*").ilike("sku", s).maybeSingle();
    if (data) return data as DBProduct;
    const { data: byRef } = await getSupabase()
      .from("products").select("*").ilike("notes", `%Ref: ${s}%`).maybeSingle();
    return byRef as DBProduct | null;
  }
  const db = getDb();
  const bySkу = db.prepare("SELECT * FROM products WHERE sku = ? COLLATE NOCASE").get(s) as DBProduct | null;
  if (bySkу) return bySkу;
  // Fallback: search internal reference in notes field
  return db.prepare("SELECT * FROM products WHERE notes LIKE ? COLLATE NOCASE").get(`%Ref: ${s}%`) as DBProduct | null;
}

export async function dbUpsertProduct(p: DBProduct): Promise<DBProduct> {
  if (IS_SUPABASE) {
    const { data } = await getSupabase()
      .from("products")
      .upsert({ ...p }, { onConflict: "id" })
      .select()
      .single();
    return data as DBProduct;
  }
  const db = getDb();
  db.prepare(`
    INSERT OR REPLACE INTO products
      (id,name,sku,category,productType,quantity,price,markdownPrice,color,size,imagePath,notes,createdAt,updatedAt)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(p.id, p.name, p.sku ?? null, p.category, p.productType ?? null, p.quantity,
    p.price ?? null, p.markdownPrice ?? null, p.color ?? null, p.size ?? null,
    p.imagePath ?? null, p.notes ?? null, p.createdAt, p.updatedAt);
  return p;
}

export async function dbBulkUpsertProducts(products: DBProduct[]): Promise<void> {
  if (!products.length) return;
  if (IS_SUPABASE) {
    // Supabase upsert accepts an array — one round-trip for all rows
    const CHUNK = 500;
    for (let i = 0; i < products.length; i += CHUNK) {
      await getSupabase()
        .from("products")
        .upsert(products.slice(i, i + CHUNK), { onConflict: "id" });
    }
    return;
  }
  // SQLite: use INSERT + ON CONFLICT UPDATE (never DELETE+INSERT) to avoid
  // cascading deletes on placements/other FK tables that reference products(id)
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO products
      (id,name,sku,category,productType,quantity,price,markdownPrice,color,size,imagePath,notes,createdAt,updatedAt)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name, sku=excluded.sku, category=excluded.category,
      productType=excluded.productType, quantity=excluded.quantity,
      price=excluded.price, markdownPrice=excluded.markdownPrice,
      color=excluded.color, size=excluded.size, imagePath=excluded.imagePath,
      notes=excluded.notes, updatedAt=excluded.updatedAt
  `);
  const tx = db.transaction((rows: DBProduct[]) => {
    for (const p of rows) {
      stmt.run(p.id, p.name, p.sku ?? null, p.category, p.productType ?? null, p.quantity,
        p.price ?? null, p.markdownPrice ?? null, p.color ?? null, p.size ?? null,
        p.imagePath ?? null, p.notes ?? null, p.createdAt, p.updatedAt);
    }
  });
  tx(products);
}

export async function dbDeleteProduct(id: string): Promise<void> {
  if (IS_SUPABASE) {
    await getSupabase().from("products").delete().eq("id", id);
    return;
  }
  getDb().prepare("DELETE FROM products WHERE id = ?").run(id);
}

export async function dbDeleteProducts(ids: string[]): Promise<void> {
  if (!ids.length) return;
  if (IS_SUPABASE) {
    // Chunk to avoid Supabase URL length limit (~2000 items per .in())
    const CHUNK = 200;
    for (let i = 0; i < ids.length; i += CHUNK) {
      await getSupabase().from("products").delete().in("id", ids.slice(i, i + CHUNK));
    }
    return;
  }
  // SQLite: use a single transaction for performance
  const db = getDb();
  const del = db.transaction((batch: string[]) => {
    const stmt = db.prepare("DELETE FROM products WHERE id = ?");
    for (const id of batch) stmt.run(id);
  });
  del(ids);
}

/**
 * Delete products that are no longer in Odoo (not present in the latest sync set).
 * Only removes odoo- prefixed products to avoid deleting manually added products.
 * Placements referencing removed products are cleaned up separately if needed.
 */
export async function dbDeleteStaleProducts(currentIds: Set<string>): Promise<number> {
  if (IS_SUPABASE) {
    const sb = getSupabase();
    // Fetch all odoo- product ids currently in DB
    const { data } = await sb.from("products").select("id").like("id", "odoo-%");
    const stale = (data ?? []).map((r: { id: string }) => r.id).filter(id => !currentIds.has(id));
    if (!stale.length) return 0;
    // Delete in chunks
    const CHUNK = 200;
    for (let i = 0; i < stale.length; i += CHUNK) {
      await sb.from("products").delete().in("id", stale.slice(i, i + CHUNK));
    }
    return stale.length;
  }
  const db = getDb();
  const existing = db.prepare("SELECT id FROM products WHERE id LIKE 'odoo-%'").all() as { id: string }[];
  const stale = existing.map(r => r.id).filter(id => !currentIds.has(id));
  if (!stale.length) return 0;
  const del = db.transaction((ids: string[]) => {
    const stmt = db.prepare("DELETE FROM products WHERE id = ?");
    for (const id of ids) stmt.run(id);
  });
  del(stale);
  return stale.length;
}

/** Delete all products whose ID starts with "odoo-" (from previous syncs) */
export async function dbDeleteAllProducts(): Promise<number> {
  if (IS_SUPABASE) {
    const { count } = await getSupabase().from("products").select("*", { count: "exact", head: true });
    await getSupabase().from("products").delete().neq("id", "");
    return count ?? 0;
  }
  const db = getDb();
  const { changes } = db.prepare("DELETE FROM products").run() as { changes: number };
  return changes;
}

// Delete products with category "Khác" or no price (garbage products from Odoo)
export async function dbDeleteBadOdooProducts(): Promise<number> {
  if (IS_SUPABASE) {
    const { data } = await getSupabase()
      .from("products")
      .select("id")
      .like("id", "odoo-%")
      .or("category.eq.Khác,price.is.null,price.eq.0");
    const ids = (data ?? []).map((r: { id: string }) => r.id);
    if (ids.length > 0) {
      const CHUNK = 200;
      for (let i = 0; i < ids.length; i += CHUNK) {
        await getSupabase().from("products").delete().in("id", ids.slice(i, i + CHUNK));
      }
    }
    return ids.length;
  }
  const db = getDb();
  const rows = db.prepare(
    "SELECT id FROM products WHERE id LIKE 'odoo-%' AND (category = 'Khác' OR price IS NULL OR price = 0)"
  ).all() as { id: string }[];
  if (rows.length > 0) {
    db.prepare(
      "DELETE FROM products WHERE id LIKE 'odoo-%' AND (category = 'Khác' OR price IS NULL OR price = 0)"
    ).run();
  }
  return rows.length;
}

export async function dbDeleteAllOdooProducts(): Promise<number> {
  if (IS_SUPABASE) {
    const { data } = await getSupabase()
      .from("products")
      .select("id")
      .like("id", "odoo-%");
    const ids = (data ?? []).map((r: { id: string }) => r.id);
    if (ids.length > 0) {
      const CHUNK = 200;
      for (let i = 0; i < ids.length; i += CHUNK) {
        await getSupabase().from("products").delete().in("id", ids.slice(i, i + CHUNK));
      }
    }
    return ids.length;
  }
  const db = getDb();
  const rows = db.prepare("SELECT id FROM products WHERE id LIKE 'odoo-%'").all() as { id: string }[];
  if (rows.length > 0) {
    const del = db.transaction(() => {
      db.prepare("DELETE FROM products WHERE id LIKE 'odoo-%'").run();
    });
    del();
  }
  return rows.length;
}

// ─── Chat Rooms ───────────────────────────────────────────────────────────────

export async function dbUpdateRoomMembers(roomId: string, memberIds: string[] | null): Promise<void> {
  const val = memberIds === null ? null : JSON.stringify(memberIds);
  if (IS_SUPABASE) {
    await getSupabase().from("chat_rooms").update({ memberIds: val }).eq("id", roomId);
    return;
  }
  getDb().prepare('UPDATE chat_rooms SET "memberIds"=? WHERE id=?').run(val, roomId);
}

export async function dbGetRooms(): Promise<(DBRoom & { lastMessage: unknown; messageCount: number })[]> {
  if (IS_SUPABASE) {
    const sb = getSupabase();
    const { data: rooms } = await sb.from("chat_rooms").select("*").order("createdAt");
    if (!rooms) return [];
    const result = await Promise.all(rooms.map(async (r) => {
      const { data: last } = await sb
        .from("chat_messages")
        .select("content, userName, createdAt, mediaType")
        .eq("roomId", r.id)
        .is("deletedAt", null)
        .order("createdAt", { ascending: false })
        .limit(1)
        .single();
      const { count } = await sb
        .from("chat_messages")
        .select("*", { count: "exact", head: true })
        .eq("roomId", r.id)
        .is("deletedAt", null);
      return { ...r, lastMessage: last ?? null, messageCount: count ?? 0 };
    }));
    return result;
  }
  const db = getDb();
  const rooms = db.prepare("SELECT * FROM chat_rooms ORDER BY createdAt").all() as DBRoom[];
  return rooms.map(r => {
    const last = db.prepare(
      "SELECT content, userName, createdAt, mediaType FROM chat_messages WHERE roomId=? AND deletedAt IS NULL ORDER BY createdAt DESC LIMIT 1"
    ).get(r.id);
    const { cnt } = db.prepare("SELECT COUNT(*) as cnt FROM chat_messages WHERE roomId=? AND deletedAt IS NULL").get(r.id) as { cnt: number };
    return { ...r, lastMessage: last ?? null, messageCount: cnt };
  });
}

export async function dbGetMessages(roomId: string, since?: string): Promise<DBMessage[]> {
  if (IS_SUPABASE) {
    const sb = getSupabase();
    let q = sb.from("chat_messages").select("*").eq("roomId", roomId).order("createdAt").limit(80);
    if (since) q = q.gt("createdAt", since);
    const { data } = await q;
    return (data ?? []) as DBMessage[];
  }
  const db = getDb();
  if (since) {
    return db.prepare("SELECT * FROM chat_messages WHERE roomId=? AND createdAt > ? ORDER BY createdAt ASC LIMIT 80").all(roomId, since) as DBMessage[];
  }
  return db.prepare("SELECT * FROM chat_messages WHERE roomId=? ORDER BY createdAt ASC LIMIT 80").all(roomId) as DBMessage[];
}

export async function dbInsertMessage(msg: {
  id: string; roomId: string; userId: string; userName: string;
  content: string; mediaUrl?: string | null; mediaType?: string | null;
  replyToId?: string | null; createdAt: string;
}): Promise<void> {
  if (IS_SUPABASE) {
    await getSupabase().from("chat_messages").insert({
      id: msg.id, roomId: msg.roomId, userId: msg.userId, userName: msg.userName,
      content: msg.content, mediaUrl: msg.mediaUrl ?? null, mediaType: msg.mediaType ?? null,
      replyToId: msg.replyToId ?? null, createdAt: msg.createdAt,
    });
    return;
  }
  getDb().prepare(`
    INSERT INTO chat_messages (id, roomId, userId, userName, content, mediaUrl, mediaType, replyToId, createdAt)
    VALUES (?,?,?,?,?,?,?,?,?)
  `).run(msg.id, msg.roomId, msg.userId, msg.userName, msg.content,
    msg.mediaUrl ?? null, msg.mediaType ?? null, msg.replyToId ?? null, msg.createdAt);
}

export async function dbRoomExists(roomId: string): Promise<boolean> {
  if (IS_SUPABASE) {
    const { data } = await getSupabase().from("chat_rooms").select("id").eq("id", roomId).single();
    return !!data;
  }
  return !!getDb().prepare("SELECT id FROM chat_rooms WHERE id=?").get(roomId);
}

export async function dbCreateRoom(id: string, name: string, type: string, createdBy: string, createdAt: string): Promise<void> {
  if (IS_SUPABASE) {
    await getSupabase().from("chat_rooms").insert({ id, name, type, createdBy, createdAt });
    return;
  }
  getDb().prepare("INSERT INTO chat_rooms (id, name, type, createdBy, createdAt) VALUES (?,?,?,?,?)")
    .run(id, name, type, createdBy, createdAt);
}

export async function dbDeleteRoom(roomId: string): Promise<void> {
  if (IS_SUPABASE) {
    await getSupabase().from("chat_rooms").delete().eq("id", roomId);
    return;
  }
  getDb().prepare("DELETE FROM chat_rooms WHERE id=?").run(roomId);
}

export async function dbClearRoomMessages(roomId: string): Promise<void> {
  if (IS_SUPABASE) {
    await getSupabase().from("chat_messages").delete().eq("roomId", roomId);
    return;
  }
  getDb().prepare("DELETE FROM chat_messages WHERE roomId=?").run(roomId);
}

export async function dbSoftDeleteMessage(msgId: string, deletedAt: string): Promise<{ found: boolean }> {
  if (IS_SUPABASE) {
    const { data: msg } = await getSupabase().from("chat_messages").select("userId").eq("id", msgId).single();
    if (!msg) return { found: false };
    await getSupabase().from("chat_messages")
      .update({ content: "[Tin nhắn đã bị xóa]", deletedAt })
      .eq("id", msgId);
    return { found: true };
  }
  const msg = getDb().prepare("SELECT userId FROM chat_messages WHERE id=?").get(msgId) as { userId: string } | undefined;
  if (!msg) return { found: false };
  getDb().prepare("UPDATE chat_messages SET content=?, deletedAt=? WHERE id=?")
    .run("[Tin nhắn đã bị xóa]", deletedAt, msgId);
  return { found: true };
}

export async function dbGetMessageSender(msgId: string): Promise<{ userId: string } | null> {
  if (IS_SUPABASE) {
    const { data } = await getSupabase().from("chat_messages").select("userId").eq("id", msgId).single();
    return data as { userId: string } | null;
  }
  return getDb().prepare("SELECT userId FROM chat_messages WHERE id=?").get(msgId) as { userId: string } | null;
}

export async function dbUpdateReactions(msgId: string, reactions: string): Promise<void> {
  if (IS_SUPABASE) {
    await getSupabase().from("chat_messages").update({ reactions }).eq("id", msgId);
    return;
  }
  getDb().prepare("UPDATE chat_messages SET reactions=? WHERE id=?").run(reactions, msgId);
}

export async function dbGetUserRole(userId: string): Promise<string | null> {
  if (IS_SUPABASE) {
    const { data } = await getSupabase().from("users").select("role").eq("id", userId).single();
    return (data as { role: string } | null)?.role ?? null;
  }
  const u = getDb().prepare("SELECT role FROM users WHERE id=?").get(userId) as { role: string } | undefined;
  return u?.role ?? null;
}

export async function dbPinMessage(msgId: string, userId: string, pin: boolean): Promise<void> {
  const now = pin ? new Date().toISOString() : null;
  const pinnedBy = pin ? userId : null;
  if (IS_SUPABASE) {
    await getSupabase().from("chat_messages").update({ pinnedAt: now, pinnedBy }).eq("id", msgId);
    return;
  }
  getDb().prepare("UPDATE chat_messages SET pinnedAt=?, pinnedBy=? WHERE id=?").run(now, pinnedBy, msgId);
}

export async function dbGetPinnedMessages(roomId: string): Promise<DBMessage[]> {
  if (IS_SUPABASE) {
    const { data } = await getSupabase()
      .from("chat_messages")
      .select("*")
      .eq("roomId", roomId)
      .not("pinnedAt", "is", null)
      .order("pinnedAt");
    return (data ?? []) as DBMessage[];
  }
  return getDb().prepare(
    "SELECT * FROM chat_messages WHERE roomId=? AND pinnedAt IS NOT NULL ORDER BY pinnedAt ASC"
  ).all(roomId) as DBMessage[];
}

export async function dbSearchMessages(roomId: string, query: string): Promise<DBMessage[]> {
  const q = `%${query}%`;
  if (IS_SUPABASE) {
    const { data } = await getSupabase()
      .from("chat_messages")
      .select("*")
      .eq("roomId", roomId)
      .is("deletedAt", null)
      .ilike("content", q)
      .order("createdAt")
      .limit(50);
    return (data ?? []) as DBMessage[];
  }
  return getDb().prepare(
    "SELECT * FROM chat_messages WHERE roomId=? AND deletedAt IS NULL AND content LIKE ? ORDER BY createdAt ASC LIMIT 50"
  ).all(roomId, q) as DBMessage[];
}

export async function dbRevokeMessage(msgId: string, revokedAt: string): Promise<{ found: boolean }> {
  if (IS_SUPABASE) {
    const { data: msg } = await getSupabase().from("chat_messages").select("userId").eq("id", msgId).single();
    if (!msg) return { found: false };
    await getSupabase().from("chat_messages")
      .update({ content: "[Tin nhắn đã được thu hồi]", revokedAt, mediaUrl: null })
      .eq("id", msgId);
    return { found: true };
  }
  const msg = getDb().prepare("SELECT userId FROM chat_messages WHERE id=?").get(msgId) as { userId: string } | undefined;
  if (!msg) return { found: false };
  getDb().prepare("UPDATE chat_messages SET content=?, revokedAt=?, mediaUrl=NULL WHERE id=?")
    .run("[Tin nhắn đã được thu hồi]", revokedAt, msgId);
  return { found: true };
}

export async function dbMarkRead(roomId: string, userId: string): Promise<void> {
  const now = new Date().toISOString();
  if (IS_SUPABASE) {
    await getSupabase().from("chat_read_receipts").upsert({ roomId, userId, lastReadAt: now }, { onConflict: "roomId,userId" });
    return;
  }
  getDb().prepare(
    "INSERT INTO chat_read_receipts (roomId, userId, lastReadAt) VALUES (?,?,?) ON CONFLICT(roomId, userId) DO UPDATE SET lastReadAt=excluded.lastReadAt"
  ).run(roomId, userId, now);
}

export async function dbGetReadReceipts(roomId: string): Promise<{ userId: string; lastReadAt: string }[]> {
  if (IS_SUPABASE) {
    const { data } = await getSupabase().from("chat_read_receipts").select("userId, lastReadAt").eq("roomId", roomId);
    return (data ?? []) as { userId: string; lastReadAt: string }[];
  }
  return getDb().prepare(
    "SELECT userId, lastReadAt FROM chat_read_receipts WHERE roomId=?"
  ).all(roomId) as { userId: string; lastReadAt: string }[];
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function dbGetNotifications(): Promise<DBNotification[]> {
  if (IS_SUPABASE) {
    const { data } = await getSupabase().from("notifications").select("*").order("createdAt", { ascending: false }).limit(50);
    return (data ?? []) as DBNotification[];
  }
  return getDb().prepare("SELECT * FROM notifications ORDER BY createdAt DESC LIMIT 50").all() as DBNotification[];
}

export async function dbInsertNotification(n: DBNotification): Promise<void> {
  if (IS_SUPABASE) {
    await getSupabase().from("notifications").insert(n);
    return;
  }
  getDb().prepare(
    "INSERT INTO notifications (id, title, body, type, createdBy, createdAt, pinned) VALUES (?,?,?,?,?,?,?)"
  ).run(n.id, n.title, n.body, n.type, n.createdBy, n.createdAt, n.pinned);
}

export async function dbDeleteNotification(id: string): Promise<void> {
  if (IS_SUPABASE) {
    await getSupabase().from("notifications").delete().eq("id", id);
    return;
  }
  getDb().prepare("DELETE FROM notifications WHERE id=?").run(id);
}

// ─── Movements ────────────────────────────────────────────────────────────────

export async function dbGetMovements(limit = 50): Promise<DBMovement[]> {
  if (IS_SUPABASE) {
    const { data } = await getSupabase().from("movements").select("*")
      .order("createdAt", { ascending: false }).limit(limit);
    return (data ?? []) as DBMovement[];
  }
  return getDb().prepare("SELECT * FROM movements ORDER BY createdAt DESC LIMIT ?").all(limit) as DBMovement[];
}

export async function dbInsertMovement(m: DBMovement): Promise<void> {
  if (IS_SUPABASE) {
    await getSupabase().from("movements").insert(m);
    return;
  }
  getDb().prepare(
    "INSERT INTO movements (id,productId,productName,variant,type,fromLoc,toLoc,qty,byUser,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?)"
  ).run(m.id, m.productId ?? null, m.productName, m.variant, m.type,
    m.fromLoc ?? null, m.toLoc ?? null, m.qty, m.byUser, m.createdAt);
}

// ─── Push Subscriptions ───────────────────────────────────────────────────────

export async function dbGetPushSubs(): Promise<DBPushSub[]> {
  if (IS_SUPABASE) {
    const { data } = await getSupabase().from("push_subs").select("*");
    return (data ?? []) as DBPushSub[];
  }
  return getDb().prepare("SELECT * FROM push_subs").all() as DBPushSub[];
}

export async function dbUpsertPushSub(sub: DBPushSub): Promise<void> {
  if (IS_SUPABASE) {
    await getSupabase().from("push_subs").upsert(sub, { onConflict: "endpoint" });
    return;
  }
  getDb().prepare(`
    INSERT OR REPLACE INTO push_subs (id, userId, endpoint, p256dh, auth, createdAt)
    VALUES (?,?,?,?,?,?)
  `).run(sub.id, sub.userId, sub.endpoint, sub.p256dh, sub.auth, sub.createdAt);
}

export async function dbDeletePushSub(endpoint: string): Promise<void> {
  if (IS_SUPABASE) {
    await getSupabase().from("push_subs").delete().eq("endpoint", endpoint);
    return;
  }
  getDb().prepare("DELETE FROM push_subs WHERE endpoint = ?").run(endpoint);
}

// ─── Shelves ──────────────────────────────────────────────────────────────────

export type DBShelf = {
  id: string; name: string; type: "WAREHOUSE" | "DISPLAY";
  subType: string | null; sortOrder: number;
};

export async function dbGetAllShelves(): Promise<DBShelf[]> {
  if (IS_SUPABASE) {
    const { data } = await getSupabase().from("shelves").select("*").order("sortOrder").order("name");
    return (data ?? []) as DBShelf[];
  }
  return getDb().prepare("SELECT * FROM shelves ORDER BY sortOrder, name").all() as DBShelf[];
}

export async function dbUpsertShelf(s: DBShelf): Promise<void> {
  if (IS_SUPABASE) {
    await getSupabase().from("shelves").upsert(s, { onConflict: "id" });
    return;
  }
  getDb().prepare(`
    INSERT INTO shelves(id,name,type,subType,sortOrder)
    VALUES(@id,@name,@type,@subType,@sortOrder)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name,type=excluded.type,subType=excluded.subType,sortOrder=excluded.sortOrder
  `).run(s);
}

export async function dbDeleteShelf(shelfId: string): Promise<void> {
  if (IS_SUPABASE) {
    const sb = getSupabase();
    // placements and slots cascade from FK, but delete explicitly to be safe
    const { data: slots } = await sb.from("slots").select("id").eq("shelfId", shelfId);
    const slotIds = (slots ?? []).map((s: { id: string }) => s.id);
    if (slotIds.length) {
      await sb.from("placements").delete().in("slotId", slotIds);
      await sb.from("slots").delete().in("id", slotIds);
    }
    await sb.from("shelves").delete().eq("id", shelfId);
    return;
  }
  const db = getDb();
  const slots = db.prepare(`SELECT id FROM slots WHERE "shelfId" = ?`).all(shelfId) as { id: string }[];
  const slotIds = slots.map(s => s.id);
  if (slotIds.length) {
    const ph = slotIds.map(() => "?").join(",");
    db.prepare(`DELETE FROM placements WHERE "slotId" IN (${ph})`).run(...slotIds);
    db.prepare(`DELETE FROM slots WHERE id IN (${ph})`).run(...slotIds);
  }
  db.prepare("DELETE FROM shelves WHERE id = ?").run(shelfId);
}

// ─── Slots ────────────────────────────────────────────────────────────────────

export type DBSlot = {
  id: string; shelfId: string; tier: number; position: number; label: string;
};

export async function dbGetOrCreateSlot(shelfId: string, tier: number, position: number, label = ""): Promise<string> {
  const slotId = `slot_${shelfId}_${tier}_${position}_${label}`.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 64);
  if (IS_SUPABASE) {
    const sb = getSupabase();
    // Check if slot already exists
    const { data: existing } = await sb.from("slots")
      .select("id").eq("shelfId", shelfId).eq("tier", tier).eq("position", position).eq("label", label).maybeSingle();
    if (existing) return (existing as { id: string }).id;
    // Insert new slot (ignore conflict on id in case of race condition)
    await sb.from("slots").upsert(
      { id: slotId, shelfId, tier, position, label },
      { onConflict: "id", ignoreDuplicates: true }
    );
    return slotId;
  }
  const db = getDb();
  const existing = db.prepare("SELECT id FROM slots WHERE shelfId=? AND tier=? AND position=? AND label=?").get(shelfId, tier, position, label) as { id: string } | undefined;
  if (existing) return existing.id;
  db.prepare("INSERT OR IGNORE INTO slots(id,shelfId,tier,position,label) VALUES(?,?,?,?,?)").run(slotId, shelfId, tier, position, label);
  return slotId;
}

// ─── Placements ───────────────────────────────────────────────────────────────

export async function dbSetPlacement(slotId: string, productId: string | null): Promise<void> {
  if (IS_SUPABASE) {
    const sb = getSupabase();
    if (!productId) {
      await sb.from("placements").delete().eq("slotId", slotId);
      return;
    }
    const now = new Date().toISOString();
    const id = `pl_${slotId}`.slice(0, 60);
    await sb.from("placements").upsert(
      { id, productId, slotId, placedAt: now, updatedAt: now },
      { onConflict: "slotId" }
    );
    return;
  }
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

export async function dbGetWarehouseMap(): Promise<Record<string, (string | null)[][]>> {
  if (IS_SUPABASE) {
    const sb = getSupabase();
    const { data: shelves } = await sb.from("shelves").select("id").eq("type", "WAREHOUSE").order("sortOrder");
    const result: Record<string, (string | null)[][]> = {};
    for (const shelf of (shelves ?? []) as { id: string }[]) {
      // Get all slots for this shelf
      const { data: slots } = await sb.from("slots").select("id, tier, position").eq("shelfId", shelf.id);
      // Get all placements for these slots
      const slotIds = (slots ?? []).map((s: { id: string }) => s.id);
      const { data: pls } = slotIds.length
        ? await sb.from("placements").select("slotId, productId").in("slotId", slotIds)
        : { data: [] };
      const plMap: Record<string, string> = {};
      for (const p of (pls ?? []) as { slotId: string; productId: string }[]) plMap[p.slotId] = p.productId;
      const tiers: (string | null)[][] = Array.from({ length: 4 }, () => Array(25).fill(null));
      for (const s of (slots ?? []) as { id: string; tier: number; position: number }[]) {
        if (s.tier < 4 && s.position < 25) tiers[s.tier][s.position] = plMap[s.id] ?? null;
      }
      result[shelf.id] = tiers;
    }
    return result;
  }
  // SQLite fallback
  const db = getDb();
  const shelves = db.prepare("SELECT * FROM shelves WHERE type='WAREHOUSE' ORDER BY sortOrder, name").all() as DBShelf[];
  const result: Record<string, (string | null)[][]> = {};
  for (const shelf of shelves) {
    const slots = db.prepare("SELECT s.tier, s.position, p.productId FROM slots s LEFT JOIN placements p ON p.slotId=s.id WHERE s.shelfId=? ORDER BY s.tier, s.position").all(shelf.id) as { tier: number; position: number; productId: string | null }[];
    const tiers: (string | null)[][] = Array.from({ length: 4 }, () => Array(25).fill(null));
    for (const s of slots) {
      if (s.tier < 4 && s.position < 25) tiers[s.tier][s.position] = s.productId ?? null;
    }
    result[shelf.id] = tiers;
  }
  return result;
}

export async function dbGetDisplayMap(): Promise<Record<string, Record<string, (string | null)[][]>>> {
  if (IS_SUPABASE) {
    const sb = getSupabase();
    const { data: shelves } = await sb.from("shelves").select("id").eq("type", "DISPLAY").order("sortOrder");
    const result: Record<string, Record<string, (string | null)[][]>> = {};
    for (const shelf of (shelves ?? []) as { id: string }[]) {
      const { data: slots } = await sb.from("slots").select("id, label, tier, position").eq("shelfId", shelf.id);
      const slotIds = (slots ?? []).map((s: { id: string }) => s.id);
      const { data: pls } = slotIds.length
        ? await sb.from("placements").select("slotId, productId").in("slotId", slotIds)
        : { data: [] };
      const plMap: Record<string, string> = {};
      for (const p of (pls ?? []) as { slotId: string; productId: string }[]) plMap[p.slotId] = p.productId;
      if (!result[shelf.id]) result[shelf.id] = {};
      for (const s of (slots ?? []) as { id: string; label: string; tier: number; position: number }[]) {
        const pid = plMap[s.id];
        if (!pid) continue;
        if (!result[shelf.id][s.label]) result[shelf.id][s.label] = [];
        while (result[shelf.id][s.label].length <= s.tier) result[shelf.id][s.label].push([]);
        while (result[shelf.id][s.label][s.tier].length <= s.position) result[shelf.id][s.label][s.tier].push(null);
        result[shelf.id][s.label][s.tier][s.position] = pid;
      }
    }
    return result;
  }
  // SQLite fallback
  const db = getDb();
  const shelves = db.prepare("SELECT * FROM shelves WHERE type='DISPLAY' ORDER BY sortOrder").all() as DBShelf[];
  const result: Record<string, Record<string, (string | null)[][]>> = {};
  for (const shelf of shelves) {
    const slots = db.prepare(`SELECT s.label, s.tier, s.position, p.productId FROM slots s LEFT JOIN placements p ON p.slotId=s.id WHERE s.shelfId=? AND p.productId IS NOT NULL ORDER BY s.label, s.tier, s.position`).all(shelf.id) as { label: string; tier: number; position: number; productId: string }[];
    if (!result[shelf.id]) result[shelf.id] = {};
    for (const s of slots) {
      if (!result[shelf.id][s.label]) result[shelf.id][s.label] = [];
      while (result[shelf.id][s.label].length <= s.tier) result[shelf.id][s.label].push([]);
      while (result[shelf.id][s.label][s.tier].length <= s.position) result[shelf.id][s.label][s.tier].push(null);
      result[shelf.id][s.label][s.tier][s.position] = s.productId;
    }
  }
  return result;
}

export async function dbGetWarehouseShelvesForState(): Promise<{
  id: string; name: string; shelfType: "shoes" | "bags"; number: number;
  tiers: (string | null)[][]; notes: string;
}[]> {
  if (IS_SUPABASE) {
    const sb = getSupabase();
    const { data: shelves } = await sb.from("shelves").select("*").eq("type", "WAREHOUSE").order("sortOrder");
    const result = [];
    for (const shelf of (shelves ?? []) as DBShelf[]) {
      const { data: slots } = await sb.from("slots").select("id, tier, position").eq("shelfId", shelf.id);
      const slotIds = (slots ?? []).map((s: { id: string }) => s.id);
      const { data: pls } = slotIds.length
        ? await sb.from("placements").select("slotId, productId").in("slotId", slotIds)
        : { data: [] };
      const plMap: Record<string, string> = {};
      for (const p of (pls ?? []) as { slotId: string; productId: string }[]) plMap[p.slotId] = p.productId;
      const tiers: (string | null)[][] = Array.from({ length: 4 }, () => []);
      for (const s of (slots ?? []) as { id: string; tier: number; position: number }[]) {
        if (s.tier < 4) {
          while (tiers[s.tier].length <= s.position) tiers[s.tier].push(null);
          tiers[s.tier][s.position] = plMap[s.id] ?? null;
        }
      }
      result.push({
        id: shelf.id, name: shelf.name,
        shelfType: (shelf.subType ?? "shoes") as "shoes" | "bags",
        number: parseInt(shelf.name.match(/\d+/)?.[0] ?? "1"),
        tiers, notes: "",
      });
    }
    return result;
  }
  // SQLite fallback
  const db = getDb();
  const shelves = db.prepare("SELECT * FROM shelves WHERE type='WAREHOUSE' ORDER BY sortOrder, name").all() as DBShelf[];
  return shelves.map(shelf => {
    const tiers: (string | null)[][] = Array.from({ length: 4 }, () => []);
    const rows = db.prepare("SELECT sl.tier, sl.position, p.productId FROM slots sl LEFT JOIN placements p ON p.slotId=sl.id WHERE sl.shelfId=? ORDER BY sl.tier, sl.position").all(shelf.id) as { tier: number; position: number; productId: string | null }[];
    for (const r of rows) {
      if (r.tier < 4) {
        while (tiers[r.tier].length <= r.position) tiers[r.tier].push(null);
        tiers[r.tier][r.position] = r.productId ?? null;
      }
    }
    return { id: shelf.id, name: shelf.name, shelfType: (shelf.subType ?? "shoes") as "shoes" | "bags", number: parseInt(shelf.name.match(/\d+/)?.[0] ?? "1"), tiers, notes: "" };
  });
}

export async function dbGetDisplayPlacements(): Promise<Record<string, Record<string, Record<number, Record<number, string>>>>> {
  if (IS_SUPABASE) {
    const sb = getSupabase();
    const { data: shelves } = await sb.from("shelves").select("id").eq("type", "DISPLAY").order("sortOrder");
    const result: Record<string, Record<string, Record<number, Record<number, string>>>> = {};
    for (const shelf of (shelves ?? []) as { id: string }[]) {
      const { data: slots } = await sb.from("slots").select("id, label, tier, position").eq("shelfId", shelf.id);
      const slotIds = (slots ?? []).map((s: { id: string }) => s.id);
      const { data: pls } = slotIds.length
        ? await sb.from("placements").select("slotId, productId").in("slotId", slotIds)
        : { data: [] };
      const plMap: Record<string, string> = {};
      for (const p of (pls ?? []) as { slotId: string; productId: string }[]) plMap[p.slotId] = p.productId;
      if (!result[shelf.id]) result[shelf.id] = {};
      for (const s of (slots ?? []) as { id: string; label: string; tier: number; position: number }[]) {
        const pid = plMap[s.id];
        if (!pid) continue;
        if (!result[shelf.id][s.label]) result[shelf.id][s.label] = {};
        if (!result[shelf.id][s.label][s.tier]) result[shelf.id][s.label][s.tier] = {};
        result[shelf.id][s.label][s.tier][s.position] = pid;
      }
    }
    return result;
  }
  // SQLite fallback
  const db = getDb();
  const shelves = db.prepare("SELECT * FROM shelves WHERE type='DISPLAY' ORDER BY sortOrder").all() as DBShelf[];
  const result: Record<string, Record<string, Record<number, Record<number, string>>>> = {};
  for (const shelf of shelves) {
    const rows = db.prepare("SELECT sl.label, sl.tier, sl.position, p.productId FROM slots sl LEFT JOIN placements p ON p.slotId=sl.id WHERE sl.shelfId=? AND p.productId IS NOT NULL").all(shelf.id) as { label: string; tier: number; position: number; productId: string }[];
    if (!result[shelf.id]) result[shelf.id] = {};
    for (const r of rows) {
      if (!result[shelf.id][r.label]) result[shelf.id][r.label] = {};
      if (!result[shelf.id][r.label][r.tier]) result[shelf.id][r.label][r.tier] = {};
      result[shelf.id][r.label][r.tier][r.position] = r.productId;
    }
  }
  return result;
}

// ─── App Settings (store info) ────────────────────────────────────────────────

export type AppSettings = {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  storeEmail: string;
};

const SETTINGS_DEFAULTS: AppSettings = {
  storeName: "",
  storeAddress: "",
  storePhone: "",
  storeEmail: "",
};

export async function dbGetAppSettings(): Promise<AppSettings> {
  if (IS_SUPABASE) {
    const sb = getSupabase();
    const { data } = await sb.from("app_settings").select("key, value");
    const map: Record<string, string> = {};
    for (const row of (data ?? []) as { key: string; value: string }[]) {
      map[row.key] = row.value;
    }
    return {
      storeName:    map["storeName"]    ?? SETTINGS_DEFAULTS.storeName,
      storeAddress: map["storeAddress"] ?? SETTINGS_DEFAULTS.storeAddress,
      storePhone:   map["storePhone"]   ?? SETTINGS_DEFAULTS.storePhone,
      storeEmail:   map["storeEmail"]   ?? SETTINGS_DEFAULTS.storeEmail,
    };
  }
  const db = getDb();
  // Ensure table exists in SQLite
  db.prepare("CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT '')").run();
  const rows = db.prepare("SELECT key, value FROM app_settings").all() as { key: string; value: string }[];
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  return {
    storeName:    map["storeName"]    ?? SETTINGS_DEFAULTS.storeName,
    storeAddress: map["storeAddress"] ?? SETTINGS_DEFAULTS.storeAddress,
    storePhone:   map["storePhone"]   ?? SETTINGS_DEFAULTS.storePhone,
    storeEmail:   map["storeEmail"]   ?? SETTINGS_DEFAULTS.storeEmail,
  };
}

export async function dbSetAppSettings(settings: Partial<AppSettings>): Promise<void> {
  if (IS_SUPABASE) {
    const sb = getSupabase();
    const rows = Object.entries(settings).map(([key, value]) => ({ key, value: value ?? "" }));
    await sb.from("app_settings").upsert(rows, { onConflict: "key" });
    return;
  }
  const db = getDb();
  db.prepare("CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT '')").run();
  const stmt = db.prepare("INSERT INTO app_settings(key, value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value");
  for (const [key, value] of Object.entries(settings)) {
    stmt.run(key, value ?? "");
  }
}

// ─── Section row overrides ────────────────────────────────────────────────────
// Stored as JSON in app_settings key "sectionRowOverrides"
// Shape: { [secId__subId]: number }  — total row count override for that subsection

export async function dbGetSectionRowOverrides(): Promise<Record<string, number>> {
  const key = "sectionRowOverrides";
  if (IS_SUPABASE) {
    const { data } = await getSupabase().from("app_settings").select("value").eq("key", key).single();
    try { return JSON.parse((data as { value: string } | null)?.value ?? "{}"); } catch { return {}; }
  }
  const db = getDb();
  db.prepare("CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT '')").run();
  const row = db.prepare("SELECT value FROM app_settings WHERE key=?").get(key) as { value: string } | undefined;
  try { return JSON.parse(row?.value ?? "{}"); } catch { return {}; }
}

export async function dbSetSectionRowOverride(secId: string, subId: string, rowCount: number): Promise<void> {
  const key = "sectionRowOverrides";
  const overrides = await dbGetSectionRowOverrides();
  overrides[`${secId}__${subId}`] = rowCount;
  const value = JSON.stringify(overrides);
  if (IS_SUPABASE) {
    await getSupabase().from("app_settings").upsert({ key, value }, { onConflict: "key" });
    return;
  }
  const db = getDb();
  db.prepare("CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT '')").run();
  db.prepare("INSERT INTO app_settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(key, value);
}

// ─── Customers ────────────────────────────────────────────────────────────────

export type DBCustomer = {
  id: string;
  odooId: number | null;
  name: string;
  phone?: string | null;
  email?: string | null;
  street?: string | null;
  totalOrders: number;
  totalSpent: number;
  lastOrderAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function dbGetCustomers(limit = 200): Promise<DBCustomer[]> {
  if (IS_SUPABASE) {
    const { data } = await getSupabase()
      .from("customers")
      .select("*")
      .order("totalSpent", { ascending: false })
      .limit(limit);
    return (data ?? []) as DBCustomer[];
  }
  return getDb().prepare(
    "SELECT * FROM customers ORDER BY totalSpent DESC LIMIT ?"
  ).all(limit) as DBCustomer[];
}

export async function dbSearchCustomers(query: string): Promise<DBCustomer[]> {
  const q = `%${query}%`;
  if (IS_SUPABASE) {
    const { data } = await getSupabase()
      .from("customers")
      .select("*")
      .or(`name.ilike.${q},phone.ilike.${q}`)
      .order("totalSpent", { ascending: false })
      .limit(50);
    return (data ?? []) as DBCustomer[];
  }
  return getDb().prepare(
    "SELECT * FROM customers WHERE name LIKE ? OR phone LIKE ? ORDER BY totalSpent DESC LIMIT 50"
  ).all(q, q) as DBCustomer[];
}

export async function dbBulkUpsertCustomers(customers: DBCustomer[]): Promise<void> {
  if (!customers.length) return;
  if (IS_SUPABASE) {
    const CHUNK = 500;
    for (let i = 0; i < customers.length; i += CHUNK) {
      await getSupabase()
        .from("customers")
        .upsert(customers.slice(i, i + CHUNK), { onConflict: "id" });
    }
    return;
  }
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO customers (id,odooId,name,phone,email,street,totalOrders,totalSpent,lastOrderAt,createdAt,updatedAt)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name, phone=excluded.phone, email=excluded.email, street=excluded.street,
      totalOrders=excluded.totalOrders, totalSpent=excluded.totalSpent,
      lastOrderAt=excluded.lastOrderAt, updatedAt=excluded.updatedAt
  `);
  const tx = db.transaction((rows: DBCustomer[]) => {
    for (const c of rows) {
      stmt.run(c.id, c.odooId ?? null, c.name, c.phone ?? null, c.email ?? null,
        c.street ?? null, c.totalOrders, c.totalSpent, c.lastOrderAt ?? null,
        c.createdAt, c.updatedAt);
    }
  });
  tx(customers);
}

// ─── POS Orders ───────────────────────────────────────────────────────────────

export type DBPosOrder = {
  id: string;
  odooId: number | null;
  name: string;
  sessionName?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  salesperson?: string | null;
  state: string;
  amountTotal: number;
  amountTax: number;
  amountPaid: number;
  lineCount: number;
  createdAt: string;
  updatedAt: string;
};

export type DBPosOrderLine = {
  id: string;
  orderId: string;
  odooId: number | null;
  productId?: string | null;
  productName: string;
  sku?: string | null;
  qty: number;
  priceUnit: number;
  discount: number;
  priceSubtotal: number;
};

export async function dbGetPosOrders(opts: { limit?: number; customerId?: string; dateFrom?: string } = {}): Promise<DBPosOrder[]> {
  const limit = opts.limit ?? 100;
  if (IS_SUPABASE) {
    let q = getSupabase()
      .from("pos_orders")
      .select("*")
      .order("createdAt", { ascending: false })
      .limit(limit);
    if (opts.customerId) q = q.eq("customerId", opts.customerId);
    if (opts.dateFrom) q = q.gte("createdAt", opts.dateFrom);
    const { data } = await q;
    return (data ?? []) as DBPosOrder[];
  }
  const db = getDb();
  if (opts.customerId) {
    return db.prepare(
      "SELECT * FROM pos_orders WHERE customerId=? ORDER BY createdAt DESC LIMIT ?"
    ).all(opts.customerId, limit) as DBPosOrder[];
  }
  if (opts.dateFrom) {
    return db.prepare(
      "SELECT * FROM pos_orders WHERE createdAt >= ? ORDER BY createdAt DESC LIMIT ?"
    ).all(opts.dateFrom, limit) as DBPosOrder[];
  }
  return db.prepare(
    "SELECT * FROM pos_orders ORDER BY createdAt DESC LIMIT ?"
  ).all(limit) as DBPosOrder[];
}

export async function dbGetPosOrderLines(orderId: string): Promise<DBPosOrderLine[]> {
  if (IS_SUPABASE) {
    const { data } = await getSupabase()
      .from("pos_order_lines")
      .select("*")
      .eq("orderId", orderId);
    return (data ?? []) as DBPosOrderLine[];
  }
  return getDb().prepare(
    "SELECT * FROM pos_order_lines WHERE orderId=?"
  ).all(orderId) as DBPosOrderLine[];
}

export async function dbBulkUpsertPosOrders(orders: DBPosOrder[]): Promise<void> {
  if (!orders.length) return;
  if (IS_SUPABASE) {
    const CHUNK = 500;
    for (let i = 0; i < orders.length; i += CHUNK) {
      await getSupabase()
        .from("pos_orders")
        .upsert(orders.slice(i, i + CHUNK), { onConflict: "id" });
    }
    return;
  }
  const db = getDb();
  // Ensure salesperson column exists (SQLite ALTER TABLE is safe to run multiple times via try/catch)
  try { db.prepare(`ALTER TABLE pos_orders ADD COLUMN salesperson TEXT`).run(); } catch { /* already exists */ }
  const stmt = db.prepare(`
    INSERT INTO pos_orders (id,odooId,name,sessionName,customerId,customerName,salesperson,state,amountTotal,amountTax,amountPaid,lineCount,createdAt,updatedAt)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET
      state=excluded.state, amountTotal=excluded.amountTotal, amountTax=excluded.amountTax,
      amountPaid=excluded.amountPaid, lineCount=excluded.lineCount, salesperson=excluded.salesperson, updatedAt=excluded.updatedAt
  `);
  const tx = db.transaction((rows: DBPosOrder[]) => {
    for (const o of rows) {
      stmt.run(o.id, o.odooId ?? null, o.name, o.sessionName ?? null,
        o.customerId ?? null, o.customerName ?? null, o.salesperson ?? null, o.state,
        o.amountTotal, o.amountTax, o.amountPaid, o.lineCount,
        o.createdAt, o.updatedAt);
    }
  });
  tx(orders);
}

export type DBStaffSales = {
  salesperson: string;
  orders: number;
  qty: number;
  revenue: number;
  avgBasket: number;
  ipt: number;
};

export async function dbGetStaffSales(dateFrom: string, dateTo: string): Promise<DBStaffSales[]> {
  if (IS_SUPABASE) {
    const { data } = await getSupabase()
      .from("pos_orders")
      .select("salesperson,amountTotal,lineCount")
      .not("salesperson", "is", null)
      .gte("createdAt", dateFrom)
      .lte("createdAt", dateTo + "T23:59:59.999Z")
      .gt("amountTotal", 0);
    const rows = (data ?? []) as { salesperson: string; amountTotal: number; lineCount: number }[];
    // Aggregate in JS
    const map = new Map<string, { orders: number; revenue: number; qty: number }>();
    for (const r of rows) {
      const name = r.salesperson;
      const cur = map.get(name) ?? { orders: 0, revenue: 0, qty: 0 };
      map.set(name, { orders: cur.orders + 1, revenue: cur.revenue + r.amountTotal, qty: cur.qty + r.lineCount });
    }
    return Array.from(map.entries()).map(([salesperson, v]) => ({
      salesperson,
      orders: v.orders,
      qty: v.qty,
      revenue: v.revenue,
      avgBasket: v.orders > 0 ? v.revenue / v.orders : 0,
      ipt: v.orders > 0 ? v.qty / v.orders : 0,
    })).sort((a, b) => b.revenue - a.revenue);
  }
  const db = getDb();
  try { db.prepare(`ALTER TABLE pos_orders ADD COLUMN salesperson TEXT`).run(); } catch { /* already exists */ }
  return db.prepare(`
    SELECT salesperson,
           COUNT(*) AS orders,
           SUM(lineCount) AS qty,
           SUM(amountTotal) AS revenue,
           CASE WHEN COUNT(*) > 0 THEN SUM(amountTotal)/COUNT(*) ELSE 0 END AS avgBasket,
           CASE WHEN COUNT(*) > 0 THEN SUM(lineCount)/COUNT(*) ELSE 0 END AS ipt
    FROM pos_orders
    WHERE salesperson IS NOT NULL AND amountTotal > 0
      AND createdAt >= ? AND createdAt <= ?
    GROUP BY salesperson
    ORDER BY revenue DESC
  `).all(dateFrom, dateTo + "T23:59:59.999Z") as DBStaffSales[];
}

export async function dbBulkUpsertPosOrderLines(lines: DBPosOrderLine[]): Promise<void> {
  if (!lines.length) return;
  if (IS_SUPABASE) {
    const CHUNK = 500;
    for (let i = 0; i < lines.length; i += CHUNK) {
      await getSupabase()
        .from("pos_order_lines")
        .upsert(lines.slice(i, i + CHUNK), { onConflict: "id" });
    }
    return;
  }
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO pos_order_lines (id,orderId,odooId,productId,productName,sku,qty,priceUnit,discount,priceSubtotal)
    VALUES (?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET qty=excluded.qty, priceUnit=excluded.priceUnit,
      discount=excluded.discount, priceSubtotal=excluded.priceSubtotal
  `);
  const tx = db.transaction((rows: DBPosOrderLine[]) => {
    for (const l of rows) {
      stmt.run(l.id, l.orderId, l.odooId ?? null, l.productId ?? null,
        l.productName, l.sku ?? null, l.qty, l.priceUnit, l.discount, l.priceSubtotal);
    }
  });
  tx(lines);
}

export async function dbGetPosSummary(dateFrom: string, dateTo?: string): Promise<{
  totalRevenue: number; orderCount: number; avgOrderValue: number; qtyTotal: number;
}> {
  if (IS_SUPABASE) {
    let q = getSupabase()
      .from("pos_orders")
      .select("amountTotal,lineCount")
      .in("state", ["done", "paid", "invoiced"])
      .gte("createdAt", dateFrom);
    if (dateTo) q = q.lte("createdAt", dateTo);
    const { data } = await q;
    const rows = (data ?? []) as { amountTotal: number; lineCount: number }[];
    const totalRevenue = rows.reduce((s, r) => s + r.amountTotal, 0);
    const qtyTotal = rows.reduce((s, r) => s + (r.lineCount ?? 0), 0);
    return { totalRevenue, orderCount: rows.length, avgOrderValue: rows.length ? totalRevenue / rows.length : 0, qtyTotal };
  }
  const where = dateTo
    ? "state IN ('done','paid','invoiced') AND createdAt >= ? AND createdAt <= ?"
    : "state IN ('done','paid','invoiced') AND createdAt >= ?";
  const params = dateTo ? [dateFrom, dateTo] : [dateFrom];
  const r = getDb().prepare(
    `SELECT COALESCE(SUM(amountTotal),0) as rev, COUNT(*) as cnt, COALESCE(SUM(lineCount),0) as qty FROM pos_orders WHERE ${where}`
  ).get(...params) as { rev: number; cnt: number; qty: number };
  return { totalRevenue: r.rev, orderCount: r.cnt, avgOrderValue: r.cnt ? r.rev / r.cnt : 0, qtyTotal: r.qty };
}

export async function dbGetTopProducts(dateFrom: string, limit = 10, dateTo?: string): Promise<{
  productName: string; sku: string | null; totalQty: number; totalRevenue: number;
}[]> {
  if (IS_SUPABASE) {
    // Supabase can't do GROUP BY via JS client easily — fetch lines and aggregate
    let oq = getSupabase()
      .from("pos_orders")
      .select("id")
      .in("state", ["done", "paid", "invoiced"])
      .gte("createdAt", dateFrom);
    if (dateTo) oq = oq.lte("createdAt", dateTo);
    const { data: orders } = await oq;
    const orderIds = (orders ?? []).map((o: { id: string }) => o.id);
    if (!orderIds.length) return [];
    const CHUNK = 200;
    const allLines: DBPosOrderLine[] = [];
    for (let i = 0; i < orderIds.length; i += CHUNK) {
      const { data: lines } = await getSupabase()
        .from("pos_order_lines")
        .select("productName,sku,qty,priceSubtotal")
        .in("orderId", orderIds.slice(i, i + CHUNK));
      allLines.push(...((lines ?? []) as DBPosOrderLine[]));
    }
    const map = new Map<string, { productName: string; sku: string | null; totalQty: number; totalRevenue: number }>();
    for (const l of allLines) {
      const k = l.productName;
      const e = map.get(k) ?? { productName: l.productName, sku: l.sku ?? null, totalQty: 0, totalRevenue: 0 };
      e.totalQty += l.qty;
      e.totalRevenue += l.priceSubtotal;
      map.set(k, e);
    }
    return [...map.values()].sort((a, b) => b.totalQty - a.totalQty).slice(0, limit);
  }
  return getDb().prepare(`
    SELECT l.productName, l.sku, SUM(l.qty) as totalQty, SUM(l.priceSubtotal) as totalRevenue
    FROM pos_order_lines l
    JOIN pos_orders o ON o.id = l.orderId
    WHERE o.state IN ('done','paid','invoiced') AND o.createdAt >= ?
    GROUP BY l.productName ORDER BY totalQty DESC LIMIT ?
  `).all(dateFrom, limit) as { productName: string; sku: string | null; totalQty: number; totalRevenue: number }[];
}

// ─── Daily Reports ────────────────────────────────────────────────────────────

export type DBDailyReport = {
  id: string;
  date: string;          // YYYY-MM-DD
  shift: "start" | "end";
  revTotal: number;
  revCash: number;
  revCard: number;
  revTransfer: number;
  revVnpay: number;
  revMomo: number;
  revUrbox: number;
  revNinja: number;
  revOther: number;
  revHB: number;
  revSC: number;
  revACC: number;
  traffic: number;
  bills: number;
  qtyTotal: number;
  conversion: number;
  aov: number;
  ipt: number;
  targetDay: number;
  note: string;
  preparedBy: string;
  createdAt: string;
  updatedAt: string;
};

export async function dbGetDailyReports(limit = 60): Promise<DBDailyReport[]> {
  if (IS_SUPABASE) {
    const { data } = await getSupabase()
      .from("daily_reports")
      .select("*")
      .order("date", { ascending: false })
      .order("shift", { ascending: false })
      .limit(limit);
    return (data ?? []) as DBDailyReport[];
  }
  return getDb().prepare(
    "SELECT * FROM daily_reports ORDER BY date DESC, shift DESC LIMIT ?"
  ).all(limit) as DBDailyReport[];
}

export async function dbGetDailyReportByDate(date: string, shift: string): Promise<DBDailyReport | null> {
  if (IS_SUPABASE) {
    const { data } = await getSupabase()
      .from("daily_reports")
      .select("*")
      .eq("date", date)
      .eq("shift", shift)
      .maybeSingle();
    return (data as DBDailyReport | null);
  }
  return getDb().prepare(
    "SELECT * FROM daily_reports WHERE date=? AND shift=?"
  ).get(date, shift) as DBDailyReport | null;
}

export async function dbUpsertDailyReport(r: DBDailyReport): Promise<void> {
  if (IS_SUPABASE) {
    await getSupabase()
      .from("daily_reports")
      .upsert(r, { onConflict: "id" });
    return;
  }
  const db = getDb();
  db.prepare(`
    INSERT INTO daily_reports
      (id,date,shift,revTotal,revCash,revCard,revTransfer,revVnpay,revMomo,revUrbox,revNinja,revOther,
       revHB,revSC,revACC,traffic,bills,qtyTotal,conversion,aov,ipt,targetDay,note,preparedBy,createdAt,updatedAt)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET
      revTotal=excluded.revTotal, revCash=excluded.revCash, revCard=excluded.revCard,
      revTransfer=excluded.revTransfer, revVnpay=excluded.revVnpay, revMomo=excluded.revMomo,
      revUrbox=excluded.revUrbox, revNinja=excluded.revNinja, revOther=excluded.revOther,
      revHB=excluded.revHB, revSC=excluded.revSC, revACC=excluded.revACC,
      traffic=excluded.traffic, bills=excluded.bills, qtyTotal=excluded.qtyTotal,
      conversion=excluded.conversion, aov=excluded.aov, ipt=excluded.ipt,
      targetDay=excluded.targetDay, note=excluded.note, preparedBy=excluded.preparedBy,
      updatedAt=excluded.updatedAt
  `).run(
    r.id, r.date, r.shift,
    r.revTotal, r.revCash, r.revCard, r.revTransfer, r.revVnpay, r.revMomo, r.revUrbox, r.revNinja, r.revOther,
    r.revHB, r.revSC, r.revACC,
    r.traffic, r.bills, r.qtyTotal,
    r.conversion, r.aov, r.ipt,
    r.targetDay, r.note, r.preparedBy,
    r.createdAt, r.updatedAt
  );
}

// ─── Work Schedules ───────────────────────────────────────────────────────────

export type DBShiftTemplate = {
  id: string; name: string; startTime: string; endTime: string;
  color: string; maxStaff: number; createdAt: string;
  staffType?: string | null;
};

export type DBShiftSlot = {
  id: string; templateId: string | null; date: string;
  name: string; startTime: string; endTime: string;
  color: string; maxStaff: number; note: string | null; createdAt: string; updatedAt: string;
  staffType?: string | null;
};

export type DBShiftRegistration = {
  id: string; slotId: string; userId: string; userName: string;
  status: string; note: string | null; createdAt: string; updatedAt: string;
};

async function ensureShiftTables() {
  if (IS_SUPABASE) return;
  const db = getDb();
  db.prepare(`CREATE TABLE IF NOT EXISTS shift_templates (id TEXT PRIMARY KEY, name TEXT NOT NULL, "startTime" TEXT NOT NULL, "endTime" TEXT NOT NULL, color TEXT NOT NULL DEFAULT '#0ea5e9', "maxStaff" INTEGER NOT NULL DEFAULT 3, "createdAt" TEXT NOT NULL)`).run();
  db.prepare(`CREATE TABLE IF NOT EXISTS shift_slots (id TEXT PRIMARY KEY, "templateId" TEXT, date TEXT NOT NULL, name TEXT NOT NULL, "startTime" TEXT NOT NULL, "endTime" TEXT NOT NULL, color TEXT NOT NULL DEFAULT '#0ea5e9', "maxStaff" INTEGER NOT NULL DEFAULT 3, note TEXT, "createdAt" TEXT NOT NULL, "updatedAt" TEXT NOT NULL DEFAULT '')`).run();
  // Migrations: add columns if not exists (for existing DBs)
  try { db.prepare(`ALTER TABLE shift_slots ADD COLUMN "updatedAt" TEXT NOT NULL DEFAULT ''`).run(); } catch { /* already exists */ }
  try { db.prepare(`ALTER TABLE shift_slots ADD COLUMN "staffType" TEXT NOT NULL DEFAULT 'ALL'`).run(); } catch { /* already exists */ }
  try { db.prepare(`ALTER TABLE shift_templates ADD COLUMN "staffType" TEXT NOT NULL DEFAULT 'ALL'`).run(); } catch { /* already exists */ }
  db.prepare(`CREATE INDEX IF NOT EXISTS idx_shift_slots_date ON shift_slots(date)`).run();
  db.prepare(`CREATE TABLE IF NOT EXISTS shift_registrations (id TEXT PRIMARY KEY, "slotId" TEXT NOT NULL REFERENCES shift_slots(id) ON DELETE CASCADE, "userId" TEXT NOT NULL, "userName" TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', note TEXT, "createdAt" TEXT NOT NULL, "updatedAt" TEXT NOT NULL, UNIQUE("slotId","userId"))`).run();
}

export async function dbGetShiftTemplates(): Promise<DBShiftTemplate[]> {
  if (IS_SUPABASE) {
    const { data, error } = await getSupabase()
      .from("shift_templates").select("*").order("startTime");
    if (error) throw new Error("dbGetShiftTemplates: " + error.message);
    return (data ?? []).map(sbRowToTemplate);
  }
  await ensureShiftTables();
  return getDb().prepare(`SELECT * FROM shift_templates ORDER BY "startTime"`).all() as DBShiftTemplate[];
}

export async function dbUpsertShiftTemplate(t: DBShiftTemplate): Promise<void> {
  if (IS_SUPABASE) {
    const row: Record<string, unknown> = {
      id: t.id, name: t.name,
      "startTime": t.startTime, "endTime": t.endTime,
      color: t.color, "maxStaff": t.maxStaff,
      "createdAt": t.createdAt, "staffType": t.staffType ?? "ALL",
    };
    let { error } = await getSupabase().from("shift_templates").upsert(row, { onConflict: "id" });
    if (error?.message?.includes("staffType") || error?.message?.includes("column")) {
      // staffType column not yet added — retry without it
      delete row["staffType"];
      ({ error } = await getSupabase().from("shift_templates").upsert(row, { onConflict: "id" }));
    }
    if (error) throw new Error("dbUpsertShiftTemplate: " + error.message);
    return;
  }
  await ensureShiftTables();
  getDb().prepare(`INSERT INTO shift_templates(id,name,"startTime","endTime",color,"maxStaff","createdAt","staffType") VALUES(@id,@name,@startTime,@endTime,@color,@maxStaff,@createdAt,@staffType) ON CONFLICT(id) DO UPDATE SET name=excluded.name,"startTime"=excluded."startTime","endTime"=excluded."endTime",color=excluded.color,"maxStaff"=excluded."maxStaff","staffType"=excluded."staffType"`).run({ ...t, staffType: t.staffType ?? "ALL" });
}

export async function dbDeleteShiftTemplate(id: string): Promise<void> {
  if (IS_SUPABASE) {
    const { error } = await getSupabase().from("shift_templates").delete().eq("id", id);
    if (error) throw new Error("dbDeleteShiftTemplate: " + error.message);
    return;
  }
  await ensureShiftTables();
  getDb().prepare("DELETE FROM shift_templates WHERE id=?").run(id);
}

export async function dbGetShiftSlots(dateFrom: string, dateTo: string): Promise<DBShiftSlot[]> {
  if (IS_SUPABASE) {
    const { data, error } = await getSupabase()
      .from("shift_slots").select("*")
      .gte("date", dateFrom).lte("date", dateTo)
      .order("date").order("startTime");
    if (error) throw new Error("dbGetShiftSlots: " + error.message);
    return (data ?? []).map(sbRowToSlot);
  }
  await ensureShiftTables();
  return getDb().prepare(`SELECT * FROM shift_slots WHERE date>=? AND date<=? ORDER BY date,"startTime"`).all(dateFrom, dateTo) as DBShiftSlot[];
}

export async function dbUpsertShiftSlot(s: DBShiftSlot): Promise<void> {
  if (IS_SUPABASE) {
    const row: Record<string, unknown> = {
      id: s.id, "templateId": s.templateId, date: s.date, name: s.name,
      "startTime": s.startTime, "endTime": s.endTime,
      color: s.color, "maxStaff": s.maxStaff, note: s.note,
      "createdAt": s.createdAt, "updatedAt": s.updatedAt,
      "staffType": s.staffType ?? "ALL",
    };
    let { error } = await getSupabase().from("shift_slots").upsert(row, { onConflict: "id" });
    if (error?.message?.includes("staffType") || error?.message?.includes("column")) {
      delete row["staffType"];
      ({ error } = await getSupabase().from("shift_slots").upsert(row, { onConflict: "id" }));
    }
    if (error) throw new Error("dbUpsertShiftSlot: " + error.message);
    return;
  }
  await ensureShiftTables();
  getDb().prepare(`INSERT INTO shift_slots(id,"templateId",date,name,"startTime","endTime",color,"maxStaff",note,"createdAt","updatedAt","staffType") VALUES(@id,@templateId,@date,@name,@startTime,@endTime,@color,@maxStaff,@note,@createdAt,@updatedAt,@staffType) ON CONFLICT(id) DO UPDATE SET "templateId"=excluded."templateId",date=excluded.date,name=excluded.name,"startTime"=excluded."startTime","endTime"=excluded."endTime",color=excluded.color,"maxStaff"=excluded."maxStaff",note=excluded.note,"updatedAt"=excluded."updatedAt","staffType"=excluded."staffType"`).run({ ...s, staffType: s.staffType ?? "ALL" });
}

// Map Supabase row (camelCase keys returned by PostgREST) to typed objects
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sbRowToTemplate(r: any): DBShiftTemplate {
  return {
    id: r.id, name: r.name,
    startTime: r.startTime ?? r["startTime"],
    endTime: r.endTime ?? r["endTime"],
    color: r.color,
    maxStaff: r.maxStaff ?? r["maxStaff"],
    createdAt: r.createdAt ?? r["createdAt"],
    staffType: r.staffType ?? r["staffType"] ?? "ALL",
  };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sbRowToSlot(r: any): DBShiftSlot {
  return {
    id: r.id,
    templateId: r.templateId ?? r["templateId"] ?? null,
    date: r.date, name: r.name,
    startTime: r.startTime ?? r["startTime"],
    endTime: r.endTime ?? r["endTime"],
    color: r.color,
    maxStaff: r.maxStaff ?? r["maxStaff"],
    note: r.note ?? null,
    createdAt: r.createdAt ?? r["createdAt"],
    updatedAt: r.updatedAt ?? r["updatedAt"],
    staffType: r.staffType ?? r["staffType"] ?? "ALL",
  };
}

export async function dbDeleteShiftSlot(id: string): Promise<void> {
  if (IS_SUPABASE) { await getSupabase().from("shift_slots").delete().eq("id", id); return; }
  await ensureShiftTables();
  getDb().prepare("DELETE FROM shift_slots WHERE id=?").run(id);
}

export async function dbGetShiftRegistrations(slotIds: string[]): Promise<DBShiftRegistration[]> {
  if (!slotIds.length) return [];
  if (IS_SUPABASE) {
    const { data, error } = await getSupabase()
      .from("shift_registrations")
      .select("id, slotId:\"slotId\", userId:\"userId\", userName:\"userName\", status, note, createdAt:\"createdAt\", updatedAt:\"updatedAt\"")
      .in("slotId", slotIds);
    if (error) throw new Error("dbGetShiftRegistrations: " + error.message);
    // Normalize quoted column names returned by PostgREST
    return ((data ?? []) as Record<string, unknown>[]).map(row => ({
      id: row.id as string,
      slotId: (row.slotId ?? row["slotId"]) as string,
      userId: (row.userId ?? row["userId"]) as string,
      userName: (row.userName ?? row["userName"]) as string,
      status: row.status as string,
      note: row.note as string | null,
      createdAt: (row.createdAt ?? row["createdAt"]) as string,
      updatedAt: (row.updatedAt ?? row["updatedAt"]) as string,
    }));
  }
  await ensureShiftTables();
  const ph = slotIds.map(() => "?").join(",");
  return getDb().prepare(`SELECT * FROM shift_registrations WHERE "slotId" IN (${ph})`).all(...slotIds) as DBShiftRegistration[];
}

export async function dbUpsertShiftRegistrationBySlotUser(r: DBShiftRegistration): Promise<void> {
  if (IS_SUPABASE) {
    const sb = getSupabase();
    const row = {
      id: r.id,
      "slotId": r.slotId,
      "userId": r.userId,
      "userName": r.userName,
      status: r.status,
      note: r.note,
      "createdAt": r.createdAt,
      "updatedAt": r.updatedAt,
    };
    const { data: existing } = await sb
      .from("shift_registrations")
      .select("id")
      .eq("slotId", r.slotId)
      .eq("userId", r.userId)
      .maybeSingle();
    if (existing) {
      const { error } = await sb.from("shift_registrations")
        .update({ status: r.status, note: r.note, "updatedAt": r.updatedAt })
        .eq("slotId", r.slotId).eq("userId", r.userId);
      if (error) throw new Error("dbUpsertShiftRegistration update: " + error.message);
    } else {
      const { error } = await sb.from("shift_registrations").insert(row);
      if (error) throw new Error("dbUpsertShiftRegistration insert: " + error.message);
    }
    return;
  }
  await ensureShiftTables();
  getDb().prepare(`INSERT INTO shift_registrations(id,"slotId","userId","userName",status,note,"createdAt","updatedAt") VALUES(@id,@slotId,@userId,@userName,@status,@note,@createdAt,@updatedAt) ON CONFLICT("slotId","userId") DO UPDATE SET status=excluded.status,note=excluded.note,"updatedAt"=excluded."updatedAt"`).run(r);
}

export async function dbDeleteShiftRegistration(id: string): Promise<void> {
  if (IS_SUPABASE) { await getSupabase().from("shift_registrations").delete().eq("id", id); return; }
  await ensureShiftTables();
  getDb().prepare("DELETE FROM shift_registrations WHERE id=?").run(id);
}

// ─── Shift Requests ───────────────────────────────────────────────────────────

export type DBShiftRequest = {
  id: string;
  userId: string;
  userName: string;
  type: string;
  status: string;
  content: string;
  adminNote: string | null;
  targetDate: string | null;
  createdAt: string;
  updatedAt: string;
};

function ensureShiftRequestsTable() {
  getDb().prepare(`CREATE TABLE IF NOT EXISTS shift_requests (
    id TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'other',
    status TEXT NOT NULL DEFAULT 'pending',
    content TEXT NOT NULL,
    "adminNote" TEXT,
    "targetDate" TEXT,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL
  )`).run();
}

export async function dbGetShiftRequests(userId?: string): Promise<DBShiftRequest[]> {
  if (IS_SUPABASE) {
    const sb = getSupabase();
    let q = sb.from("shift_requests").select("*").order("createdAt", { ascending: false }).limit(100);
    if (userId) q = q.eq("userId", userId);
    const { data } = await q;
    return (data ?? []) as DBShiftRequest[];
  }
  ensureShiftRequestsTable();
  if (userId) {
    return getDb().prepare(`SELECT * FROM shift_requests WHERE "userId"=? ORDER BY "createdAt" DESC LIMIT 100`).all(userId) as DBShiftRequest[];
  }
  return getDb().prepare(`SELECT * FROM shift_requests ORDER BY "createdAt" DESC LIMIT 100`).all() as DBShiftRequest[];
}

export async function dbInsertShiftRequest(r: DBShiftRequest): Promise<void> {
  if (IS_SUPABASE) {
    await getSupabase().from("shift_requests").insert({
      id: r.id, userId: r.userId, userName: r.userName,
      type: r.type, status: r.status, content: r.content,
      adminNote: r.adminNote, targetDate: r.targetDate,
      createdAt: r.createdAt, updatedAt: r.updatedAt,
    });
    return;
  }
  ensureShiftRequestsTable();
  getDb().prepare(`INSERT INTO shift_requests(id,"userId","userName",type,status,content,"adminNote","targetDate","createdAt","updatedAt") VALUES(@id,@userId,@userName,@type,@status,@content,@adminNote,@targetDate,@createdAt,@updatedAt)`).run(r);
}

export async function dbUpdateShiftRequest(id: string, fields: { status: string; adminNote?: string; updatedAt: string }): Promise<void> {
  if (IS_SUPABASE) {
    await getSupabase().from("shift_requests").update({
      status: fields.status,
      adminNote: fields.adminNote ?? null,
      updatedAt: fields.updatedAt,
    }).eq("id", id);
    return;
  }
  ensureShiftRequestsTable();
  getDb().prepare(`UPDATE shift_requests SET status=?, "adminNote"=?, "updatedAt"=? WHERE id=?`).run(fields.status, fields.adminNote ?? null, fields.updatedAt, id);
}

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
  mediaUrl?: string | null;
  mediaType?: string | null;
  replyToId?: string | null;
  reactions?: string | null;
};

export type DBRoom = {
  id: string;
  name: string;
  type: string;
  createdBy: string;
  createdAt: string;
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
      "mediaUrl"  TEXT,
      "mediaType" TEXT,
      "replyToId" TEXT,
      reactions   TEXT DEFAULT '{}'
    );
    CREATE INDEX IF NOT EXISTS idx_chat_msg_room ON chat_messages("roomId", "createdAt" DESC);

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
    const { data } = await getSupabase().from("products").select("*").order("createdAt");
    return (data ?? []) as DBProduct[];
  }
  return getDb().prepare("SELECT * FROM products ORDER BY createdAt").all() as DBProduct[];
}

export async function dbGetProductBySku(sku: string): Promise<DBProduct | null> {
  if (IS_SUPABASE) {
    const { data } = await getSupabase()
      .from("products").select("*").ilike("sku", sku.trim()).single();
    return data as DBProduct | null;
  }
  return getDb().prepare("SELECT * FROM products WHERE sku = ? COLLATE NOCASE").get(sku.trim()) as DBProduct | null;
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
  // SQLite: wrap in a transaction for speed
  const db = getDb();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO products
      (id,name,sku,category,productType,quantity,price,markdownPrice,color,size,imagePath,notes,createdAt,updatedAt)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
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
  if (IS_SUPABASE) {
    await getSupabase().from("products").delete().in("id", ids);
    return;
  }
  const stmt = getDb().prepare("DELETE FROM products WHERE id = ?");
  for (const id of ids) stmt.run(id);
}

// ─── Chat Rooms ───────────────────────────────────────────────────────────────

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
      const tiers: (string | null)[][] = Array.from({ length: 4 }, () => Array(25).fill(null));
      for (const s of (slots ?? []) as { id: string; tier: number; position: number }[]) {
        if (s.tier < 4 && s.position < 25) tiers[s.tier][s.position] = plMap[s.id] ?? null;
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
    const tiers: (string | null)[][] = Array.from({ length: 4 }, () => Array(25).fill(null));
    const rows = db.prepare("SELECT sl.tier, sl.position, p.productId FROM slots sl LEFT JOIN placements p ON p.slotId=sl.id WHERE sl.shelfId=? ORDER BY sl.tier, sl.position").all(shelf.id) as { tier: number; position: number; productId: string | null }[];
    for (const r of rows) { if (r.tier < 4 && r.position < 25) tiers[r.tier][r.position] = r.productId ?? null; }
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

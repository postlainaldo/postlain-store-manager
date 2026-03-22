/**
 * Postlain DB Seed Script
 * Run: node scripts/seed.js
 *
 * Creates:
 *  - 22 warehouse shelves (14 giày + 8 túi) matching INITIAL_WAREHOUSE
 *  - 50+ ALDO-style products
 *  - Random placements across shelves
 */

const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const DB_PATH = path.join(__dirname, "..", "data", "postlain.db");
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ─── Schema ───────────────────────────────────────────────────────────────────
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
    type      TEXT NOT NULL,
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

  CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
  CREATE INDEX IF NOT EXISTS idx_products_sku      ON products(sku);
  CREATE INDEX IF NOT EXISTS idx_slots_shelf       ON slots(shelfId);
  CREATE INDEX IF NOT EXISTS idx_placements_prod   ON placements(productId);
`);

const now = new Date().toISOString();
const uid = (prefix = "id") => `${prefix}_${crypto.randomBytes(6).toString("hex")}`;

// ─── 1. Shelves ────────────────────────────────────────────────────────────────
console.log("📦 Seeding shelves...");

const SHOE_SHELVES = Array.from({ length: 14 }, (_, i) => ({
  id: `giay_${String(i + 1).padStart(2, "0")}`,
  name: `Giày ${String(i + 1).padStart(2, "0")}`,
  type: "WAREHOUSE",
  subType: "shoes",
  sortOrder: i,
}));

const BAG_SHELVES = Array.from({ length: 8 }, (_, i) => ({
  id: `tui_${String(i + 1).padStart(2, "0")}`,
  name: `Túi ${String(i + 1).padStart(2, "0")}`,
  type: "WAREHOUSE",
  subType: "bags",
  sortOrder: 14 + i,
}));

const ALL_SHELVES = [...SHOE_SHELVES, ...BAG_SHELVES];

const insertShelf = db.prepare(`
  INSERT OR REPLACE INTO shelves(id,name,type,subType,sortOrder)
  VALUES(@id,@name,@type,@subType,@sortOrder)
`);
const insertShelfTx = db.transaction(() => ALL_SHELVES.forEach(s => insertShelf.run(s)));
insertShelfTx();
console.log(`  ✓ ${ALL_SHELVES.length} shelves created`);

// ─── 2. Slots (4 tiers × 25 positions per shelf) ─────────────────────────────
console.log("🗂️  Seeding slots...");

const insertSlot = db.prepare(`
  INSERT OR IGNORE INTO slots(id,shelfId,tier,position,label)
  VALUES(@id,@shelfId,@tier,@position,@label)
`);

const insertSlotsTx = db.transaction(() => {
  for (const shelf of ALL_SHELVES) {
    for (let tier = 0; tier < 4; tier++) {
      for (let pos = 0; pos < 25; pos++) {
        const id = `slot_${shelf.id}_${tier}_${pos}`;
        insertSlot.run({ id, shelfId: shelf.id, tier, position: pos, label: "" });
      }
    }
  }
});
insertSlotsTx();
console.log(`  ✓ ${ALL_SHELVES.length * 4 * 25} slots created`);

// ─── 3. Products — 60 ALDO-style items ────────────────────────────────────────
console.log("👟 Seeding products...");

const SHOE_CATEGORIES = ["Giày nữ", "Giày nam", "Bốt nữ", "Bốt nam", "Sandal nữ", "Sandal nam"];
const BAG_CATEGORIES  = ["Túi nữ", "Túi nam", "Phụ kiện"];

const COLORS = [
  { name: "Black",       hex: "#1a1a1a" },
  { name: "Nude",        hex: "#C4956A" },
  { name: "White",       hex: "#F5F0EB" },
  { name: "Cognac",      hex: "#8B4513" },
  { name: "Gold",        hex: "#C9A55A" },
  { name: "Silver",      hex: "#A8A9AD" },
  { name: "Blush",       hex: "#F2C4B0" },
  { name: "Navy",        hex: "#1B3A5C" },
  { name: "Camel",       hex: "#C19A6B" },
  { name: "Burgundy",    hex: "#6D1A2A" },
  { name: "Olive",       hex: "#6B7A3A" },
  { name: "Stone",       hex: "#C2B9A7" },
];

const SHOE_SIZES = ["35", "36", "37", "38", "39", "40", "41", "42", "43", "44"];

// ALDO product names (realistic)
const PRODUCTS_DATA = [
  // Giày nữ Dress
  { name: "STESSY",        cat: "Giày nữ",  type: "Dress",     basePrice: 2_490_000 },
  { name: "TREASA",        cat: "Giày nữ",  type: "Dress",     basePrice: 2_790_000 },
  { name: "CLARAA",        cat: "Giày nữ",  type: "Dress",     basePrice: 2_290_000 },
  { name: "PIXLEY",        cat: "Giày nữ",  type: "Dress",     basePrice: 2_690_000 },
  { name: "NYDERIA",       cat: "Giày nữ",  type: "Dress",     basePrice: 3_090_000 },
  { name: "OVALINNA",      cat: "Giày nữ",  type: "Dress",     basePrice: 2_890_000 },

  // Giày nữ Casual / Sneaker
  { name: "COSNELLE",      cat: "Giày nữ",  type: "Sneaker",   basePrice: 1_990_000 },
  { name: "GALVANY",       cat: "Giày nữ",  type: "Sneaker",   basePrice: 2_190_000 },
  { name: "ELENAA",        cat: "Giày nữ",  type: "Casual",    basePrice: 1_790_000 },
  { name: "PRINI",         cat: "Giày nữ",  type: "Casual",    basePrice: 1_690_000 },

  // Sandal nữ
  { name: "JERAYCLYA",     cat: "Sandal nữ", type: "Flat",     basePrice: 1_490_000 },
  { name: "ADWOA",         cat: "Sandal nữ", type: "Flat",     basePrice: 1_390_000 },
  { name: "ONARDRA",       cat: "Sandal nữ", type: "Heeled",   basePrice: 1_890_000 },
  { name: "LILLIBETH",     cat: "Sandal nữ", type: "Heeled",   basePrice: 1_990_000 },
  { name: "KESSIA",        cat: "Sandal nữ", type: "Platform", basePrice: 2_090_000 },

  // Bốt nữ
  { name: "CASTA",         cat: "Bốt nữ",  type: "Ankle",     basePrice: 3_290_000 },
  { name: "ABITHA",        cat: "Bốt nữ",  type: "Ankle",     basePrice: 3_490_000 },
  { name: "SEVIDE",        cat: "Bốt nữ",  type: "Knee-High", basePrice: 4_290_000 },
  { name: "NANDRA",        cat: "Bốt nữ",  type: "Chelsea",   basePrice: 2_990_000 },

  // Giày nam Dress
  { name: "BRIENEN",       cat: "Giày nam", type: "Oxford",    basePrice: 2_990_000 },
  { name: "DUHALDE",       cat: "Giày nam", type: "Oxford",    basePrice: 2_790_000 },
  { name: "FINESPEC",      cat: "Giày nam", type: "Derby",     basePrice: 2_490_000 },
  { name: "GLORIOSO",      cat: "Giày nam", type: "Derby",     basePrice: 2_690_000 },
  { name: "HADLEIGH",      cat: "Giày nam", type: "Loafer",    basePrice: 2_890_000 },
  { name: "IDYLIAN",       cat: "Giày nam", type: "Loafer",    basePrice: 2_590_000 },

  // Giày nam Casual
  { name: "JEROBOAM",      cat: "Giày nam", type: "Sneaker",   basePrice: 1_990_000 },
  { name: "KADDOX",        cat: "Giày nam", type: "Sneaker",   basePrice: 2_190_000 },
  { name: "LYNDELL",       cat: "Giày nam", type: "Casual",    basePrice: 1_790_000 },

  // Sandal nam
  { name: "MORBIDO",       cat: "Sandal nam", type: "Slide",   basePrice: 1_290_000 },
  { name: "NEALEY",        cat: "Sandal nam", type: "Slide",   basePrice: 1_190_000 },
  { name: "OBLANCO",       cat: "Sandal nam", type: "Sport",   basePrice: 1_490_000 },

  // Bốt nam
  { name: "PALTANO",       cat: "Bốt nam",  type: "Chelsea",   basePrice: 3_490_000 },
  { name: "QUAVELA",       cat: "Bốt nam",  type: "Chukka",    basePrice: 2_990_000 },
  { name: "RAWLING",       cat: "Bốt nam",  type: "Worker",    basePrice: 3_190_000 },

  // Túi nữ
  { name: "SAFFIANO TOTE", cat: "Túi nữ",   type: "Tote",      basePrice: 4_490_000 },
  { name: "LAVIA",         cat: "Túi nữ",   type: "Crossbody", basePrice: 3_290_000 },
  { name: "MINERVA",       cat: "Túi nữ",   type: "Satchel",   basePrice: 3_890_000 },
  { name: "NOELLA",        cat: "Túi nữ",   type: "Clutch",    basePrice: 2_490_000 },
  { name: "OCEANA",        cat: "Túi nữ",   type: "Shoulder",  basePrice: 3_590_000 },
  { name: "PEARCE",        cat: "Túi nữ",   type: "Mini Bag",  basePrice: 2_290_000 },
  { name: "QUEONA",        cat: "Túi nữ",   type: "Hobo",      basePrice: 3_990_000 },
  { name: "ROSELLA",       cat: "Túi nữ",   type: "Tote",      basePrice: 4_190_000 },

  // Túi nam
  { name: "STADIUM",       cat: "Túi nam",  type: "Messenger", basePrice: 2_890_000 },
  { name: "TARQUIN",       cat: "Túi nam",  type: "Briefcase", basePrice: 3_490_000 },
  { name: "ULBERTO",       cat: "Túi nam",  type: "Backpack",  basePrice: 2_990_000 },

  // Phụ kiện
  { name: "VELARO BELT",   cat: "Phụ kiện", type: "Belt",      basePrice: 990_000  },
  { name: "WANDERER BELT", cat: "Phụ kiện", type: "Belt",      basePrice: 890_000  },
  { name: "XERIS WALLET",  cat: "Phụ kiện", type: "Wallet",    basePrice: 1_290_000 },
  { name: "YORIAN WALLET", cat: "Phụ kiện", type: "Wallet",    basePrice: 1_190_000 },
  { name: "ZENITH SCARF",  cat: "Phụ kiện", type: "Scarf",     basePrice: 790_000  },
  { name: "ARIA SUNGLASSES",cat:"Phụ kiện", type: "Eyewear",   basePrice: 1_590_000 },
  { name: "BLISSE SUNGLASSES",cat:"Phụ kiện",type:"Eyewear",   basePrice: 1_490_000 },
  { name: "COVET KEYCHAIN",cat: "Phụ kiện", type: "Keychain",  basePrice: 390_000  },
  { name: "DEMI HAIRPIN",  cat: "Phụ kiện", type: "Hair Acc",  basePrice: 290_000  },
  { name: "ELARA EARRINGS",cat: "Phụ kiện", type: "Jewelry",   basePrice: 690_000  },
];

function randItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function skuFor(name, cat) {
  const catCode = cat.replace(/[^A-Za-z]/g,"").slice(0,3).toUpperCase();
  const nameCode = name.replace(/[^A-Za-z]/g,"").slice(0,5).toUpperCase();
  return `${catCode}${nameCode}${String(Math.floor(Math.random()*900)+100)}`;
}

const insertProduct = db.prepare(`
  INSERT OR IGNORE INTO products(id,name,sku,category,productType,quantity,price,markdownPrice,color,size,imagePath,notes,createdAt,updatedAt)
  VALUES(@id,@name,@sku,@category,@productType,@quantity,@price,@markdownPrice,@color,@size,@imagePath,@notes,@createdAt,@updatedAt)
`);

const allProducts = [];
const insertProductsTx = db.transaction(() => {
  for (const raw of PRODUCTS_DATA) {
    const color = randItem(COLORS);
    const isShoe = !["Túi nữ","Túi nam","Phụ kiện"].includes(raw.cat);
    const size = isShoe ? randItem(SHOE_SIZES) : null;
    const markdown = Math.random() < 0.3 ? Math.round(raw.basePrice * 0.7 / 10000) * 10000 : null;
    const qty = Math.floor(Math.random() * 20) + 3;
    const p = {
      id: uid("prod"),
      name: raw.name,
      sku: skuFor(raw.name, raw.cat),
      category: raw.cat,
      productType: raw.type,
      quantity: qty,
      price: raw.basePrice,
      markdownPrice: markdown,
      color: color.hex,
      size,
      imagePath: null,
      notes: null,
      createdAt: now,
      updatedAt: now,
    };
    insertProduct.run(p);
    allProducts.push(p);
  }
});
insertProductsTx();
console.log(`  ✓ ${allProducts.length} products inserted`);

// ─── 4. Placements — random assign ~40% products to warehouse slots ───────────
console.log("📍 Seeding placements...");

// Get all slot ids grouped by shelf
const shoeSlotIds = db.prepare(`
  SELECT sl.id FROM slots sl
  JOIN shelves sh ON sh.id = sl.shelfId
  WHERE sh.type = 'WAREHOUSE' AND sh.subType = 'shoes'
  ORDER BY RANDOM()
`).all().map(r => r.id);

const bagSlotIds = db.prepare(`
  SELECT sl.id FROM slots sl
  JOIN shelves sh ON sh.id = sl.shelfId
  WHERE sh.type = 'WAREHOUSE' AND sh.subType = 'bags'
  ORDER BY RANDOM()
`).all().map(r => r.id);

const shoeProducts = allProducts.filter(p => !["Túi nữ","Túi nam","Phụ kiện"].includes(p.category));
const bagProducts  = allProducts.filter(p => ["Túi nữ","Túi nam"].includes(p.category));
const accProducts  = allProducts.filter(p => p.category === "Phụ kiện");

const insertPlacement = db.prepare(`
  INSERT OR IGNORE INTO placements(id,productId,slotId,placedAt,updatedAt)
  VALUES(?,?,?,?,?)
`);

let placementCount = 0;
const placeTx = db.transaction(() => {
  // Place each shoe product in 1-3 slots (qty > 1 = same product in multiple slots)
  let slotIdx = 0;
  for (const p of shoeProducts) {
    const copies = Math.min(Math.ceil(p.quantity / 8), 3);
    for (let c = 0; c < copies && slotIdx < shoeSlotIds.length; c++) {
      insertPlacement.run(uid("pl"), p.id, shoeSlotIds[slotIdx], now, now);
      slotIdx++;
      placementCount++;
    }
  }
  // bags
  let bagIdx = 0;
  for (const p of bagProducts) {
    if (bagIdx >= bagSlotIds.length) break;
    insertPlacement.run(uid("pl"), p.id, bagSlotIds[bagIdx], now, now);
    bagIdx++;
    placementCount++;
  }
  // accessories go in bag area too
  for (const p of accProducts.slice(0, 5)) {
    if (bagIdx >= bagSlotIds.length) break;
    insertPlacement.run(uid("pl"), p.id, bagSlotIds[bagIdx], now, now);
    bagIdx++;
    placementCount++;
  }
});
placeTx();
console.log(`  ✓ ${placementCount} placements created`);

// ─── 5. Also write products to data/products.json for existing API ────────────
console.log("💾 Syncing products.json...");
const jsonPath = path.join(__dirname, "..", "data", "products.json");
const dbProducts = db.prepare("SELECT * FROM products").all();
fs.writeFileSync(jsonPath, JSON.stringify(dbProducts, null, 2));
console.log(`  ✓ ${dbProducts.length} products written to products.json`);

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log("\n✅ SEED COMPLETE");
console.log(`   Database : ${DB_PATH}`);
console.log(`   Shelves  : ${ALL_SHELVES.length} (14 giày + 8 túi)`);
console.log(`   Slots    : ${ALL_SHELVES.length * 100} (4 tiers × 25 positions)`);
console.log(`   Products : ${allProducts.length}`);
console.log(`   Placed   : ${placementCount} positions filled`);

db.close();

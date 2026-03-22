import { NextResponse } from "next/server";
import getDb from "@/lib/database";

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function randItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const COLORS = [
  "#1a1a1a", "#C4956A", "#F5F0EB", "#8B4513", "#C9A55A",
  "#A8A9AD", "#F2C4B0", "#1B3A5C", "#C19A6B", "#6D1A2A", "#6B7A3A", "#C2B9A7",
];

const SHOE_SIZES = ["35", "36", "37", "38", "39", "40", "41", "42", "43", "44"];

const PRODUCTS_DATA = [
  { name: "STESSY",         cat: "Giày nữ",   type: "Dress",     price: 2_490_000 },
  { name: "TREASA",         cat: "Giày nữ",   type: "Dress",     price: 2_790_000 },
  { name: "CLARAA",         cat: "Giày nữ",   type: "Dress",     price: 2_290_000 },
  { name: "PIXLEY",         cat: "Giày nữ",   type: "Dress",     price: 2_690_000 },
  { name: "NYDERIA",        cat: "Giày nữ",   type: "Dress",     price: 3_090_000 },
  { name: "OVALINNA",       cat: "Giày nữ",   type: "Dress",     price: 2_890_000 },
  { name: "COSNELLE",       cat: "Giày nữ",   type: "Sneaker",   price: 1_990_000 },
  { name: "GALVANY",        cat: "Giày nữ",   type: "Sneaker",   price: 2_190_000 },
  { name: "ELENAA",         cat: "Giày nữ",   type: "Casual",    price: 1_790_000 },
  { name: "PRINI",          cat: "Giày nữ",   type: "Casual",    price: 1_690_000 },
  { name: "JERAYCLYA",      cat: "Sandal nữ", type: "Flat",      price: 1_490_000 },
  { name: "ADWOA",          cat: "Sandal nữ", type: "Flat",      price: 1_390_000 },
  { name: "ONARDRA",        cat: "Sandal nữ", type: "Heeled",    price: 1_890_000 },
  { name: "LILLIBETH",      cat: "Sandal nữ", type: "Heeled",    price: 1_990_000 },
  { name: "KESSIA",         cat: "Sandal nữ", type: "Platform",  price: 2_090_000 },
  { name: "CASTA",          cat: "Bốt nữ",   type: "Ankle",     price: 3_290_000 },
  { name: "ABITHA",         cat: "Bốt nữ",   type: "Ankle",     price: 3_490_000 },
  { name: "SEVIDE",         cat: "Bốt nữ",   type: "Knee-High", price: 4_290_000 },
  { name: "NANDRA",         cat: "Bốt nữ",   type: "Chelsea",   price: 2_990_000 },
  { name: "BRIENEN",        cat: "Giày nam",  type: "Oxford",    price: 2_990_000 },
  { name: "DUHALDE",        cat: "Giày nam",  type: "Oxford",    price: 2_790_000 },
  { name: "FINESPEC",       cat: "Giày nam",  type: "Derby",     price: 2_490_000 },
  { name: "GLORIOSO",       cat: "Giày nam",  type: "Derby",     price: 2_690_000 },
  { name: "HADLEIGH",       cat: "Giày nam",  type: "Loafer",    price: 2_890_000 },
  { name: "IDYLIAN",        cat: "Giày nam",  type: "Loafer",    price: 2_590_000 },
  { name: "JEROBOAM",       cat: "Giày nam",  type: "Sneaker",   price: 1_990_000 },
  { name: "KADDOX",         cat: "Giày nam",  type: "Sneaker",   price: 2_190_000 },
  { name: "LYNDELL",        cat: "Giày nam",  type: "Casual",    price: 1_790_000 },
  { name: "MORBIDO",        cat: "Sandal nam",type: "Slide",     price: 1_290_000 },
  { name: "NEALEY",         cat: "Sandal nam",type: "Slide",     price: 1_190_000 },
  { name: "OBLANCO",        cat: "Sandal nam",type: "Sport",     price: 1_490_000 },
  { name: "PALTANO",        cat: "Bốt nam",   type: "Chelsea",   price: 3_490_000 },
  { name: "QUAVELA",        cat: "Bốt nam",   type: "Chukka",    price: 2_990_000 },
  { name: "RAWLING",        cat: "Bốt nam",   type: "Worker",    price: 3_190_000 },
  { name: "SAFFIANO TOTE",  cat: "Túi nữ",   type: "Tote",      price: 4_490_000 },
  { name: "LAVIA",          cat: "Túi nữ",   type: "Crossbody", price: 3_290_000 },
  { name: "MINERVA",        cat: "Túi nữ",   type: "Satchel",   price: 3_890_000 },
  { name: "NOELLA",         cat: "Túi nữ",   type: "Clutch",    price: 2_490_000 },
  { name: "OCEANA",         cat: "Túi nữ",   type: "Shoulder",  price: 3_590_000 },
  { name: "PEARCE",         cat: "Túi nữ",   type: "Mini Bag",  price: 2_290_000 },
  { name: "QUEONA",         cat: "Túi nữ",   type: "Hobo",      price: 3_990_000 },
  { name: "ROSELLA",        cat: "Túi nữ",   type: "Tote",      price: 4_190_000 },
  { name: "STADIUM",        cat: "Túi nam",  type: "Messenger", price: 2_890_000 },
  { name: "TARQUIN",        cat: "Túi nam",  type: "Briefcase", price: 3_490_000 },
  { name: "ULBERTO",        cat: "Túi nam",  type: "Backpack",  price: 2_990_000 },
  { name: "VELARO BELT",    cat: "Phụ kiện", type: "Belt",      price: 990_000   },
  { name: "WANDERER BELT",  cat: "Phụ kiện", type: "Belt",      price: 890_000   },
  { name: "XERIS WALLET",   cat: "Phụ kiện", type: "Wallet",    price: 1_290_000 },
  { name: "YORIAN WALLET",  cat: "Phụ kiện", type: "Wallet",    price: 1_190_000 },
  { name: "ZENITH SCARF",   cat: "Phụ kiện", type: "Scarf",     price: 790_000   },
  { name: "ARIA SUNGLASSES",cat: "Phụ kiện", type: "Eyewear",   price: 1_590_000 },
  { name: "COVET KEYCHAIN", cat: "Phụ kiện", type: "Keychain",  price: 390_000   },
  { name: "DEMI HAIRPIN",   cat: "Phụ kiện", type: "Hair Acc",  price: 290_000   },
  { name: "ELARA EARRINGS", cat: "Phụ kiện", type: "Jewelry",   price: 690_000   },
];

const BAG_CATS = new Set(["Túi nữ", "Túi nam", "Phụ kiện"]);

export async function POST() {
  try {
    const db = getDb();
    const now = new Date().toISOString();

    // ── Shelves ───────────────────────────────────────────────────────────────
    const shoeShelvesData = Array.from({ length: 14 }, (_, i) => ({
      id: `giay_${String(i + 1).padStart(2, "0")}`,
      name: `Giày ${String(i + 1).padStart(2, "0")}`,
      type: "WAREHOUSE", subType: "shoes", sortOrder: i,
    }));
    const bagShelvesData = Array.from({ length: 8 }, (_, i) => ({
      id: `tui_${String(i + 1).padStart(2, "0")}`,
      name: `Túi ${String(i + 1).padStart(2, "0")}`,
      type: "WAREHOUSE", subType: "bags", sortOrder: 14 + i,
    }));
    const allShelves = [...shoeShelvesData, ...bagShelvesData];

    const insertShelf = db.prepare(`
      INSERT OR REPLACE INTO shelves(id,name,type,subType,sortOrder)
      VALUES(@id,@name,@type,@subType,@sortOrder)
    `);
    const insertSlot = db.prepare(`
      INSERT OR IGNORE INTO slots(id,shelfId,tier,position,label)
      VALUES(@id,@shelfId,@tier,@position,@label)
    `);

    // ── Products ──────────────────────────────────────────────────────────────
    const insertProduct = db.prepare(`
      INSERT OR IGNORE INTO products(id,name,sku,category,productType,quantity,price,markdownPrice,color,size,imagePath,notes,createdAt,updatedAt)
      VALUES(@id,@name,@sku,@category,@productType,@quantity,@price,@markdownPrice,@color,@size,@imagePath,@notes,@createdAt,@updatedAt)
    `);

    // ── Placements ────────────────────────────────────────────────────────────
    const insertPlacement = db.prepare(`
      INSERT OR IGNORE INTO placements(id,productId,slotId,placedAt,updatedAt)
      VALUES(?,?,?,?,?)
    `);

    const allProducts: { id: string; category: string }[] = [];

    const tx = db.transaction(() => {
      // Shelves + slots
      for (const s of allShelves) {
        insertShelf.run(s);
        for (let tier = 0; tier < 4; tier++) {
          for (let pos = 0; pos < 25; pos++) {
            insertSlot.run({ id: `slot_${s.id}_${tier}_${pos}`, shelfId: s.id, tier, position: pos, label: "" });
          }
        }
      }

      // Products
      for (const raw of PRODUCTS_DATA) {
        const isShoe = !BAG_CATS.has(raw.cat);
        const markdown = Math.random() < 0.3 ? Math.round(raw.price * 0.7 / 10000) * 10000 : null;
        const p = {
          id: uid("prod"),
          name: raw.name,
          sku: `${raw.cat.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase()}${raw.name.replace(/[^A-Za-z]/g, "").slice(0, 5).toUpperCase()}${Math.floor(Math.random() * 900) + 100}`,
          category: raw.cat,
          productType: raw.type,
          quantity: Math.floor(Math.random() * 18) + 3,
          price: raw.price,
          markdownPrice: markdown,
          color: randItem(COLORS),
          size: isShoe ? randItem(SHOE_SIZES) : null,
          imagePath: null,
          notes: null,
          createdAt: now,
          updatedAt: now,
        };
        insertProduct.run(p);
        allProducts.push({ id: p.id, category: p.category });
      }

      // Placements
      const shoeSlots = db.prepare(`
        SELECT sl.id FROM slots sl JOIN shelves sh ON sh.id=sl.shelfId
        WHERE sh.type='WAREHOUSE' AND sh.subType='shoes' ORDER BY RANDOM()
      `).all() as { id: string }[];
      const bagSlots = db.prepare(`
        SELECT sl.id FROM slots sl JOIN shelves sh ON sh.id=sl.shelfId
        WHERE sh.type='WAREHOUSE' AND sh.subType='bags' ORDER BY RANDOM()
      `).all() as { id: string }[];

      let si = 0, bi = 0;
      for (const p of allProducts) {
        if (!BAG_CATS.has(p.category) && si < shoeSlots.length) {
          insertPlacement.run(uid("pl"), p.id, shoeSlots[si].id, now, now);
          si++;
        } else if (BAG_CATS.has(p.category) && bi < bagSlots.length) {
          insertPlacement.run(uid("pl"), p.id, bagSlots[bi].id, now, now);
          bi++;
        }
      }
    });

    tx();

    return NextResponse.json({
      ok: true,
      shelves: allShelves.length,
      products: allProducts.length,
    });
  } catch (err) {
    console.error("[seed]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

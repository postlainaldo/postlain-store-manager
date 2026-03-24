// ─── ALDO MH/MC code → Vietnamese category mapping ────────────────────────────

// Group-level MH codes (MH12xxx)
export const MH_GROUP_MAP: Record<string, string> = {
  MH12001: "Giày nữ",
  MH12002: "Giày nam",
  MH12003: "Giày trẻ em",
  MH12004: "Túi xách",
  MH12005: "Phụ kiện",
  MH12006: "Chăm sóc giày",
};

// Department-level MH codes (MH13xxx)
export const MH_DEPT_MAP: Record<string, string> = {
  MH13001: "Giày nữ",           // Ladies Shoes
  MH13002: "Bốt nữ",            // Ladies Boots
  MH13003: "Sandal nữ",         // Ladies Sandals
  MH13004: "Giày nam",          // Men Shoes
  MH13005: "Bốt nam",           // Men Boots
  MH13006: "Sandal nam",        // Men Sandals
  MH13007: "Giày trẻ em",       // Kids Shoes
  MH13009: "Sandal trẻ em",     // Kids Sandals
  MH13010: "Túi nữ",            // Ladies Handbags
  MH13011: "Túi nam",           // Men Handbags
  MH13012: "Phụ kiện nữ",       // Ladies Non Jewelry
  MH13013: "Trang sức nữ",      // Ladies Jewelry
  MH13014: "Phụ kiện nam",      // Men Accessories
  MH13017: "Chăm sóc giày",     // Shoe Care
  MH13018: "Phụ kiện giày",     // Footwear Accessories
};

// MC code → detailed Vietnamese description
export const MC_MAP: Record<string, { category: string; label: string; productType?: string }> = {
  // Ladies Shoes
  MC14001: { category: "Giày nữ", label: "Giày nữ Dress", productType: "giay_cao_got" },
  MC14002: { category: "Giày nữ", label: "Giày nữ Casual", productType: "sandal_nu" },
  // Ladies Boots
  MC14003: { category: "Bốt nữ", label: "Bốt nữ cổ cao", productType: "giay_cao_got" },
  MC14007: { category: "Bốt nữ", label: "Bốt nữ Dress" },
  MC14008: { category: "Bốt nữ", label: "Bốt nữ Casual" },
  MC14009: { category: "Bốt nữ", label: "Bốt nữ Performance" },
  // Ladies Sandals
  MC14011: { category: "Sandal nữ", label: "Sandal nữ" },
  MC14013: { category: "Sandal nữ", label: "Sandal nữ Dress", productType: "sandal_nu" },
  MC14014: { category: "Sandal nữ", label: "Sandal nữ Casual", productType: "dep_nu" },
  // Men Shoes
  MC14019: { category: "Giày nam", label: "Giày tây", productType: "giay_tay" },
  MC14020: { category: "Giày nam", label: "Giày city", productType: "giay_city" },
  MC14021: { category: "Giày nam", label: "Giày nam Casual" },
  MC14022: { category: "Giày nam", label: "Giày tây National Brand", productType: "giay_tay" },
  MC14023: { category: "Giày nam", label: "Giày nam National Brand" },
  // Men Boots
  MC14025: { category: "Bốt nam", label: "Bốt tây" },
  MC14026: { category: "Bốt nam", label: "Bốt nam Casual" },
  MC14027: { category: "Bốt nam", label: "Bốt Performance" },
  MC14028: { category: "Bốt nam", label: "Bốt tây National Brand" },
  MC14029: { category: "Bốt nam", label: "Bốt Casual National Brand" },
  MC14030: { category: "Bốt nam", label: "Bốt Performance National Brand" },
  // Men Sandals
  MC14031: { category: "Sandal nam", label: "Dép tây", productType: "dep_nam" },
  MC14032: { category: "Sandal nam", label: "Sandal nam Casual", productType: "dep_nam" },
  MC14034: { category: "Sandal nam", label: "Dép tây National Brand" },
  MC14035: { category: "Sandal nam", label: "Sandal Casual National Brand" },
  // Kids
  MC14037: { category: "Giày trẻ em", label: "Giày nữ trẻ em Casual" },
  MC14038: { category: "Giày trẻ em", label: "Giày nữ trẻ em City" },
  MC14039: { category: "Giày trẻ em", label: "Giày nữ trẻ em Dress" },
  MC14040: { category: "Giày trẻ em", label: "Giày nam trẻ em Dress" },
  MC14041: { category: "Giày trẻ em", label: "Giày nam trẻ em Casual" },
  MC14049: { category: "Sandal trẻ em", label: "Sandal nữ trẻ em Dress" },
  MC14050: { category: "Sandal trẻ em", label: "Sandal nữ trẻ em Casual" },
  MC14052: { category: "Sandal trẻ em", label: "Sandal nam trẻ em Boys" },
  MC14053: { category: "Sandal trẻ em", label: "Sandal nam trẻ em Casual" },
  // Ladies Handbags
  MC14055: { category: "Túi nữ", label: "Túi city nữ", productType: "tui_nu" },
  MC14056: { category: "Túi nữ", label: "Túi dress nữ", productType: "tui_nu" },
  MC14057: { category: "Túi nữ", label: "Ví nữ", productType: "vi_nu" },
  MC14058: { category: "Túi nữ", label: "Túi BTS nữ" },
  MC14059: { category: "Túi nữ", label: "Túi nữ" },
  // Men Handbags
  MC14060: { category: "Túi nam", label: "Túi nam", productType: "tui_nam" },
  // Accessories
  MC14061: { category: "Phụ kiện", label: "Nón, khăn, găng tay nữ", productType: "khan" },
  MC14062: { category: "Phụ kiện", label: "Vớ nữ", productType: "vot_nu" },
  MC14063: { category: "Phụ kiện", label: "Phụ kiện giày nữ" },
  MC14064: { category: "Phụ kiện", label: "Kính nữ", productType: "kinh_nu" },
  MC14065: { category: "Phụ kiện", label: "Nịt, ví nữ", productType: "vi_nu" },
  MC14066: { category: "Trang sức", label: "Vòng tay nữ", productType: "vong_tay" },
  MC14067: { category: "Trang sức", label: "Dây chuyền nữ", productType: "day_chuyen" },
  MC14068: { category: "Trang sức", label: "Hoa tai nữ", productType: "hoa_tai" },
  MC14069: { category: "Trang sức", label: "Đồng hồ nữ", productType: "dong_ho" },
  MC14070: { category: "Trang sức", label: "Nhẫn nữ", productType: "nhan" },
  MC14071: { category: "Trang sức", label: "Trang sức nữ khác" },
  MC14072: { category: "Phụ kiện nam", label: "Trang sức nam" },
  MC14073: { category: "Phụ kiện nam", label: "Đồng hồ nam", productType: "dong_ho" },
  MC14074: { category: "Phụ kiện nam", label: "Nón, khăn nam", productType: "khan" },
  MC14075: { category: "Phụ kiện nam", label: "Nịt nam", productType: "nit_nam" },
  MC14076: { category: "Phụ kiện nam", label: "Kính nam", productType: "kinh_nam" },
  MC14077: { category: "Phụ kiện nam", label: "Phụ kiện nam" },
  MC14078: { category: "Phụ kiện nam", label: "Vớ nam", productType: "vot_nam" },
  // Shoe care
  MC14087: { category: "Chăm sóc giày", label: "Bóng đánh giày" },
  MC14088: { category: "Chăm sóc giày", label: "Chống thấm, bảo vệ" },
  MC14089: { category: "Chăm sóc giày", label: "Dụng cụ giãn giày" },
  MC14090: { category: "Phụ kiện giày", label: "Lót giày" },
  MC14091: { category: "Phụ kiện giày", label: "Dây giày", productType: "day_giay" },
  MC14092: { category: "Phụ kiện giày", label: "Đệm giày" },
};

// ─── Main resolver function ────────────────────────────────────────────────────
export function resolveCategory(code: string): { category: string; productType?: string } {
  const upper = String(code).trim().toUpperCase();
  // Try MC code first (most specific)
  if (upper.startsWith("MC") && MC_MAP[upper]) {
    const mc = MC_MAP[upper];
    return { category: mc.category, productType: mc.productType };
  }
  // Try MH13xxx (department)
  if (upper.startsWith("MH13") && MH_DEPT_MAP[upper]) {
    return { category: MH_DEPT_MAP[upper] };
  }
  // Try MH12xxx (group)
  if (upper.startsWith("MH12") && MH_GROUP_MAP[upper]) {
    return { category: MH_GROUP_MAP[upper] };
  }
  // Return as-is if no match
  return { category: code };
}

// ─── ALDO Color code → hex color ──────────────────────────────────────────────
// Based on ALDO NRF color code ranges
export function colorCodeToHex(code: string | null | undefined): string | null {
  if (!code) return null;
  const n = parseInt(code, 10);
  if (isNaN(n)) return null;
  if (n === 0)             return null;           // No colour
  if (n >= 1   && n <= 19) return "#1a1a1a";     // Black
  if (n >= 20  && n <= 99) return "#9ca3af";     // Gray (Pewter)
  if (n >= 100 && n <= 199) return "#f5f5f5";    // White / Natural
  if (n >= 200 && n <= 249) return "#7c2d12";    // Brown (Rust/Khaki/Bone)
  if (n >= 250 && n <= 299) return "#92400e";    // Beige / Khaki
  if (n >= 300 && n <= 399) return "#15803d";    // Green
  if (n >= 400 && n <= 499) return "#1d4ed8";    // Blue (Navy/Light Blue)
  if (n >= 500 && n <= 599) return "#7e22ce";    // Purple
  if (n >= 600 && n <= 649) return "#dc2626";    // Red
  if (n >= 650 && n <= 699) return "#be185d";    // Pink / Fuchsia
  if (n >= 700 && n <= 799) return "#d97706";    // Yellow
  if (n >= 800 && n <= 899) return "#ea580c";    // Orange / Dark Orange
  if (n >= 900 && n <= 939) return "#f97316";    // Other
  if (n >= 940 && n <= 999) return "#c0c0c0";    // Metallic Multi
  return null;
}

// ─── Parse MC and Season from notes field ─────────────────────────────────────
// notes format: "MC: MC14003 | Season: FW25"
export function parseMCFromNotes(notes?: string | null): string | null {
  if (!notes) return null;
  const m = notes.match(/MC:\s*(MC\d+)/);
  return m ? m[1] : null;
}

export function parseSeasonFromNotes(notes?: string | null): string | null {
  if (!notes) return null;
  const m = notes.match(/Season:\s*([A-Z]{2}\d{2})/);
  return m ? m[1] : null;
}

// ─── Parse Vietnamese price format ────────────────────────────────────────────
// "300.000 đ" → 300000, "1.500.000đ" → 1500000, "150,000" → 150000
export function parseVietnamesePrice(raw: unknown): number | undefined {
  if (raw == null || raw === "") return undefined;
  const str = String(raw)
    .replace(/[đd₫]/gi, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")    // remove thousand separators (dots)
    .replace(/,/g, ".");   // commas as decimal
  const n = parseFloat(str);
  return isNaN(n) ? undefined : n;
}

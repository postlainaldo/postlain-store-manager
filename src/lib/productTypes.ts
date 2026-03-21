// ─── Shape types for 3D viewer ────────────────────────────────────────────────
export type ShapeType =
  | "shoe_flat" | "shoe_heel" | "shoe_sneaker" | "shoe_dress" | "shoe_ballet"
  | "shoe_sneaker_women" | "sandal_strappy" | "sandal_slide" | "shoe_loafer"
  | "bag_tote" | "bag_messenger" | "bag_backpack" | "bag_structured"
  | "ring_bangle" | "ring_chain" | "watch" | "glasses"
  | "wallet" | "belt" | "hat_beret" | "hat_cap"
  | "scarf" | "keychain" | "earring" | "sock";

export interface ProductTypeConfig {
  label: string;
  group: "shoes_women" | "shoes_men" | "bags_women" | "bags_men" | "accessories";
  shape: ShapeType;
  defaultColor: string;
  hasSize: boolean;
  hasColor: boolean;
  shoeSizes?: string[];
}

export const PRODUCT_TYPES: Record<string, ProductTypeConfig> = {
  // ── Women's shoes ──────────────────────────────────────────────────────────
  dep_nu:      { label: "Dép nữ",        group: "shoes_women", shape: "sandal_slide",    defaultColor: "#D4A574", hasSize: true, hasColor: true, shoeSizes: ["35","36","37","38","39","40"] },
  giay_cao_got:{ label: "Giày cao gót",   group: "shoes_women", shape: "shoe_heel",   defaultColor: "#8B6B6B", hasSize: true, hasColor: true, shoeSizes: ["35","36","37","38","39","40"] },
  sandal_nu:   { label: "Sandal nữ",      group: "shoes_women", shape: "sandal_strappy",   defaultColor: "#C4956A", hasSize: true, hasColor: true, shoeSizes: ["35","36","37","38","39","40"] },
  dep_quai_nu: { label: "Dép quai nữ",    group: "shoes_women", shape: "sandal_strappy",   defaultColor: "#B8956A", hasSize: true, hasColor: true, shoeSizes: ["35","36","37","38","39","40"] },
  // ── Men's shoes ────────────────────────────────────────────────────────────
  giay_tay:    { label: "Giày tây",        group: "shoes_men",  shape: "shoe_loafer",  defaultColor: "#4A3828", hasSize: true, hasColor: true, shoeSizes: ["39","40","41","42","43","44","45"] },
  giay_city:   { label: "Giày city",       group: "shoes_men",  shape: "shoe_loafer",  defaultColor: "#3A3028", hasSize: true, hasColor: true, shoeSizes: ["39","40","41","42","43","44","45"] },
  sneaker_nam: { label: "Sneaker nam",      group: "shoes_men",  shape: "shoe_sneaker",defaultColor: "#E8E0D8", hasSize: true, hasColor: true, shoeSizes: ["39","40","41","42","43","44","45"] },
  dep_nam:     { label: "Dép nam",          group: "shoes_men",  shape: "shoe_flat",   defaultColor: "#6A5040", hasSize: true, hasColor: true, shoeSizes: ["39","40","41","42","43","44","45"] },
  // ── Women's bags ──────────────────────────────────────────────────────────
  tui_nu:      { label: "Túi nữ",          group: "bags_women", shape: "bag_structured",    defaultColor: "#C4956A", hasSize: false, hasColor: true },
  balo_nu:     { label: "Balo nữ",         group: "bags_women", shape: "bag_backpack",defaultColor: "#8B7B6B", hasSize: false, hasColor: true },
  // ── Men's bags ────────────────────────────────────────────────────────────
  tui_nam:     { label: "Túi nam",          group: "bags_men",   shape: "bag_messenger",defaultColor: "#4A3828", hasSize: false, hasColor: true },
  balo_nam:    { label: "Balo nam",         group: "bags_men",   shape: "bag_backpack", defaultColor: "#3A3028", hasSize: false, hasColor: true },
  // ── Accessories ───────────────────────────────────────────────────────────
  vong_tay:    { label: "Vòng tay",         group: "accessories", shape: "ring_bangle", defaultColor: "#C9A96E", hasSize: false, hasColor: true },
  day_chuyen:  { label: "Dây chuyền",       group: "accessories", shape: "ring_chain",  defaultColor: "#D4B896", hasSize: false, hasColor: true },
  dong_ho:     { label: "Đồng hồ",          group: "accessories", shape: "watch",       defaultColor: "#8A8A8A", hasSize: false, hasColor: true },
  day_giay:    { label: "Dây giày",         group: "accessories", shape: "scarf",       defaultColor: "#E8E0D8", hasSize: false, hasColor: true },
  bang_do:     { label: "Băng đô",          group: "accessories", shape: "ring_bangle", defaultColor: "#C4956A", hasSize: false, hasColor: true },
  no:          { label: "Nơ",               group: "accessories", shape: "earring",     defaultColor: "#C4748A", hasSize: false, hasColor: true },
  kep_toc:     { label: "Kẹp tóc",          group: "accessories", shape: "earring",     defaultColor: "#A0A0A0", hasSize: false, hasColor: true },
  kinh_nu:     { label: "Kính nữ",          group: "accessories", shape: "glasses",     defaultColor: "#3A2A2A", hasSize: false, hasColor: true },
  kinh_nam:    { label: "Kính nam",         group: "accessories", shape: "glasses",     defaultColor: "#2A2A2A", hasSize: false, hasColor: true },
  vi_nu:       { label: "Ví nữ",            group: "accessories", shape: "wallet",      defaultColor: "#C4956A", hasSize: false, hasColor: true },
  vi_nam:      { label: "Ví nam",           group: "accessories", shape: "wallet",      defaultColor: "#4A3828", hasSize: false, hasColor: true },
  nit_nam:     { label: "Nịt nam",          group: "accessories", shape: "belt",        defaultColor: "#2A2218", hasSize: false, hasColor: true },
  non_tai_beo: { label: "Nón tai bèo",      group: "accessories", shape: "hat_beret",   defaultColor: "#D4C4A8", hasSize: false, hasColor: true },
  non_kieu:    { label: "Nón kiểu",         group: "accessories", shape: "hat_cap",     defaultColor: "#8A7A68", hasSize: false, hasColor: true },
  khan:        { label: "Khăn",             group: "accessories", shape: "scarf",       defaultColor: "#D4A8B8", hasSize: false, hasColor: true },
  moc_khoa:    { label: "Móc khóa hình thú",group: "accessories", shape: "keychain",    defaultColor: "#C4956A", hasSize: false, hasColor: true },
  hoa_tai:     { label: "Hoa tai",          group: "accessories", shape: "earring",     defaultColor: "#C9A96E", hasSize: false, hasColor: true },
  nhan:        { label: "Nhẫn",             group: "accessories", shape: "ring_chain",  defaultColor: "#C9A96E", hasSize: false, hasColor: true },
  vot_nam:     { label: "Vớ nam",           group: "accessories", shape: "sock",        defaultColor: "#E8E0D8", hasSize: false, hasColor: true },
  vot_nu:      { label: "Vớ nữ",            group: "accessories", shape: "sock",        defaultColor: "#F0E8E0", hasSize: false, hasColor: true },
  bup_be:      { label: "Giày búp bê",   group: "shoes_women", shape: "shoe_ballet",         defaultColor: "#D4A8A0", hasSize: true,  hasColor: true, shoeSizes: ["35","36","37","38","39","40"] },
  sneaker_nu:  { label: "Sneaker nữ",    group: "shoes_women", shape: "shoe_sneaker_women",  defaultColor: "#E8E0D8", hasSize: true,  hasColor: true, shoeSizes: ["35","36","37","38","39","40"] },
};

export const PRODUCT_GROUPS: Record<string, { label: string; color: string }> = {
  shoes_women: { label: "Giày nữ",   color: "#C4956A" },
  shoes_men:   { label: "Giày nam",  color: "#8B7060" },
  bags_women:  { label: "Túi nữ",   color: "#A88060" },
  bags_men:    { label: "Túi nam",  color: "#706050" },
  accessories: { label: "Phụ kiện", color: "#C9A96E" },
};

export const PRODUCT_COLORS = [
  { id: "#1A1A1A", label: "Đen" },
  { id: "#F0F0F0", label: "Trắng" },
  { id: "#8B6B4A", label: "Nâu" },
  { id: "#D4B896", label: "Be" },
  { id: "#C4956A", label: "Camel" },
  { id: "#1A2A4A", label: "Navy" },
  { id: "#C44A4A", label: "Đỏ" },
  { id: "#E8A0B0", label: "Hồng" },
  { id: "#C9A96E", label: "Vàng" },
  { id: "#C0C0C0", label: "Bạc" },
  { id: "#5A8A5A", label: "Xanh lá" },
  { id: "#4A7AB0", label: "Xanh dương" },
];

// ─── ALDO NRF Color Code mapping ─────────────────────────────────────────────
// Based on the store's color management system (PHẦN 1 - THAY ĐỔI MÃ QUẢN LÝ)
// Code range → color name + hex

interface NRFColor {
  name: string;
  hex: string;
  range: [number, number];
}

const NRF_COLOR_TABLE: NRFColor[] = [
  { name: "No Colour",       hex: "#D0CCC8", range: [0, 0] },
  { name: "Black",           hex: "#1A1A1A", range: [1, 19] },
  { name: "Pewter",          hex: "#9A9A9A", range: [20, 99] },
  { name: "White",           hex: "#F5F2EE", range: [100, 199] },
  { name: "Brown",           hex: "#6B3E26", range: [200, 249] },
  { name: "Beige / Khaki",   hex: "#D4C4A8", range: [250, 299] },
  { name: "Green",           hex: "#3A7A3A", range: [300, 399] },
  { name: "Blue",            hex: "#2A5898", range: [400, 499] },
  { name: "Purple",          hex: "#6A3A8A", range: [500, 589] },
  { name: "Red",             hex: "#B82A2A", range: [600, 649] },
  { name: "Fuchsia",         hex: "#C44A7A", range: [650, 699] },
  { name: "Yellow",          hex: "#D4C428", range: [700, 799] },
  { name: "Orange",          hex: "#D46A1A", range: [800, 899] },
  { name: "Dark Orange",     hex: "#B84A08", range: [900, 961] },
  { name: "Metallic Multi",  hex: "#C8C0A8", range: [962, 999] },
];

// Named codes that override range
const NRF_NAMED: Record<number, { name: string; hex: string }> = {
  1:   { name: "Black",       hex: "#1A1A1A" },
  22:  { name: "Pewter",      hex: "#9A9A9A" },
  100: { name: "White",       hex: "#F5F2EE" },
  101: { name: "Natural",     hex: "#EDE0D0" },
  200: { name: "Rust",        hex: "#8B3A1A" },
  221: { name: "Rust",        hex: "#8B3A1A" },
  250: { name: "Bone",        hex: "#E8DCC8" },
  270: { name: "Khaki",       hex: "#C4B888" },
  310: { name: "Medium Green",hex: "#4A8A4A" },
  410: { name: "Navy",        hex: "#1A2A4A" },
  450: { name: "Light Blue",  hex: "#6A9AC8" },
  520: { name: "Bright Purple",hex: "#7A3A9A" },
  600: { name: "Red",         hex: "#C43030" },
  652: { name: "Fuchsia",     hex: "#C43A7A" },
  710: { name: "Gold",        hex: "#C9A96E" },
  801: { name: "Dark Orange", hex: "#B84818" },
  901: { name: "Dark Orange", hex: "#A04010" },
  962: { name: "Metallic Multi", hex: "#C8C0A8" },
};

/**
 * Extract NRF color code from SKU string.
 * SKU format typically: NAME + 3-digit code at end, e.g. "OLOEN001" → 001
 */
export function extractColorCodeFromSKU(sku: string): number | null {
  if (!sku) return null;
  // Match trailing 3-digit number
  const match = sku.match(/(\d{3})$/);
  if (!match) return null;
  return parseInt(match[1], 10);
}

export interface ColorInfo {
  name: string;
  hex: string;
  code: number;
}

export function getNRFColor(code: number): ColorInfo {
  // Check named codes first
  if (NRF_NAMED[code]) {
    return { ...NRF_NAMED[code], code };
  }
  // Find range match
  for (const entry of NRF_COLOR_TABLE) {
    if (code >= entry.range[0] && code <= entry.range[1]) {
      return { name: entry.name, hex: entry.hex, code };
    }
  }
  return { name: "Unknown", hex: "#B0A898", code };
}

export function getProductColor(sku?: string, fallback?: string): string {
  if (!sku) return fallback ?? "#B0A898";
  const code = extractColorCodeFromSKU(sku);
  if (code === null) return fallback ?? "#B0A898";
  return getNRFColor(code).hex;
}

export function getProductColorInfo(sku?: string): ColorInfo | null {
  if (!sku) return null;
  const code = extractColorCodeFromSKU(sku);
  if (code === null) return null;
  return getNRFColor(code);
}

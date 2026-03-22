// ─────────────────────────────────────────────────────────────────────────────
// POSTLAIN — Store Manager · Inventory Type System
// Front-end interfaces mirroring prisma/schema.prisma
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────────────────────

export enum ProductStatus {
  ACTIVE    = "ACTIVE",
  ARCHIVED  = "ARCHIVED",
  DRAFT     = "DRAFT",
  MARKDOWN  = "MARKDOWN",
}

export enum CollectionStatus {
  SKETCH     = "SKETCH",
  SAMPLING   = "SAMPLING",
  PRODUCTION = "PRODUCTION",
  RELEASED   = "RELEASED",
  ARCHIVED   = "ARCHIVED",
}

export enum LocationType {
  WAREHOUSE   = "WAREHOUSE",
  STORE_SHELF = "STORE_SHELF",
  WINDOW      = "WINDOW",
  FITTING     = "FITTING",
  TRANSIT     = "TRANSIT",
}

export enum Gender {
  WOMEN  = "WOMEN",
  MEN    = "MEN",
  KIDS   = "KIDS",
  UNISEX = "UNISEX",
}

export enum StockMovementType {
  RECEIVE    = "RECEIVE",
  TRANSFER   = "TRANSFER",
  SALE       = "SALE",
  RETURN     = "RETURN",
  ADJUSTMENT = "ADJUSTMENT",
  MARKDOWN   = "MARKDOWN",
}

export enum SizeSystem {
  EU = "EU",
  US = "US",
  UK = "UK",
  FR = "FR",
  IT = "IT",
  VN = "VN",
}

// ─────────────────────────────────────────────────────────────────────────────
// LABEL MAPS — dùng cho UI display
// ─────────────────────────────────────────────────────────────────────────────

export const PRODUCT_STATUS_LABEL: Record<ProductStatus, string> = {
  [ProductStatus.ACTIVE]:   "Đang bán",
  [ProductStatus.ARCHIVED]: "Ngừng bán",
  [ProductStatus.DRAFT]:    "Bản nháp",
  [ProductStatus.MARKDOWN]: "Giảm giá",
};

export const COLLECTION_STATUS_LABEL: Record<CollectionStatus, string> = {
  [CollectionStatus.SKETCH]:     "Bản thảo",
  [CollectionStatus.SAMPLING]:   "Đang mẫu",
  [CollectionStatus.PRODUCTION]: "Sản xuất",
  [CollectionStatus.RELEASED]:   "Đã ra mắt",
  [CollectionStatus.ARCHIVED]:   "Kết thúc",
};

export const LOCATION_TYPE_LABEL: Record<LocationType, string> = {
  [LocationType.WAREHOUSE]:   "Kho hàng",
  [LocationType.STORE_SHELF]: "Kệ trưng bày",
  [LocationType.WINDOW]:      "Tủ kính",
  [LocationType.FITTING]:     "Phòng thử",
  [LocationType.TRANSIT]:     "Đang vận chuyển",
};

export const GENDER_LABEL: Record<Gender, string> = {
  [Gender.WOMEN]:  "Nữ",
  [Gender.MEN]:    "Nam",
  [Gender.KIDS]:   "Trẻ em",
  [Gender.UNISEX]: "Unisex",
};

export const MOVEMENT_TYPE_LABEL: Record<StockMovementType, string> = {
  [StockMovementType.RECEIVE]:    "Nhập kho",
  [StockMovementType.TRANSFER]:   "Chuyển kho",
  [StockMovementType.SALE]:       "Bán ra",
  [StockMovementType.RETURN]:     "Trả hàng",
  [StockMovementType.ADJUSTMENT]: "Điều chỉnh",
  [StockMovementType.MARKDOWN]:   "Markdown",
};

// ─────────────────────────────────────────────────────────────────────────────
// COLOR
// ─────────────────────────────────────────────────────────────────────────────

export interface IColor {
  id:     string;
  name:   string; // "Jet Black", "Nude Beige"
  code:   string; // "BLK001", "NUD002"
  hex:    string; // "#1A1410"
  family: string; // "Neutral", "Earth", "Jewel"
}

// ─────────────────────────────────────────────────────────────────────────────
// TAG
// ─────────────────────────────────────────────────────────────────────────────

export interface ITag {
  id:    string;
  name:  string; // "Bestseller", "New Arrival", "Exclusive"
  color: string; // hex
}

// ─────────────────────────────────────────────────────────────────────────────
// COLLECTION
// ─────────────────────────────────────────────────────────────────────────────

export interface ICollection {
  id:          string;
  name:        string;        // "SS25 Women"
  season:      string;        // "SS25"
  year:        number;
  gender:      Gender;
  status:      CollectionStatus;
  description: string | null;
  launchDate:  string | null; // ISO 8601
  endDate:     string | null;
  productCount?: number;      // computed — không có trong DB trực tiếp
  createdAt:   string;
  updatedAt:   string;
}

export interface ICollectionWithProducts extends ICollection {
  products: IProduct[];
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT
// ─────────────────────────────────────────────────────────────────────────────

export interface IProduct {
  id:            string;
  name:          string;
  description:   string | null;
  category:      string;       // "Giày nữ", "Túi nam", "Phụ kiện"
  productType:   string | null; // "SNEAKER", "BOOT", "SANDAL"
  gender:        Gender;
  basePrice:     number;
  markdownPrice: number | null;
  status:        ProductStatus;
  imagePath:     string | null;
  notes:         string | null;
  collectionId:  string | null;
  createdAt:     string;
  updatedAt:     string;
}

export interface IProductWithVariants extends IProduct {
  collection: ICollection | null;
  variants:   IProductVariant[];
  tags:       ITag[];
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT VARIANT — đơn vị tồn kho cơ bản (SKU)
// ─────────────────────────────────────────────────────────────────────────────

export interface IProductVariant {
  id:            string;
  sku:           string;        // "ALDO-DR001-BLK-38"
  barcode:       string | null;
  productId:     string;
  colorId:       string;
  size:          string;        // "36", "37", "38", "S", "M", "ONE SIZE"
  sizeSystem:    SizeSystem;
  priceOverride: number | null; // override basePrice nếu variant có giá khác
  status:        ProductStatus;
  imagePath:     string | null;
  createdAt:     string;
  updatedAt:     string;
}

export interface IProductVariantFull extends IProductVariant {
  product:    IProduct;
  color:      IColor;
  stockItems: IStockItemWithLocation[];
  // Computed from stockItems
  totalStock:     number;
  availableStock: number; // totalStock - reservedQty
}

// ─────────────────────────────────────────────────────────────────────────────
// LOCATION
// ─────────────────────────────────────────────────────────────────────────────

export interface ILocation {
  id:       string;
  name:     string;         // "Kho Chính A", "Kệ Trưng Bày 01 — Tầng 3"
  code:     string;         // "WH-A", "SHELF-01-T3"
  type:     LocationType;
  aisle:    string | null;  // "A", "B"
  bay:      string | null;  // "01", "02"
  tier:     number | null;  // Tầng (1 = thấp nhất)
  slot:     number | null;  // Ô trong tầng
  capacity: number;         // Số lượng tối đa
  notes:    string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ILocationWithStock extends ILocation {
  stockItems:  IStockItem[];
  usedCapacity: number; // computed: sum of stockItems[].quantity
  fillPercent:  number; // computed: usedCapacity / capacity * 100
}

// ─────────────────────────────────────────────────────────────────────────────
// STOCK ITEM — snapshot tồn kho tại vị trí cụ thể
// ─────────────────────────────────────────────────────────────────────────────

export interface IStockItem {
  id:          string;
  variantId:   string;
  locationId:  string;
  quantity:    number;      // Số lượng hiện tại
  reservedQty: number;      // Đã đặt / đang chờ
  minAlert:    number;      // Cảnh báo khi stock < minAlert
  displayRow:  number | null; // Hàng trên kệ (1-based)
  displayPos:  number | null; // Vị trí trong hàng (1-based)
  createdAt:   string;
  updatedAt:   string;
}

export interface IStockItemWithVariant extends IStockItem {
  variant: IProductVariantFull;
}

export interface IStockItemWithLocation extends IStockItem {
  location: ILocation;
}

export interface IStockItemFull extends IStockItem {
  variant:  IProductVariantFull;
  location: ILocation;
}

// ─────────────────────────────────────────────────────────────────────────────
// STOCK MOVEMENT — lịch sử biến động (audit trail)
// ─────────────────────────────────────────────────────────────────────────────

export interface IStockMovement {
  id:             string;
  type:           StockMovementType;
  variantId:      string;
  fromLocationId: string | null;
  toLocationId:   string | null;
  quantity:       number;
  note:           string | null;
  reference:      string | null; // Số PO, số đơn hàng
  performedBy:    string | null;
  createdAt:      string;
  updatedAt:      string;
}

export interface IStockMovementFull extends IStockMovement {
  variant:      IProductVariant;
  fromLocation: ILocation | null;
  toLocation:   ILocation | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// ORDER
// ─────────────────────────────────────────────────────────────────────────────

export interface IOrderItem {
  id:        string;
  orderId:   string;
  variantId: string;
  quantity:  number;
  unitPrice: number;
  discount:  number;
  createdAt: string;
  updatedAt: string;
}

export interface IOrderItemFull extends IOrderItem {
  variant: IProductVariantFull;
}

export interface IOrder {
  id:           string;
  orderNumber:  string;  // "ORD-2025-0001"
  type:         "SALE" | "PURCHASE" | "RETURN";
  status:       "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
  totalAmount:  number;
  currency:     string;
  customerName: string | null;
  notes:        string | null;
  createdAt:    string;
  updatedAt:    string;
}

export interface IOrderFull extends IOrder {
  items: IOrderItemFull[];
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD / ANALYTICS — computed aggregates cho màn hình tổng quan
// ─────────────────────────────────────────────────────────────────────────────

export interface IInventorySummary {
  totalSKUs:          number;
  totalUnits:         number;
  totalValue:         number; // sum(quantity * price) across all variants
  lowStockCount:      number; // variants where availableStock <= minAlert
  outOfStockCount:    number; // variants where totalStock === 0
  locationCount:      number;
  warehouseUnits:     number; // units in WAREHOUSE locations
  storeUnits:         number; // units in STORE_SHELF + WINDOW locations
}

export interface ICategoryBreakdown {
  category:    string;
  totalSKUs:   number;
  totalUnits:  number;
  totalValue:  number;
  fillPercent: number; // % of store shelf capacity used by this category
}

export interface ILocationSummary {
  location:    ILocation;
  totalUnits:  number;
  fillPercent: number;
  lowStockItems: IStockItemFull[];
}

// ─────────────────────────────────────────────────────────────────────────────
// TRANSFER REQUEST — payload để di chuyển hàng giữa 2 vị trí
// ─────────────────────────────────────────────────────────────────────────────

export interface ITransferPayload {
  variantId:      string;
  fromLocationId: string;
  toLocationId:   string;
  quantity:       number;
  note?:          string;
  performedBy?:   string;
}

// ─────────────────────────────────────────────────────────────────────────────
// FILTER / QUERY PARAMS — chuẩn hóa params cho API calls
// ─────────────────────────────────────────────────────────────────────────────

export interface IProductFilter {
  search?:       string;
  category?:     string;
  gender?:       Gender;
  status?:       ProductStatus;
  collectionId?: string;
  tagIds?:       string[];
  inStock?:      boolean;
  locationType?: LocationType;
  page?:         number;
  limit?:        number;
  sortBy?:       "name" | "basePrice" | "createdAt" | "totalStock";
  sortDir?:      "asc" | "desc";
}

export interface IStockFilter {
  locationId?:   string;
  locationType?: LocationType;
  variantId?:    string;
  productId?:    string;
  lowStockOnly?: boolean;
  page?:         number;
  limit?:        number;
}

export interface IMovementFilter {
  variantId?:    string;
  locationId?:   string;
  type?:         StockMovementType;
  fromDate?:     string; // ISO 8601
  toDate?:       string;
  performedBy?:  string;
  page?:         number;
  limit?:        number;
}

// ─────────────────────────────────────────────────────────────────────────────
// API RESPONSE WRAPPERS
// ─────────────────────────────────────────────────────────────────────────────

export interface IApiResponse<T> {
  data:    T;
  success: boolean;
  message?: string;
}

export interface IPaginatedResponse<T> {
  data:       T[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// PLANOGRAM — vị trí trưng bày trên kệ (2D visual mapping)
// ─────────────────────────────────────────────────────────────────────────────

export interface IPlanogramSlot {
  locationId:  string;
  row:         number;  // hàng trên kệ (1 = trên cùng)
  position:    number;  // vị trí trong hàng (1 = trái nhất)
  stockItem:   IStockItemFull | null;
  isEmpty:     boolean;
}

export interface IPlanogramSection {
  sectionName: string;
  sectionCode: string;
  gender:      Gender;
  rows:        number;
  positions:   number;
  slots:       IPlanogramSlot[][];
}

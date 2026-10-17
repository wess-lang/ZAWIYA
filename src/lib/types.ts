// Shared domain types for ZAWIYA, mirroring the data dictionary in the
// project documentation (Section 4.4.1) as closely as a single-process
// prototype reasonably can.

export type Role = "customer" | "shop_owner" | "admin";

export type Category =
  | "sofa"
  | "bed"
  | "dining"
  | "chair"
  | "storage"
  | "lighting"
  | "outdoor"
  | "decor"
  | "office";

export const CATEGORY_LABELS: Record<Category, string> = {
  sofa: "Sofas & Seating",
  bed: "Beds & Bedroom",
  dining: "Dining",
  chair: "Chairs",
  storage: "Storage",
  lighting: "Lighting",
  outdoor: "Outdoor",
  decor: "Decor",
  office: "Office",
};

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  createdAt: string;
}

export interface Address {
  id: string;
  userId: string;
  label: string;
  city: string;
  details: string;
}

export type ShopStatus = "pending" | "active" | "rejected" | "suspended";

export interface Shop {
  id: string;
  ownerId: string;
  name: string;
  tagline: string;
  city: string;
  accent: string; // hex badge colour
  styleTags: string[];
  status: ShopStatus;
  rejectionReason?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  shopId: string;
  name: string;
  category: Category;
  price: number; // JOD
  stock: number;
  styleTags: string[];
  colorTags: string[];
  roomTags: string[];
  dimensions?: string;
  description: string;
  image: string;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  productId: string;
  rating: number; // 1-5
  comment: string;
  createdAt: string;
}

export interface WishlistItem {
  userId: string;
  productId: string;
  createdAt: string;
}

export type SubOrderStatus =
  | "placed"
  | "confirmed"
  | "preparing"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export const SUB_ORDER_STATUS_LABELS: Record<SubOrderStatus, string> = {
  placed: "Placed",
  confirmed: "Confirmed",
  preparing: "Preparing",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

// Order of statuses for rendering a timeline (cancelled is a side-branch).
export const SUB_ORDER_STATUS_FLOW: SubOrderStatus[] = [
  "placed",
  "confirmed",
  "preparing",
  "out_for_delivery",
  "delivered",
];

export interface OrderItem {
  productId: string;
  productName: string;
  shopId: string;
  unitPrice: number;
  qty: number;
}

export interface SubOrder {
  id: string;
  orderId: string;
  shopId: string;
  status: SubOrderStatus;
  items: OrderItem[];
  subtotal: number;
}

export type PaymentMethod = "card" | "cliq" | "cod";

export interface Order {
  id: string;
  userId: string;
  addressId: string;
  addressSnapshot: { label: string; city: string; details: string };
  paymentMethod: PaymentMethod;
  subOrders: SubOrder[];
  totalAmount: number;
  createdAt: string;
}

export interface RoomScan {
  id: string;
  userId: string;
  roomType: string;
  styleTags: string[];
  palette: string[];
  confidence: number;
  createdAt: string;
}

export interface AIPlacement {
  productId: string;
  matchScore: number; // 0-1
  reason: string;
}

export interface Database {
  users: User[];
  addresses: Address[];
  shops: Shop[];
  products: Product[];
  reviews: Review[];
  wishlist: WishlistItem[];
  orders: Order[];
  roomScans: RoomScan[];
}

// Food corner and To-let: public lists, customer requests, and the admin review endpoints.
// Prices and totals are always calculated by the server; the client sends only ids and quantities.
import { api } from "./client";

// ---------- Food corner ----------
export type FoodItem = {
  id: string;
  nameEn: string;
  nameBn: string;
  descriptionEn: string | null;
  descriptionBn: string | null;
  price: number; // BDT, from the server
  emoji: string | null; // simple picture until real photos exist
  isAvailable: boolean;
};

export type FoodOrderInput = {
  itemId: string;
  quantity: number;
  name: string;
  phone: string;
  address: string;
  note?: string;
};

export type RequestStatus = "PENDING" | "APPROVED" | "REJECTED";
export type FoodOrderStatus = "PENDING" | "CONFIRMED" | "DELIVERED" | "CANCELLED";

export type FoodOrder = FoodOrderInput & {
  id: string;
  itemName: string;
  unitPrice: number;
  total: number;
  status: FoodOrderStatus;
  createdAt: string;
  vendor?: { id: string; name: string } | null; // admin list only
  shop?: { id: string; name: string; slug: string } | null; // admin list only
};

export const listFoodItems = () => api.get<FoodItem[]>("/food/items");
export const createFoodOrder = (input: FoodOrderInput) => api.post<FoodOrder>("/food/orders", input);
export const listMyFoodOrders = () => api.get<FoodOrder[]>("/me/food-orders");

// Admin
export const adminListFoodOrders = (status?: FoodOrderStatus) =>
  api.get<FoodOrder[]>(`/admin/food-orders${status ? `?status=${status}` : ""}`);
export const adminUpdateFoodOrder = (id: string, status: FoodOrderStatus) =>
  api.patch<FoodOrder>(`/admin/food-orders/${encodeURIComponent(id)}`, { status });

// ---------- To-let ----------
// Shop spaces only.
export const TOLET_TYPES = ["SHOP", "SHOWROOM", "KIOSK", "FOOD_COURT", "WAREHOUSE"] as const;
export type ToletType = (typeof TOLET_TYPES)[number];

export type ToletInput = {
  type: ToletType;
  title: string;
  marketName?: string; // e.g. Bashundhara City
  floor?: string; // e.g. "Level 4"
  area: string; // e.g. Panthapath
  address: string;
  rent: number; // BDT per month
  advance?: number; // security deposit, BDT
  sizeSqft?: number;
  availableFrom: string; // YYYY-MM-DD
  contactName: string;
  contactPhone: string;
  description?: string;
  website?: string; // hidden spam trap: people leave it empty, bots fill it
};

// Public list hides the owner's contact; only the admin list returns it.
export type Tolet = Omit<ToletInput, "website" | "contactName" | "contactPhone"> & {
  contactName?: string;
  contactPhone?: string;
  id: string;
  status: RequestStatus;
  rejectionReason?: string | null;
  createdAt: string;
  submitter?: { id: string; name: string; email: string } | null; // admin list only; null = guest
};

export const listTolets = () => api.get<Tolet[]>("/tolets?limit=8");
export const createTolet = (input: ToletInput) => api.post<Tolet>("/tolets", input);

// Admin
export const adminListTolets = (status: RequestStatus = "PENDING") =>
  api.get<Tolet[]>(`/admin/tolets?status=${status}`);
export const adminReviewTolet = (id: string, status: Exclude<RequestStatus, "PENDING">, reason?: string) =>
  api.patch<Tolet>(`/admin/tolets/${encodeURIComponent(id)}`, { status, ...(reason && { reason }) });

// Reservations: a visitor asks us for an appointment to see a to-let. Our team calls them back.
export const INQUIRY_TIMES = ["MORNING", "AFTERNOON", "EVENING"] as const;
export type InquiryTime = (typeof INQUIRY_TIMES)[number];
export type InquiryStatus = "NEW" | "CONTACTED" | "CLOSED";

export type ToletInquiryInput = {
  name: string;
  phone: string;
  preferredDate: string; // YYYY-MM-DD
  preferredTime: InquiryTime;
  message?: string;
  website?: string; // hidden spam trap
};

export type ToletInquiry = Omit<ToletInquiryInput, "website"> & {
  id: string;
  status: InquiryStatus;
  createdAt: string;
  tolet: Pick<Tolet, "id" | "title" | "type" | "area" | "marketName" | "rent" | "contactName" | "contactPhone">;
};

export const createToletInquiry = (toletId: string, input: ToletInquiryInput) =>
  api.post<{ id: string }>(`/tolets/${encodeURIComponent(toletId)}/inquiries`, input);
export const adminListToletInquiries = (status?: InquiryStatus) =>
  api.get<ToletInquiry[]>(`/admin/tolet-inquiries${status ? `?status=${status}` : ""}`);
export const adminUpdateToletInquiry = (id: string, status: InquiryStatus) =>
  api.patch<ToletInquiry>(`/admin/tolet-inquiries/${encodeURIComponent(id)}`, { status });

export const requestKeys = {
  food: ["food", "items"] as const,
  tolets: ["tolets", "public"] as const,
  adminFood: (status?: string) => ["admin", "food-orders", status ?? "all"] as const,
  adminTolets: (status: string) => ["admin", "tolets", status] as const,
  adminInquiries: (status: string) => ["admin", "tolet-inquiries", status] as const,
};

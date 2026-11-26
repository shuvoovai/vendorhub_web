import "client-only";
import { api } from "./client";
import type { ApiResult } from "./core";
import type { components } from "./schema";

type VerificationLevel = components["schemas"]["VerificationLevel"];
export type OrderStatus = components["schemas"]["OrderStatus"];
export type PaymentStatus = components["schemas"]["PaymentStatus"];

export type DeliveryMethod = "STORE_PICKUP" | "VENDOR_DELIVERY";
// ONLINE = card on the gateway's own page. BKASH / NAGAD: no gateway yet; the order is placed with
// payment PENDING and the admin marks it paid. NAGAD needs the backend update (checkout.schema.js).
export type PaymentMethod = "ONLINE" | "PAY_AT_STORE" | "CASH_ON_DELIVERY" | "BKASH" | "NAGAD";

export const ORDER_STATUSES: OrderStatus[] = [
  "PLACED",
  "CONFIRMED",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
  "COMPLETED",
  "CANCELLED",
];

// Same as the backend (DELIVERY_FEE, taka per shop that delivers). Shown before ordering;
// the confirmation always shows the server's own numbers.
export const DELIVERY_FEE = 60;

// Exact shape of formatOrder() in checkout.service.js
export type Order = {
  id: string;
  orderNumber: string;
  checkoutId: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  deliveryMethod: DeliveryMethod;
  deliveryAddress: string | null;
  deliveryFee: number;
  subtotal: number;
  total: number;
  createdAt: string;
  shop: {
    id: string;
    name: string;
    slug: string;
    phone: string | null; // null for shops created before phones were required
    logoUrl: string | null;
    levelFloor: string | null;
    shopNumber: string | null;
    addressLine: string;
    verificationLevel: VerificationLevel;
  };
  items: { id: string; title: string; unitPrice: number; quantity: number; lineTotal: number; bargained: boolean; variantLabel?: string | null; productId?: string; productSlug?: string }[];

};

export type CheckoutResult = { checkoutId: string; totalAmount: number; createdAt?: string; orders: Order[] };

// Only choices are sent: never prices, items or quantities (the server builds the orders from the cart).
export type ShopChoice = {
  shopId: string;
  deliveryMethod: DeliveryMethod;
  paymentMethod: PaymentMethod;
  deliveryAddress?: string;
  // bKash / Nagad only: the customer's wallet number and, if already sent, the transaction ID.
  // Card details are never sent to us: they are typed on the payment gateway's page.
  paymentDetails?: { walletNumber: string; transactionId?: string };
};

export const checkoutKeys = {
  checkout: (checkoutId: string) => ["checkout", checkoutId] as const,
  orders: (status: OrderStatus | undefined, page: number) => ["orders", status ?? "ALL", page] as const,
};

// The key makes a retry return the first result instead of creating the orders twice.
export function placeOrders({ shops, key }: { shops: ShopChoice[]; key: string }): Promise<CheckoutResult> {
  return api.post<CheckoutResult>("/checkout", { shops }, { headers: { "Idempotency-Key": key } });
}

export function getCheckout(checkoutId: string): Promise<CheckoutResult> {
  return api.get<CheckoutResult>(`/checkouts/${encodeURIComponent(checkoutId)}`);
}

export function payMockOrder(orderId: string): Promise<Order> {
  return api.post<Order>(`/orders/${encodeURIComponent(orderId)}/pay-mock`);
}

// The logged-in customer's own orders (the backend never returns anyone else's).
export function listOrders(query: { status?: OrderStatus; page: number; limit: number }): Promise<ApiResult<Order[]>> {
  return api.list<Order>("/orders", { query });
}


// The customer cancels their own order (only while PLACED; the backend checks both).
export function cancelOrder(orderId: string, reason?: string): Promise<Order> {
  return api.post<Order>(`/orders/${encodeURIComponent(orderId)}/cancel`, reason ? { reason } : {});
}
// ---------- Admin: orders the vendor has approved (CONFIRMED and later) ----------
export type AdminOrder = Order & { customer: { id: string; name: string; phone: string | null } | null };
export type AdminOrderUpdate = { status?: OrderStatus; paymentStatus?: PaymentStatus };

export const adminOrderKeys = {
  all: ["admin", "orders"] as const,
  list: (status: OrderStatus | undefined, page: number) => ["admin", "orders", status ?? "ALL", page] as const,
};

export function adminListOrders(query: { status?: OrderStatus; page: number; limit: number }): Promise<ApiResult<AdminOrder[]>> {
  return api.list<AdminOrder>("/admin/orders", { query });
}

export function adminUpdateOrder(orderId: string, body: AdminOrderUpdate): Promise<AdminOrder> {
  return api.patch<AdminOrder>(`/admin/orders/${encodeURIComponent(orderId)}`, body);
}

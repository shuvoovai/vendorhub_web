import "client-only";
import { api } from "./client";

// FREE: every shop starts here, no payment. PRO: paid by bKash / Nagad to our merchant number
// (GET /payment-options); the request stays PENDING until an admin checks the money and approves it.
export type PlanCode = "FREE" | "PRO";
export type SubscriptionRequestStatus = "PENDING" | "APPROVED" | "REJECTED";
export type SubscriptionPayMethod = "BKASH" | "NAGAD";

// Exact shape of GET /subscription-plans. Prices and limits always come from the server.
export type SubscriptionPlan = {
  code: PlanCode;
  maxListings: number | null; // null = unlimited
  flashDeals: boolean; // may request flash deals
  featuredBadge: boolean; // "Pro shop" badge and higher place in search
  prices: { months: number; amount: number }[]; // empty for FREE
};

export type SubscriptionRequest = {
  id: string;
  plan: PlanCode;
  months: number;
  amount: number; // set by the server from the plan price
  method: SubscriptionPayMethod;
  walletNumber: string;
  transactionId: string;
  status: SubscriptionRequestStatus;
  rejectReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

// Exact shape of GET /shops/:shopId/subscription (shop owner only).
export type ShopSubscription = {
  plan: PlanCode; // FREE again once a PRO period has ended
  currentPeriodEnd: string | null; // ISO; null on FREE
  listingsUsed: number;
  pendingRequest: SubscriptionRequest | null;
  lastRejected: SubscriptionRequest | null; // newest rejected request, if it is newer than the last approval
};

export type SubscriptionRequestInput = {
  plan: "PRO";
  months: number; // one of the plan's prices[].months
  method: SubscriptionPayMethod;
  walletNumber: string; // 01XXXXXXXXX
  transactionId: string; // 8–12 letters or digits
};

export const subscriptionKeys = {
  plans: ["subscription-plans"] as const,
  shop: (shopId: string) => ["shop-subscription", shopId] as const,
};

export function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  return api.get<SubscriptionPlan[]>("/subscription-plans", { auth: false });
}

export function getShopSubscription(shopId: string): Promise<ShopSubscription> {
  return api.get<ShopSubscription>(`/shops/${encodeURIComponent(shopId)}/subscription`);
}

/** Upgrade or extend PRO. Only one PENDING request per shop (409 otherwise). */
export function requestSubscription(shopId: string, input: SubscriptionRequestInput): Promise<SubscriptionRequest> {
  return api.post<SubscriptionRequest>(`/shops/${encodeURIComponent(shopId)}/subscription/requests`, input);
}

/** Withdraw a PENDING request (before the admin has looked at it). */
export function withdrawSubscriptionRequest(shopId: string, id: string): Promise<void> {
  return api.delete<void>(`/shops/${encodeURIComponent(shopId)}/subscription/requests/${encodeURIComponent(id)}`);
}

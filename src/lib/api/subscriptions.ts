import "client-only";
import { api } from "./client";
import type { ApiResult } from "./core";

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
  admin: (status: SubscriptionRequestStatus, page: number) => ["admin-subscriptions", status, page] as const,
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

// ---------- Admin ----------
// ADMIN ONLY: walletNumber / transactionId let the admin find the money in the bKash / Nagad account.
export type AdminSubscriptionRequest = SubscriptionRequest & {
  shop: { id: string; name: string; slug: string };
};

export function adminListSubscriptionRequests(
  status: SubscriptionRequestStatus,
  page: number,
): Promise<ApiResult<AdminSubscriptionRequest[]>> {
  return api.list<AdminSubscriptionRequest>("/admin/subscriptions/requests", { query: { status, page, limit: 20 } });
}

/** APPROVE extends the shop's Pro period by the request's months; REJECT needs a reason the owner sees. */
export function reviewSubscriptionRequest(
  id: string,
  body: { decision: "APPROVE" } | { decision: "REJECT"; reason: string },
): Promise<AdminSubscriptionRequest> {
  return api.patch<AdminSubscriptionRequest>(`/admin/subscriptions/requests/${encodeURIComponent(id)}/review`, body);
}

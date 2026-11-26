import "client-only";
import { api } from "./client";
import type { ApiResult } from "./core";

// PENDING until an admin approves; only APPROVED deals are live (home page, prices, checkout).
export type DealStatus = "PENDING" | "APPROVED" | "REJECTED";

// Exact shape of present() in deals.service.js
export type Deal = {
  id: string;
  listingId: string;
  dealPrice: number;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  stockLimit: number | null;
  soldQty: number;
  status: DealStatus;
  rejectReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  listing?: {
    id: string;
    price: number;
    shop: { id: string; name: string; slug: string };
    product: { id: string; slug: string; title: string; image: string | null };
  };
};

export type DealInput = {
  listingId: string;
  dealPrice: number;
  startsAt: string; // ISO
  endsAt: string; // ISO, after startsAt and at most 7 days later
  stockLimit?: number | null;
};

export const MAX_DEAL_DAYS = 7; // same as the backend

export const dealKeys = {
  admin: (status: DealStatus, page: number) => ["admin-deals", status, page] as const,
  shop: (shopId: string) => ["shop-deals", shopId] as const,
};

// ---------- Shop team ----------
export function listShopDeals(shopId: string): Promise<Deal[]> {
  return api.get<Deal[]>(`/shops/${encodeURIComponent(shopId)}/deals`);
}

/** A request: the deal is PENDING until an admin approves it. */
export function requestDeal(shopId: string, input: DealInput): Promise<Deal> {
  return api.post<Deal>(`/shops/${encodeURIComponent(shopId)}/deals`, input);
}

/** Pause / resume keeps the approval; changing price or dates sends it back for review. */
export function setDealActive(shopId: string, id: string, isActive: boolean): Promise<Deal> {
  return api.patch<Deal>(`/shops/${encodeURIComponent(shopId)}/deals/${encodeURIComponent(id)}`, { isActive });
}

export function deleteShopDeal(shopId: string, id: string): Promise<void> {
  return api.delete<void>(`/shops/${encodeURIComponent(shopId)}/deals/${encodeURIComponent(id)}`);
}

// ---------- Admin ----------
export function adminListDeals(status: DealStatus, page: number): Promise<ApiResult<Deal[]>> {
  return api.list<Deal>("/admin/deals", { query: { status, page, limit: 20 } });
}

export function reviewDeal(id: string, body: { decision: "APPROVE" } | { decision: "REJECT"; reason: string }): Promise<Deal> {
  return api.patch<Deal>(`/admin/deals/${encodeURIComponent(id)}/review`, body);
}

export function adminDeleteDeal(id: string): Promise<void> {
  return api.delete<void>(`/admin/deals/${encodeURIComponent(id)}`);
}

import "client-only";
import { api } from "./client";
import { publicGet } from "./public";
import type { components } from "./schema";

type Availability = components["schemas"]["Availability"];

/** Availability the shop may set by hand when it doesn't count stock. */
// ---------- Variants (color, size, …) ----------
// A listing may offer options, e.g. Color: Red, Blue and Size: S, M, L.
// Each combination is one variant with its own stock and (optionally) its own price.
export const MAX_VARIANT_OPTIONS = 3;
export const MAX_OPTION_VALUES = 20;
export type VariantOption = { name: string; values: string[] };
export type VariantInput = {
  options: Record<string, string>; // e.g. { Color: "Red", Size: "M" }
  price: number | null; // null = the listing price
  stockQty: number | null; // null when the listing doesn't count stock
  isActive: boolean;
};
export type OwnerVariant = VariantInput & { id: string };

export type ManualAvailability = "AVAILABLE" | "LIMITED" | "OUT_OF_STOCK";

// Who sees the number of items in stock: everyone, only vendors (shop teams), or only this shop's team.
export type StockVisibility = "PUBLIC" | "VENDORS" | "HIDDEN";

// The shop team's view of a listing (includes the private fields stockQty, minOfferPercent, isActive).
export type OwnerListing = {
  id: string;
  shopId: string;
  productId: string;
  price: number;
  availability: Availability;
  stockQty: number | null;
  stockVisibility?: StockVisibility; // missing until the backend supports it
  bargainEnabled: boolean;
  minOfferPercent: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  product: { id: string; slug: string; title: string; msrp: number | null; images: string[] };
  variantOptions?: VariantOption[]; // empty or missing = no variants
  variants?: OwnerVariant[];
};

/** A product from the public catalog search, for "Add a product". */
export type CatalogPick = {
  id: string;
  slug: string;
  title: string;
  brand?: string | null;
  image?: string | null;
  msrp?: number | null;
};

export type ListingInput = {
  price: number;
  stockQty: number | null;
  availability?: ManualAvailability; // only when stock is not counted
  stockVisibility?: StockVisibility;
  bargainEnabled: boolean;
  minOfferPercent: number;
  // Both empty = no variants. The server matches existing variants by their options.
  variantOptions?: VariantOption[];
  variants?: VariantInput[];
};

export const listingKeys = {
  mine: (shopId: string) => ["owner", "listings", shopId] as const,
  catalog: (term: string) => ["owner", "catalog-search", term] as const,
};

const base = (shopId: string) => `/shops/${encodeURIComponent(shopId)}/listings`;

export function listOwnerListings(shopId: string): Promise<OwnerListing[]> {
  return api.get<OwnerListing[]>(base(shopId));
}

export function createListing(shopId: string, productId: string, input: ListingInput): Promise<OwnerListing> {
  return api.post<OwnerListing>(base(shopId), { productId, ...input });
}

export function updateListing(
  shopId: string,
  listingId: string,
  patch: Partial<ListingInput> & { isActive?: boolean },
): Promise<OwnerListing> {
  return api.patch<OwnerListing>(`${base(shopId)}/${encodeURIComponent(listingId)}`, patch);
}

// Public catalog search (the same one customers use).
export async function searchCatalog(term: string): Promise<CatalogPick[]> {
  return (await publicGet<CatalogPick[]>("/products", { q: term, limit: 8 })).data;
}



// ---------- Shop-made products ----------

export type SimilarProduct = { id: string; slug: string; title: string; brand?: { name: string } | null; image?: string | null };

export type NewProductInput = {
  title: string;
  categoryId: string;
  brandId?: string;
  description?: string;
  specs?: Record<string, string>;
  msrp?: number;
  listing: ListingInput;
};

const shopProducts = (shopId: string) => `/shops/${encodeURIComponent(shopId)}/products`;

export function findSimilarProducts(shopId: string, title: string): Promise<SimilarProduct[]> {
  return api.get<SimilarProduct[]>(`${shopProducts(shopId)}/similar`, { query: { title } });
}

// Creates the product and this shop's listing in one go (live at once).
export function createShopProduct(shopId: string, input: NewProductInput): Promise<{ product: { id: string; slug: string; title: string } }> {
  return api.post<{ product: { id: string; slug: string; title: string } }>(shopProducts(shopId), input);
}

// One real image per call; the server checks and re-draws it as WebP.
export function uploadShopProductPhoto(shopId: string, productId: string, file: File): Promise<unknown> {
  const body = new FormData();
  body.append("image", file);
  return api.put<unknown>(`${shopProducts(shopId)}/${encodeURIComponent(productId)}/images`, body);
}
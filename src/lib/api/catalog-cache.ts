import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { listProducts, type Brand, type Category, type ProductCardData } from "./catalog";
import { publicGet } from "./public";
import type { Market } from "./shops";
import { PAGE_SIZE } from "@/lib/search-params";

// Lists that rarely change: cached 10 minutes, served stale up to 5 minutes while refreshing.
const SLOW_CHANGING = { stale: 300, revalidate: 600, expire: 3600 };

/**
 * Home page "All products": a random mix from the whole catalogue (sort=random). The seed changes every
 * 10 minutes, so everyone shares one cache entry per seed and the API is asked about once a minute.
 * The same seed on /search page 2 continues this order without repeating a product.
 * Errors are not cached (the next visit tries again).
 */
export async function getMixedProducts(seed: string): Promise<ProductCardData[]> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 60, expire: 600 }); // seconds
  cacheTag("products");

  const { data } = await listProducts({ sort: "random", seed, availableOnly: true, limit: PAGE_SIZE }, { fresh: false });
  return data;
}

export async function getCategories(): Promise<Category[]> {
  "use cache";
  cacheLife(SLOW_CHANGING);
  cacheTag("catalog");
  return (await publicGet<Category[]>("/categories", undefined, { fresh: false })).data;
}

export async function getBrands(): Promise<Brand[]> {
  "use cache";
  cacheLife(SLOW_CHANGING);
  cacheTag("catalog");
  return (await publicGet<Brand[]>("/brands", undefined, { fresh: false })).data;
}

export async function getMarkets(): Promise<Market[]> {
  "use cache";
  cacheLife(SLOW_CHANGING);
  cacheTag("markets");
  return (await publicGet<Market[]>("/markets", undefined, { fresh: false })).data;
}
export type Banner = {
  id: string;
  imageUrl: string | null; // photo banner (null on a video-only banner)
  videoUrl?: string | null; // video banner (MP4/WebM, same media origin)
  titleEn: string | null;
  titleBn: string | null;
  textEn: string | null;
  textBn: string | null;
  ctaEn: string | null;
  ctaBn: string | null;
  href: string;
};

// Home page slider: the same for everyone, refreshed about once a minute.
export async function getBanners(): Promise<Banner[]> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 60, expire: 600 });
  cacheTag("banners");
  return (await publicGet<Banner[]>("/banners", undefined, { fresh: false })).data;
}

// A product on sale for a short time. Prices come from the server.
export type FlashDeal = ProductCardData & { dealPrice: number; originalPrice: number; dealEndsAt: string };

export async function getFlashDeals(): Promise<FlashDeal[]> {
  "use cache";
  cacheLife({ stale: 30, revalidate: 30, expire: 300 }); // deals end, so refresh often
  cacheTag("deals");
  try {
    return (await publicGet<FlashDeal[]>("/deals/flash", { limit: 10 }, { fresh: false })).data;
  } catch {
    return []; // no deals endpoint yet, or the API is down: the section stays hidden
  }
}

export async function getNewArrivals(): Promise<ProductCardData[]> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 60, expire: 600 });
  cacheTag("products");
  const { data } = await listProducts({ sort: "newest", availableOnly: true, limit: 10 }, { fresh: false });
  return data;
}

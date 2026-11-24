// Home page slider banners: admin list, create, edit, reorder, delete.
// Each banner is either a photo or a video (never both).
import { api } from "./client";
import type { Banner } from "./catalog-cache";

export type BannerMedia = "IMAGE" | "VIDEO";

export type AdminBanner = Banner & {
  thumbUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BannerFields = {
  titleEn: string;
  titleBn: string;
  textEn: string;
  textBn: string;
  ctaEn: string;
  ctaBn: string;
  href: string;
  isActive: boolean;
  startsAt: string; // "" = no start date
  endsAt: string; // "" = no end date
};

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const VIDEO_TYPES = ["video/mp4", "video/webm"];
export const MAX_IMAGE_MB = 3;
export const MAX_VIDEO_MB = 20;

function toForm(
  fields: BannerFields,
  files: { image?: File | null; video?: File | null },
) {
  const body = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (k === "startsAt" || k === "endsAt") {
      // date input (YYYY-MM-DD) -> start/end of that day in Dhaka
      body.append(k, v ? `${v}T${k === "startsAt" ? "00:00:00" : "23:59:59"}+06:00` : "");
    } else body.append(k, String(v));
  }
  if (files.image) body.append("image", files.image);
  if (files.video) body.append("video", files.video);
  return body;
}

export const adminListBanners = () => api.get<AdminBanner[]>("/admin/banners");
// Send exactly one file: "image" or "video".
export const adminCreateBanner = (fields: BannerFields, media: { image?: File; video?: File }) =>
  api.post<AdminBanner>("/admin/banners", toForm(fields, media));
export const adminUpdateBanner = (
  id: string,
  fields: BannerFields,
  // A new file switches the banner to that type; the server deletes the other file.
  files: { image?: File | null; video?: File | null },
) => api.patch<AdminBanner>(`/admin/banners/${encodeURIComponent(id)}`, toForm(fields, files));
export const adminSetBannerActive = (id: string, isActive: boolean) =>
  api.patch<AdminBanner>(`/admin/banners/${encodeURIComponent(id)}`, { isActive });
export const adminDeleteBanner = (id: string) =>
  api.delete<unknown>(`/admin/banners/${encodeURIComponent(id)}`);
export const adminReorderBanners = (ids: string[]) =>
  api.patch<unknown>("/admin/banners/reorder", { ids });

export const bannerKeys = { admin: ["admin", "banners"] as const };

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  Film,
  ImageIcon,
  Inbox,
  LoaderCircle,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { TextField } from "@/components/ui/text-field";
import {
  IMAGE_TYPES,
  MAX_IMAGE_MB,
  MAX_VIDEO_MB,
  VIDEO_TYPES,
  adminCreateBanner,
  adminDeleteBanner,
  adminListBanners,
  adminReorderBanners,
  adminSetBannerActive,
  adminUpdateBanner,
  bannerKeys,
  type AdminBanner,
  type BannerFields,
  type BannerMedia,
} from "@/lib/api/banners";
import { ApiError } from "@/lib/api/core";
import { safeMediaUrl } from "@/lib/api/storefront";
import { refreshPublicPages } from "@/lib/refresh-public";
import { cn } from "@/lib/utils";

const btn = (tone: "primary" | "outline" | "danger" | "icon") =>
  cn(
    "type-body-medium flex h-11 items-center justify-center gap-2 rounded-sm focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none disabled:opacity-50",
    tone === "primary" &&
      "bg-action px-5 text-primary-foreground hover:bg-action-hover",
    tone === "outline" && "border border-brand px-4 text-brand hover:bg-subtle",
    tone === "danger" && "border border-error px-4 text-error hover:bg-subtle",
    tone === "icon" &&
      "w-11 border border-line-strong text-ink hover:border-brand",
  );

function errorText(err: unknown, t: (k: string) => string) {
  if (err instanceof ApiError && err.status === 400) return t("errors.checkFields");
  if (err instanceof ApiError && err.status === 413) return t("errors.tooBig");
  if (err instanceof ApiError && err.status === 0) return t("errors.network");
  return t("errors.generic");
}

// Admin list of home page banners: add, edit, show/hide, reorder, delete.
export function BannersManager() {
  const t = useTranslations("AdminBanners");
  const qc = useQueryClient();
  const [editing, setEditing] = useState<AdminBanner | "new" | null>(null);
  const [deleting, setDeleting] = useState<AdminBanner | null>(null);
  const query = useQuery({ queryKey: bannerKeys.admin, queryFn: adminListBanners });
  const done = () => {
    qc.invalidateQueries({ queryKey: bannerKeys.admin });
    refreshPublicPages(["banners"]); // home page shows the change right away
  };

  const toggle = useMutation({
    mutationFn: (b: AdminBanner) => adminSetBannerActive(b.id, !b.isActive),
    onSettled: done,
  });
  const reorder = useMutation({ mutationFn: adminReorderBanners, onSettled: done });
  const remove = useMutation({
    mutationFn: (id: string) => adminDeleteBanner(id),
    onSuccess: () => setDeleting(null),
    onSettled: done,
  });
  const failed = toggle.error ?? reorder.error ?? remove.error;

  const move = (list: AdminBanner[], i: number, dir: -1 | 1) => {
    const ids = list.map((b) => b.id);
    [ids[i], ids[i + dir]] = [ids[i + dir], ids[i]];
    reorder.mutate(ids);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="type-caption text-ink-muted">{t("rules")}</p>
        <button type="button" onClick={() => setEditing("new")} className={btn("primary")}>
          <Plus className="size-4" aria-hidden />
          {t("add")}
        </button>
      </div>
      {failed && (
        <p role="alert" className="type-caption text-error">
          {errorText(failed, t)}
        </p>
      )}

      {query.isPending ? (
        <div className="flex flex-col gap-3" aria-hidden>
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="skeleton h-28 rounded-md" />
          ))}
        </div>
      ) : query.isError || query.data.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-line-strong bg-card px-4 py-10 text-center">
          <Inbox className="size-7 text-highlight" strokeWidth={1.5} aria-hidden />
          <p className="type-body-medium text-ink">
            {t(query.isError ? "loadError" : "empty")}
          </p>
          {query.isError ? (
            <button type="button" onClick={() => query.refetch()} className={btn("outline")}>
              {t("retry")}
            </button>
          ) : (
            <p className="type-caption text-ink-muted">{t("emptyHint")}</p>
          )}
        </div>
      ) : (
        <ol className="flex flex-col gap-3">
          {query.data.map((b, i, list) => {
            const name = b.titleEn || b.titleBn || t("untitled");
            const thumb = safeMediaUrl(b.thumbUrl) ?? safeMediaUrl(b.imageUrl);
            return (
              <li
                key={b.id}
                className="flex flex-col gap-3 rounded-md border border-line bg-card p-3 sm:flex-row sm:items-center"
              >
                <div className="relative aspect-[3/1] w-full shrink-0 overflow-hidden rounded-sm bg-subtle sm:w-48">
                  {thumb ? (
                    <Image src={thumb} alt="" fill unoptimized sizes="192px" className="object-cover" />
                  ) : b.videoUrl && safeMediaUrl(b.videoUrl) ? (
                    <video
                      src={safeMediaUrl(b.videoUrl)!}
                      muted
                      playsInline
                      preload="metadata"
                      aria-hidden
                      className="absolute inset-0 size-full object-cover"
                    />
                  ) : null}
                  <span className="type-caption absolute bottom-1 left-1 flex items-center gap-1 rounded-sm bg-card/90 px-1.5 text-ink">
                    {b.videoUrl ? (
                      <Film className="size-3.5" aria-hidden />
                    ) : (
                      <ImageIcon className="size-3.5" aria-hidden />
                    )}
                    {t(b.videoUrl ? "video" : "image")}
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="type-body-medium line-clamp-1 text-ink">{name}</p>
                  <p className="type-caption line-clamp-1 text-ink-secondary">{b.titleBn}</p>
                  <p className="type-caption text-ink-muted">
                    {b.href}
                    {(b.startsAt || b.endsAt) &&
                      ` · ${b.startsAt?.slice(0, 10) ?? "…"} → ${b.endsAt?.slice(0, 10) ?? "…"}`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="type-caption flex min-h-11 cursor-pointer items-center gap-2 px-1 text-ink">
                    <input
                      type="checkbox"
                      checked={b.isActive}
                      disabled={toggle.isPending}
                      onChange={() => toggle.mutate(b)}
                      className="size-5 accent-brand"
                    />
                    {t("active")}
                  </label>
                  <button
                    type="button"
                    disabled={i === 0 || reorder.isPending}
                    onClick={() => move(list, i, -1)}
                    aria-label={t("moveUp", { title: name })}
                    className={btn("icon")}
                  >
                    <ArrowUp className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    disabled={i === list.length - 1 || reorder.isPending}
                    onClick={() => move(list, i, 1)}
                    aria-label={t("moveDown", { title: name })}
                    className={btn("icon")}
                  >
                    <ArrowDown className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(b)}
                    aria-label={t("editOf", { title: name })}
                    className={btn("icon")}
                  >
                    <Pencil className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(b)}
                    aria-label={t("deleteOf", { title: name })}
                    className={cn(btn("icon"), "text-error hover:border-error")}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          {editing && (
            <BannerForm
              key={editing === "new" ? "new" : editing.id}
              banner={editing === "new" ? null : editing}
              onDone={() => {
                setEditing(null);
                done();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle className="type-h3 text-ink">{t("deleteTitle")}</DialogTitle>
          <DialogDescription className="type-body text-ink-secondary">
            {t("deleteText", { title: deleting ? deleting.titleEn || deleting.titleBn || t("untitled") : "" })}
          </DialogDescription>
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => setDeleting(null)} className={btn("outline")}>
              {t("cancel")}
            </button>
            <button
              type="button"
              disabled={remove.isPending}
              onClick={() => deleting && remove.mutate(deleting.id)}
              className={btn("danger")}
            >
              {remove.isPending && <LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden />}
              {t("delete")}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const DATE = /^(\d{4}-\d{2}-\d{2})?$/;
const HREF = /^\/(?![/\\])[^\s]*$/;

function checkFile(file: File | null, types: string[], maxMb: number) {
  if (!file) return null;
  if (!types.includes(file.type)) return "type";
  if (file.size > maxMb * 1024 * 1024) return "size";
  return null;
}

function BannerForm({ banner, onDone }: { banner: AdminBanner | null; onDone: () => void }) {
  const t = useTranslations("AdminBanners");
  const current: BannerMedia = banner?.videoUrl ? "VIDEO" : "IMAGE";
  const [kind, setKind] = useState<BannerMedia>(current);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const schema = useMemo(() => {
    // Every text is optional: a photo/video banner can have no text at all.
    const text = (max: number) =>
      z
        .string()
        .trim()
        .max(max, { error: t("errors.text", { max }) });
    return z
      .object({
        titleEn: text(80),
        titleBn: text(80),
        textEn: text(160),
        textBn: text(160),
        ctaEn: text(30),
        ctaBn: text(30),
        href: z.string().trim().max(200).regex(HREF, { error: t("errors.href") }),
        isActive: z.boolean(),
        startsAt: z.string().regex(DATE),
        endsAt: z.string().regex(DATE),
      })
      .refine((v) => !v.startsAt || !v.endsAt || v.startsAt <= v.endsAt, {
        path: ["endsAt"],
        error: t("errors.dates"),
      });
  }, [t]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BannerFields>({
    resolver: zodResolver(schema),
    defaultValues: {
      titleEn: banner?.titleEn ?? "",
      titleBn: banner?.titleBn ?? "",
      textEn: banner?.textEn ?? "",
      textBn: banner?.textBn ?? "",
      ctaEn: banner?.ctaEn ?? "",
      ctaBn: banner?.ctaBn ?? "",
      href: banner?.href ?? "/search",
      isActive: banner?.isActive ?? true,
      startsAt: banner?.startsAt?.slice(0, 10) ?? "",
      endsAt: banner?.endsAt?.slice(0, 10) ?? "",
    },
  });

  const save = useMutation({
    mutationFn: (fields: BannerFields) =>
      banner
        ? adminUpdateBanner(banner.id, fields, kind === "IMAGE" ? { image: file } : { video: file })
        : adminCreateBanner(fields, kind === "IMAGE" ? { image: file! } : { video: file! }),
    onSuccess: onDone,
  });

  const onSubmit = handleSubmit((fields) => {
    const isImage = kind === "IMAGE";
    // New banner, or switching photo <-> video: a file is needed.
    if (!file && (!banner || kind !== current))
      return setFileError(t(isImage ? "errors.imageRequired" : "errors.videoRequired"));
    const err = isImage
      ? checkFile(file, IMAGE_TYPES, MAX_IMAGE_MB)
      : checkFile(file, VIDEO_TYPES, MAX_VIDEO_MB);
    if (err)
      return setFileError(
        t(`errors.${isImage ? "image" : "video"}_${err}`, {
          max: isImage ? MAX_IMAGE_MB : MAX_VIDEO_MB,
        }),
      );
    setFileError(null);
    save.mutate(fields);
  });

  const fileClass =
    "type-caption w-full rounded-sm border border-line-strong bg-card p-2 text-ink file:mr-3 file:h-9 file:rounded-sm file:border-0 file:bg-subtle file:px-3 file:text-ink focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none";

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 pr-8">
        <DialogTitle className="type-h3 text-ink">{t(banner ? "editTitle" : "addTitle")}</DialogTitle>
        <DialogDescription className="type-caption text-ink-muted">{t("formHint")}</DialogDescription>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="type-body-medium mb-2 text-ink">{t("mediaType")}</legend>
        <div className="grid grid-cols-2 gap-1 rounded-full border border-highlight/50 bg-card p-1">
          {(["IMAGE", "VIDEO"] as const).map((k) => {
            const Icon = k === "IMAGE" ? ImageIcon : Film;
            return (
              <label
                key={k}
                className={cn(
                  "type-body-medium flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand",
                  kind === k
                    ? "bg-action text-primary-foreground"
                    : "text-ink-secondary hover:bg-subtle",
                )}
              >
                <input
                  type="radio"
                  name="banner-kind"
                  value={k}
                  checked={kind === k}
                  onChange={() => {
                    setKind(k);
                    setFile(null);
                    setFileError(null);
                  }}
                  className="sr-only"
                />
                <Icon className="size-4" aria-hidden />
                {t(k === "IMAGE" ? "image" : "video")}
              </label>
            );
          })}
        </div>
        <label htmlFor="banner-file" className="type-body-medium mt-2 text-ink">
          {t(
            kind === "IMAGE"
              ? banner && current === "IMAGE" ? "imageReplace" : "imageField"
              : banner && current === "VIDEO" ? "videoReplace" : "videoField",
          )}
        </label>
        <input
          key={kind}
          id="banner-file"
          type="file"
          accept={(kind === "IMAGE" ? IMAGE_TYPES : VIDEO_TYPES).join(",")}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className={fileClass}
        />
        <p className="type-caption text-ink-muted">
          {kind === "IMAGE"
            ? t("imageHint", { max: MAX_IMAGE_MB })
            : t("videoHint", { max: MAX_VIDEO_MB })}
        </p>
        {banner && kind !== current && (
          <p className="type-caption text-highlight">{t("switchNote")}</p>
        )}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label={t("titleEn")} maxLength={80} error={errors.titleEn?.message} {...register("titleEn")} />
        <TextField label={t("titleBn")} maxLength={80} error={errors.titleBn?.message} {...register("titleBn")} />
        <TextField label={t("textEn")} maxLength={160} error={errors.textEn?.message} {...register("textEn")} />
        <TextField label={t("textBn")} maxLength={160} error={errors.textBn?.message} {...register("textBn")} />
        <TextField label={t("ctaEn")} maxLength={30} error={errors.ctaEn?.message} {...register("ctaEn")} />
        <TextField label={t("ctaBn")} maxLength={30} error={errors.ctaBn?.message} {...register("ctaBn")} />
      </div>
      <TextField
        label={t("href")}
        maxLength={200}
        hint={t("hrefHint")}
        error={errors.href?.message}
        {...register("href")}
      />
      <div className="grid grid-cols-2 gap-3">
        <TextField label={t("startsAt")} type="date" error={errors.startsAt?.message} {...register("startsAt")} />
        <TextField label={t("endsAt")} type="date" error={errors.endsAt?.message} {...register("endsAt")} />
      </div>
      <label className="type-body flex min-h-11 items-center gap-2 text-ink">
        <input type="checkbox" className="size-5 accent-brand" {...register("isActive")} />
        {t("activeField")}
      </label>

      {(fileError || save.error) && (
        <p role="alert" className="type-caption text-error">
          {fileError ?? errorText(save.error, t)}
        </p>
      )}
      <button type="submit" disabled={save.isPending} className={btn("primary")}>
        {save.isPending && <LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden />}
        {t(save.isPending ? "uploading" : "save")}
      </button>
    </form>
  );
}

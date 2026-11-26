"use client";

import { ImageOff } from "lucide-react";
import Image from "next/image";
import { useFormatter, useLocale, useNow, useTranslations } from "next-intl";
import type { Deal } from "@/lib/api/deals";
import { safeMediaUrl } from "@/lib/api/storefront";
import { formatTaka } from "@/lib/format";
import { cn } from "@/lib/utils";

type Phase = "pending" | "rejected" | "paused" | "upcoming" | "live" | "ended";

/** Where a deal stands right now (reads the time, so it renders inside Suspense). */
export function useDealPhase(deal: Deal): Phase {
  const now = useNow({ updateInterval: 60_000 });
  if (deal.status === "PENDING") return "pending";
  if (deal.status === "REJECTED") return "rejected";
  if (new Date(deal.endsAt) <= now) return "ended";
  if (!deal.isActive) return "paused";
  return new Date(deal.startsAt) > now ? "upcoming" : "live";
}

const TONE: Record<Phase, string> = {
  pending: "bg-highlight-soft text-highlight",
  rejected: "bg-subtle text-error",
  paused: "bg-subtle text-ink-muted",
  upcoming: "bg-info-soft text-verified",
  live: "bg-success-soft text-success-ink",
  ended: "bg-subtle text-ink-muted",
};

/** Photo, product, shop, deal price vs regular price, time window, sales and status. */
export function DealSummary({ deal, phase, showShop = false }: { deal: Deal; phase: Phase; showShop?: boolean }) {
  const t = useTranslations("DealForm");
  const locale = useLocale();
  const format = useFormatter();
  const src = safeMediaUrl(deal.listing?.product.image ?? null);
  const when = (iso: string) => format.dateTime(new Date(iso), { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="flex min-w-0 gap-3">
      <div className="relative size-20 shrink-0 overflow-hidden rounded-t-full rounded-b-sm bg-subtle">
        {src ? (
          <Image src={src} alt="" fill unoptimized sizes="5rem" className="object-cover" />
        ) : (
          <ImageOff className="absolute inset-0 m-auto size-6 text-highlight" strokeWidth={1.25} aria-hidden />
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <span className={cn("type-caption self-start rounded-sm px-2 py-0.5", TONE[phase])}>{t(`phase.${phase}`)}</span>
        <p className="type-body-medium line-clamp-2 text-ink">{deal.listing?.product.title ?? "—"}</p>
        {showShop && deal.listing && <p className="type-caption text-ink-muted">{deal.listing.shop.name}</p>}
        <p className="type-body">
          <span className="type-price text-brand">{formatTaka(deal.dealPrice, locale)}</span>
          {deal.listing && <span className="type-caption ml-2 text-ink-muted line-through">{formatTaka(deal.listing.price, locale)}</span>}
        </p>
        <p className="type-caption text-ink-secondary">
          {when(deal.startsAt)} – {when(deal.endsAt)}
        </p>
        <p className="type-caption text-ink-secondary">
          {deal.stockLimit ? t("soldOf", { sold: deal.soldQty, limit: deal.stockLimit }) : t("sold", { sold: deal.soldQty })}
        </p>
        {deal.status === "REJECTED" && deal.rejectReason && (
          <p className="type-caption rounded-sm border border-error/40 bg-card px-2 py-1 text-error">{t("rejectedBecause", { reason: deal.rejectReason })}</p>
        )}
      </div>
    </div>
  );
}

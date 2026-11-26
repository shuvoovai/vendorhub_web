"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Zap } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState, type FormEvent } from "react";
import { TextField } from "@/components/ui/text-field";
import { ApiError } from "@/lib/api/core";
import { MAX_DEAL_DAYS, dealKeys, requestDeal } from "@/lib/api/deals";
import { listOwnerListings } from "@/lib/api/listings";
import { formatTaka } from "@/lib/format";
import { cn } from "@/lib/utils";

export const dealBtn = (tone: "primary" | "outline" | "danger") =>
  cn(
    "type-body-medium flex h-11 items-center justify-center gap-2 rounded-sm px-4 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none disabled:opacity-50",
    tone === "primary" && "bg-action text-primary-foreground hover:bg-action-hover",
    tone === "outline" && "border border-brand text-brand hover:bg-subtle",
    tone === "danger" && "border border-error text-error hover:bg-subtle",
  );
const SELECT =
  "type-body h-12 w-full rounded-sm border border-line-strong bg-card px-3 text-ink focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none disabled:opacity-60";
const HOUR = 60 * 60 * 1000;
// Only called from event handlers (submit), never while rendering.
const isPast = (ms: number) => ms <= Date.now();

// <input type="datetime-local"> wants local time without seconds: 2026-11-26T14:30
const toLocalInput = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function dealErrorText(err: unknown, t: (k: string) => string) {
  if (err instanceof ApiError) {
    if (err.status === 409) return t("errors.conflict");
    if (err.status === 400) return t("errors.checkFields");
    if (err.status === 404) return t("errors.notFound");
    if (err.status === 0) return t("errors.network");
  }
  return t("errors.generic");
}

type Form = { listingId: string; dealPrice: string; startsAt: string; endsAt: string; stockLimit: string };
type FormErrors = Partial<Record<keyof Form, string>>;

/** Shop team: ask for a flash deal on one of the shop's products. It waits for an admin's approval. */
export function DealRequestForm({ shopId, onDone }: { shopId: string; onDone: () => void }) {
  const t = useTranslations("DealForm");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const id = useId();
  // Defaults: starts now, ends in 24 hours (made when the form opens, not during a server render)
  const [form, setForm] = useState<Form>(() => {
    const now = Date.now();
    return { listingId: "", dealPrice: "", startsAt: toLocalInput(new Date(now)), endsAt: toLocalInput(new Date(now + 24 * HOUR)), stockLimit: "" };
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);

  const listings = useQuery({ queryKey: ["owner-listings", shopId], queryFn: () => listOwnerListings(shopId) });
  const active = (listings.data ?? []).filter((l) => l.isActive);
  const listing = active.find((l) => l.id === form.listingId);

  const send = useMutation({
    mutationFn: () =>
      requestDeal(shopId, {
        listingId: form.listingId,
        dealPrice: Number(form.dealPrice),
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        stockLimit: form.stockLimit.trim() ? Number(form.stockLimit) : null,
      }),
    onMutate: () => setApiError(null),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dealKeys.shop(shopId) });
      onDone();
    },
    onError: (err) => setApiError(dealErrorText(err, t)),
  });

  const set = (next: Partial<Form>) => {
    setForm((f) => ({ ...f, ...next }));
    setErrors({});
  };

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const errs: FormErrors = {};
    if (!form.listingId) errs.listingId = t("errors.listing");
    const price = Number(form.dealPrice);
    if (!Number.isInteger(price) || price < 1) errs.dealPrice = t("errors.price");
    else if (listing && price >= listing.price) errs.dealPrice = t("errors.priceLower", { price: formatTaka(listing.price, locale) });
    const start = new Date(form.startsAt).getTime();
    const end = new Date(form.endsAt).getTime();
    if (!Number.isFinite(start)) errs.startsAt = t("errors.date");
    if (!Number.isFinite(end)) errs.endsAt = t("errors.date");
    else if (end <= start) errs.endsAt = t("errors.endAfter");
    else if (end - start > MAX_DEAL_DAYS * 24 * HOUR) errs.endsAt = t("errors.maxDays", { days: MAX_DEAL_DAYS });
    else if (isPast(end)) errs.endsAt = t("errors.endFuture");
    if (form.stockLimit.trim()) {
      const n = Number(form.stockLimit);
      if (!Number.isInteger(n) || n < 1 || n > 100_000) errs.stockLimit = t("errors.stock");
    }
    setErrors(errs);
    if (Object.keys(errs).length === 0) send.mutate();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 rounded-md border border-gold bg-card p-4 shadow-card md:p-5">
      <div className="flex flex-col gap-1">
        <h2 className="type-h3 flex items-center gap-2 text-ink">
          <Zap className="size-5 text-highlight" aria-hidden />
          {t("title")}
        </h2>
        <p className="type-caption text-ink-muted">{t("reviewNote")}</p>
      </div>
      <fieldset disabled={send.isPending} className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1.5 md:col-span-2">
          <span className="type-body-medium text-ink">{t("product")}</span>
          <select
            className={SELECT}
            value={form.listingId}
            disabled={listings.isPending}
            onChange={(e) => set({ listingId: e.target.value })}
            aria-invalid={!!errors.listingId}
            aria-describedby={errors.listingId ? `${id}-listing-err` : undefined}
          >
            <option value="">{listings.isPending ? t("loading") : active.length === 0 ? t("noListings") : t("chooseProduct")}</option>
            {active.map((l) => (
              <option key={l.id} value={l.id}>
                {l.product.title} · {formatTaka(l.price, locale)}
              </option>
            ))}
          </select>
          {listings.isError && <p className="type-caption text-error">{t("errors.listingsLoad")}</p>}
          {errors.listingId && (
            <p id={`${id}-listing-err`} className="type-caption text-error">
              {errors.listingId}
            </p>
          )}
        </label>
        <TextField
          label={t("dealPrice")}
          hint={listing ? t("regularPrice", { price: formatTaka(listing.price, locale) }) : undefined}
          inputMode="numeric"
          value={form.dealPrice}
          onChange={(e) => set({ dealPrice: e.target.value.replace(/\D/g, "").slice(0, 8) })}
          error={errors.dealPrice}
        />
        <TextField
          label={t("stockLimit")}
          hint={t("stockHint")}
          inputMode="numeric"
          value={form.stockLimit}
          onChange={(e) => set({ stockLimit: e.target.value.replace(/\D/g, "").slice(0, 6) })}
          error={errors.stockLimit}
        />
        <TextField label={t("startsAt")} type="datetime-local" value={form.startsAt} onChange={(e) => set({ startsAt: e.target.value })} error={errors.startsAt} />
        <TextField
          label={t("endsAt")}
          hint={t("maxDaysHint", { days: MAX_DEAL_DAYS })}
          type="datetime-local"
          value={form.endsAt}
          onChange={(e) => set({ endsAt: e.target.value })}
          error={errors.endsAt}
        />
      </fieldset>
      {apiError && (
        <p role="alert" className="type-body text-error">
          {apiError}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={send.isPending} aria-busy={send.isPending} className={dealBtn("primary")}>
          {send.isPending ? t("sending") : t("send")}
        </button>
        <button type="button" onClick={onDone} disabled={send.isPending} className={dealBtn("outline")}>
          {t("cancel")}
        </button>
      </div>
    </form>
  );
}

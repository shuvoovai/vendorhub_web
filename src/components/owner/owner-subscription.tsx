"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Check, Clock, CircleAlert, Minus } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState, type FormEvent, type ReactNode } from "react";
import { useSession } from "@/components/app-providers";
import { OwnerSkeleton } from "@/components/owner/owner-skeleton";
import { TextField } from "@/components/ui/text-field";
import { Link } from "@/i18n/routing";
import { getPaymentOptions } from "@/lib/api/checkout";
import { ApiError } from "@/lib/api/core";
import { getMyShops, shopKeys } from "@/lib/api/shops";
import {
  getShopSubscription,
  getSubscriptionPlans,
  requestSubscription,
  subscriptionKeys,
  withdrawSubscriptionRequest,
  type ShopSubscription,
  type SubscriptionPayMethod,
  type SubscriptionPlan,
} from "@/lib/api/subscriptions";
import { formatDate, formatTaka } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BD_MOBILE, normalizePhone } from "@/lib/validation";

const TRX_ID = /^[A-Za-z0-9]{8,12}$/;
const METHODS: SubscriptionPayMethod[] = ["BKASH", "NAGAD"];

const panel = "flex flex-col items-center gap-3 rounded-md border border-line bg-card px-6 py-12 text-center";
const btn = (tone: "primary" | "outline" | "danger") =>
  cn(
    "type-body-medium flex h-11 items-center justify-center gap-2 rounded-sm px-4 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50",
    tone === "primary" && "bg-action text-primary-foreground hover:bg-action-hover",
    tone === "outline" && "border border-brand text-brand hover:bg-subtle",
    tone === "danger" && "border border-error text-error hover:bg-subtle",
  );
const primaryLink = cn(btn("primary"), "h-12 px-6");

function errorText(err: unknown, t: (k: string) => string) {
  if (err instanceof ApiError) {
    if (err.status === 409) return t("errors.pending");
    if (err.status === 400) return t("errors.checkFields");
    if (err.status === 0) return t("errors.network");
  }
  return t("errors.generic");
}

/** One plan: name, price and what it includes. Prices and limits come from the server. */
function PlanCard({
  plan,
  current,
  action,
}: {
  plan: SubscriptionPlan;
  current: boolean;
  action?: ReactNode;
}) {
  const t = useTranslations("OwnerSubscription");
  const locale = useLocale();
  const first = [...plan.prices].sort((a, b) => a.months - b.months)[0];
  const features = [
    {
      key: "listings",
      on: true,
      label:
        plan.maxListings === null
          ? t("features.listingsUnlimited")
          : t("features.listings", { count: plan.maxListings }),
    },
    { key: "deals", on: plan.flashDeals, label: t("features.flashDeals") },
    { key: "badge", on: plan.featuredBadge, label: t("features.featuredBadge") },
  ];

  return (
    <article
      className={cn(
        "flex flex-col gap-4 rounded-t-[2rem] rounded-b-md border bg-card p-5",
        current ? "border-brand ring-1 ring-brand" : "border-line",
        plan.code === "PRO" && "bg-surface",
      )}
    >
      <header className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <h2 className="type-h3 flex items-center gap-2 text-ink">
            {plan.code === "PRO" && <BadgeCheck className="size-5 text-gold" aria-hidden />}
            {t(`plans.${plan.code}.name`)}
          </h2>
          {current && (
            <span className="type-caption rounded-full bg-highlight-soft px-2.5 py-0.5 text-highlight">{t("current")}</span>
          )}
        </div>
        <p className="type-caption text-ink-muted">{t(`plans.${plan.code}.tagline`)}</p>
      </header>

      <p className="type-h3 text-brand">
        {first
          ? first.months === 1
            ? t("perMonth", { price: formatTaka(first.amount, locale) })
            : t("forMonths", { price: formatTaka(first.amount, locale), months: first.months })
          : t("free")}
      </p>

      <ul className="flex flex-col gap-2">
        {features.map((f) => (
          <li key={f.key} className={cn("type-body flex items-start gap-2", f.on ? "text-ink" : "text-ink-muted")}>
            {f.on ? (
              <Check className="mt-0.5 size-4 shrink-0 text-success-ink" aria-hidden />
            ) : (
              <Minus className="mt-0.5 size-4 shrink-0" aria-hidden />
            )}
            <span>
              <span className="sr-only">{f.on ? t("included") : t("notIncluded")}: </span>
              {f.label}
            </span>
          </li>
        ))}
      </ul>

      {action && <div className="mt-auto pt-1">{action}</div>}
    </article>
  );
}

/** What is going on with the plan right now: payment being checked, rejected, or Pro active. */
function StatusBox({ shopId, sub }: { shopId: string; sub: ShopSubscription }) {
  const t = useTranslations("OwnerSubscription");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState(false);
  const withdraw = useMutation({
    mutationFn: (id: string) => withdrawSubscriptionRequest(shopId, id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: subscriptionKeys.shop(shopId) }),
  });

  const pending = sub.pendingRequest;
  if (pending) {
    return (
      <section role="status" className="flex flex-col gap-3 rounded-md border border-warning bg-warning-soft p-4">
        <h2 className="type-body-medium flex items-center gap-2 text-ink">
          <Clock className="size-4 shrink-0" aria-hidden />
          {t("pendingTitle")}
        </h2>
        <p className="type-body text-ink-secondary">
          {t("pendingBody", {
            amount: formatTaka(pending.amount, locale),
            method: t(`methods.${pending.method}`),
            trx: pending.transactionId,
            months: pending.months,
          })}
        </p>
        <div className="flex flex-wrap gap-2">
          {confirm ? (
            <>
              <button type="button" disabled={withdraw.isPending} onClick={() => withdraw.mutate(pending.id)} className={btn("danger")}>
                {t("confirmWithdraw")}
              </button>
              <button type="button" disabled={withdraw.isPending} onClick={() => setConfirm(false)} className={btn("outline")}>
                {t("cancel")}
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setConfirm(true)} className={btn("danger")}>
              {t("withdraw")}
            </button>
          )}
        </div>
        {withdraw.isError && (
          <p role="alert" className="type-caption text-error">
            {errorText(withdraw.error, t)}
          </p>
        )}
      </section>
    );
  }

  return (
    <>
      {sub.lastRejected && (
        <section role="alert" className="flex flex-col gap-1 rounded-md border border-error bg-error-soft p-4">
          <h2 className="type-body-medium flex items-center gap-2 text-error">
            <CircleAlert className="size-4 shrink-0" aria-hidden />
            {t("rejectedTitle")}
          </h2>
          {sub.lastRejected.rejectReason && (
            <p className="type-body text-ink">{t("rejectedReason", { reason: sub.lastRejected.rejectReason })}</p>
          )}
          <p className="type-caption text-ink-secondary">{t("rejectedHint")}</p>
        </section>
      )}
      {sub.plan === "PRO" && sub.currentPeriodEnd && (
        <p className="type-body flex items-center gap-2 rounded-md bg-success-soft p-4 text-success-ink">
          <BadgeCheck className="size-5 shrink-0" aria-hidden />
          {t("activeUntil", { date: formatDate(sub.currentPeriodEnd, locale) })}
        </p>
      )}
    </>
  );
}

/** A radio choice drawn as a card (44px+ touch target, keyboard via the native radio). */
function Choice({ name, checked, label, onSelect }: { name: string; checked: boolean; label: string; onSelect: () => void }) {
  return (
    <label
      className={cn(
        "type-body flex min-h-12 cursor-pointer items-center gap-3 rounded-sm border px-3 py-2 has-focus-visible:ring-2 has-focus-visible:ring-brand",
        checked ? "border-brand bg-subtle text-ink" : "border-line-strong bg-card text-ink-secondary",
      )}
    >
      <input type="radio" name={name} checked={checked} onChange={onSelect} className="size-4 accent-brand" />
      {label}
    </label>
  );
}

/** Pay for Pro by bKash / Nagad. The amount is the server's price for the chosen months. */
function UpgradeForm({ shopId, plan, onDone }: { shopId: string; plan: SubscriptionPlan; onDone: () => void }) {
  const t = useTranslations("OwnerSubscription");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const options = useQuery({ queryKey: ["payment-options"], queryFn: getPaymentOptions, staleTime: 5 * 60_000 });

  const prices = [...plan.prices].sort((a, b) => a.months - b.months);
  const merchants: Record<SubscriptionPayMethod, string | null> = {
    BKASH: options.data?.bkash?.merchantNumber ?? null,
    NAGAD: options.data?.nagad?.merchantNumber ?? null,
  };
  const methods = METHODS.filter((m) => merchants[m]);

  const [months, setMonths] = useState(prices[0]?.months ?? 1);
  const [picked, setPicked] = useState<SubscriptionPayMethod | null>(null);
  const [wallet, setWallet] = useState("");
  const [trxId, setTrxId] = useState("");
  const [errors, setErrors] = useState<{ wallet?: string; trxId?: string }>({});
  const method = picked && methods.includes(picked) ? picked : methods[0];
  const price = prices.find((p) => p.months === months) ?? prices[0];

  const send = useMutation({
    mutationFn: () =>
      requestSubscription(shopId, {
        plan: "PRO",
        months: price.months,
        method,
        walletNumber: normalizePhone(wallet),
        transactionId: trxId.trim().toUpperCase(),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: subscriptionKeys.shop(shopId) });
      onDone();
    },
  });

  if (options.isPending) return <div className="skeleton h-64 rounded-md" aria-hidden />;
  if (!price || methods.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-md border border-line bg-card p-4">
        <p className="type-body text-ink-secondary">{options.isError ? t("loadError") : t("form.noWallet")}</p>
        <button type="button" onClick={onDone} className={btn("outline")}>
          {t("cancel")}
        </button>
      </div>
    );
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!BD_MOBILE.test(normalizePhone(wallet))) next.wallet = t("errors.wallet");
    if (!TRX_ID.test(trxId.trim())) next.trxId = t("errors.trxId");
    setErrors(next);
    if (Object.keys(next).length === 0) send.mutate();
  };
  const walletName = t(`methods.${method}`);

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5 rounded-md border border-line bg-card p-4 md:p-5">
      <h2 className="type-h3 text-ink">{t("form.title")}</h2>
      <fieldset disabled={send.isPending} className="flex flex-col gap-2">
        <legend className="type-body-medium mb-2 text-ink">{t("form.duration")}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {prices.map((p) => (
            <Choice
              key={p.months}
              name="months"
              checked={p.months === price.months}
              label={t("form.monthOption", { months: p.months, price: formatTaka(p.amount, locale) })}
              onSelect={() => setMonths(p.months)}
            />
          ))}
        </div>
      </fieldset>

      <fieldset disabled={send.isPending} className="flex flex-col gap-2">
        <legend className="type-body-medium mb-2 text-ink">{t("form.method")}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {methods.map((m) => (
            <Choice key={m} name="method" checked={m === method} label={t(`methods.${m}`)} onSelect={() => setPicked(m)} />
          ))}
        </div>
      </fieldset>

      <p className="type-body rounded-md border border-gold bg-highlight-soft/40 p-3 text-ink">
        {t("form.sendTo", { amount: formatTaka(price.amount, locale), wallet: walletName, number: merchants[method] ?? "" })}
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label={t("form.walletNumber", { name: walletName })}
          name="walletNumber"
          hint={t("form.walletHint")}
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          maxLength={14}
          placeholder="01XXXXXXXXX"
          value={wallet}
          disabled={send.isPending}
          onChange={(e) => setWallet(e.target.value)}
          error={errors.wallet}
        />
        <TextField
          label={t("form.trxId")}
          name="transactionId"
          hint={t("form.trxIdHint", { name: walletName })}
          autoCapitalize="characters"
          autoComplete="off"
          maxLength={12}
          value={trxId}
          disabled={send.isPending}
          onChange={(e) => setTrxId(e.target.value)}
          error={errors.trxId}
        />
      </div>

      {send.isError && (
        <p role="alert" className="type-body text-error">
          {errorText(send.error, t)}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={send.isPending} className={btn("primary")}>
          {send.isPending ? t("form.sending") : t("form.submit")}
        </button>
        <button type="button" disabled={send.isPending} onClick={onDone} className={btn("outline")}>
          {t("cancel")}
        </button>
      </div>
    </form>
  );
}

/** Vendor panel: Free vs Pro plan, upgrade / extend with bKash or Nagad. Shop owners only. */
export function OwnerSubscription() {
  const t = useTranslations("OwnerSubscription");
  const searchParams = useSearchParams();
  const { status: session, user } = useSession();
  const [upgrading, setUpgrading] = useState(false);
  const isOwner = user?.role === "SHOP_OWNER";
  const isTeam = isOwner || user?.role === "SHOP_STAFF";

  // Only the user's own shops; a shop id typed into the URL is ignored otherwise.
  const shops = useQuery({ queryKey: shopKeys.mine, queryFn: getMyShops, enabled: session === "authenticated" && isOwner });
  const shop = (shops.data ?? []).find((s) => s.id === searchParams.get("shop")) ?? shops.data?.[0];
  const plans = useQuery({ queryKey: subscriptionKeys.plans, queryFn: getSubscriptionPlans, staleTime: 10 * 60_000 });
  const sub = useQuery({
    queryKey: subscriptionKeys.shop(shop?.id ?? ""),
    queryFn: () => getShopSubscription(shop?.id ?? ""),
    enabled: Boolean(shop),
  });

  const loading = <OwnerSkeleton label={t("loading")} />;
  if (session === "loading") return loading;
  if (session === "guest") {
    return (
      <div className={panel}>
        <h2 className="type-h3 text-ink">{t("guestTitle")}</h2>
        <Link href={`/auth/login?next=${encodeURIComponent("/owner/subscription")}`} className={primaryLink}>
          {t("logIn")}
        </Link>
      </div>
    );
  }
  if (!isTeam || !isOwner) {
    return (
      <div className={panel}>
        <h2 className="type-h3 text-ink">{isTeam ? t("ownerOnly") : t("notTeamTitle")}</h2>
      </div>
    );
  }
  if (shops.isPending) return loading;
  if (shops.isError || !shop) {
    return (
      <div className={panel}>
        <p className="type-body text-ink-secondary">{shops.isError ? t("loadError") : t("noShop")}</p>
        {!shops.isError && (
          <Link href="/owner/setup" className={primaryLink}>
            {t("setup")}
          </Link>
        )}
      </div>
    );
  }
  if (plans.isPending || sub.isPending) {
    return (
      <div className="grid gap-4 sm:grid-cols-2" aria-hidden>
        <div className="skeleton h-72 rounded-md" />
        <div className="skeleton h-72 rounded-md" />
      </div>
    );
  }
  if (plans.isError || sub.isError) {
    return (
      <div className="flex flex-col items-start gap-2">
        <p className="type-body text-error">{t("loadError")}</p>
        <button
          type="button"
          onClick={() => {
            if (plans.isError) void plans.refetch();
            if (sub.isError) void sub.refetch();
          }}
          className={btn("outline")}
        >
          {t("retry")}
        </button>
      </div>
    );
  }

  const current = sub.data;
  const order = { FREE: 0, PRO: 1 } as const;
  const list = [...plans.data].sort((a, b) => order[a.code] - order[b.code]);
  const pro = list.find((p) => p.code === "PRO");
  const currentPlan = list.find((p) => p.code === current.plan);
  const max = currentPlan?.maxListings ?? null;

  return (
    <div className="flex flex-col gap-5">
      <StatusBox shopId={shop.id} sub={current} />

      <p className="type-body text-ink-secondary">
        {max === null
          ? t("usageUnlimited", { used: current.listingsUsed })
          : t("usage", { used: current.listingsUsed, max })}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {list.map((plan) => (
          <PlanCard
            key={plan.code}
            plan={plan}
            current={plan.code === current.plan}
            action={
              plan.code === "PRO" && !upgrading && !current.pendingRequest ? (
                <button type="button" onClick={() => setUpgrading(true)} className={cn(btn("primary"), "w-full")}>
                  {current.plan === "PRO" ? t("extend") : t("upgrade")}
                </button>
              ) : undefined
            }
          />
        ))}
      </div>

      {upgrading && pro && !current.pendingRequest && (
        <UpgradeForm shopId={shop.id} plan={pro} onDone={() => setUpgrading(false)} />
      )}
    </div>
  );
}

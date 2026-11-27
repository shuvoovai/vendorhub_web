"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Check, Inbox, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";
import { Link } from "@/i18n/routing";
import { ApiError } from "@/lib/api/core";
import {
  adminListSubscriptionRequests,
  reviewSubscriptionRequest,
  subscriptionKeys,
  type AdminSubscriptionRequest,
  type SubscriptionRequestStatus,
} from "@/lib/api/subscriptions";
import { formatDate, formatTaka } from "@/lib/format";
import { cn } from "@/lib/utils";

const TABS: SubscriptionRequestStatus[] = ["PENDING", "APPROVED", "REJECTED"];

const btn = (tone: "primary" | "outline" | "danger") =>
  cn(
    "type-body-medium flex h-11 items-center justify-center gap-2 rounded-sm px-4 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50",
    tone === "primary" && "bg-action text-primary-foreground hover:bg-action-hover",
    tone === "outline" && "border border-brand text-brand hover:bg-subtle",
    tone === "danger" && "border border-error text-error hover:bg-subtle",
  );

function errorText(err: unknown, t: (k: string) => string) {
  if (err instanceof ApiError) {
    if (err.status === 409) return t("errors.conflict");
    if (err.status === 404) return t("errors.notFound");
    if (err.status === 400) return t("errors.checkFields");
    if (err.status === 0) return t("errors.network");
  }
  return t("errors.generic");
}

function RequestRow({ req }: { req: AdminSubscriptionRequest }) {
  const t = useTranslations("AdminSubscriptions");
  const tPlan = useTranslations("OwnerSubscription");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const reasonId = useId();
  const [mode, setMode] = useState<"idle" | "approve" | "reject">("idle");
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);

  const review = useMutation({
    mutationFn: (body: { decision: "APPROVE" } | { decision: "REJECT"; reason: string }) => reviewSubscriptionRequest(req.id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
      void queryClient.invalidateQueries({ queryKey: ["shop-subscription"] });
    },
    // Another admin reviewed it first: show the fresh list.
    onError: (err) => {
      if (err instanceof ApiError && err.status === 409) void queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
    },
  });
  const busy = review.isPending;
  const amount = formatTaka(req.amount, locale);
  const method = tPlan(`methods.${req.method}`);

  function sendReject() {
    const text = reason.trim();
    if (text.length < 3 || text.length > 300) return setReasonError(t("reasonError"));
    review.mutate({ decision: "REJECT", reason: text });
  }

  return (
    <li className="flex flex-col gap-3 rounded-md border border-line bg-card p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <h2 className="type-body-medium flex flex-wrap items-center gap-2 text-ink">
            <Link
              href={`/shops/${encodeURIComponent(req.shop.slug)}`}
              className="underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
            >
              {req.shop.name}
            </Link>
            <span className="type-caption inline-flex items-center gap-1 rounded-full bg-highlight-soft px-2.5 py-0.5 text-highlight">
              <BadgeCheck className="size-3.5" aria-hidden />
              {t("planMonths", { plan: tPlan(`plans.${req.plan}.name`), months: req.months })}
            </span>
          </h2>
          <dl className="type-body grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-ink-secondary">
            <dt>{t("amount")}</dt>
            <dd className="type-price text-ink">{amount}</dd>
            <dt>{t("method")}</dt>
            <dd className="text-ink">{method}</dd>
            <dt>{t("wallet")}</dt>
            <dd className="text-ink tabular-nums select-all">{req.walletNumber}</dd>
            <dt>{t("trxId")}</dt>
            <dd className="font-mono text-ink break-all select-all">{req.transactionId}</dd>
            <dt>{t("requested")}</dt>
            <dd>{formatDate(req.createdAt, locale)}</dd>
            {req.reviewedAt && (
              <>
                <dt>{t("reviewed")}</dt>
                <dd>{formatDate(req.reviewedAt, locale)}</dd>
              </>
            )}
          </dl>
          {req.status === "REJECTED" && req.rejectReason && (
            <p className="type-caption rounded-sm bg-error-soft p-2 text-error">{t("reason", { reason: req.rejectReason })}</p>
          )}
        </div>

        {req.status === "PENDING" && mode === "idle" && (
          <div className="flex shrink-0 flex-wrap gap-2 md:justify-end">
            <button type="button" onClick={() => setMode("approve")} className={btn("primary")}>
              <Check className="size-4" aria-hidden />
              {t("approve")}
            </button>
            <button type="button" onClick={() => setMode("reject")} className={btn("danger")}>
              <X className="size-4" aria-hidden />
              {t("reject")}
            </button>
          </div>
        )}
      </div>

      {mode === "approve" && (
        <div className="flex flex-col gap-2 border-t border-line pt-3">
          <p className="type-body text-ink">
            {t("confirmApprove", { amount, method, wallet: req.walletNumber, trx: req.transactionId })}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => review.mutate({ decision: "APPROVE" })} className={btn("primary")}>
              {t("yesApprove")}
            </button>
            <button type="button" disabled={busy} onClick={() => setMode("idle")} className={btn("outline")}>
              {t("cancel")}
            </button>
          </div>
        </div>
      )}

      {mode === "reject" && (
        <div className="flex flex-col gap-2 border-t border-line pt-3">
          <label htmlFor={reasonId} className="type-body-medium text-ink">
            {t("reasonLabel")}
          </label>
          <textarea
            id={reasonId}
            value={reason}
            maxLength={300}
            rows={3}
            onChange={(e) => {
              setReason(e.target.value);
              setReasonError(null);
            }}
            aria-invalid={!!reasonError}
            aria-describedby={reasonError ? `${reasonId}-err` : undefined}
            placeholder={t("reasonPlaceholder")}
            className="type-body w-full rounded-sm border border-line-strong bg-card p-3 text-ink focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
          />
          {reasonError && (
            <p id={`${reasonId}-err`} className="type-caption text-error">
              {reasonError}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={sendReject} className={btn("danger")}>
              {t("sendReject")}
            </button>
            <button type="button" disabled={busy} onClick={() => setMode("idle")} className={btn("outline")}>
              {t("cancel")}
            </button>
          </div>
        </div>
      )}

      {review.isError && (
        <p role="alert" className="type-caption text-error">
          {errorText(review.error, t)}
        </p>
      )}
    </li>
  );
}

/** Admin: shops' Pro payment requests. Check the money in bKash / Nagad, then approve or reject with a reason. */
export function SubscriptionsManager() {
  const t = useTranslations("AdminSubscriptions");
  const [tab, setTab] = useState<SubscriptionRequestStatus>("PENDING");
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: subscriptionKeys.admin(tab, page),
    queryFn: () => adminListSubscriptionRequests(tab, page),
    placeholderData: keepPreviousData,
  });
  const requests = query.data?.data ?? [];
  const totalPages = query.data?.meta?.pagination?.totalPages ?? 1;

  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" aria-label={t("title")} className="scroll-row flex gap-2 overflow-x-auto">
        {TABS.map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={tab === s}
            onClick={() => {
              setTab(s);
              setPage(1);
            }}
            className={cn(
              "type-body-medium flex h-11 shrink-0 items-center rounded-full border px-5 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none",
              tab === s ? "border-brand bg-brand text-primary-foreground" : "border-line-strong bg-card text-ink hover:border-brand",
            )}
          >
            {t(`tab.${s}`)}
          </button>
        ))}
      </div>

      {query.isPending ? (
        <ul className="flex flex-col gap-3" aria-hidden>
          {Array.from({ length: 3 }, (_, i) => (
            <li key={i} className="skeleton h-40 rounded-md" />
          ))}
        </ul>
      ) : query.isError ? (
        <div className="flex flex-col items-start gap-2">
          <p className="type-body text-error">{t("loadError")}</p>
          <button type="button" onClick={() => query.refetch()} className={btn("outline")}>
            {t("retry")}
          </button>
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-line-strong bg-card px-4 py-10 text-center">
          <Inbox className="size-7 text-highlight" strokeWidth={1.5} aria-hidden />
          <p className="type-body-medium text-ink">{t(`empty.${tab}`)}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {requests.map((r) => (
            <RequestRow key={r.id} req={r} />
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="flex items-center gap-3">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className={btn("outline")}>
            {t("prev")}
          </button>
          <span className="type-caption text-ink-muted">{t("pageOf", { page, total: totalPages })}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className={btn("outline")}>
            {t("next")}
          </button>
        </div>
      )}
    </div>
  );
}

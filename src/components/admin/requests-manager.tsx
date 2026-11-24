"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Inbox, LoaderCircle, Phone } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { ApiError } from "@/lib/api/core";
import {
  adminListFoodOrders,
  adminListToletInquiries,
  adminListTolets,
  adminReviewTolet,
  adminUpdateFoodOrder,
  adminUpdateToletInquiry,
  requestKeys,
  type FoodOrderStatus,
  type InquiryStatus,
  type RequestStatus,
} from "@/lib/api/requests";
import { formatTaka } from "@/lib/format";
import { cn } from "@/lib/utils";

const chip = (active: boolean) =>
  cn(
    "type-body-medium flex h-11 items-center rounded-full border px-4 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none",
    active
      ? "border-brand bg-action text-primary-foreground"
      : "border-line-strong bg-card text-ink hover:border-brand",
  );
const action = (tone: "primary" | "outline" | "danger") =>
  cn(
    "type-body-medium flex h-11 items-center justify-center gap-2 rounded-sm px-4 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none disabled:opacity-60",
    tone === "primary" &&
      "bg-action text-primary-foreground hover:bg-action-hover",
    tone === "outline" && "border border-brand text-brand hover:bg-subtle",
    tone === "danger" && "border border-error text-error hover:bg-subtle",
  );

function Filters<T extends string>({
  values,
  value,
  onChange,
  label,
}: {
  values: T[];
  value: T;
  onChange: (v: T) => void;
  label: (v: T) => string;
}) {
  return (
    <div className="scroll-row flex gap-2 overflow-x-auto pb-1">
      {values.map((v) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={chip(value === v)}
        >
          {label(v)}
        </button>
      ))}
    </div>
  );
}

function State({
  kind,
  onRetry,
}: {
  kind: "loading" | "error" | "empty";
  onRetry?: () => void;
}) {
  const t = useTranslations("AdminRequests");
  if (kind === "loading")
    return (
      <div className="flex flex-col gap-3" aria-hidden>
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="skeleton h-32 rounded-md" />
        ))}
      </div>
    );
  return (
    <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-line-strong bg-card px-4 py-10 text-center">
      <Inbox className="size-7 text-highlight" strokeWidth={1.5} aria-hidden />
      <p className="type-body-medium text-ink">
        {t(kind === "error" ? "error" : "empty")}
      </p>
      {kind === "error" && onRetry && (
        <button type="button" onClick={onRetry} className={action("outline")}>
          {t("retry")}
        </button>
      )}
    </div>
  );
}

function errorText(err: unknown, t: (k: string) => string) {
  if (err instanceof ApiError && err.status === 409) return t("conflict");
  if (err instanceof ApiError && err.status === 0) return t("network");
  return t("actionError");
}

// ---------------- Food orders ----------------
const FOOD_FILTERS = [
  "PENDING",
  "CONFIRMED",
  "DELIVERED",
  "CANCELLED",
  "ALL",
] as const;
type FoodFilter = (typeof FOOD_FILTERS)[number];
const NEXT: Record<FoodOrderStatus, FoodOrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

export function FoodOrdersManager() {
  const t = useTranslations("AdminRequests");
  const locale = useLocale();
  const format = useFormatter();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<FoodFilter>("PENDING");
  const status = filter === "ALL" ? undefined : filter;
  const query = useQuery({
    queryKey: requestKeys.adminFood(status),
    queryFn: () => adminListFoodOrders(status),
  });
  const update = useMutation({
    mutationFn: ({ id, next }: { id: string; next: FoodOrderStatus }) =>
      adminUpdateFoodOrder(id, next),
    onSettled: () =>
      qc.invalidateQueries({ queryKey: ["admin", "food-orders"] }),
  });

  return (
    <div className="flex flex-col gap-4">
      <Filters
        values={[...FOOD_FILTERS]}
        value={filter}
        onChange={setFilter}
        label={(v) => t(`food.status.${v}`)}
      />
      {update.isError && (
        <p role="alert" className="type-caption text-error">
          {errorText(update.error, t)}
        </p>
      )}
      {query.isPending ? (
        <State kind="loading" />
      ) : query.isError ? (
        <State kind="error" onRetry={() => query.refetch()} />
      ) : query.data.length === 0 ? (
        <State kind="empty" />
      ) : (
        <ul className="flex flex-col gap-3">
          {query.data.map((o) => (
            <li
              key={o.id}
              className="flex flex-col gap-3 rounded-md border border-line bg-card p-4 md:flex-row md:items-start md:justify-between"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <p className="type-body-medium text-ink">
                  {o.itemName} × {o.quantity} ·{" "}
                  <span className="text-brand">
                    {formatTaka(o.total, locale)}
                  </span>
                </p>
                <p className="type-caption text-ink-muted">
                  {t("food.unit", { price: formatTaka(o.unitPrice, locale) })} ·{" "}
                  {format.dateTime(new Date(o.createdAt), {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
                <p className="type-body text-ink-secondary">
                  {o.name}
                  {o.shop ? ` · ${o.shop.name}` : ""}
                </p>
                <a
                  href={`tel:${o.phone}`}
                  className="type-body flex min-h-11 w-fit items-center gap-1 text-brand hover:underline focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                >
                  <Phone className="size-4" aria-hidden />
                  {o.phone}
                </a>
                <p className="type-caption break-words text-ink-secondary">
                  {o.address}
                </p>
                {o.note && (
                  <p className="type-caption break-words text-ink-muted">
                    “{o.note}”
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-start gap-2 md:items-end">
                <span className="type-caption rounded-sm bg-highlight-soft px-2 py-0.5 text-ink">
                  {t(`food.status.${o.status}`)}
                </span>
                <div className="flex flex-wrap gap-2">
                  {NEXT[o.status].map((next) => (
                    <button
                      key={next}
                      type="button"
                      disabled={update.isPending}
                      onClick={() => update.mutate({ id: o.id, next })}
                      className={action(
                        next === "CANCELLED" ? "danger" : "primary",
                      )}
                    >
                      {update.isPending &&
                        update.variables?.id === o.id &&
                        update.variables.next === next && (
                          <LoaderCircle
                            className="size-4 motion-safe:animate-spin"
                            aria-hidden
                          />
                        )}
                      {t(`food.to.${next}`)}
                    </button>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------- To-let requests ----------------
const TOLET_FILTERS: RequestStatus[] = ["PENDING", "APPROVED", "REJECTED"];

export function ToletRequestsManager() {
  const t = useTranslations("AdminRequests");
  const tTolet = useTranslations("Tolet");
  const locale = useLocale();
  const format = useFormatter();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<RequestStatus>("PENDING");
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const query = useQuery({
    queryKey: requestKeys.adminTolets(filter),
    queryFn: () => adminListTolets(filter),
  });
  const review = useMutation({
    mutationFn: ({
      id,
      status,
      reason,
    }: {
      id: string;
      status: "APPROVED" | "REJECTED";
      reason?: string;
    }) => adminReviewTolet(id, status, reason),
    onSuccess: () => {
      setRejecting(null);
      setReason("");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["admin", "tolets"] });
      qc.invalidateQueries({ queryKey: requestKeys.tolets });
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <Filters
        values={TOLET_FILTERS}
        value={filter}
        onChange={setFilter}
        label={(v) => t(`tolet.status.${v}`)}
      />
      {review.isError && (
        <p role="alert" className="type-caption text-error">
          {errorText(review.error, t)}
        </p>
      )}
      {query.isPending ? (
        <State kind="loading" />
      ) : query.isError ? (
        <State kind="error" onRetry={() => query.refetch()} />
      ) : query.data.length === 0 ? (
        <State kind="empty" />
      ) : (
        <ul className="flex flex-col gap-3">
          {query.data.map((l) => (
            <li
              key={l.id}
              className="flex flex-col gap-3 rounded-md border border-line bg-card p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="type-caption rounded-sm bg-highlight-soft px-2 py-0.5 text-ink">
                  {tTolet(`types.${l.type}`)}
                </span>
                <span className="type-caption text-ink-muted">
                  {format.dateTime(new Date(l.createdAt), {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </div>
              <h2 className="type-h3 break-words text-ink">{l.title}</h2>
              <dl className="type-body grid gap-x-6 gap-y-1 text-ink-secondary sm:grid-cols-2">
                <Row
                  label={t("tolet.rent")}
                  value={formatTaka(l.rent, locale)}
                />
                {l.advance != null && (
                  <Row
                    label={t("tolet.advance")}
                    value={formatTaka(l.advance, locale)}
                  />
                )}
                <Row
                  label={t("tolet.place")}
                  value={[l.marketName, l.floor, l.area]
                    .filter(Boolean)
                    .join(", ")}
                />
                {l.sizeSqft != null && (
                  <Row
                    label={t("tolet.size")}
                    value={tTolet("sqft", { size: l.sizeSqft })}
                  />
                )}
                <Row label={t("tolet.address")} value={l.address} />
                <Row
                  label={t("tolet.available")}
                  value={l.availableFrom.slice(0, 10)}
                />
                <Row
                  label={t("tolet.contact")}
                  value={`${l.contactName} · ${l.contactPhone}`}
                />
                <Row
                  label={t("tolet.submitter")}
                  value={
                    l.submitter
                      ? `${l.submitter.name} (${l.submitter.email})`
                      : t("tolet.guest")
                  }
                />
              </dl>
              {l.description && (
                <p className="type-caption whitespace-pre-line break-words text-ink-muted">
                  {l.description}
                </p>
              )}
              {l.status === "REJECTED" && l.rejectionReason && (
                <p className="type-caption text-error">
                  {t("tolet.reason", { reason: l.rejectionReason })}
                </p>
              )}

              {rejecting === l.id ? (
                <form
                  className="flex flex-col gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (reason.trim().length > 0)
                      review.mutate({
                        id: l.id,
                        status: "REJECTED",
                        reason: reason.trim(),
                      });
                  }}
                >
                  <label
                    htmlFor={`reason-${l.id}`}
                    className="type-body-medium text-ink"
                  >
                    {t("tolet.reasonLabel")}
                  </label>
                  <textarea
                    id={`reason-${l.id}`}
                    rows={2}
                    maxLength={300}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="type-body w-full rounded-sm border border-line-strong bg-card p-3 text-ink focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      disabled={review.isPending || reason.trim().length === 0}
                      className={action("danger")}
                    >
                      {t("tolet.confirmReject")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRejecting(null)}
                      className={action("outline")}
                    >
                      {t("cancel")}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {l.status !== "APPROVED" && (
                    <button
                      type="button"
                      disabled={review.isPending}
                      onClick={() =>
                        review.mutate({ id: l.id, status: "APPROVED" })
                      }
                      className={action("primary")}
                    >
                      {review.isPending && review.variables?.id === l.id && (
                        <LoaderCircle
                          className="size-4 motion-safe:animate-spin"
                          aria-hidden
                        />
                      )}
                      {t("tolet.approve")}
                    </button>
                  )}
                  {l.status !== "REJECTED" && (
                    <button
                      type="button"
                      disabled={review.isPending}
                      onClick={() => setRejecting(l.id)}
                      className={action("danger")}
                    >
                      {t("tolet.reject")}
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 gap-2">
      <dt className="shrink-0 text-ink-muted">{label}:</dt>
      <dd className="min-w-0 break-words">{value}</dd>
    </div>
  );
}

// ---------------- To-let: listings + reservations tabs ----------------
const TOLET_TABS = ["listings", "reservations"] as const;
type ToletTab = (typeof TOLET_TABS)[number];

export function ToletAdmin() {
  const t = useTranslations("AdminRequests");
  const [tab, setTab] = useState<ToletTab>("listings");
  return (
    <div className="flex flex-col gap-5">
      <div
        role="group"
        aria-label={t("tolet.tabsLabel")}
        className="flex gap-2 border-b border-line pb-3"
      >
        {TOLET_TABS.map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={tab === v}
            onClick={() => setTab(v)}
            className={chip(tab === v)}
          >
            {t(`tolet.tabs.${v}`)}
          </button>
        ))}
      </div>
      {tab === "listings" ? <ToletRequestsManager /> : <ToletInquiriesManager />}
    </div>
  );
}

const INQUIRY_FILTERS = ["NEW", "CONTACTED", "CLOSED", "ALL"] as const;
type InquiryFilter = (typeof INQUIRY_FILTERS)[number];
const INQUIRY_NEXT: Record<InquiryStatus, InquiryStatus[]> = {
  NEW: ["CONTACTED", "CLOSED"],
  CONTACTED: ["CLOSED"],
  CLOSED: ["NEW"],
};

export function ToletInquiriesManager() {
  const t = useTranslations("AdminRequests");
  const tTolet = useTranslations("Tolet");
  const locale = useLocale();
  const format = useFormatter();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<InquiryFilter>("NEW");
  const status = filter === "ALL" ? undefined : filter;
  const query = useQuery({
    queryKey: requestKeys.adminInquiries(filter),
    queryFn: () => adminListToletInquiries(status),
  });
  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: InquiryStatus }) =>
      adminUpdateToletInquiry(id, status),
    onSettled: () =>
      qc.invalidateQueries({ queryKey: ["admin", "tolet-inquiries"] }),
  });

  return (
    <div className="flex flex-col gap-4">
      <Filters
        values={[...INQUIRY_FILTERS]}
        value={filter}
        onChange={setFilter}
        label={(v) => t(`inquiry.status.${v}`)}
      />
      {update.isError && (
        <p role="alert" className="type-caption text-error">
          {errorText(update.error, t)}
        </p>
      )}
      {query.isPending ? (
        <State kind="loading" />
      ) : query.isError ? (
        <State kind="error" onRetry={() => query.refetch()} />
      ) : query.data.length === 0 ? (
        <State kind="empty" />
      ) : (
        <ul className="flex flex-col gap-3">
          {query.data.map((r) => (
            <li
              key={r.id}
              className="flex flex-col gap-3 rounded-md border border-line bg-card p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="type-caption rounded-sm bg-highlight-soft px-2 py-0.5 text-ink">
                  {t(`inquiry.status.${r.status}`)}
                </span>
                <span className="type-caption text-ink-muted">
                  {format.dateTime(new Date(r.createdAt), {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <p className="type-body-medium text-ink">{r.name}</p>
                <a
                  href={`tel:${r.phone}`}
                  className="type-body-medium flex min-h-11 w-fit items-center gap-2 rounded-sm text-brand hover:underline focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                >
                  <Phone className="size-4" aria-hidden />
                  {r.phone}
                </a>
              </div>
              <dl className="type-caption grid gap-1 text-ink-secondary sm:grid-cols-2">
                <Row
                  label={t("inquiry.when")}
                  value={`${format.dateTime(new Date(`${r.preferredDate}T00:00:00`), { dateStyle: "medium" })} · ${tTolet(`inquiry.times.${r.preferredTime}`)}`}
                />
                <Row
                  label={t("inquiry.listing")}
                  value={`${tTolet(`types.${r.tolet.type}`)} · ${r.tolet.title}`}
                />
                <Row
                  label={t("tolet.place")}
                  value={[r.tolet.marketName, r.tolet.area]
                    .filter(Boolean)
                    .join(", ")}
                />
                <Row
                  label={t("tolet.rent")}
                  value={formatTaka(r.tolet.rent, locale)}
                />
                {r.tolet.contactPhone && (
                  <Row
                    label={t("inquiry.owner")}
                    value={`${r.tolet.contactName ?? ""} · ${r.tolet.contactPhone}`}
                  />
                )}
              </dl>
              {r.message && (
                <p className="type-caption rounded-sm bg-subtle p-3 whitespace-pre-line text-ink">
                  {r.message}
                </p>
              )}
              {INQUIRY_NEXT[r.status].length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {INQUIRY_NEXT[r.status].map((next) => (
                    <button
                      key={next}
                      type="button"
                      disabled={update.isPending}
                      onClick={() => update.mutate({ id: r.id, status: next })}
                      className={action(
                        next === "CONTACTED" ? "primary" : "outline",
                      )}
                    >
                      {update.isPending &&
                        update.variables?.id === r.id &&
                        update.variables.status === next && (
                          <LoaderCircle
                            className="size-4 motion-safe:animate-spin"
                            aria-hidden
                          />
                        )}
                      {t(`inquiry.to.${next}`)}
                    </button>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

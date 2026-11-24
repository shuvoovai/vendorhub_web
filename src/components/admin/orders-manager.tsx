"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Inbox, Phone } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { ApiError } from "@/lib/api/core";
import {
  adminListOrders,
  adminOrderKeys,
  adminUpdateOrder,
  type AdminOrder,
  type AdminOrderUpdate,
  type OrderStatus,
} from "@/lib/api/checkout";
import { formatTaka } from "@/lib/format";
import { cn } from "@/lib/utils";

const LIMIT = 20;
// Only orders the vendor already approved reach the admin.
const FILTERS = ["CONFIRMED", "READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "COMPLETED", "CANCELLED", "ALL"] as const;
type Filter = (typeof FILTERS)[number];

// Client hint only; the backend checks every change.
function nextStatuses(o: AdminOrder): OrderStatus[] {
  switch (o.status) {
    case "CONFIRMED":
      return [o.deliveryMethod === "STORE_PICKUP" ? "READY_FOR_PICKUP" : "OUT_FOR_DELIVERY", "CANCELLED"];
    case "READY_FOR_PICKUP":
    case "OUT_FOR_DELIVERY":
      return ["COMPLETED", "CANCELLED"];
    default:
      return [];
  }
}

const btn = (tone: "primary" | "outline" | "danger") =>
  cn(
    "type-body-medium flex h-11 items-center justify-center rounded-sm px-4 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none disabled:opacity-60",
    tone === "primary" && "bg-action text-primary-foreground hover:bg-action-hover",
    tone === "outline" && "border border-brand text-brand hover:bg-subtle",
    tone === "danger" && "border border-error text-error hover:bg-subtle",
  );

export function OrdersManager() {
  const t = useTranslations("AdminOrders");
  const tOrder = useTranslations("Order");
  const locale = useLocale();
  const format = useFormatter();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>("CONFIRMED");
  const [page, setPage] = useState(1);
  const status = filter === "ALL" ? undefined : filter;

  const query = useQuery({
    queryKey: adminOrderKeys.list(status, page),
    queryFn: () => adminListOrders({ status, page, limit: LIMIT }),
    placeholderData: keepPreviousData,
  });
  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: AdminOrderUpdate }) => adminUpdateOrder(id, body),
    onSettled: () => qc.invalidateQueries({ queryKey: adminOrderKeys.all }),
  });

  const orders = query.data?.data ?? [];
  const totalPages = query.data?.meta?.pagination?.totalPages ?? 1;
  const errorText =
    update.error instanceof ApiError && update.error.status === 409
      ? t("conflict")
      : update.error instanceof ApiError && update.error.status === 0
        ? t("network")
        : t("actionError");

  return (
    <div className="flex flex-col gap-4">
      <div className="scroll-row flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => {
              setFilter(f);
              setPage(1);
            }}
            className={cn(
              "type-body-medium flex h-11 shrink-0 items-center rounded-full border px-4 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none",
              filter === f ? "border-brand bg-action text-primary-foreground" : "border-line-strong bg-card text-ink hover:border-brand",
            )}
          >
            {f === "ALL" ? t("all") : tOrder(`status.${f}`)}
          </button>
        ))}
      </div>

      {update.isError && (
        <p role="alert" className="type-caption text-error">
          {errorText}
        </p>
      )}

      {query.isPending ? (
        <div className="flex flex-col gap-3" aria-hidden>
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="skeleton h-36 rounded-md" />
          ))}
        </div>
      ) : query.isError || orders.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-line-strong bg-card px-4 py-10 text-center">
          <Inbox className="size-7 text-highlight" strokeWidth={1.5} aria-hidden />
          <p className="type-body-medium text-ink">{t(query.isError ? "error" : "empty")}</p>
          {query.isError && (
            <button type="button" onClick={() => query.refetch()} className={btn("outline")}>
              {t("retry")}
            </button>
          )}
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((o) => {
            const busy = update.isPending && update.variables?.id === o.id;
            const canMarkPaid = o.paymentStatus !== "PAID" && o.paymentStatus !== "REFUNDED" && o.status !== "CANCELLED";
            const canRefund = o.paymentStatus === "PAID" && o.status === "CANCELLED";
            return (
              <li key={o.id} className="flex flex-col gap-3 rounded-md border border-line bg-card p-4 md:flex-row md:items-start md:justify-between">
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="type-body-medium text-ink">
                    {o.orderNumber} · <span className="text-brand">{formatTaka(o.total, locale)}</span>
                  </p>
                  <p className="type-caption text-ink-muted">
                    {o.shop.name} · {format.dateTime(new Date(o.createdAt), { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                  <ul className="type-caption text-ink-secondary">
                    {o.items.map((i) => (
                      <li key={i.id} className="truncate">
                        {i.quantity} × {i.title}
                      </li>
                    ))}
                  </ul>
                  {o.customer && <p className="type-body text-ink-secondary">{o.customer.name}</p>}
                  {o.customer?.phone && (
                    <a
                      href={`tel:${o.customer.phone}`}
                      className="type-body flex min-h-11 w-fit items-center gap-1 text-brand hover:underline focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                    >
                      <Phone className="size-4" aria-hidden />
                      {o.customer.phone}
                    </a>
                  )}
                  <p className="type-caption break-words text-ink-secondary">
                    {o.deliveryMethod === "VENDOR_DELIVERY" && o.deliveryAddress
                      ? tOrder("deliverTo", { address: o.deliveryAddress })
                      : t("pickup")}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-start gap-2 md:items-end">
                  <div className="flex flex-wrap gap-1.5">
                    <span className="type-caption rounded-sm bg-highlight-soft px-2 py-0.5 text-ink">{tOrder(`status.${o.status}`)}</span>
                    <span className="type-caption rounded-sm bg-subtle px-2 py-0.5 text-ink">
                      {tOrder(`payment.${o.paymentMethod}`)} · {tOrder(`paymentStatus.${o.paymentStatus}`)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {nextStatuses(o).map((next) => (
                      <button
                        key={next}
                        type="button"
                        disabled={busy}
                        onClick={() => update.mutate({ id: o.id, body: { status: next } })}
                        className={btn(next === "CANCELLED" ? "danger" : "primary")}
                      >
                        {t(`to.${next}`)}
                      </button>
                    ))}
                    {canMarkPaid && (
                      <button type="button" disabled={busy} onClick={() => update.mutate({ id: o.id, body: { paymentStatus: "PAID" } })} className={btn("outline")}>
                        {t("markPaid")}
                      </button>
                    )}
                    {canRefund && (
                      <button type="button" disabled={busy} onClick={() => update.mutate({ id: o.id, body: { paymentStatus: "REFUNDED" } })} className={btn("outline")}>
                        {t("markRefunded")}
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {totalPages > 1 && (
        <nav aria-label={t("pages")} className="flex items-center justify-center gap-3">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className={btn("outline")}>
            {t("prev")}
          </button>
          <span className="type-caption text-ink-muted">{t("pageOf", { page, total: totalPages })}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className={btn("outline")}>
            {t("next")}
          </button>
        </nav>
      )}
    </div>
  );
}

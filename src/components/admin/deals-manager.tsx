"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Inbox, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { dealBtn, dealErrorText } from "@/components/deals/deal-form";
import { DealSummary, useDealPhase } from "@/components/deals/deal-summary";
import { adminDeleteDeal, adminListDeals, dealKeys, reviewDeal, type Deal, type DealStatus } from "@/lib/api/deals";
import { refreshPublicPages } from "@/lib/refresh-public";
import { cn } from "@/lib/utils";

const TABS: DealStatus[] = ["PENDING", "APPROVED", "REJECTED"];

function AdminDealRow({ deal }: { deal: Deal }) {
  const t = useTranslations("AdminDeals");
  const tForm = useTranslations("DealForm");
  const phase = useDealPhase(deal);
  const queryClient = useQueryClient();
  const reasonId = useId();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const done = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-deals"] });
    refreshPublicPages(["deals"]); // the home page shows approved deals right away
  };
  const review = useMutation({
    mutationFn: (body: { decision: "APPROVE" } | { decision: "REJECT"; reason: string }) => reviewDeal(deal.id, body),
    onMutate: () => setError(null),
    onSuccess: done,
    onError: (err) => setError(dealErrorText(err, tForm)),
  });
  const remove = useMutation({
    mutationFn: () => adminDeleteDeal(deal.id),
    onMutate: () => setError(null),
    onSuccess: done,
    onError: (err) => setError(dealErrorText(err, tForm)),
  });
  const busy = review.isPending || remove.isPending;

  function sendReject() {
    const text = reason.trim();
    if (text.length < 5 || text.length > 300) return setReasonError(t("reasonError"));
    review.mutate({ decision: "REJECT", reason: text });
  }

  return (
    <li className="flex flex-col gap-3 rounded-md border border-line bg-card p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <DealSummary deal={deal} phase={phase} showShop />
        <div className="flex shrink-0 flex-wrap gap-2 md:justify-end">
          {deal.status === "PENDING" && !rejecting && (
            <>
              <button type="button" disabled={busy || phase === "ended"} onClick={() => review.mutate({ decision: "APPROVE" })} className={dealBtn("primary")}>
                <Check className="size-4" aria-hidden />
                {t("approve")}
              </button>
              <button type="button" disabled={busy} onClick={() => setRejecting(true)} className={dealBtn("danger")}>
                <X className="size-4" aria-hidden />
                {t("reject")}
              </button>
            </>
          )}
          {deal.status !== "PENDING" &&
            (confirmDelete ? (
              <>
                <button type="button" disabled={busy} onClick={() => remove.mutate()} className={dealBtn("danger")}>
                  {tForm("confirmDelete")}
                </button>
                <button type="button" disabled={busy} onClick={() => setConfirmDelete(false)} className={dealBtn("outline")}>
                  {tForm("cancel")}
                </button>
              </>
            ) : (
              <button type="button" disabled={busy} onClick={() => setConfirmDelete(true)} className={dealBtn("danger")}>
                <Trash2 className="size-4" aria-hidden />
                {tForm("delete")}
              </button>
            ))}
        </div>
      </div>

      {deal.status === "PENDING" && phase === "ended" && <p className="type-caption text-ink-muted">{t("expired")}</p>}

      {rejecting && (
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
            <button type="button" disabled={busy} onClick={sendReject} className={dealBtn("danger")}>
              {t("sendReject")}
            </button>
            <button type="button" disabled={busy} onClick={() => setRejecting(false)} className={dealBtn("outline")}>
              {tForm("cancel")}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="type-caption text-error">
          {error}
        </p>
      )}
    </li>
  );
}

/** Admin: shops' flash deal requests. Approve to put a deal on the home page, or reject with a reason. */
export function DealsManager() {
  const t = useTranslations("AdminDeals");
  const [tab, setTab] = useState<DealStatus>("PENDING");
  const [page, setPage] = useState(1);
  const query = useQuery({ queryKey: dealKeys.admin(tab, page), queryFn: () => adminListDeals(tab, page), placeholderData: keepPreviousData });
  const deals = query.data?.data ?? [];
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
            <li key={i} className="skeleton h-32 rounded-md" />
          ))}
        </ul>
      ) : query.isError ? (
        <div className="flex flex-col items-start gap-2">
          <p className="type-body text-error">{t("loadError")}</p>
          <button type="button" onClick={() => query.refetch()} className={dealBtn("outline")}>
            {t("retry")}
          </button>
        </div>
      ) : deals.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-line-strong bg-card px-4 py-10 text-center">
          <Inbox className="size-7 text-highlight" strokeWidth={1.5} aria-hidden />
          <p className="type-body-medium text-ink">{t(`empty.${tab}`)}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {deals.map((d) => (
            <AdminDealRow key={d.id} deal={d} />
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="flex items-center gap-3">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className={dealBtn("outline")}>
            {t("prev")}
          </button>
          <span className="type-caption text-ink-muted">{t("pageOf", { page, total: totalPages })}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className={dealBtn("outline")}>
            {t("next")}
          </button>
        </div>
      )}
    </div>
  );
}

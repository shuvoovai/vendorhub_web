"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Zap } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useSession } from "@/components/app-providers";
import { DealRequestForm, dealBtn, dealErrorText } from "@/components/deals/deal-form";
import { DealSummary, useDealPhase } from "@/components/deals/deal-summary";
import { OwnerSkeleton } from "@/components/owner/owner-skeleton";
import { Link } from "@/i18n/routing";
import { dealKeys, deleteShopDeal, listShopDeals, setDealActive, type Deal } from "@/lib/api/deals";
import { getMyShops, shopKeys } from "@/lib/api/shops";
import { cn } from "@/lib/utils";

const panel = "flex flex-col items-center gap-3 rounded-md border border-line bg-card px-6 py-12 text-center";
const primaryLink =
  "type-body-medium flex h-12 items-center rounded-sm bg-action px-6 text-primary-foreground hover:bg-action-hover focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-none";

function OwnerDealRow({ deal, shopId }: { deal: Deal; shopId: string }) {
  const t = useTranslations("DealForm");
  const phase = useDealPhase(deal);
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refresh = () => void queryClient.invalidateQueries({ queryKey: dealKeys.shop(shopId) });

  const toggle = useMutation({
    mutationFn: () => setDealActive(shopId, deal.id, !deal.isActive),
    onMutate: () => setError(null),
    onSuccess: refresh,
    onError: (err) => setError(dealErrorText(err, t)),
  });
  const remove = useMutation({
    mutationFn: () => deleteShopDeal(shopId, deal.id),
    onMutate: () => setError(null),
    onSuccess: refresh,
    onError: (err) => setError(dealErrorText(err, t)),
  });
  const busy = toggle.isPending || remove.isPending;

  return (
    <li className="flex flex-col gap-3 rounded-md border border-line bg-card p-4 md:flex-row md:items-start md:justify-between">
      <DealSummary deal={deal} phase={phase} />
      <div className="flex shrink-0 flex-col items-start gap-2 md:items-end">
        <div className="flex flex-wrap gap-2">
          {deal.status === "APPROVED" && phase !== "ended" && (
            <button type="button" disabled={busy} onClick={() => toggle.mutate()} className={dealBtn("outline")}>
              {deal.isActive ? t("pause") : t("resume")}
            </button>
          )}
          {confirm ? (
            <>
              <button type="button" disabled={busy} onClick={() => remove.mutate()} className={dealBtn("danger")}>
                {t("confirmDelete")}
              </button>
              <button type="button" disabled={busy} onClick={() => setConfirm(false)} className={dealBtn("outline")}>
                {t("cancel")}
              </button>
            </>
          ) : (
            <button type="button" disabled={busy} onClick={() => setConfirm(true)} className={dealBtn("danger")}>
              <Trash2 className="size-4" aria-hidden />
              {deal.status === "PENDING" ? t("withdraw") : t("delete")}
            </button>
          )}
        </div>
        {error && (
          <p role="alert" className="type-caption text-error">
            {error}
          </p>
        )}
      </div>
    </li>
  );
}

/** Vendor panel: request flash deals and follow their approval. ?shop= picks one of the user's shops. */
export function OwnerDeals() {
  const t = useTranslations("OwnerDeals");
  const searchParams = useSearchParams();
  const { status: session, user } = useSession();
  const [adding, setAdding] = useState(false);
  const isTeam = user?.role === "SHOP_OWNER" || user?.role === "SHOP_STAFF";

  // Only the user's own shops; a shop id typed into the URL is ignored otherwise.
  const shops = useQuery({ queryKey: shopKeys.mine, queryFn: getMyShops, enabled: session === "authenticated" && isTeam });
  const shop = (shops.data ?? []).find((s) => s.id === searchParams.get("shop")) ?? shops.data?.[0];
  const deals = useQuery({ queryKey: dealKeys.shop(shop?.id ?? ""), queryFn: () => listShopDeals(shop?.id ?? ""), enabled: Boolean(shop) });

  const loading = <OwnerSkeleton label={t("loading")} />;
  if (session === "loading") return loading;
  if (session === "guest") {
    return (
      <div className={panel}>
        <h2 className="type-h3 text-ink">{t("guestTitle")}</h2>
        <Link href={`/auth/login?next=${encodeURIComponent("/owner/deals")}`} className={primaryLink}>
          {t("logIn")}
        </Link>
      </div>
    );
  }
  if (!isTeam) {
    return (
      <div className={panel}>
        <h2 className="type-h3 text-ink">{t("notTeamTitle")}</h2>
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

  const list = deals.data ?? [];
  return (
    <div className="flex flex-col gap-5">
      {adding ? (
        <DealRequestForm shopId={shop.id} onDone={() => setAdding(false)} />
      ) : (
        <button type="button" onClick={() => setAdding(true)} className={cn(dealBtn("primary"), "self-start")}>
          <Plus className="size-4" aria-hidden />
          {t("request")}
        </button>
      )}

      {deals.isPending ? (
        <ul className="flex flex-col gap-3" aria-hidden>
          {Array.from({ length: 2 }, (_, i) => (
            <li key={i} className="skeleton h-32 rounded-md" />
          ))}
        </ul>
      ) : deals.isError ? (
        <div className="flex flex-col items-start gap-2">
          <p className="type-body text-error">{t("loadError")}</p>
          <button type="button" onClick={() => deals.refetch()} className={dealBtn("outline")}>
            {t("retry")}
          </button>
        </div>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-line-strong bg-card px-4 py-10 text-center">
          <Zap className="size-7 text-highlight" strokeWidth={1.5} aria-hidden />
          <p className="type-body-medium text-ink">{t("empty")}</p>
          <p className="type-caption max-w-sm text-ink-muted">{t("emptyHint")}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((d) => (
            <OwnerDealRow key={d.id} deal={d} shopId={shop.id} />
          ))}
        </ul>
      )}
    </div>
  );
}

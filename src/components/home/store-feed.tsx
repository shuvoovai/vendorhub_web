"use client";

import { useQuery } from "@tanstack/react-query";
import { Compass, Heart, Store } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { useSession } from "@/components/app-providers";
import { ProductCard } from "@/components/catalog/product-card";
import { ProductSlider } from "@/components/home/product-slider";
import { Link } from "@/i18n/routing";
import type { ProductCardData } from "@/lib/api/catalog";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils";

type Scope = "followed" | "unfollowed";
// "Unfollowed" first and default: everyone (guests too) sees products right away.
const SCOPES: Scope[] = ["unfollowed", "followed"];
const ICONS = { unfollowed: Compass, followed: Heart } as const;
const GRID = "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4";
const LIMIT = 20; // shown in a sideways slider

// Products from shops the user follows / doesn't follow. Guests see a login prompt on "Followed"
// and the newest public products on "Not followed".
export function StoreFeed() {
  const t = useTranslations("StoreFeed");
  const { status } = useSession();
  const [scope, setScope] = useState<Scope>("unfollowed");
  const id = useId();
  const loggedIn = status === "authenticated";

  const query = useQuery({
    queryKey: ["store-feed", scope, loggedIn],
    enabled: status !== "loading" && (loggedIn || scope === "unfollowed"),
    queryFn: () =>
      loggedIn
        ? api.get<ProductCardData[]>(`/products/following?scope=${scope}&limit=${LIMIT}`)
        : api.get<ProductCardData[]>(`/products?sort=newest&availableOnly=true&limit=${LIMIT}`),
  });

  const message = (title: string, hint?: string, action?: React.ReactNode) => (
    <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-line-strong bg-card px-4 py-10 text-center">
      <Store className="size-7 text-highlight" strokeWidth={1.5} aria-hidden />
      <p className="type-body-medium text-ink">{title}</p>
      {hint && <p className="type-caption max-w-sm text-ink-muted">{hint}</p>}
      {action}
    </div>
  );

  let body: React.ReactNode;
  if (status === "loading" || query.isPending) {
    body = (
      <div className={GRID} aria-hidden>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="skeleton aspect-square rounded-sm" />
        ))}
      </div>
    );
    if (!loggedIn && scope === "followed" && status !== "loading") {
      body = message(
        t("loginTitle"),
        t("loginHint"),
        <Link
          href="/auth/login?next=%2F"
          className="type-body-medium mt-2 flex h-11 items-center rounded-full bg-action px-7 text-primary-foreground shadow-sm ring-1 ring-highlight/40 hover:bg-action-hover motion-safe:transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          {t("logIn")}
        </Link>,
      );
    }
  } else if (query.isError) {
    body = message(
      t("error"),
      undefined,
      <button
        type="button"
        onClick={() => query.refetch()}
        className="type-body-medium mt-2 flex h-11 items-center rounded-sm border border-brand px-6 text-brand hover:bg-subtle focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
      >
        {t("retry")}
      </button>,
    );
  } else if (query.data.length === 0) {
    body =
      scope === "followed"
        ? message(t("emptyFollowed"), t("emptyFollowedHint"))
        : message(t("emptyUnfollowed"));
  } else {
    body = (
      <ProductSlider>
        {query.data.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </ProductSlider>
    );
  }

  return (
    <section aria-labelledby={`${id}-title`} className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 border-b border-line pb-3 sm:flex-row sm:items-end sm:justify-between">
        <h2 id={`${id}-title`} className="type-h2 text-ink">
          {t("title")}
        </h2>
        <div
          role="tablist"
          aria-label={t("title")}
          onKeyDown={(e) => {
            if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
            e.preventDefault();
            const next = SCOPES[(SCOPES.indexOf(scope) + 1) % SCOPES.length];
            setScope(next);
            document.getElementById(`${id}-tab-${next}`)?.focus();
          }}
          className="flex w-full gap-1 rounded-full border border-highlight/50 bg-card p-1 shadow-sm sm:w-auto"
        >
          {SCOPES.map((s) => {
            const Icon = ICONS[s];
            const active = scope === s;
            return (
              <button
                key={s}
                type="button"
                role="tab"
                id={`${id}-tab-${s}`}
                aria-selected={active}
                aria-controls={`${id}-panel`}
                tabIndex={active ? 0 : -1}
                onClick={() => setScope(s)}
                className={cn(
                  "type-body-medium flex h-11 flex-1 items-center justify-center gap-2 rounded-full px-5 whitespace-nowrap focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-none motion-safe:transition-colors motion-safe:duration-200 sm:flex-none",
                  active
                    ? "bg-action text-primary-foreground shadow-sm ring-1 ring-highlight/60"
                    : "text-ink-secondary hover:bg-subtle hover:text-ink",
                )}
              >
                <Icon
                  className={cn("size-4", active ? "text-highlight-soft" : "text-highlight")}
                  aria-hidden
                />
                {t(s)}
              </button>
            );
          })}
        </div>
      </div>
      <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${scope}`}>
        {body}
      </div>
    </section>
  );
}

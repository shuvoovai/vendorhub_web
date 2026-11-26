"use client";

import { useQuery } from "@tanstack/react-query";
import { ShoppingBag } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCartReady } from "@/components/cart/cart-badge";
import { Link, usePathname } from "@/i18n/routing";
import { cartKeys, getCart } from "@/lib/api/cart";
import { formatTaka } from "@/lib/format";

// Cart tab fixed to the right edge: item count and subtotal (from the server). Hidden on cart/checkout.
export function FloatingCart() {
  const t = useTranslations("Cart");
  const locale = useLocale();
  const pathname = usePathname();
  const ready = useCartReady();
  const { data } = useQuery({
    queryKey: cartKeys.cart,
    queryFn: getCart,
    enabled: ready,
    staleTime: 30_000,
  });

  if (pathname.startsWith("/cart") || pathname.startsWith("/checkout")) return null;
  const count = data?.totals.itemCount ?? 0;
  const total = formatTaka(data?.totals.subtotal ?? 0, locale);

  return (
    <Link
      href="/cart"
      aria-label={t("floatingLabel", { count, total })}
      className="fixed top-1/2 right-0 z-30 flex w-20 -translate-y-1/2 flex-col overflow-hidden rounded-l-md border border-r-0 border-gold bg-card shadow-card focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-none motion-safe:transition-transform motion-safe:duration-200 hover:-translate-x-1 hover:-translate-y-1/2"
    >
      <span className="flex flex-col items-center gap-1 bg-brand px-2 py-2.5 text-primary-foreground">
        <ShoppingBag className="size-6" strokeWidth={1.5} aria-hidden />
        <span className="type-caption">{t("floatingItems", { count })}</span>
      </span>
      <span className="type-caption py-1.5 text-center font-medium text-brand">{total}</span>
    </Link>
  );
}

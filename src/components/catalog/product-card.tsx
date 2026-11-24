import {
  Cable,
  Headphones,
  Laptop,
  Package,
  Shirt,
  Smartphone,
  Tablet,
  Watch,
  type LucideProps,
} from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { PriceTicket } from "@/components/brand/price-ticket";
import { AdminOnly } from "@/components/auth/admin-only";
import { AddToCartButton } from "@/components/cart/add-to-cart";
import { AvailabilityBadge } from "@/components/catalog/availability-badge";
import { Reveal } from "@/components/motion/reveal";
import { Link } from "@/i18n/routing";
import type { ProductCardData } from "@/lib/api/catalog";

type CategoryKind = "phone" | "tablet" | "laptop" | "watch" | "audio" | "accessory" | "fashion" | "other";

const KINDS: [RegExp, CategoryKind][] = [
  [/phone|mobile/, "phone"],
  [/tablet/, "tablet"],
  [/laptop|computer/, "laptop"],
  [/watch|wearable/, "watch"],
  [/audio|headphone|earbud|speaker/, "audio"],
  [/accessor|charger|cable/, "accessory"],
  [/fashion|cloth|wear|shirt/, "fashion"],
];

function categoryKind(categorySlug: string): CategoryKind {
  return KINDS.find(([pattern]) => pattern.test(categorySlug))?.[1] ?? "other";
}

/** Icon standing in for a missing product photo. A fixed component (React rule: no components chosen during render). */
export function CategoryIcon({ categorySlug, ...props }: { categorySlug: string } & LucideProps) {
  switch (categoryKind(categorySlug)) {
    case "phone":
      return <Smartphone {...props} />;
    case "tablet":
      return <Tablet {...props} />;
    case "laptop":
      return <Laptop {...props} />;
    case "watch":
      return <Watch {...props} />;
    case "audio":
      return <Headphones {...props} />;
    case "accessory":
      return <Cable {...props} />;
    case "fashion":
      return <Shirt {...props} />;
    default:
      return <Package {...props} />;
  }
}

export function ProductCard({ product }: { product: ProductCardData }) {
  const t = useTranslations("Catalog");

  return (
    // Reveal: rises in on scroll, neighbours one after another. The link lifts on hover (.lift).
    // The link covers photo, name and price; the buy buttons sit below it (a button can't be inside a link).
    <Reveal className="flex">
    <div className="lift flex w-full flex-col gap-2 rounded-md border border-line bg-card p-2 pb-3 shadow-card transition-colors hover:border-line-strong">
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-1 flex-col gap-2 rounded-sm focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
    >
      <div className="relative aspect-square overflow-hidden rounded-sm bg-highlight-soft">
        {product.image ? (
          // Photos come from our API (allowed by the CSP). Optimisation is switched on at deployment.
          <Image
            src={product.image}
            alt=""
            fill
            unoptimized
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-contain transition-transform duration-300 ease-out motion-safe:group-hover:scale-105"
          />
        ) : (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-highlight">
            <CategoryIcon categorySlug={product.category.slug} className="size-10" strokeWidth={1.25} aria-hidden />
            <span className="type-caption text-ink-muted">{t("noPhoto")}</span>
          </span>
        )}
        {product.bargainAvailable && (
          <span className="type-caption absolute bottom-2 left-2 rounded-sm bg-highlight px-1.5 py-0.5 text-primary-foreground">
            <span aria-hidden>🤝 </span>
            {t("bargain")}
            <span className="sr-only">: {t("bargainAvailable")}</span>
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1 px-1">
        {product.brand && <p className="type-caption text-ink-muted">{product.brand.name}</p>}
        <h3 className="type-body-medium line-clamp-2 text-ink group-hover:text-brand">{product.title}</h3>
      </div>

      <div className="flex flex-wrap items-baseline gap-1.5 px-1">
        {/* Shop count / "from" price: admins only */}
        {product.shopCount > 1 && (
          <AdminOnly>
            <span className="type-caption text-ink-muted">{t("from")}</span>
          </AdminOnly>
        )}
        <PriceTicket amount={product.lowestPrice} msrp={product.msrp} />
      </div>

      <div className="flex flex-wrap items-center gap-2 px-1">
        <AvailabilityBadge value={product.availability} />
        <AdminOnly>
          <span className="type-caption text-ink-muted">{t("shops", { count: product.shopCount })}</span>
        </AdminOnly>
      </div>
    </Link>
    {/* Cheapest shop's offer. Without one (older API), the card links to the product to choose a shop. */}
    {product.bestListingId && product.hasVariants && (
      <div className="px-1 pt-1">
        <Link
          href={`/products/${product.slug}?listing=${product.bestListingId}`}
          className="type-caption flex h-11 w-full items-center justify-center rounded-sm border border-brand bg-card px-2 text-brand hover:bg-subtle focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          {t("chooseOptions")}
        </Link>
      </div>
    )}
    {product.bestListingId && !product.hasVariants && (
      <div className="px-1 pt-1">
        <AddToCartButton
          listingId={product.bestListingId}
          image={product.image}
          disabled={product.availability === "OUT_OF_STOCK"}
          compact
        />
      </div>
    )}
    </div>
    </Reveal>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-line bg-card p-2 pb-3" aria-hidden>
      <div className="skeleton aspect-square rounded-sm" />
      <div className="skeleton h-4 w-3/4 rounded-sm" />
      <div className="skeleton h-6 w-1/2 rounded-sm" />
    </div>
  );
}
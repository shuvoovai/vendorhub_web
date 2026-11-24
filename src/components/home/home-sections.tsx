import { ChevronRight, Zap } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { CategoryIcon, ProductCard } from "@/components/catalog/product-card";
import { DealEnds } from "@/components/home/deal-ends";
import { Link } from "@/i18n/routing";
import type { Category, ProductCardData } from "@/lib/api/catalog";
import {
  getCategories,
  getFlashDeals,
  getNewArrivals,
} from "@/lib/api/catalog-cache";
import { safeMediaUrl } from "@/lib/api/storefront";

// One sideways row on phones; the cards keep a fixed width so nothing jumps.
const ROW =
  "scroll-row -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0";
const ROW_ITEM = "w-[44%] shrink-0 snap-start sm:w-[30%] lg:w-[23%]";
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function Heading({
  id,
  title,
  href,
  link,
  icon,
}: {
  id: string;
  title: string;
  href: string;
  link: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-line pb-3">
      <h2 id={id} className="type-h2 flex items-center gap-2 text-ink">
        {icon}
        {title}
      </h2>
      <Link
        href={href}
        className="type-body-medium flex min-h-11 shrink-0 items-center gap-1 text-brand hover:underline focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
      >
        {link}
        <ChevronRight className="size-4" aria-hidden />
      </Link>
    </div>
  );
}

export function RowSkeleton({ square = false }: { square?: boolean }) {
  return (
    <div className={ROW} aria-hidden>
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className={ROW_ITEM}>
          <div
            className={
              square
                ? "skeleton aspect-square rounded-sm"
                : "skeleton h-24 rounded-md"
            }
          />
        </div>
      ))}
    </div>
  );
}

// ---------- Categories ----------
async function CategoryList() {
  const t = await getTranslations("HomeSections");
  let categories: Category[];
  try {
    categories = await getCategories();
  } catch {
    return <p className="type-body text-ink-secondary">{t("loadError")}</p>;
  }
  const top = categories
    .filter((c) => c.parentId === null && SLUG.test(c.slug))
    .slice(0, 12);
  if (top.length === 0)
    return <p className="type-body text-ink-secondary">{t("noCategories")}</p>;

  return (
    <ul className={ROW}>
      {top.map((c) => (
        <li key={c.id} className="w-28 shrink-0 snap-start md:w-32">
          <Link
            href={`/search?category=${c.slug}`}
            className="flex h-full min-h-24 flex-col items-center justify-center gap-2 rounded-md border border-line bg-card p-3 text-center hover:border-brand focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
          >
            <CategoryIcon
              categorySlug={c.slug}
              className="size-7 text-highlight"
              strokeWidth={1.5}
              aria-hidden
            />
            <span className="type-caption line-clamp-2 text-ink">{c.name}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export async function CategoriesSection() {
  const t = await getTranslations("HomeSections");
  return (
    <section aria-labelledby="categories-title" className="flex flex-col gap-5">
      <Heading
        id="categories-title"
        title={t("categoriesTitle")}
        href="/search"
        link={t("seeAll")}
      />
      <Suspense fallback={<RowSkeleton />}>
        <CategoryList />
      </Suspense>
    </section>
  );
}

// ---------- Flash deals ----------
async function FlashDealsList() {
  const t = await getTranslations("HomeSections");
  const deals = await getFlashDeals(); // [] on an API error
  if (deals.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-line-strong bg-card px-4 py-8 text-center">
        <Zap className="size-7 text-highlight" strokeWidth={1.5} aria-hidden />
        <p className="type-body-medium text-ink">{t("noDeals")}</p>
        <p className="type-caption text-ink-muted">{t("noDealsHint")}</p>
      </div>
    );
  }

  return (
    <ul className={ROW}>
      {deals.map((d) => (
        <li key={d.id} className={`${ROW_ITEM} flex flex-col gap-1`}>
          {/* The card's price ticket shows the deal price with the old price struck through */}
          <ProductCard
            product={{
              ...d,
              image: safeMediaUrl(d.image),
              lowestPrice: d.dealPrice,
              msrp: d.originalPrice,
            }}
          />
          <Suspense>
            <DealEnds endsAt={d.dealEndsAt} />
          </Suspense>
        </li>
      ))}
    </ul>
  );
}

export async function FlashDealsSection() {
  const t = await getTranslations("HomeSections");
  return (
    <section aria-labelledby="deals-title" className="flex flex-col gap-5">
      <Heading
        id="deals-title"
        title={t("dealsTitle")}
        href="/search"
        link={t("seeAll")}
        icon={<Zap className="size-6 text-highlight" aria-hidden />}
      />
      <Suspense fallback={<RowSkeleton square />}>
        <FlashDealsList />
      </Suspense>
    </section>
  );
}

// ---------- New arrivals ----------
async function NewArrivalsList() {
  const t = await getTranslations("HomeSections");
  let products: ProductCardData[];
  try {
    products = await getNewArrivals();
  } catch {
    return <p className="type-body text-ink-secondary">{t("loadError")}</p>;
  }
  if (products.length === 0)
    return <p className="type-body text-ink-secondary">{t("noProducts")}</p>;

  return (
    <ul className={ROW}>
      {products.map((p) => (
        <li key={p.id} className={`${ROW_ITEM} flex`}>
          <ProductCard product={p} />
        </li>
      ))}
    </ul>
  );
}

export async function NewArrivalsSection() {
  const t = await getTranslations("HomeSections");
  return (
    <section aria-labelledby="arrivals-title" className="flex flex-col gap-5">
      <Heading
        id="arrivals-title"
        title={t("arrivalsTitle")}
        href="/search?sort=newest"
        link={t("seeAll")}
      />
      <Suspense fallback={<RowSkeleton square />}>
        <NewArrivalsList />
      </Suspense>
    </section>
  );
}

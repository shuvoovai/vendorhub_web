"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronDown, House, LayoutGrid, Menu, Package, Store } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { CategoryIcon } from "@/components/catalog/product-card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Link } from "@/i18n/routing";
import { listCategories } from "@/lib/api/catalog";
import { cn } from "@/lib/utils";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const item =
  "type-body-medium flex min-h-11 w-full items-center gap-3 rounded-sm px-3 text-ink hover:bg-subtle focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none";

// Top-level categories, loaded only when the dropdown is first opened.
function CategoryLinks({ onPick }: { onPick: () => void }) {
  const t = useTranslations("HomeSections");
  const query = useQuery({
    queryKey: ["categories"],
    queryFn: listCategories,
    staleTime: 10 * 60_000,
  });

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-1 py-1 pl-6" aria-hidden>
        {Array.from({ length: 4 }, (_, i) => (
          <span key={i} className="skeleton h-9 rounded-sm" />
        ))}
      </div>
    );
  }
  if (query.isError) {
    return <p className="type-caption px-3 py-2 pl-9 text-ink-muted">{t("loadError")}</p>;
  }
  const top = query.data.filter((c) => c.parentId === null && SLUG.test(c.slug));
  if (top.length === 0) {
    return <p className="type-caption px-3 py-2 pl-9 text-ink-muted">{t("noCategories")}</p>;
  }

  return (
    <ul className="flex flex-col py-1 pl-6">
      {top.map((c) => (
        <li key={c.id}>
          <Link href={`/search?category=${c.slug}`} onClick={onPick} className={cn(item, "type-body")}>
            <CategoryIcon categorySlug={c.slug} className="size-4 text-highlight" strokeWidth={1.5} aria-hidden />
            <span className="line-clamp-1">{c.name}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

// Hamburger button left of the logo that opens a side menu with extra pages.
export function NavMenu() {
  const t = useTranslations("Nav");
  const tMarket = useTranslations("Market");
  const tHome = useTranslations("HomeSections");
  const [open, setOpen] = useState(false);
  const [catsOpen, setCatsOpen] = useState(false);
  const catsId = useId();
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label={t("menu")}
        className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-full text-ink-secondary hover:bg-subtle focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
      >
        <Menu className="size-5" aria-hidden />
      </SheetTrigger>
      <SheetContent side="left" className="w-72 overflow-y-auto bg-card">
        <SheetHeader>
          <SheetTitle className="type-h3 text-ink">{t("menu")}</SheetTitle>
          <SheetDescription className="sr-only">{t("menuText")}</SheetDescription>
        </SheetHeader>
        <nav aria-label={t("menu")} className="flex flex-col gap-1 px-2 pb-4">
          <Link href="/markets" className={item} onClick={close}>
            <Store className="size-5 text-highlight" aria-hidden />
            {tMarket("viewAll")}
          </Link>
          <div>
            <button
              type="button"
              aria-expanded={catsOpen}
              aria-controls={catsId}
              onClick={() => setCatsOpen((v) => !v)}
              className={item}
            >
              <LayoutGrid className="size-5 text-highlight" aria-hidden />
              {tHome("categoriesTitle")}
              <ChevronDown
                className={cn(
                  "ml-auto size-4 text-ink-muted motion-safe:transition-transform motion-safe:duration-200",
                  catsOpen && "rotate-180",
                )}
                aria-hidden
              />
            </button>
            <div id={catsId} hidden={!catsOpen}>
              {catsOpen && <CategoryLinks onPick={close} />}
            </div>
          </div>
          <Link href="/tolet" className={item} onClick={close}>
            <House className="size-5 text-highlight" aria-hidden />
            {t("tolet")}
          </Link>
          <Link href="/account/orders" className={item} onClick={close}>
            <Package className="size-5 text-highlight" aria-hidden />
            {t("track")}
          </Link>
        </nav>
      </SheetContent>
    </Sheet>
  );
}

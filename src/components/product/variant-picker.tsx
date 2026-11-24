"use client";

import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";
import { AddToCartButton } from "@/components/cart/add-to-cart";
import type { Listing } from "@/lib/api/catalog";
import { formatTaka } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  listing: Listing;
  productSlug: string;
  image?: string | null;
  disabled?: boolean; // whole listing out of stock
};

/**
 * Customer side: pick each option (Color, Size…) as buttons, then buy that exact variant.
 * A value that has no available variant with the other choices is shown crossed out.
 */
export function ListingPurchase({ listing, productSlug, image, disabled = false }: Props) {
  const t = useTranslations("Product.variants");
  const locale = useLocale();
  const id = useId();
  const options = listing.variantOptions ?? [];
  const variants = listing.variants ?? [];
  const [chosen, setChosen] = useState<Record<string, string>>({});

  if (options.length === 0) {
    return <AddToCartButton listingId={listing.id} productSlug={productSlug} disabled={disabled} image={image} />;
  }

  const matches = (sel: Record<string, string>) =>
    variants.filter((v) => Object.entries(sel).every(([k, val]) => v.options[k] === val));
  const inStock = (sel: Record<string, string>) => matches(sel).some((v) => v.availability !== "OUT_OF_STOCK");
  const complete = options.every((o) => chosen[o.name]);
  const variant = complete ? matches(chosen)[0] : undefined;
  const missing = options.find((o) => !chosen[o.name]);

  return (
    <div className="flex flex-col gap-4">
      {options.map((o) => (
        <fieldset key={o.name} className="flex flex-col gap-2">
          <legend className="type-body-medium mb-2 text-ink">
            {o.name}
            {chosen[o.name] && <span className="text-ink-secondary">: {chosen[o.name]}</span>}
          </legend>
          <div className="flex flex-wrap gap-2">
            {o.values.map((v) => {
              const on = chosen[o.name] === v;
              const possible = inStock({ ...chosen, [o.name]: v });
              return (
                <label
                  key={v}
                  className={cn(
                    "type-body flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-sm border px-4 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand has-[:focus-visible]:ring-offset-2 motion-safe:transition-colors",
                    on ? "border-brand bg-action text-primary-foreground" : "border-line-strong bg-card text-ink hover:border-brand",
                    !possible && !on && "text-ink-muted line-through",
                  )}
                >
                  <input
                    type="radio"
                    name={`${id}-${o.name}`}
                    value={v}
                    checked={on}
                    onChange={() => setChosen((c) => ({ ...c, [o.name]: v }))}
                    className="sr-only"
                  />
                  {v}
                  {!possible && <span className="sr-only"> ({t("unavailable")})</span>}
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}

      {variant && variant.price !== listing.price && (
        <p className="type-body text-ink" aria-live="polite">
          {t("priceFor", { label: Object.values(variant.options).join(" / "), price: formatTaka(variant.price, locale) })}
        </p>
      )}
      {complete && (!variant || variant.availability === "OUT_OF_STOCK") && (
        <p role="status" className="type-caption text-error">
          {t("soldOut")}
        </p>
      )}

      <AddToCartButton
        listingId={listing.id}
        variantId={variant?.id ?? null}
        productSlug={productSlug}
        image={image}
        disabled={disabled || !variant || variant.availability === "OUT_OF_STOCK"}
      />
      {missing && (
        <p className="type-caption -mt-2 text-ink-muted">{t("choose", { option: missing.name })}</p>
      )}
    </div>
  );
}

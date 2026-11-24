"use client";

import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState, type KeyboardEvent } from "react";
import { parseAmount } from "@/lib/api/bargains";
import {
  MAX_OPTION_VALUES,
  MAX_VARIANT_OPTIONS,
  type OwnerListing,
  type VariantInput,
  type VariantOption,
} from "@/lib/api/listings";
import { cn } from "@/lib/utils";

type Row = { price: string; stock: string; active: boolean };
export type VariantsState = {
  enabled: boolean;
  options: VariantOption[];
  rows: Record<string, Row>; // key: the combination's values, see comboKey
};

const inputClass =
  "type-body h-11 w-full rounded-sm border border-line-strong bg-card px-3 text-ink focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none";
const SUGGESTED = ["Color", "Size", "Material", "Storage"];
const MAX_NAME = 30;
const MAX_VALUE = 30;

/** Every combination of the option values, e.g. Red/S, Red/M, Blue/S, Blue/M. */
export function combinations(options: VariantOption[]): Record<string, string>[] {
  const usable = options.filter((o) => o.name.trim() && o.values.length > 0);
  if (usable.length === 0) return [];
  return usable.reduce<Record<string, string>[]>(
    (acc, o) => acc.flatMap((c) => o.values.map((v) => ({ ...c, [o.name.trim()]: v }))),
    [{}],
  );
}
const comboKey = (c: Record<string, string>) => JSON.stringify(Object.values(c));
const comboLabel = (c: Record<string, string>) => Object.values(c).join(" / ");

export function initialVariants(listing?: OwnerListing): VariantsState {
  const options = listing?.variantOptions ?? [];
  const rows: Record<string, Row> = {};
  for (const v of listing?.variants ?? []) {
    rows[comboKey(v.options)] = {
      price: v.price === null ? "" : String(v.price),
      stock: v.stockQty === null ? "" : String(v.stockQty),
      active: v.isActive,
    };
  }
  return { enabled: options.length > 0, options, rows };
}

/**
 * Checks the editor and builds what the API needs. Returns an error text key or the payload.
 * Variants without their own price use the listing price.
 */
export function buildVariants(
  state: VariantsState,
  track: boolean,
  maxPrice: number,
  maxStock: number,
): { error: string } | { variantOptions: VariantOption[]; variants: VariantInput[] } {
  if (!state.enabled) return { variantOptions: [], variants: [] };
  const options = state.options
    .map((o) => ({ name: o.name.trim(), values: o.values }))
    .filter((o) => o.name || o.values.length);
  if (options.length === 0) return { error: "variants.errors.none" };
  if (options.some((o) => !o.name || o.values.length === 0)) return { error: "variants.errors.incomplete" };
  const names = options.map((o) => o.name.toLowerCase());
  if (new Set(names).size !== names.length) return { error: "variants.errors.duplicateName" };

  const variants: VariantInput[] = [];
  for (const c of combinations(options)) {
    const row = state.rows[comboKey(c)] ?? { price: "", stock: "", active: true };
    const price = row.price.trim() ? parseAmount(row.price) : null;
    if (row.price.trim() && (price === null || price < 1 || price > maxPrice)) return { error: "variants.errors.price" };
    const stock = parseAmount(row.stock);
    if (track && row.active && (stock === null || stock > maxStock)) return { error: "variants.errors.stock" };
    variants.push({ options: c, price, stockQty: track ? (stock ?? 0) : null, isActive: row.active });
  }
  if (!variants.some((v) => v.isActive)) return { error: "variants.errors.allOff" };
  return { variantOptions: options, variants };
}

/** Vendor side: turn on variants, name the options (Color, Size…), then set price/stock per combination. */
export function VariantsEditor({
  value,
  onChange,
  track,
  basePrice,
}: {
  value: VariantsState;
  onChange: (next: VariantsState) => void;
  track: boolean; // the listing counts stock: each variant gets a stock field
  basePrice: string; // shown as the placeholder of each variant's price
}) {
  const t = useTranslations("OwnerListings.variants");
  const id = useId();
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const set = (patch: Partial<VariantsState>) => onChange({ ...value, ...patch });
  const setOption = (i: number, o: VariantOption) =>
    set({ options: value.options.map((x, j) => (j === i ? o : x)) });

  function addValues(i: number, text: string) {
    const o = value.options[i];
    const fresh = text
      .split(",")
      .map((v) => v.trim().slice(0, MAX_VALUE))
      .filter((v) => v && !o.values.some((x) => x.toLowerCase() === v.toLowerCase()));
    if (fresh.length) setOption(i, { ...o, values: [...o.values, ...fresh].slice(0, MAX_OPTION_VALUES) });
    setDrafts((d) => ({ ...d, [i]: "" }));
  }
  function onValueKey(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault(); // Enter must not submit the whole form
      addValues(i, drafts[i] ?? "");
    }
  }

  const combos = combinations(value.options);
  const row = (c: Record<string, string>): Row => value.rows[comboKey(c)] ?? { price: "", stock: "", active: true };
  const setRow = (c: Record<string, string>, patch: Partial<Row>) =>
    set({ rows: { ...value.rows, [comboKey(c)]: { ...row(c), ...patch } } });

  return (
    <fieldset className="flex flex-col gap-3 rounded-md border border-line-strong p-3">
      <legend className="sr-only">{t("title")}</legend>
      <label className="flex min-h-11 cursor-pointer items-start gap-3 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand">
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(e) =>
            set({
              enabled: e.target.checked,
              options: e.target.checked && value.options.length === 0 ? [{ name: "Color", values: [] }] : value.options,
            })
          }
          className="mt-0.5 size-5 accent-brand"
        />
        <span className="flex flex-col">
          <span className="type-body-medium text-ink">{t("enable")}</span>
          <span className="type-caption text-ink-muted">{t("enableHint")}</span>
        </span>
      </label>

      {value.enabled && (
        <>
          <datalist id={`${id}-names`}>
            {SUGGESTED.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>

          {value.options.map((o, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-sm bg-surface p-3">
              <div className="flex items-end gap-2">
                <div className="flex flex-1 flex-col gap-1">
                  <label htmlFor={`${id}-name-${i}`} className="type-caption text-ink-secondary">
                    {t("optionName")}
                  </label>
                  <input
                    id={`${id}-name-${i}`}
                    list={`${id}-names`}
                    maxLength={MAX_NAME}
                    value={o.name}
                    placeholder={t("optionNamePlaceholder")}
                    onChange={(e) => setOption(i, { ...o, name: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => set({ options: value.options.filter((_, j) => j !== i) })}
                  aria-label={t("removeOption", { name: o.name || t("optionName") })}
                  className="flex size-11 shrink-0 items-center justify-center rounded-sm border border-line-strong text-error hover:border-error focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </div>

              <label htmlFor={`${id}-values-${i}`} className="type-caption text-ink-secondary">
                {t("values")}
              </label>
              {o.values.length > 0 && (
                <ul className="flex flex-wrap gap-1.5">
                  {o.values.map((v) => (
                    <li key={v} className="type-caption flex items-center gap-1 rounded-full border border-line-strong bg-card py-0.5 pr-0.5 pl-3 text-ink">
                      {v}
                      <button
                        type="button"
                        onClick={() => setOption(i, { ...o, values: o.values.filter((x) => x !== v) })}
                        aria-label={t("removeValue", { value: v })}
                        className="flex size-8 items-center justify-center rounded-full hover:bg-subtle focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                      >
                        <X className="size-3.5" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2">
                <input
                  id={`${id}-values-${i}`}
                  maxLength={MAX_VALUE * 5}
                  value={drafts[i] ?? ""}
                  placeholder={t("valuesPlaceholder")}
                  onChange={(e) => setDrafts((d) => ({ ...d, [i]: e.target.value }))}
                  onKeyDown={(e) => onValueKey(i, e)}
                  disabled={o.values.length >= MAX_OPTION_VALUES}
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => addValues(i, drafts[i] ?? "")}
                  className="type-body-medium flex h-11 shrink-0 items-center rounded-sm border border-brand px-4 text-brand hover:bg-subtle focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                >
                  {t("addValue")}
                </button>
              </div>
            </div>
          ))}

          {value.options.length < MAX_VARIANT_OPTIONS && (
            <button
              type="button"
              onClick={() => set({ options: [...value.options, { name: value.options.length === 0 ? "Color" : "Size", values: [] }] })}
              className="type-body-medium flex min-h-11 items-center gap-2 self-start rounded-sm px-2 text-brand hover:underline focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
            >
              <Plus className="size-4" aria-hidden />
              {t("addOption")}
            </button>
          )}

          {combos.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="type-body-medium text-ink">{t("combos", { count: combos.length })}</p>
              <p className="type-caption text-ink-muted">{t("combosHint")}</p>
              <ul className="flex flex-col gap-2">
                {combos.map((c) => {
                  const r = row(c);
                  const label = comboLabel(c);
                  return (
                    <li
                      key={comboKey(c)}
                      className={cn(
                        "grid grid-cols-[1fr_1fr_auto] items-center gap-2 rounded-sm border border-line p-2 sm:grid-cols-[1fr_7rem_6rem_auto]",
                        !r.active && "opacity-60",
                      )}
                    >
                      <span className="type-body-medium col-span-3 text-ink sm:col-span-1">{label}</span>
                      <input
                        inputMode="numeric"
                        maxLength={12}
                        value={r.price}
                        placeholder={basePrice || t("price")}
                        onChange={(e) => setRow(c, { price: e.target.value })}
                        aria-label={t("priceFor", { label })}
                        className={inputClass}
                      />
                      {track ? (
                        <input
                          inputMode="numeric"
                          maxLength={7}
                          value={r.stock}
                          placeholder={t("stock")}
                          onChange={(e) => setRow(c, { stock: e.target.value })}
                          aria-label={t("stockFor", { label })}
                          className={inputClass}
                        />
                      ) : (
                        <span className="hidden sm:block" />
                      )}
                      <label className="type-caption flex min-h-11 cursor-pointer items-center gap-2 text-ink">
                        <input
                          type="checkbox"
                          checked={r.active}
                          onChange={(e) => setRow(c, { active: e.target.checked })}
                          className="size-5 accent-brand"
                        />
                        {t("on")}
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}
    </fieldset>
  );
}

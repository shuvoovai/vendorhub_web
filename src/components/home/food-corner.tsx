"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, LoaderCircle, UtensilsCrossed } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useId, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useSession } from "@/components/app-providers";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { TextField } from "@/components/ui/text-field";
import { ApiError } from "@/lib/api/core";
import {
  createFoodOrder,
  listFoodItems,
  requestKeys,
  type FoodItem,
} from "@/lib/api/requests";
import { formatTaka } from "@/lib/format";

// Demo menu, shown until the backend has food items (or when it is down). Ordering needs the real menu.
const DEMO: FoodItem[] = [
  {
    id: "demo-1",
    nameEn: "Chicken Biryani",
    nameBn: "চিকেন বিরিয়ানি",
    descriptionEn: "Old Dhaka style, with egg",
    descriptionBn: "পুরান ঢাকার স্টাইল, ডিম সহ",
    price: 280,
    emoji: "🍛",
    isAvailable: true,
  },
  {
    id: "demo-2",
    nameEn: "Beef Tehari",
    nameBn: "বিফ তেহারি",
    descriptionEn: "Mustard oil, green chilli",
    descriptionBn: "সরিষার তেল, কাঁচা মরিচ",
    price: 220,
    emoji: "🥘",
    isAvailable: true,
  },
  {
    id: "demo-3",
    nameEn: "Fuchka (10 pcs)",
    nameBn: "ফুচকা (১০টি)",
    descriptionEn: "With tamarind water",
    descriptionBn: "তেঁতুলের টক সহ",
    price: 80,
    emoji: "🥟",
    isAvailable: true,
  },
  {
    id: "demo-4",
    nameEn: "Mutton Kacchi",
    nameBn: "মাটন কাচ্চি",
    descriptionEn: "Slow-cooked, with borhani",
    descriptionBn: "দমে রান্না, বোরহানি সহ",
    price: 420,
    emoji: "🍲",
    isAvailable: true,
  },
  {
    id: "demo-5",
    nameEn: "Chicken Shawarma",
    nameBn: "চিকেন শর্মা",
    descriptionEn: "Garlic sauce, fries",
    descriptionBn: "গার্লিক সস, ফ্রাই",
    price: 180,
    emoji: "🌯",
    isAvailable: true,
  },
  {
    id: "demo-6",
    nameEn: "Mango Lassi",
    nameBn: "ম্যাংগো লাচ্ছি",
    descriptionEn: "Fresh mango, yoghurt",
    descriptionBn: "তাজা আম, দই",
    price: 120,
    emoji: "🥭",
    isAvailable: true,
  },
];

const PHONE = /^01[3-9]\d{8}$/; // Bangladeshi mobile
const primary =
  "type-body-medium flex h-11 items-center justify-center rounded-sm bg-action px-5 text-primary-foreground hover:bg-action-hover focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60";

export function FoodCorner() {
  const t = useTranslations("FoodCorner");
  const locale = useLocale();
  const { user } = useSession();
  const [picked, setPicked] = useState<FoodItem | null>(null);
  const id = useId();
  // Only for logged-in vendors (shop owners and staff)
  const isVendor = user?.role === "SHOP_OWNER" || user?.role === "SHOP_STAFF";
  const query = useQuery({
    queryKey: requestKeys.food,
    queryFn: listFoodItems,
    enabled: isVendor,
  });
  if (!isVendor) return null;

  const isDemo = !query.data || query.data.length === 0;
  const items = isDemo ? DEMO : query.data.filter((i) => i.isAvailable);
  const bn = locale === "bn";

  return (
    <section aria-labelledby={`${id}-title`} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1 border-b border-line pb-3">
        <h2
          id={`${id}-title`}
          className="type-h2 flex items-center gap-2 text-ink"
        >
          <UtensilsCrossed className="size-6 text-highlight" aria-hidden />
          {t("title")}
        </h2>
        <p className="type-body text-ink-secondary">{t("text")}</p>
      </div>

      {query.isPending ? (
        <div
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
          aria-hidden
        >
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="skeleton h-44 rounded-md" />
          ))}
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-2 rounded-md border border-line bg-card p-3"
            >
              <span
                aria-hidden
                className="flex aspect-square items-center justify-center rounded-sm bg-highlight-soft text-5xl"
              >
                {item.emoji ?? "🍽️"}
              </span>
              <h3 className="type-body-medium line-clamp-1 text-ink">
                {bn ? item.nameBn : item.nameEn}
              </h3>
              <p className="type-caption line-clamp-2 min-h-8 text-ink-muted">
                {bn ? item.descriptionBn : item.descriptionEn}
              </p>
              <p className="type-price text-brand">
                {formatTaka(item.price, locale)}
              </p>
              <button
                type="button"
                disabled={isDemo}
                onClick={() => setPicked(item)}
                className={primary}
              >
                {t("order")}
              </button>
            </li>
          ))}
        </ul>
      )}
      {isDemo && !query.isPending && (
        <p className="type-caption text-ink-muted">{t("demoNote")}</p>
      )}

      <Dialog
        open={picked !== null}
        onOpenChange={(open) => !open && setPicked(null)}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
          {picked && <OrderForm item={picked} onDone={() => setPicked(null)} />}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function OrderForm({ item, onDone }: { item: FoodItem; onDone: () => void }) {
  const t = useTranslations("FoodCorner");
  const locale = useLocale();
  const schema = useMemo(
    () =>
      z.object({
        quantity: z.coerce
          .number<string>()
          .int()
          .min(1, { error: t("errors.quantity") })
          .max(20, { error: t("errors.quantity") }),
        name: z
          .string()
          .trim()
          .min(2, { error: t("errors.name") })
          .max(80, { error: t("errors.name") }),
        phone: z
          .string()
          .trim()
          .regex(PHONE, { error: t("errors.phone") }),
        address: z
          .string()
          .trim()
          .min(5, { error: t("errors.address") })
          .max(300, { error: t("errors.address") }),
        note: z.string().trim().max(300).optional(),
      }),
    [t],
  );
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      quantity: "1",
      name: "",
      phone: "",
      address: "",
      note: "",
    },
  });
  const order = useMutation({ mutationFn: createFoodOrder });

  if (order.isSuccess) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <CheckCircle2 className="size-10 text-success" aria-hidden />
        <DialogTitle className="type-h3 text-ink">{t("sentTitle")}</DialogTitle>
        <DialogDescription className="type-body text-ink-secondary">
          {t("sentText")}
        </DialogDescription>
        <button type="button" onClick={onDone} className={primary}>
          {t("close")}
        </button>
      </div>
    );
  }

  const name = locale === "bn" ? item.nameBn : item.nameEn;
  const err = order.error;
  const errorText = err
    ? t(
        err instanceof ApiError && err.status === 400
          ? "errors.checkFields"
          : err instanceof ApiError && err.status === 0
            ? "errors.network"
            : "errors.generic",
      )
    : null;

  return (
    <form
      noValidate
      onSubmit={handleSubmit((v) =>
        order.mutate({ itemId: item.id, ...v, note: v.note || undefined }),
      )}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1 pr-8">
        <DialogTitle className="type-h3 text-ink">
          {t("formTitle", { name })}
        </DialogTitle>
        <DialogDescription className="type-caption text-ink-muted">
          {t("formHint", { price: formatTaka(item.price, locale) })}
        </DialogDescription>
      </div>
      <TextField
        label={t("quantity")}
        inputMode="numeric"
        maxLength={2}
        error={errors.quantity?.message}
        {...register("quantity")}
      />
      <TextField
        label={t("name")}
        autoComplete="name"
        maxLength={80}
        error={errors.name?.message}
        {...register("name")}
      />
      <TextField
        label={t("phone")}
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        maxLength={11}
        placeholder="01XXXXXXXXX"
        error={errors.phone?.message}
        {...register("phone")}
      />
      <TextField
        label={t("address")}
        autoComplete="street-address"
        maxLength={300}
        error={errors.address?.message}
        {...register("address")}
      />
      <TextField
        label={t("note")}
        maxLength={300}
        error={errors.note?.message}
        {...register("note")}
      />
      {errorText && (
        <p role="alert" className="type-caption text-error">
          {errorText}
        </p>
      )}
      <button type="submit" disabled={order.isPending} className={primary}>
        {order.isPending && (
          <LoaderCircle
            className="mr-2 size-4 motion-safe:animate-spin"
            aria-hidden
          />
        )}
        {t("send")}
      </button>
      <p className="type-caption text-ink-muted">{t("priceNote")}</p>
    </form>
  );
}

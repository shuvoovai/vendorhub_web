"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Building2,
  CheckCircle2,
  House,
  LoaderCircle,
  CalendarCheck,
  MapPin,
  Plus,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useId, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { TextField } from "@/components/ui/text-field";
import { ApiError } from "@/lib/api/core";
import {
  INQUIRY_TIMES,
  TOLET_TYPES,
  createTolet,
  createToletInquiry,
  listTolets,
  requestKeys,
  type Tolet,
  type ToletInput,
  type ToletInquiryInput,
} from "@/lib/api/requests";
import { formatTaka } from "@/lib/format";

const PHONE = /^01[3-9]\d{8}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const primary =
  "type-body-medium flex h-11 items-center justify-center gap-2 rounded-sm bg-action px-5 text-primary-foreground hover:bg-action-hover focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60";
const selectClass =
  "type-body h-12 w-full rounded-sm border border-line-strong bg-card px-3 text-ink focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none";

// Approved To-let listings + a button that opens the request form. New requests wait for admin approval.
export function ToletSection() {
  const t = useTranslations("Tolet");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [contact, setContact] = useState<Tolet | null>(null);
  const id = useId();
  const query = useQuery({ queryKey: requestKeys.tolets, queryFn: listTolets });

  return (
    <section aria-labelledby={`${id}-title`} className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 border-b border-line pb-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2
            id={`${id}-title`}
            className="type-h2 flex items-center gap-2 text-ink"
          >
            <House className="size-6 text-highlight" aria-hidden />
            {t("title")}
          </h2>
          <p className="type-body text-ink-secondary">{t("text")}</p>
        </div>
        {/* No login needed: the server rate-limits and an admin approves every request */}
        <button type="button" onClick={() => setOpen(true)} className={primary}>
          <Plus className="size-4" aria-hidden />
          {t("post")}
        </button>
      </div>

      {query.isPending ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-hidden>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="skeleton h-48 rounded-md" />
          ))}
        </div>
      ) : query.isError || query.data.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-line-strong bg-card px-4 py-10 text-center">
          <House
            className="size-7 text-highlight"
            strokeWidth={1.5}
            aria-hidden
          />
          <p className="type-body-medium text-ink">{t("empty")}</p>
          <p className="type-caption text-ink-muted">{t("emptyHint")}</p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {query.data.map((l) => (
            <li
              key={l.id}
              className="flex flex-col gap-2 rounded-md border border-line bg-card p-4"
            >
              <span className="type-caption w-fit rounded-sm bg-highlight-soft px-2 py-0.5 text-ink">
                {t(`types.${l.type}`)}
              </span>
              <h3 className="type-body-medium line-clamp-2 text-ink">
                {l.title}
              </h3>
              <p className="type-price text-brand">
                {t("perMonth", { rent: formatTaka(l.rent, locale) })}
              </p>
              <p className="type-caption flex items-center gap-1 text-ink-secondary">
                <MapPin className="size-3.5 shrink-0" aria-hidden />
                <span className="line-clamp-1">{l.area}</span>
              </p>
              {(l.marketName || l.floor || l.sizeSqft) && (
                <p className="type-caption flex items-center gap-1 text-ink-secondary">
                  <Building2 className="size-3.5 shrink-0" aria-hidden />
                  <span className="line-clamp-1">
                    {[
                      l.marketName,
                      l.floor,
                      l.sizeSqft ? t("sqft", { size: l.sizeSqft }) : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </p>
              )}
              {l.advance != null && (
                <p className="type-caption text-ink-secondary">
                  {t("advanceShown", { amount: formatTaka(l.advance, locale) })}
                </p>
              )}
              {l.description && (
                <p className="type-caption line-clamp-3 text-ink-muted">
                  {l.description}
                </p>
              )}
              {/* Owner's number stays private: visitors ask us for an appointment instead */}
              <button
                type="button"
                onClick={() => setContact(l)}
                aria-label={t("contactFor", { title: l.title })}
                className={`${primary} mt-auto`}
              >
                <CalendarCheck className="size-4" aria-hidden />
                {t("contactUs")}
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <ToletForm onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog
        open={contact !== null}
        onOpenChange={(o) => !o && setContact(null)}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
          {contact && (
            <InquiryForm
              key={contact.id}
              tolet={contact}
              onDone={() => setContact(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function sendError(err: unknown, t: (k: string) => string) {
  if (!err) return null;
  if (err instanceof ApiError && err.status === 400)
    return t("errors.checkFields");
  if (err instanceof ApiError && err.status === 404) return t("errors.gone");
  if (err instanceof ApiError && err.status === 429) return t("errors.tooMany");
  if (err instanceof ApiError && err.status === 0) return t("errors.network");
  return t("errors.generic");
}

// Appointment request for one to-let. Goes to the admin "Reservations" list; our team calls back.
function InquiryForm({ tolet, onDone }: { tolet: Tolet; onDone: () => void }) {
  const t = useTranslations("Tolet");
  const schema = useMemo(
    () =>
      z.object({
        name: z
          .string()
          .trim()
          .min(2, { error: t("errors.name") })
          .max(80, { error: t("errors.name") }),
        phone: z
          .string()
          .trim()
          .regex(PHONE, { error: t("errors.phone") }),
        preferredDate: z.string().regex(DATE, { error: t("errors.date") }),
        preferredTime: z.enum(INQUIRY_TIMES),
        message: z
          .string()
          .trim()
          .max(500, { error: t("errors.message") }),
        website: z.string(),
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
      name: "",
      phone: "",
      preferredDate: "",
      preferredTime: "MORNING" as const,
      message: "",
      website: "",
    },
  });
  const send = useMutation({
    mutationFn: (input: ToletInquiryInput) =>
      createToletInquiry(tolet.id, input),
  });

  if (send.isSuccess) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <CheckCircle2 className="size-10 text-success" aria-hidden />
        <DialogTitle className="type-h3 text-ink">
          {t("inquiry.sentTitle")}
        </DialogTitle>
        <DialogDescription className="type-body text-ink-secondary">
          {t("inquiry.sentText")}
        </DialogDescription>
        <button type="button" onClick={onDone} className={primary}>
          {t("close")}
        </button>
      </div>
    );
  }

  const errorText = sendError(send.error, t);

  return (
    <form
      noValidate
      onSubmit={handleSubmit((v) =>
        send.mutate({
          ...v,
          message: v.message || undefined,
          website: v.website || undefined,
        }),
      )}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1 pr-8">
        <DialogTitle className="type-h3 text-ink">
          {t("inquiry.title")}
        </DialogTitle>
        <DialogDescription className="type-caption text-ink-muted">
          {t("inquiry.hint", { title: tolet.title })}
        </DialogDescription>
      </div>
      <TextField
        label={t("inquiry.name")}
        autoComplete="name"
        maxLength={80}
        error={errors.name?.message}
        {...register("name")}
      />
      <TextField
        label={t("inquiry.phone")}
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        maxLength={11}
        placeholder="01XXXXXXXXX"
        error={errors.phone?.message}
        {...register("phone")}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label={t("inquiry.date")}
          type="date"
          error={errors.preferredDate?.message}
          {...register("preferredDate")}
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="inquiry-time" className="type-body-medium text-ink">
            {t("inquiry.time")}
          </label>
          <select
            id="inquiry-time"
            className={selectClass}
            {...register("preferredTime")}
          >
            {INQUIRY_TIMES.map((v) => (
              <option key={v} value={v}>
                {t(`inquiry.times.${v}`)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="inquiry-msg" className="type-body-medium text-ink">
          {t("inquiry.message")}
        </label>
        <textarea
          id="inquiry-msg"
          rows={3}
          maxLength={500}
          aria-invalid={errors.message ? true : undefined}
          className="type-body w-full rounded-sm border border-line-strong bg-card p-3 text-ink focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
          {...register("message")}
        />
        {errors.message && (
          <p className="type-caption text-error">{errors.message.message}</p>
        )}
      </div>
      {/* Spam trap: hidden from people and screen readers */}
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="hidden"
        {...register("website")}
      />
      {errorText && (
        <p role="alert" className="type-caption text-error">
          {errorText}
        </p>
      )}
      <button type="submit" disabled={send.isPending} className={primary}>
        {send.isPending && (
          <LoaderCircle
            className="size-4 motion-safe:animate-spin"
            aria-hidden
          />
        )}
        {t("inquiry.send")}
      </button>
    </form>
  );
}

const optionalInt = (max: number, msg: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || (/^\d+$/.test(v) && Number(v) <= max), {
      error: msg,
    })
    .transform((v) => (v === "" ? undefined : Number(v)));

function ToletForm({ onDone }: { onDone: () => void }) {
  const t = useTranslations("Tolet");
  const schema = useMemo(
    () =>
      z.object({
        type: z.enum(TOLET_TYPES),
        title: z
          .string()
          .trim()
          .min(5, { error: t("errors.title") })
          .max(100, { error: t("errors.title") }),
        area: z
          .string()
          .trim()
          .min(2, { error: t("errors.area") })
          .max(60, { error: t("errors.area") }),
        address: z
          .string()
          .trim()
          .min(5, { error: t("errors.address") })
          .max(200, { error: t("errors.address") }),
        rent: z
          .string()
          .trim()
          .regex(/^\d{3,7}$/, { error: t("errors.rent") })
          .transform(Number),
        marketName: z
          .string()
          .trim()
          .max(80, { error: t("errors.market") }),
        floor: z
          .string()
          .trim()
          .max(20, { error: t("errors.floor") }),
        advance: optionalInt(99_999_999, t("errors.number")),
        website: z.string(),
        sizeSqft: optionalInt(100000, t("errors.number")),
        availableFrom: z.string().regex(DATE, { error: t("errors.date") }),
        contactName: z
          .string()
          .trim()
          .min(2, { error: t("errors.name") })
          .max(80, { error: t("errors.name") }),
        contactPhone: z
          .string()
          .trim()
          .regex(PHONE, { error: t("errors.phone") }),
        description: z
          .string()
          .trim()
          .max(1000, { error: t("errors.description") }),
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
      type: "SHOP" as const,
      title: "",
      area: "",
      address: "",
      rent: "",
      marketName: "",
      floor: "",
      advance: "",
      website: "",
      sizeSqft: "",
      availableFrom: "",
      contactName: "",
      contactPhone: "",
      description: "",
    },
  });
  const send = useMutation({
    mutationFn: (input: ToletInput) => createTolet(input),
  });

  if (send.isSuccess) {
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

  const err = send.error;
  const errorText = err
    ? t(
        err instanceof ApiError && err.status === 400
          ? "errors.checkFields"
          : err instanceof ApiError && err.status === 429
            ? "errors.tooMany"
            : err instanceof ApiError && err.status === 0
              ? "errors.network"
              : "errors.generic",
      )
    : null;

  return (
    <form
      noValidate
      onSubmit={handleSubmit((v) =>
        send.mutate({
          ...v,
          marketName: v.marketName || undefined,
          floor: v.floor || undefined,
          description: v.description || undefined,
          website: v.website || undefined,
        }),
      )}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1 pr-8">
        <DialogTitle className="type-h3 text-ink">{t("formTitle")}</DialogTitle>
        <DialogDescription className="type-caption text-ink-muted">
          {t("formHint")}
        </DialogDescription>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="tolet-type" className="type-body-medium text-ink">
          {t("type")}
        </label>
        <select id="tolet-type" className={selectClass} {...register("type")}>
          {TOLET_TYPES.map((v) => (
            <option key={v} value={v}>
              {t(`types.${v}`)}
            </option>
          ))}
        </select>
      </div>
      <TextField
        label={t("titleField")}
        maxLength={100}
        placeholder={t("titlePlaceholder")}
        error={errors.title?.message}
        {...register("title")}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label={t("area")}
          maxLength={60}
          placeholder={t("areaPlaceholder")}
          error={errors.area?.message}
          {...register("area")}
        />
        <TextField
          label={t("rent")}
          inputMode="numeric"
          maxLength={7}
          error={errors.rent?.message}
          {...register("rent")}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label={t("marketName")}
          maxLength={80}
          placeholder={t("marketPlaceholder")}
          error={errors.marketName?.message}
          {...register("marketName")}
        />
        <TextField
          label={t("floor")}
          maxLength={20}
          placeholder={t("floorPlaceholder")}
          error={errors.floor?.message}
          {...register("floor")}
        />
      </div>
      <TextField
        label={t("address")}
        maxLength={200}
        error={errors.address?.message}
        {...register("address")}
      />
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label={t("advance")}
          inputMode="numeric"
          maxLength={8}
          error={errors.advance?.message}
          {...register("advance")}
        />
        <TextField
          label={t("size")}
          inputMode="numeric"
          maxLength={6}
          error={errors.sizeSqft?.message}
          {...register("sizeSqft")}
        />
      </div>
      <TextField
        label={t("availableFrom")}
        type="date"
        error={errors.availableFrom?.message}
        {...register("availableFrom")}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label={t("contactName")}
          autoComplete="name"
          maxLength={80}
          error={errors.contactName?.message}
          {...register("contactName")}
        />
        <TextField
          label={t("contactPhone")}
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          maxLength={11}
          placeholder="01XXXXXXXXX"
          error={errors.contactPhone?.message}
          {...register("contactPhone")}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="tolet-desc" className="type-body-medium text-ink">
          {t("description")}
        </label>
        <textarea
          id="tolet-desc"
          rows={4}
          maxLength={1000}
          aria-invalid={errors.description ? true : undefined}
          className="type-body w-full rounded-sm border border-line-strong bg-card p-3 text-ink focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
          {...register("description")}
        />
        {errors.description && (
          <p className="type-caption text-error">
            {errors.description.message}
          </p>
        )}
      </div>

      {/* Spam trap: hidden from people and screen readers */}
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="hidden"
        {...register("website")}
      />

      {errorText && (
        <p role="alert" className="type-caption text-error">
          {errorText}
        </p>
      )}
      <button type="submit" disabled={send.isPending} className={primary}>
        {send.isPending && (
          <LoaderCircle
            className="size-4 motion-safe:animate-spin"
            aria-hidden
          />
        )}
        {t("send")}
      </button>
    </form>
  );
}

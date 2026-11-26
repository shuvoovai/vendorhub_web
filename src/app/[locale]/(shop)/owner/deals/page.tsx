import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { OwnerDeals } from "@/components/owner/owner-deals";
import { OwnerSkeleton } from "@/components/owner/owner-skeleton";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "OwnerDeals" });
  // Shop team page: never indexed.
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function OwnerDealsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("OwnerDeals");

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="type-display text-ink">{t("title")}</h1>
        <p className="type-body text-ink-secondary">{t("subtitle")}</p>
      </header>
      {/* Reads ?shop= and the current time, which needs a Suspense boundary */}
      <Suspense fallback={<OwnerSkeleton label={t("loading")} />}>
        <OwnerDeals />
      </Suspense>
    </div>
  );
}

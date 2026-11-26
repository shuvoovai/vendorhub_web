import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ToletSection } from "@/components/home/tolet-section";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Tolet" });
  return { title: t("title"), description: t("text") };
}

// /tolet: approved shop to-let listings and the request form (moved here from the home page).
export default async function ToletPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ToletSection />;
}

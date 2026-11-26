import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { InfoPage, infoMetadata } from "@/components/info/info-page";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return infoMetadata((await params).locale, "privacy");
}

export default async function Page({ params }: Props) {
  setRequestLocale((await params).locale);
  return <InfoPage infoKey="privacy" />;
}

import { Mail, Package, Phone } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { InfoPage, infoMetadata } from "@/components/info/info-page";
import { Link } from "@/i18n/routing";
import { SITE_CONTACT, mailtoHref, telHref } from "@/lib/site";

type Props = { params: Promise<{ locale: string }> };

const CARD =
  "flex min-h-14 items-center gap-3 rounded-md border border-line bg-card p-4 shadow-card hover:border-brand focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return infoMetadata((await params).locale, "contact");
}

// Contact: phone / email (when set in src/lib/site.ts) and the order help path.
export default async function ContactPage({ params }: Props) {
  setRequestLocale((await params).locale);
  const t = await getTranslations("Info.contact");
  const tel = telHref(SITE_CONTACT.phone);
  const mail = mailtoHref(SITE_CONTACT.email);

  return (
    <InfoPage infoKey="contact">
      <div className="grid gap-3 sm:grid-cols-2">
        {tel && (
          <a href={tel} className={CARD}>
            <Phone className="size-5 text-highlight" aria-hidden />
            <span className="flex flex-col">
              <span className="type-caption text-ink-muted">{t("phone")}</span>
              <span className="type-body-medium text-ink">{SITE_CONTACT.phone}</span>
            </span>
          </a>
        )}
        {mail && (
          <a href={mail} className={CARD}>
            <Mail className="size-5 text-highlight" aria-hidden />
            <span className="flex flex-col">
              <span className="type-caption text-ink-muted">{t("email")}</span>
              <span className="type-body-medium break-all text-ink">{SITE_CONTACT.email}</span>
            </span>
          </a>
        )}
        <Link href="/account/orders" className={CARD}>
          <Package className="size-5 text-highlight" aria-hidden />
          <span className="flex flex-col">
            <span className="type-caption text-ink-muted">{t("orderHelp")}</span>
            <span className="type-body-medium text-ink">{t("track")}</span>
          </span>
        </Link>
      </div>
    </InfoPage>
  );
}

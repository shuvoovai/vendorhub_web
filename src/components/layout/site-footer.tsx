import { Mail, Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { SITE_CONTACT, mailtoHref, telHref } from "@/lib/site";

const LINK =
  "type-body inline-flex min-h-11 items-center text-primary-foreground/80 underline-offset-4 hover:text-primary-foreground hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none";

// Site footer: bordeaux hall with a gold arch line on top. On phones it leaves room for the bottom bar.
export async function SiteFooter({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "Footer" });
  const columns = [
    {
      title: t("shop"),
      links: [
        { href: "/markets", label: t("allMarkets") },
        { href: "/search", label: t("allProducts") },
        { href: "/tolet", label: t("tolet") },
        { href: "/account/orders", label: t("track") },
      ],
    },
    {
      title: t("help"),
      links: [
        { href: "/contact", label: t("contact") },
        { href: "/return-policy", label: t("returns") },
        { href: "/privacy", label: t("privacy") },
        { href: "/about", label: t("vision") },
      ],
    },
  ];
  const tel = telHref(SITE_CONTACT.phone);
  const mail = mailtoHref(SITE_CONTACT.email);

  return (
    <footer className="relative isolate mt-6 overflow-hidden bg-brand pb-[calc(4.5rem+env(safe-area-inset-bottom))] text-primary-foreground md:pb-0">
      <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gold" />
      <span
        aria-hidden
        className="absolute -right-10 -bottom-6 -z-10 h-56 w-40 rounded-t-full border border-b-0 border-gold/30 md:right-16 md:h-72 md:w-52"
      />
      <div className="mx-auto grid max-w-7xl gap-8 px-4 pt-12 pb-8 md:grid-cols-[1.4fr_1fr_1fr] md:gap-10 md:px-10">
        <div className="flex flex-col gap-3">
          <p className="font-heading text-[1.5rem] leading-none font-semibold">Vendors Hub</p>
          <p className="type-body max-w-sm text-primary-foreground/80">{t("tagline")}</p>
          {(tel || mail) && (
            <ul className="flex flex-col">
              {tel && (
                <li>
                  <a href={tel} className={`${LINK} gap-2`}>
                    <Phone className="size-4 text-gold" aria-hidden />
                    {SITE_CONTACT.phone}
                  </a>
                </li>
              )}
              {mail && (
                <li>
                  <a href={mail} className={`${LINK} gap-2`}>
                    <Mail className="size-4 text-gold" aria-hidden />
                    {SITE_CONTACT.email}
                  </a>
                </li>
              )}
            </ul>
          )}
        </div>
        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title} className="flex flex-col gap-1">
            <h2 className="type-caption mb-1 tracking-[0.12em] text-gold uppercase">{col.title}</h2>
            <ul className="flex flex-col">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className={LINK}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="mx-auto max-w-7xl border-t border-gold/30 px-4 py-4 md:px-10">
        <p className="type-caption text-primary-foreground/70">{t("rights")}</p>
      </div>
    </footer>
  );
}

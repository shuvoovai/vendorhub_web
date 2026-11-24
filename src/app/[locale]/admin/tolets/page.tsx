import { getTranslations, setRequestLocale } from "next-intl/server";
import { ToletAdmin } from "@/components/admin/requests-manager";

type Props = { params: Promise<{ locale: string }> };
export const instant = false;

export default async function AdminToletsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("AdminRequests");
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="type-display text-ink">{t("tolet.title")}</h1>
        <p className="type-body text-ink-secondary">{t("tolet.subtitle")}</p>
      </header>
      <ToletAdmin />
    </div>
  );
}

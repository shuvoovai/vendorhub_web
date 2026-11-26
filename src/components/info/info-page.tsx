import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

export type InfoKey = "privacy" | "returns" | "vision" | "contact";
type Section = { h: string; p: string };

export async function infoMetadata(locale: string, key: InfoKey): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: `Info.${key}` });
  return { title: t("title"), description: t("intro") };
}

/** Plain text page (privacy, return policy, vision, contact): title, intro and numbered sections. */
export async function InfoPage({ infoKey, children }: { infoKey: InfoKey; children?: ReactNode }) {
  const t = await getTranslations(`Info.${infoKey}`);
  const sections = t.raw("sections") as Section[];

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-8">
      <header className="relative flex flex-col gap-2 pb-4">
        <h1 className="type-h2 text-ink">{t("title")}</h1>
        <p className="type-body text-ink-secondary">{t("intro")}</p>
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-gold" />
      </header>
      {children}
      <ol className="flex flex-col gap-6">
        {sections.map((s, i) => (
          <li key={s.h} className="flex gap-4">
            <span
              aria-hidden
              className="flex h-10 w-8 shrink-0 items-end justify-center rounded-t-full rounded-b-sm bg-brand pb-1 font-heading text-primary-foreground"
            >
              {i + 1}
            </span>
            <div className="flex flex-col gap-1">
              <h2 className="type-h3 text-ink">{s.h}</h2>
              <p className="type-body whitespace-pre-line text-ink-secondary">{s.p}</p>
            </div>
          </li>
        ))}
      </ol>
    </article>
  );
}

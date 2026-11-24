"use client";

import { useFormatter, useNow, useTranslations } from "next-intl";

// "Ends in 3 hours". Must be rendered inside <Suspense> (reads the time).
export function DealEnds({ endsAt }: { endsAt: string }) {
  const t = useTranslations("HomeSections");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const end = new Date(endsAt);
  if (Number.isNaN(end.getTime())) return null;
  if (end <= now) return <span className="type-caption text-ink-muted">{t("dealEnded")}</span>;
  return (
    <span className="type-caption text-brand">
      {t("dealEnds", { time: format.relativeTime(end, now) })}
    </span>
  );
}

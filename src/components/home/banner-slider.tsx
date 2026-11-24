"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export type Slide = {
  id: string;
  image?: string | null; // a slide has a photo or a video
  video?: string | null;
  title?: string | null;
  text?: string | null;
  cta?: string | null;
  href: string;
};

// Shown when the admin has no active banners or the API is down.
const FALLBACK = [
  { image: "/banners/banner-1.svg", key: "1", href: "/search" },
  { image: "/banners/banner-2.svg", key: "2", href: "/markets" },
  { image: "/banners/banner-3.svg", key: "3", href: "/bargains" },
] as const;

// Internal links only (the server checks too).
const safeHref = (href: string) =>
  href.startsWith("/") && !href.startsWith("//") && !href.startsWith("/\\")
    ? href
    : "/search";

// Swipe or use the arrows/dots. No autoplay: the project allows no looping animation.
export function BannerSlider({ slides }: { slides?: Slide[] }) {
  const t = useTranslations("Banners");
  const BANNERS: Slide[] =
    slides && slides.length > 0
      ? slides
      : FALLBACK.map((b) => ({
          id: b.key,
          image: b.image,
          href: b.href,
          title: t(`title${b.key}`),
          text: t(`text${b.key}`),
          cta: t(`cta${b.key}`),
        }));
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  // Only the slide in view plays its video, once, muted. Reduced motion: poster only.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.querySelectorAll<HTMLVideoElement>("video").forEach((v) => {
      if (!reduce && Number(v.dataset.slide) === active) void v.play().catch(() => undefined);
      else v.pause();
    });
  }, [active]);

  // Follow the slide in view (also when the user swipes)
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting)
            setActive(Number((e.target as HTMLElement).dataset.index));
        }
      },
      { root: track, threshold: 0.6 },
    );
    track.querySelectorAll("[data-index]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [BANNERS.length]);

  const goTo = (i: number) => {
    const track = trackRef.current;
    if (!track) return;
    const next = (i + BANNERS.length) % BANNERS.length;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    track.scrollTo({
      left: next * track.clientWidth,
      behavior: reduce ? "auto" : "smooth",
    });
  };

  const arrow =
    "absolute top-1/2 z-10 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-card/90 text-brand hover:bg-card focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none md:flex";

  return (
    <section
      aria-roledescription="carousel"
      aria-label={t("label")}
      className="relative"
    >
      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-md [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {BANNERS.map((b, i) => (
          <div
            key={b.id}
            data-index={i}
            role="group"
            aria-roledescription="slide"
            aria-label={t("slideOf", { n: i + 1, total: BANNERS.length })}
            className="relative aspect-[3/2] w-full shrink-0 snap-start sm:aspect-[3/1]"
          >
            {b.image && !b.video && (
            <Image
              src={b.image}
              alt=""
              fill
              unoptimized
              priority={i === 0}
              sizes="(min-width: 1280px) 1216px, 100vw"
              className="object-cover"
            />
            )}
            {b.video && (
              <video
                data-slide={i}
                src={b.video}
                poster={b.image ?? undefined}
                muted
                playsInline
                preload={i === 0 ? "metadata" : "none"}
                aria-hidden
                className="absolute inset-0 size-full object-cover"
              />
            )}
            {/* No dark overlay: the uploaded photo/video shows as it is. A soft text shadow keeps text readable. */}
            <div className="absolute inset-0 flex flex-col items-start justify-center gap-3 px-6 [text-shadow:0_1px_3px_rgb(0_0_0/0.35)] md:px-16">
              {b.title && (
                <h2 className="type-h2 max-w-md text-primary-foreground">
                  {b.title}
                </h2>
              )}
              {b.text && (
                <p className="type-body max-w-md text-primary-foreground/85">
                  {b.text}
                </p>
              )}
              {b.cta && (
                <Link
                  href={safeHref(b.href)}
                  tabIndex={i === active ? 0 : -1}
                  className="type-body-medium flex h-11 items-center rounded-sm bg-card px-6 text-brand hover:bg-subtle focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
                >
                  {b.cta}
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => goTo(active - 1)}
        aria-label={t("prev")}
        className={cn(arrow, "left-3")}
      >
        <ChevronLeft className="size-5" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => goTo(active + 1)}
        aria-label={t("next")}
        className={cn(arrow, "right-3")}
      >
        <ChevronRight className="size-5" aria-hidden />
      </button>

      <div className="mt-2 flex justify-center">
        {BANNERS.map((b, i) => (
          <button
            key={b.id}
            type="button"
            onClick={() => goTo(i)}
            aria-label={t("goTo", { n: i + 1 })}
            aria-current={i === active}
            className="flex size-11 items-center justify-center rounded-full focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
          >
            <span
              className={cn(
                "block h-2 rounded-full motion-safe:transition-colors",
                i === active ? "w-6 bg-brand" : "w-2 bg-gold/50",
              )}
            />
          </button>
        ))}
      </div>
    </section>
  );
}

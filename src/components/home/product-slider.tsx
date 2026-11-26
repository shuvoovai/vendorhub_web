"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from "react";

const ARROW =
  "absolute top-1/2 z-10 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-card text-brand shadow-card hover:border-brand focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none disabled:pointer-events-none disabled:opacity-0 md:flex motion-safe:transition-opacity motion-safe:duration-200";

/**
 * Sideways row of cards: swipe on phones, arrow buttons on bigger screens.
 * The cards are rendered on the server and passed in as children.
 */
export function ProductSlider({ children }: { children: ReactNode }) {
  const t = useTranslations("Catalog");
  const row = useRef<HTMLUListElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const update = useCallback(() => {
    const el = row.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = row.current;
    if (!el) return;
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    el.addEventListener("scroll", update, { passive: true });
    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", update);
    };
  }, [update]);

  function move(direction: 1 | -1) {
    const el = row.current;
    if (!el) return;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: smooth ? "smooth" : "auto" });
  }

  return (
    <div className="relative">
      <button type="button" onClick={() => move(-1)} disabled={!canPrev} aria-label={t("slidePrev")} className={`${ARROW} -left-5`}>
        <ChevronLeft className="size-5" aria-hidden />
      </button>
      <ul
        ref={row}
        className="scroll-row -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:gap-4 md:mx-0 md:px-0"
      >
        {Children.map(children, (child) => (
          <li className="w-[44%] shrink-0 snap-start sm:w-[30%] lg:w-[23%]">{child}</li>
        ))}
      </ul>
      <button type="button" onClick={() => move(1)} disabled={!canNext} aria-label={t("slideNext")} className={`${ARROW} -right-5`}>
        <ChevronRight className="size-5" aria-hidden />
      </button>
    </div>
  );
}

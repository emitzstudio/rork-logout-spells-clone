import useEmblaCarousel from "embla-carousel-react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";

import { Reveal } from "@/components/site/Reveal";
import { cn } from "@/lib/utils";

/** Auto-advance cadence. */
const AUTOPLAY_MS = 4000;
/** How long autoplay sleeps after the visitor touches the carousel. */
const RESUME_MS = 8000;
/** How much the centre card grows — deliberately whisper-subtle. */
const MAX_SCALE = 0.04;
/** Side cards settle at this opacity; the hero card at 1. */
const MIN_OPACITY = 0.88;
/** Peak alpha of the gold glow under the hero card. */
const GLOW_MAX = 0.3;

/** Minimal round arrow, hidden on desktop until the carousel is hovered. */
function CarouselArrow({ dir, onClick }: { dir: "prev" | "next"; onClick: () => void }) {
  const prev = dir === "prev";
  const Icon = prev ? ArrowLeft : ArrowRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={prev ? "Previous" : "Next"}
      className={cn(
        "absolute top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-cream/15 bg-charcoal-deep/85 text-cream/70 shadow-[0_12px_34px_rgba(0,0,0,0.4)] transition-all duration-300 hover:border-gold/40 hover:bg-gold/[0.08] hover:text-gold-light",
        "md:opacity-0 md:group-hover/showcase:opacity-100 md:group-focus-within/showcase:opacity-100",
        prev ? "left-2 lg:left-4" : "right-2 lg:right-4",
      )}
    >
      <Icon className="h-[18px] w-[18px]" />
    </button>
  );
}

export interface ShowcaseCarouselProps<T> {
  items: T[];
  itemKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  ariaLabel: string;
}

/**
 * The site's signature infinite showcase — one engine shared by the Live
 * Spells and Previous Spells carousels. Loops seamlessly (embla loop +
 * duplicated slides when the collection is small), auto-advances one card
 * every 4s, pauses ~8s after any manual touch, and gently crowns whichever
 * card is passing the centre. 1 card on mobile, 2 on tablet, 3 on desktop.
 * With fewer than 3 items it renders a calm centred row instead.
 */
export default function ShowcaseCarousel<T>({
  items,
  itemKey,
  renderItem,
  ariaLabel,
}: ShowcaseCarouselProps<T>) {
  /* Embla needs enough slides to loop without a visible seam; when the
     collection is small, render each item twice (never side by side). */
  const slides = useMemo<{ key: string; item: T }[]>(() => {
    const base = items.map((item) => ({ key: itemKey(item), item }));
    if (items.length === 0 || items.length >= 6) return base;
    return [...base, ...items.map((item) => ({ key: `${itemKey(item)}-loop`, item }))];
  }, [items, itemKey]);

  const [viewportRef, embla] = useEmblaCarousel({
    loop: true,
    align: "start",
    duration: 32,
    skipSnaps: false,
  });

  /* Called on any manual interaction — rests autoplay, resumes after RESUME_MS. */
  const wake = useRef<(() => void) | null>(null);

  const interact = useCallback((action: () => void) => {
    wake.current?.();
    action();
  }, []);

  /* ------------------------- Centre-stage tween -------------------------
     On every frame of movement, each card is scaled/brightened by how close
     it is to the viewport centre, so the "hero" emphasis hands over smoothly
     mid-slide instead of snapping between cards. Writes touch ONLY transform
     and opacity — the gold glow is a pre-painted overlay whose opacity is
     tweened, so no frame ever repaints a shadow. */
  useEffect(() => {
    if (!embla) return;

    const tween = () => {
      const rootRect = embla.rootNode().getBoundingClientRect();
      if (rootRect.width === 0) return;
      const centre = rootRect.left + rootRect.width / 2;

      for (const slide of embla.slideNodes()) {
        const inner = slide.firstElementChild as HTMLElement | null;
        if (!inner) continue;
        const rect = slide.getBoundingClientRect();
        if (rect.width === 0) continue;

        const dist = Math.abs((rect.left + rect.width / 2 - centre) / rootRect.width);
        const raw = Math.max(0, 1 - dist * 3);
        const e = raw * raw * (3 - 2 * raw); // smoothstep — no harsh hand-off

        inner.style.transform = `scale(${(1 + MAX_SCALE * e).toFixed(4)})`;
        inner.style.opacity = (MIN_OPACITY + (1 - MIN_OPACITY) * e).toFixed(3);
        const glow = inner.firstElementChild as HTMLElement | null;
        if (glow) glow.style.opacity = e.toFixed(3);
      }
    };

    tween();
    embla.on("scroll", tween).on("settle", tween).on("reInit", tween);
    return () => {
      embla.off("scroll", tween).off("settle", tween).off("reInit", tween);
    };
  }, [embla]);

  /* ------------------------------ Autoplay ------------------------------ */
  useEffect(() => {
    if (!embla) return;

    let interval: number | null = null;
    let resume: number | null = null;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const halt = () => {
      if (interval !== null) {
        window.clearInterval(interval);
        interval = null;
      }
    };
    const play = () => {
      if (reduced) return;
      halt();
      interval = window.setInterval(() => embla.scrollNext(), AUTOPLAY_MS);
    };
    const rest = () => {
      halt();
      if (resume !== null) window.clearTimeout(resume);
      resume = window.setTimeout(play, RESUME_MS);
    };

    wake.current = rest;
    play();
    embla.on("pointerDown", rest);

    return () => {
      halt();
      if (resume !== null) window.clearTimeout(resume);
      embla.off("pointerDown", rest);
      wake.current = null;
    };
  }, [embla]);

  if (items.length === 0) return null;

  /* With one or two items a carousel is theatre without a cast —
     show them as a calm, centred row instead. */
  if (items.length < 3) {
    return (
      <div className="flex flex-wrap justify-center gap-5 md:gap-6">
        {items.map((item, i) => (
          <Reveal key={itemKey(item)} delay={i * 0.1} className="w-full max-w-[400px]">
            {renderItem(item)}
          </Reveal>
        ))}
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          interact(() => embla?.scrollPrev());
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          interact(() => embla?.scrollNext());
        }
      }}
      className="group/showcase relative focus-visible:outline-none"
    >
      {/* Viewport — vertical padding gives the hero scale + hover lift room to breathe. */}
      <div
        ref={viewportRef}
        className="cursor-grab select-none overflow-hidden px-3 py-8 active:cursor-grabbing md:px-0"
      >
        <div className="-ml-5 flex touch-pan-y md:-ml-6">
          {slides.map(({ key, item }) => (
            <div
              key={key}
              role="group"
              aria-roledescription="slide"
              className="min-w-0 flex-[0_0_100%] pl-5 md:flex-[0_0_50%] md:pl-6 lg:flex-[0_0_33.3333%]"
            >
              <div className="relative rounded-[14px] will-change-transform">
                {/* Pre-painted gold glow — only its opacity is animated. */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-[14px] opacity-0"
                  style={{
                    boxShadow: `0 34px 90px -34px rgba(184,150,62,${GLOW_MAX})`,
                    willChange: "opacity",
                  }}
                />
                {renderItem(item)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edge veils — a quiet hint that the collection continues off-stage. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-10 hidden w-14 bg-gradient-to-r from-charcoal via-charcoal/55 to-transparent md:block lg:w-24"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-10 hidden w-14 bg-gradient-to-l from-charcoal via-charcoal/55 to-transparent md:block lg:w-24"
      />

      <CarouselArrow dir="prev" onClick={() => interact(() => embla?.scrollPrev())} />
      <CarouselArrow dir="next" onClick={() => interact(() => embla?.scrollNext())} />
    </div>
  );
}

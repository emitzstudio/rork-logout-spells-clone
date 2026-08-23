import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

import { useGoBack } from "@/hooks/use-go-back";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

interface PageBackOrbProps {
  className?: string;
  /** Where "back" lands when the page was opened directly (shared link). */
  fallback?: string;
}

/**
 * The circular cream/gold back control (M11.5). One treatment, two homes:
 * the bare orb (`PageBackOrb`) drops into a page's own structure - hero
 * badge rows, standalone headers - and the content-aligned band
 * (`PageBack`, rendered by Layout) sits at the top of the page's own
 * container. It scrolls WITH the page and aligns to each page's content
 * width - never a universal fixed viewport coordinate. Replaces the old
 * viewport-fixed BackFab. Browser/router back behaviour is preserved via
 * useGoBack (history back, or the fallback when the page opened directly).
 */
export function PageBackOrb({ className, fallback = "/" }: PageBackOrbProps) {
  const goBack = useGoBack(fallback);
  return (
    <motion.button
      type="button"
      onClick={goBack}
      aria-label="Go back"
      title="Go back"
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: EASE, delay: 0.15 }}
      className={cn(
        "group flex h-11 w-11 items-center justify-center rounded-full border border-cream/15 bg-charcoal-deep/85 text-cream/70 shadow-[0_12px_34px_rgba(0,0,0,0.4)] backdrop-blur-sm transition-colors duration-300 hover:border-gold/40 hover:bg-gold/[0.08] hover:text-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40",
        className,
      )}
    >
      <ArrowLeft className="h-[18px] w-[18px] transition-transform duration-300 ease-out-expo group-hover:-translate-x-0.5" />
    </motion.button>
  );
}

export interface PageBackConfig {
  /** Tailwind max-width class matching the page's own content container. */
  container?: string;
  /** Horizontal gutters matching the page's own sections. */
  gutters?: string;
  /** Vertical placement - the quiet band between the nav and the hero. */
  top?: string;
}

/**
 * Content-aligned back band. Absolute within the page (NOT fixed), so it
 * scrolls away naturally and hugs the page's own container edge on every
 * viewport. z-40: above page content, below the nav (90) and modals.
 */
export default function PageBack({
  container = "max-w-7xl",
  gutters = "px-5 md:px-10",
  top = "top-[84px] md:top-[94px]",
}: PageBackConfig) {
  return (
    <div className={cn("pointer-events-none absolute inset-x-0 z-40", top)}>
      <div className={cn("mx-auto flex w-full justify-start", container, gutters)}>
        <PageBackOrb className="pointer-events-auto" />
      </div>
    </div>
  );
}

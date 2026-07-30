import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "react-router-dom";

import { useGoBack } from "@/hooks/use-go-back";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Floating back button for the public site — fixed to the viewport so it
 * stays put while the page scrolls. Hidden on the homepage (nowhere to go
 * back to) and on /dashboard, which carries its own back arrow in the topbar.
 * Sits at z-[85]: above page content, below the nav (90), menus/modals
 * (92–97) and the portal (200).
 */
export default function BackFab() {
  const location = useLocation();
  const goBack = useGoBack("/");

  const hidden = location.pathname === "/" || location.pathname.startsWith("/dashboard");
  if (hidden) return null;

  return (
    <motion.button
      type="button"
      onClick={goBack}
      aria-label="Go back"
      title="Go back"
      initial={{ opacity: 0, x: -14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: EASE, delay: 0.2 }}
      className="group fixed left-4 top-20 z-[85] flex h-11 w-11 items-center justify-center rounded-full border border-cream/15 bg-charcoal-deep/85 text-cream/70 shadow-[0_12px_34px_rgba(0,0,0,0.4)] transition-colors duration-300 hover:border-gold/40 hover:bg-gold/[0.08] hover:text-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 md:left-6"
    >
      <ArrowLeft className="h-[18px] w-[18px] transition-transform duration-300 ease-out-expo group-hover:-translate-x-0.5" />
    </motion.button>
  );
}

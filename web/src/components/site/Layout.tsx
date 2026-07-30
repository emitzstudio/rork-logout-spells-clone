import { motion } from "framer-motion";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import Cursor from "@/components/site/Cursor";
import Footer from "@/components/site/Footer";
import Nav from "@/components/site/Nav";

const EASE = [0.16, 1, 0.3, 1] as const;

interface PageProps {
  title: string;
  children: React.ReactNode;
}

/**
 * Shared page shell: nav, footer, custom cursor,
 * page transition and hash-aware scrolling.
 * The starfield backdrop is rendered globally in App (StarBackdrop),
 * so the shell stays transparent and lets the sky show through.
 */
export default function Page({ title, children }: PageProps) {
  const location = useLocation();

  useEffect(() => {
    document.title = `${title} — Logout Spells`;
  }, [title]);

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.slice(1);
      const t = window.setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 120);
      return () => window.clearTimeout(t);
    }
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    return undefined;
  }, [location.pathname, location.hash]);

  return (
    <div className="min-h-screen text-cream">
      <Cursor />
      <Nav />
      <motion.main
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } }}
        exit={{ opacity: 0, y: -8, transition: { duration: 0.26, ease: "easeIn" } }}
      >
        {children}
      </motion.main>
      <Footer />
    </div>
  );
}

import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

interface PanelProps {
  title: string;
  eyebrow?: string;
  action?: { label: string; to: string };
  delay?: number;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}

/** Premium console card: hairline border, serif title, optional header action. */
export default function Panel({
  title,
  eyebrow,
  action,
  delay = 0,
  className,
  bodyClassName,
  children,
}: PanelProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.55, delay, ease: EASE }}
      className={cn(
        "overflow-hidden rounded-xl border border-cream/[0.07] bg-charcoal-soft/75",
        className,
      )}
    >
      <header className="flex items-center justify-between gap-3 border-b border-cream/[0.06] px-5 py-4">
        <div className="min-w-0">
          {eyebrow && (
            <p className="font-sans text-[9.5px] uppercase tracking-[0.3em] text-gold/70">{eyebrow}</p>
          )}
          <h2 className="mt-0.5 truncate font-serif text-[19px] leading-tight text-cream">{title}</h2>
        </div>
        {action && (
          <Link
            to={action.to}
            className="group flex shrink-0 items-center gap-1 font-sans text-[11.5px] text-cream/45 transition-colors duration-200 hover:text-gold-light"
          >
            {action.label}
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        )}
      </header>
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </motion.section>
  );
}

import {
  CalendarDays,
  Footprints,
  Heart,
  Image as ImageIcon,
  Luggage,
  ReceiptText,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";

import { PageSkeleton } from "@/components/account/bits";
import Page from "@/components/site/Layout";
import { useAccount } from "@/data/account/AccountProvider";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface ShellItem {
  label: string;
  to: string;
  icon: LucideIcon;
  /** Match exactly (overview) or by prefix (everything else). */
  end?: boolean;
}

const SHELL_ITEMS: ShellItem[] = [
  { label: "Overview", to: "/account", icon: Sparkles, end: true },
  { label: "My Trips", to: "/account/trips", icon: Luggage },
  { label: "Calendar", to: "/account/calendar", icon: CalendarDays },
  { label: "Wishlist", to: "/account/wishlist", icon: Heart },
  { label: "Memories", to: "/account/memories", icon: ImageIcon },
  { label: "Journey", to: "/account/journey", icon: Footprints },
  { label: "Transactions", to: "/account/transactions", icon: ReceiptText },
];

/**
 * The traveller space shell — session guard, the sub-navigation ribbon and
 * the content column. Lives inside the standard site chrome (nav + footer),
 * so the account always feels like another chapter of Logout Spells.
 */
export default function AccountShell({ children }: { children: ReactNode }) {
  const { session, data, booting } = useAccount();
  const location = useLocation();

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const active = (item: ShellItem): boolean =>
    item.end === true
      ? location.pathname === item.to
      : location.pathname.startsWith(item.to);

  const current = SHELL_ITEMS.find((i) => active(i));

  return (
    <Page title={current ? `${current.label} · My Space` : "My Space"}>
      <div className="relative min-h-[100svh] px-5 pb-24 pt-24 md:px-10 md:pt-28">
        {/* Quiet golden ambience for the whole space */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[420px]"
          style={{
            background: "radial-gradient(ellipse 55% 60% at 50% 0%, rgba(184,150,62,0.09), transparent 70%)",
          }}
        />

        <div className="relative mx-auto w-full max-w-6xl">
          {/* Sub-navigation ribbon */}
          <nav
            aria-label="My space"
            className="no-scrollbar sticky top-[62px] z-40 -mx-5 overflow-x-auto px-5 py-2 md:-mx-2 md:px-2"
          >
            <div className="flex w-max items-center gap-1.5 rounded-full border border-cream/[0.09] bg-charcoal-deep/80 p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              {SHELL_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = active(item);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "relative flex items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-2 font-sans text-[11.5px] tracking-[0.1em] transition-colors duration-300",
                      isActive ? "text-charcoal-deep" : "text-cream/55 hover:text-cream",
                    )}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="account-pill"
                        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute inset-0 rounded-full bg-gradient-to-r from-gold to-gold-light shadow-[0_0_20px_rgba(184,150,62,0.35)]"
                        aria-hidden
                      />
                    )}
                    <Icon size={13.5} className="relative" />
                    <span className="relative">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Content */}
          <div className="mt-7 md:mt-9">
            {booting || !data ? <PageSkeleton /> : children}
          </div>
        </div>
      </div>
    </Page>
  );
}

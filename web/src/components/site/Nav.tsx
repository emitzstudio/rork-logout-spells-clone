import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { MobileAccountBlock, NavAvatar, NavBell } from "@/components/account/ProfileMenu";
import { useAccount } from "@/data/account/AccountProvider";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  to: string;
  live?: boolean;
}

/** Centre menu, in reading order — Live Spells anchors the end. */
const NAV_ITEMS: NavItem[] = [
  { label: "Spells", to: "/#spells" },
  { label: "Become a Spellcaster", to: "/creators" },
  { label: "Blog", to: "/blog" },
  { label: "Discover", to: "/discover" },
  { label: "Our Story", to: "/our-story" },
  { label: "Live Spells", to: "/live", live: true },
];

/**
 * Site navigation — brand pinned far left, primary items perfectly centred,
 * a single quiet Log In on the right. Live Spells carries a soft golden
 * emphasis with a shimmer on hover — noticed, never shouted.
 */
export default function Nav() {
  const [scrolled, setScrolled] = useState<boolean>(false);
  const [open, setOpen] = useState<boolean>(false);
  const location = useLocation();
  const { session } = useAccount();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const isActive = (item: NavItem): boolean =>
    !item.to.includes("#") &&
    (location.pathname === item.to || location.pathname.startsWith(`${item.to}/`));

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-[90] transition-all duration-500 ease-silk",
          scrolled
            ? "border-b border-cream/[0.06] bg-charcoal-deep/95 py-3"
            : "bg-transparent py-5",
        )}
      >
        <div className="relative mx-auto flex max-w-[1440px] items-center justify-between px-5 md:px-10">
          {/* Left — the brand, pinned to the edge */}
          <Link
            to="/"
            aria-label="Logout Spells home"
            className="group relative z-10 flex shrink-0 flex-col leading-none"
          >
            <span className="font-sans text-[13px] font-semibold tracking-[0.42em] text-cream transition-colors duration-300 group-hover:text-gold-light">
              LOGOUT
            </span>
            <span className="font-serif text-[19px] italic leading-[1.05] text-gold">Spells</span>
          </Link>

          {/* Centre — primary navigation, evenly spaced and truly centred */}
          <nav
            aria-label="Main navigation"
            className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-6 lg:flex xl:gap-8"
          >
            {NAV_ITEMS.map((item) =>
              item.live ? (
                <Link
                  key={item.label}
                  to={item.to}
                  className="group relative flex items-center gap-2 whitespace-nowrap font-sans text-[12.5px] font-medium tracking-[0.14em]"
                >
                  <span className="relative flex h-1.5 w-1.5" aria-hidden>
                    <span className="absolute inset-0 animate-ping rounded-full bg-gold/50" />
                    <span className="relative h-1.5 w-1.5 rounded-full bg-gold-light" />
                  </span>
                  <span className="nav-live">{item.label}</span>
                  <span
                    className={cn(
                      "absolute -bottom-1.5 left-0 h-px bg-gradient-to-r from-gold via-[#F0DFAE] to-gold transition-all duration-300 ease-out-expo",
                      isActive(item) ? "w-full" : "w-0 group-hover:w-full",
                    )}
                    aria-hidden
                  />
                </Link>
              ) : (
                <Link
                  key={item.label}
                  to={item.to}
                  className={cn(
                    "group relative whitespace-nowrap font-sans text-[12.5px] tracking-[0.14em] transition-colors duration-300",
                    isActive(item) ? "text-gold-light" : "text-cream/60 hover:text-cream",
                  )}
                >
                  {item.label}
                  <span
                    className={cn(
                      "absolute -bottom-1.5 left-0 h-px bg-gold transition-all duration-300 ease-out-expo",
                      isActive(item) ? "w-full" : "w-0 group-hover:w-full",
                    )}
                    aria-hidden
                  />
                </Link>
              ),
            )}
          </nav>

          {/* Right — a single quiet door in */}
          <div className="hidden shrink-0 items-center lg:flex">
            {session ? (
              <div className="flex items-center gap-3">
                <NavBell />
                <NavAvatar />
              </div>
            ) : (
              <Link
                to="/login"
                className={cn(
                  "group relative whitespace-nowrap font-sans text-[12.5px] tracking-[0.14em] transition-colors duration-300",
                  location.pathname === "/login" ? "text-gold-light" : "text-cream/60 hover:text-cream",
                )}
              >
                Log In
                <span
                  className="absolute -bottom-1.5 left-0 h-px w-0 bg-gold transition-all duration-300 ease-out-expo group-hover:w-full"
                  aria-hidden
                />
              </Link>
            )}
          </div>

          {/* Mobile — avatar shortcut + hamburger */}
          <div className="flex items-center gap-2.5 lg:hidden">
            {session && !open && (
              <Link
                to="/account"
                aria-label="My Logout Space"
                className="h-9 w-9 overflow-hidden rounded-full border-2 border-gold/40"
              >
                <img src={session.avatar} alt="" className="h-full w-full object-cover" />
              </Link>
            )}
            <button
              type="button"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="relative z-[96] flex h-11 w-11 items-center justify-center"
            >
              <div className="flex w-6 flex-col gap-[6px]">
                <span
                  className={cn(
                    "h-px bg-cream transition-all duration-300",
                    open && "translate-y-[7px] rotate-45 bg-gold",
                  )}
                />
                <span className={cn("h-px bg-cream transition-all duration-300", open && "opacity-0")} />
                <span
                  className={cn(
                    "h-px bg-cream transition-all duration-300",
                    open && "-translate-y-[7px] -rotate-45 bg-gold",
                  )}
                />
              </div>
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="fixed inset-0 z-[94] flex flex-col justify-center overflow-y-auto bg-charcoal-deep/[0.97] px-8 py-24 lg:hidden"
          >
            {session && (
              <motion.div
                initial={{ opacity: 0, y: -14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="mb-7"
              >
                <MobileAccountBlock onNavigate={() => setOpen(false)} />
              </motion.div>
            )}

            <nav aria-label="Mobile navigation" className="flex flex-col gap-1">
              {NAV_ITEMS.map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: -26 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.08 + i * 0.06, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Link
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 py-2.5 font-serif transition-colors",
                      item.live
                        ? "text-gold-light hover:text-[#F0DFAE]"
                        : "text-cream hover:text-gold-light",
                      session ? "text-3xl" : "text-4xl py-3",
                    )}
                  >
                    {item.live && (
                      <span className="h-2 w-2 animate-pulse-dot rounded-full bg-gold" aria-hidden />
                    )}
                    {item.label}
                  </Link>
                </motion.div>
              ))}

              {!session && (
                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  className="mt-8 flex flex-col gap-3"
                >
                  <MobileAccountBlock onNavigate={() => setOpen(false)} />
                </motion.div>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

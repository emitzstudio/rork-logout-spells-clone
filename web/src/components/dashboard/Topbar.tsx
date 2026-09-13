import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Bell,
  CalendarCheck2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  CornerDownLeft,
  Globe,
  Inbox,
  LogOut,
  Mail,
  Menu,
  MessageSquareQuote,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useOpsBadges } from "@/data/bookingOps";
import { DASH_SECTIONS } from "@/data/dashboard";
import { useFormStore } from "@/data/formStore";
import { useSiteSettings } from "@/data/siteSettingsStore";
import { useStaffNotificationPrefs } from "@/data/staffPrefs";
import { STATUS_META } from "@/data/spells";
import { useSpellStore } from "@/data/spellStore";
import { useFounderProfile } from "@/data/team";
import { useGoBack } from "@/hooks/use-go-back";
import { useStaffAuth } from "@/integrations/supabase/staffAuth";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

type MenuKind = "none" | "bell" | "profile";

interface SearchHit {
  id: string;
  label: string;
  sub: string;
  to: string;
  group: "Sections" | "Spells";
}

/** A live "needs attention" row - real counts from the database, never seeded. */
interface AttentionRow {
  id: string;
  icon: LucideIcon;
  count: number;
  label: string;
  to: string;
}

const PANEL_CLASS =
  "absolute right-0 top-[calc(100%+10px)] z-50 overflow-hidden rounded-xl border border-cream/10 bg-[#161511] shadow-[0_24px_60px_rgba(0,0,0,0.55)]";

const MENU_ITEM_CLASS =
  "flex items-center gap-2.5 rounded-lg px-2.5 py-2 font-sans text-[12.5px] text-cream/70 transition-colors duration-150 hover:bg-cream/[0.05] hover:text-cream";

export default function Topbar({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  const [menu, setMenu] = useState<MenuKind>("none");
  const [query, setQuery] = useState<string>("");
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const staff = useStaffAuth();
  const badges = useOpsBadges();
  const { spells } = useSpellStore();
  const { responses, inquiries } = useFormStore();
  /* M12 - founder identity + contact fallback come from the central sources. */
  const founder = useFounderProfile();
  const { contact } = useSiteSettings();
  /* M12 - per-staff bell preferences filter what the bell surfaces. */
  const prefs = useStaffNotificationPrefs();
  /* Back arrow lives in this sticky bar, so it never scrolls away. On the
     console root it exits to the website; on sub-pages it falls back to Overview. */
  const goBack = useGoBack(location.pathname === "/dashboard" ? "/" : "/dashboard");

  const newResponses = useMemo<number>(
    () => responses.filter((r) => r.status === "new").length,
    [responses],
  );
  const newInquiries = useMemo<number>(
    () => inquiries.filter((i) => i.status === "new").length,
    [inquiries],
  );

  /** Everything that genuinely needs the founder right now - live counts only,
      filtered by the M12 per-staff notification preferences. */
  const attention = useMemo<AttentionRow[]>(() => {
    const rows: AttentionRow[] = [];
    const b = badges.data;
    if (b !== undefined) {
      if (prefs.notifyBookings && b.pendingBookings > 0)
        rows.push({
          id: "att-bookings",
          icon: CalendarCheck2,
          count: b.pendingBookings,
          label: `booking${b.pendingBookings === 1 ? "" : "s"} awaiting confirmation`,
          to: "/dashboard/bookings",
        });
      if (prefs.notifyRequests && b.openRequests > 0)
        rows.push({
          id: "att-requests",
          icon: ClipboardList,
          count: b.openRequests,
          label: `open change request${b.openRequests === 1 ? "" : "s"}`,
          to: "/dashboard/bookings/requests",
        });
      if (prefs.notifyReviews && b.pendingReviews > 0)
        rows.push({
          id: "att-reviews",
          icon: MessageSquareQuote,
          count: b.pendingReviews,
          label: `review${b.pendingReviews === 1 ? "" : "s"} awaiting moderation`,
          to: "/dashboard/testimonials",
        });
    }
    if (prefs.notifyResponses && newResponses > 0)
      rows.push({
        id: "att-responses",
        icon: Inbox,
        count: newResponses,
        label: `new form response${newResponses === 1 ? "" : "s"}`,
        to: "/dashboard/forms?tab=responses",
      });
    if (prefs.notifyEnquiries && newInquiries > 0)
      rows.push({
        id: "att-inquiries",
        icon: Mail,
        count: newInquiries,
        label: `new enquir${newInquiries === 1 ? "y" : "ies"}`,
        to: "/dashboard/forms?tab=enquiries",
      });
    return rows;
  }, [badges.data, newResponses, newInquiries, prefs]);

  const attentionTotal = attention.reduce((sum, row) => sum + row.count, 0);
  /** How many bell alert types the staff member muted (waitlist is dormant - not counted). */
  const mutedCount = [
    prefs.notifyBookings,
    prefs.notifyResponses,
    prefs.notifyEnquiries,
    prefs.notifyReviews,
    prefs.notifyRequests,
  ].filter((on) => !on).length;

  const sectionLabel = useMemo<string>(() => {
    const match = DASH_SECTIONS.find((s) => location.pathname === `/dashboard/${s.slug}`);
    if (match) return match.label;
    if (location.pathname.startsWith("/dashboard/forms")) return "Forms";
    if (location.pathname.startsWith("/dashboard/spells")) return "Spells";
    if (location.pathname.startsWith("/dashboard/receipts")) return "Receipts";
    return "Overview";
  }, [location.pathname]);

  useEffect(() => {
    setMenu("none");
  }, [location.pathname]);

  // ⌘K / Ctrl+K focuses search; Escape dismisses any open surface.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setMenu("none");
        setSearchOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /** ⌘K hits - console sections plus the LIVE spell collection (drafts included). */
  const hits = useMemo<SearchHit[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const overview: SearchHit[] =
      "dashboard overview".includes(q)
        ? [{ id: "hit-overview", label: "Dashboard", sub: "Overview & pulse", to: "/dashboard", group: "Sections" }]
        : [];
    const sections: SearchHit[] = DASH_SECTIONS.filter((s) => s.label.toLowerCase().includes(q)).map((s) => ({
      id: `hit-${s.slug}`,
      label: s.label,
      sub: s.tagline,
      to: `/dashboard/${s.slug}`,
      group: "Sections",
    }));
    const spellHits: SearchHit[] = spells
      .filter((s) => `${s.name} ${s.type}`.toLowerCase().includes(q))
      .map((s) => ({
        id: `hit-spell-${s.id}`,
        label: s.name !== "" ? s.name : "Untitled spell",
        sub: `${s.type}${s.type !== "" ? " · " : ""}${STATUS_META[s.status].label}`,
        to: `/dashboard/spells/${s.id}/edit`,
        group: "Spells",
      }));
    return [...overview, ...sections, ...spellHits].slice(0, 7);
  }, [query, spells]);

  const goTo = (to: string) => {
    setQuery("");
    setSearchOpen(false);
    inputRef.current?.blur();
    navigate(to);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-cream/[0.06] bg-charcoal/95">
      <div className="flex h-16 items-center gap-2.5 px-4 md:gap-3 md:px-6">
        <button
          type="button"
          onClick={goBack}
          aria-label="Go back"
          title="Go back"
          className="group grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-cream/[0.08] bg-cream/[0.03] text-cream/60 transition-colors duration-150 hover:border-gold/30 hover:text-gold-light"
        >
          <ArrowLeft className="h-[18px] w-[18px] transition-transform duration-200 group-hover:-translate-x-0.5" />
        </button>

        <button
          type="button"
          onClick={onOpenMobileNav}
          aria-label="Open navigation"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-cream/60 transition-colors hover:bg-cream/[0.05] hover:text-cream lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="hidden shrink-0 items-center gap-1.5 md:flex">
          <span className="font-sans text-[12px] text-cream/35">Admin</span>
          <ChevronRight className="h-3 w-3 text-cream/25" />
          <span className="font-sans text-[12px] font-medium text-cream/85">{sectionLabel}</span>
        </div>

        {/* Search */}
        <div className="relative min-w-0 flex-1 md:mx-4 md:max-w-[440px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cream/35" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => window.setTimeout(() => setSearchOpen(false), 120)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && hits[0]) goTo(hits[0].to);
            }}
            placeholder="Search spells, pages…"
            aria-label="Search the dashboard"
            className="h-10 w-full rounded-lg border border-cream/[0.08] bg-cream/[0.03] pl-9 pr-12 font-sans text-[13px] text-cream outline-none transition-all duration-200 placeholder:text-cream/30 focus:border-gold/40 focus:bg-cream/[0.05]"
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-cream/10 bg-cream/[0.04] px-1.5 py-0.5 font-sans text-[10px] text-cream/35 md:block">
            ⌘K
          </kbd>

          <AnimatePresence>
            {searchOpen && query.trim().length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.18, ease: EASE }}
                className="absolute top-full z-50 mt-2 w-full overflow-hidden rounded-xl border border-cream/10 bg-[#161511] shadow-[0_24px_60px_rgba(0,0,0,0.55)]"
              >
                {hits.length === 0 ? (
                  <p className="px-4 py-6 text-center font-sans text-[12px] text-cream/40">
                    Nothing found for “{query.trim()}”
                  </p>
                ) : (
                  (["Sections", "Spells"] as const).map((group) => {
                    const groupHits = hits.filter((h) => h.group === group);
                    if (groupHits.length === 0) return null;
                    return (
                      <div key={group} className="py-1.5">
                        <p className="px-4 pb-1 pt-1.5 font-sans text-[9.5px] uppercase tracking-[0.28em] text-cream/30">
                          {group}
                        </p>
                        {groupHits.map((hit) => (
                          <button
                            key={hit.id}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              goTo(hit.to);
                            }}
                            className="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors duration-150 hover:bg-gold/[0.07]"
                          >
                            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-cream/[0.08] bg-cream/[0.03] text-gold">
                              {group === "Spells" ? <Sparkles className="h-3.5 w-3.5" /> : <Search className="h-3.5 w-3.5" />}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-sans text-[13px] text-cream">{hit.label}</span>
                              <span className="block truncate font-sans text-[11px] text-cream/40">{hit.sub}</span>
                            </span>
                            <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-cream/25" />
                          </button>
                        ))}
                      </div>
                    );
                  })
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right cluster */}
        <div className="ml-auto flex shrink-0 items-center gap-1 md:gap-1.5">
          {/* Needs attention - live operational counts, no invented notifications */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenu((m) => (m === "bell" ? "none" : "bell"))}
              aria-label={`Needs attention${attentionTotal > 0 ? ` (${attentionTotal})` : ""}`}
              className={cn(
                "relative grid h-10 w-10 place-items-center rounded-lg transition-colors duration-150",
                menu === "bell" ? "bg-cream/[0.06] text-gold-light" : "text-cream/60 hover:bg-cream/[0.05] hover:text-cream",
              )}
            >
              <Bell className="h-[18px] w-[18px]" />
              {attentionTotal > 0 && (
                <span aria-hidden className="absolute right-2 top-2 h-2 w-2 rounded-full bg-gold ring-2 ring-charcoal" />
              )}
            </button>
            <AnimatePresence>
              {menu === "bell" && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.99 }}
                  transition={{ duration: 0.18, ease: EASE }}
                  className={cn(PANEL_CLASS, "w-[min(92vw,360px)]")}
                >
                  <div className="border-b border-cream/[0.06] px-4 py-3">
                    <p className="font-serif text-lg text-cream">Needs attention</p>
                  </div>
                  {badges.isPending ? (
                    <p className="px-4 py-6 text-center font-sans text-[12px] text-cream/40">
                      Checking the wards…
                    </p>
                  ) : badges.isError ? (
                    <div className="flex flex-col items-center gap-3 px-4 py-6">
                      <p className="font-sans text-[12px] text-cream/45">Couldn't check right now.</p>
                      <button
                        type="button"
                        onClick={() => void badges.refetch()}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-cream/12 px-3 py-1.5 font-sans text-[11px] text-cream/70 transition-colors hover:border-gold/40 hover:text-gold-light"
                      >
                        <RefreshCw className="h-3 w-3" /> Try again
                      </button>
                    </div>
                  ) : attention.length === 0 ? (
                    <p className="px-4 py-7 text-center font-serif text-[14px] italic text-cream/40">
                      All clear. Nothing needs you right now <span className="text-gold/60">✦</span>
                    </p>
                  ) : (
                    <ul className="max-h-[340px] overflow-y-auto">
                      {attention.map((row) => {
                        const Icon = row.icon;
                        return (
                          <li key={row.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setMenu("none");
                                navigate(row.to);
                              }}
                              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-cream/[0.03]"
                            >
                              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-gold/20 bg-gold/[0.07] text-gold">
                                <Icon className="h-3.5 w-3.5" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block font-sans text-[12.5px] text-cream">
                                  <span className="font-medium text-gold-light">{row.count}</span> {row.label}
                                </span>
                              </span>
                              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-cream/25" />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {mutedCount > 0 && !badges.isPending && !badges.isError && (
                    <p className="border-t border-cream/[0.06] px-4 py-2.5 font-sans text-[10.5px] text-cream/35">
                      {mutedCount} alert type{mutedCount === 1 ? " is" : "s are"} muted in{" "}
                      <Link
                        to="/dashboard/settings"
                        onClick={() => setMenu("none")}
                        className="text-gold/70 transition-colors hover:text-gold-light"
                      >
                        Settings
                      </Link>
                      .
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Settings */}
          <Link
            to="/dashboard/settings"
            aria-label="Settings"
            className="group hidden h-10 w-10 place-items-center rounded-lg text-cream/60 transition-colors hover:bg-cream/[0.05] hover:text-cream sm:grid"
          >
            <Settings className="h-[18px] w-[18px] transition-transform duration-500 ease-out-expo group-hover:rotate-90" />
          </Link>

          <span aria-hidden className="mx-1 hidden h-5 w-px bg-cream/[0.08] sm:block" />

          {/* Founder profile - real session identity */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenu((m) => (m === "profile" ? "none" : "profile"))}
              aria-label="Founder menu"
              className={cn(
                "flex items-center gap-2.5 rounded-lg py-1.5 pl-1.5 pr-2 transition-colors duration-150",
                menu === "profile" ? "bg-cream/[0.06]" : "hover:bg-cream/[0.05]",
              )}
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-gold-light to-gold font-serif text-[15px] text-charcoal-deep ring-1 ring-gold/40">
                {founder.initial}
              </span>
              <span className="hidden max-w-[170px] text-left leading-tight xl:block">
                <span className="block truncate font-sans text-[12px] text-cream">{founder.name}</span>
                <span className="block truncate font-sans text-[10px] uppercase tracking-[0.18em] text-gold/70">
                  {founder.designation}
                </span>
              </span>
              <ChevronDown
                className={cn(
                  "hidden h-3.5 w-3.5 text-cream/40 transition-transform duration-200 xl:block",
                  menu === "profile" && "rotate-180",
                )}
              />
            </button>
            <AnimatePresence>
              {menu === "profile" && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.99 }}
                  transition={{ duration: 0.18, ease: EASE }}
                  className={cn(PANEL_CLASS, "w-60")}
                >
                  <div className="border-b border-cream/[0.06] px-4 py-3">
                    <p className="truncate font-sans text-[13px] text-cream">{founder.name}</p>
                    <p className="truncate font-sans text-[11px] text-cream/40">
                      {staff !== null && staff.email !== "" ? staff.email : contact.contactEmail}
                    </p>
                  </div>
                  <div className="p-1.5">
                    <Link to="/" onClick={() => setMenu("none")} className={MENU_ITEM_CLASS}>
                      <Globe className="h-4 w-4" /> View website
                    </Link>
                    <Link to="/dashboard/settings" onClick={() => setMenu("none")} className={MENU_ITEM_CLASS}>
                      <Settings className="h-4 w-4" /> Settings
                    </Link>
                    <div aria-hidden className="mx-2 my-1.5 h-px bg-cream/[0.06]" />
                    <button
                      type="button"
                      onClick={() => {
                        setMenu("none");
                        void staff?.signOut();
                      }}
                      className={cn(MENU_ITEM_CLASS, "w-full")}
                    >
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Click-away layer for open menus */}
      {menu !== "none" && (
        <div aria-hidden className="fixed inset-0 z-[45]" onClick={() => setMenu("none")} />
      )}
    </header>
  );
}

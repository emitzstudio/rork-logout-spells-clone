/**
 * Signed-in navbar cluster - notification bell + avatar dropdown, plus the
 * account block for the mobile menu. Rendered by the site Nav when a
 * traveller session exists.
 */
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  CircleUserRound,
  Heart,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Luggage,
  ReceiptText,
  Settings,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { EASE, NOTIF_META } from "@/components/account/bits";
import { useAccount } from "@/data/account/AccountProvider";
import { timeAgo } from "@/data/account/derive";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

const MENU_ITEMS: { label: string; to: string; icon: LucideIcon }[] = [
  { label: "My Dashboard", to: "/account", icon: LayoutDashboard },
  { label: "My Trips", to: "/account/trips", icon: Luggage },
  { label: "Wishlist", to: "/account/wishlist", icon: Heart },
  { label: "Transactions", to: "/account/transactions", icon: ReceiptText },
  { label: "Notifications", to: "/account/notifications", icon: Bell },
  { label: "Profile", to: "/account/profile", icon: CircleUserRound },
  { label: "Settings", to: "/account/settings", icon: Settings },
  { label: "Support", to: "/account/support", icon: LifeBuoy },
];

function useClickOutside(ref: RefObject<HTMLElement | null>, onOutside: () => void): void {
  useEffect(() => {
    const handler = (e: PointerEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onOutside();
    };
    document.addEventListener("pointerdown", handler);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", handler);
      document.removeEventListener("keydown", onKey);
    };
  }, [ref, onOutside]);
}

function Panel({ open, children, width = 300 }: { open: boolean; children: ReactNode; width?: number }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.98 }}
          transition={{ duration: 0.24, ease: EASE }}
          style={{ width }}
          className="absolute right-0 top-[calc(100%+12px)] z-[95] overflow-hidden rounded-2xl border border-cream/[0.1] bg-[#16150f]/[0.97] shadow-[0_30px_80px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* -------------------------------- Bell ------------------------------------ */

export function NavBell() {
  const { data, unreadCount, markNotificationRead, markAllNotificationsRead } = useAccount();
  const [open, setOpen] = useState<boolean>(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  useClickOutside(ref, () => setOpen(false));

  const recent = data?.notifications.slice(0, 4) ?? [];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative grid h-10 w-10 place-items-center rounded-full border transition-all duration-300 active:scale-95",
          open
            ? "border-gold/50 bg-gold/10 text-gold-light"
            : "border-cream/15 text-cream/65 hover:border-gold/40 hover:text-gold-light",
        )}
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 font-sans text-[9px] font-semibold text-charcoal-deep">
            {unreadCount}
          </span>
        )}
      </button>

      <Panel open={open} width={324}>
        <div className="flex items-center justify-between border-b border-cream/[0.07] px-4 py-3">
          <p className="font-sans text-[10px] uppercase tracking-[0.26em] text-cream/45">Whispers</p>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() =>
                void markAllNotificationsRead().catch(() =>
                  toast.error("Couldn't mark them read. Try again"),
                )
              }
              className="font-sans text-[10px] uppercase tracking-[0.18em] text-gold transition-colors hover:text-gold-light"
            >
              Mark all read
            </button>
          )}
        </div>
        {recent.length === 0 ? (
          <p className="px-4 py-8 text-center font-serif text-[14px] italic text-cream/40">
            All quiet, exactly how it should be ☾
          </p>
        ) : (
          <ul>
            {recent.map((n) => {
              const meta = NOTIF_META[n.kind];
              const Icon = meta.icon;
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      void markNotificationRead(n.id).catch(() =>
                        toast.error("Couldn't mark that as read. It stays unread"),
                      );
                      if (n.link) navigate(n.link);
                    }}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-cream/[0.04]"
                  >
                    <span className={cn("mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border", meta.tint)}>
                      <Icon size={13} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block truncate font-sans text-[12.5px]", n.read ? "text-cream/60" : "text-cream")}>
                        {n.title}
                      </span>
                      <span className="mt-0.5 block font-sans text-[10.5px] text-cream/35">{timeAgo(n.time)}</span>
                    </span>
                    {!n.read && <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" aria-hidden />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <Link
          to="/account/notifications"
          onClick={() => setOpen(false)}
          className="block border-t border-cream/[0.07] px-4 py-3 text-center font-sans text-[10.5px] uppercase tracking-[0.22em] text-gold transition-colors hover:bg-gold/[0.05] hover:text-gold-light"
        >
          All notifications →
        </Link>
      </Panel>
    </div>
  );
}

/* ------------------------------- Avatar menu ------------------------------ */

export function NavAvatar() {
  const { session, data, signOut, unreadCount } = useAccount();
  const [open, setOpen] = useState<boolean>(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  useClickOutside(ref, () => setOpen(false));

  if (!session) return null;
  const fullName = data ? `${data.profile.firstName} ${data.profile.lastName}` : session.firstName;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Account menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "group/avatar relative h-10 w-10 overflow-hidden rounded-full border-2 transition-all duration-300 active:scale-95",
          open ? "border-gold shadow-[0_0_18px_rgba(184,150,62,0.45)]" : "border-gold/40 hover:border-gold",
        )}
      >
        <img src={session.avatar} alt={`${session.firstName}'s avatar`} className="h-full w-full object-cover" />
      </button>

      <Panel open={open} width={264}>
        <div className="border-b border-cream/[0.07] px-4 py-3.5">
          <p className="font-serif text-[17px] leading-tight text-cream">{fullName}</p>
          <p className="mt-0.5 truncate font-sans text-[11px] text-cream/40">{session.email}</p>
        </div>
        <ul className="py-1.5">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 font-sans text-[13px] text-cream/70 transition-colors hover:bg-cream/[0.04] hover:text-cream"
                >
                  <Icon size={15} className="text-gold/70" />
                  <span className="flex-1">{item.label}</span>
                  {item.to === "/account/notifications" && unreadCount > 0 && (
                    <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-gold/15 px-1.5 font-sans text-[10px] text-gold-light">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            signOut();
            navigate("/");
          }}
          className="flex w-full items-center gap-3 border-t border-cream/[0.07] px-4 py-3 font-sans text-[13px] text-cream/55 transition-colors hover:bg-red-400/[0.05] hover:text-red-300"
        >
          <LogOut size={15} />
          Log out
        </button>
      </Panel>
    </div>
  );
}

/* ----------------------------- Mobile menu block --------------------------- */

/** Account section inside the full-screen mobile menu. */
export function MobileAccountBlock({ onNavigate }: { onNavigate: () => void }) {
  const { session, data, signOut, unreadCount } = useAccount();
  const navigate = useNavigate();

  if (!session) {
    return (
      <div className="flex flex-col gap-2.5">
        <Link to="/login" onClick={onNavigate} className="btn-gold w-full">
          Log in
        </Link>
        <Link to="/join" onClick={onNavigate} className="btn-ghost-gold w-full">
          Create account
        </Link>
      </div>
    );
  }

  const quick: { label: string; to: string }[] = [
    { label: "My Trips", to: "/account/trips" },
    { label: "Wishlist", to: "/account/wishlist" },
    { label: "Transactions", to: "/account/transactions" },
    { label: "Notifications", to: "/account/notifications" },
  ];

  return (
    <div>
      <Link
        to="/account"
        onClick={onNavigate}
        className="flex items-center gap-3.5 rounded-2xl border border-gold/25 bg-gold/[0.06] p-3.5"
      >
        <img
          src={session.avatar}
          alt=""
          className="h-12 w-12 rounded-full border-2 border-gold/50 object-cover"
        />
        <span className="min-w-0">
          <span className="block font-serif text-xl leading-tight text-cream">
            {data ? `${data.profile.firstName} ${data.profile.lastName}` : session.firstName}
          </span>
          <span className="font-sans text-[10.5px] uppercase tracking-[0.22em] text-gold">
            My Logout Space →
          </span>
        </span>
      </Link>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {quick.map((q) => (
          <Link
            key={q.to}
            to={q.to}
            onClick={onNavigate}
            className="flex items-center justify-between rounded-xl border border-cream/[0.09] px-3.5 py-3 font-sans text-[13px] text-cream/70 transition-colors hover:border-gold/30 hover:text-cream"
          >
            {q.label}
            {q.to === "/account/notifications" && unreadCount > 0 && (
              <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-gold px-1.5 font-sans text-[10px] font-semibold text-charcoal-deep">
                {unreadCount}
              </span>
            )}
          </Link>
        ))}
      </div>
      <button
        type="button"
        onClick={() => {
          onNavigate();
          signOut();
          navigate("/");
        }}
        className="mt-3 flex items-center gap-2 px-1 py-2 font-sans text-[12px] uppercase tracking-[0.2em] text-cream/40 transition-colors hover:text-red-300"
      >
        <LogOut size={14} /> Log out
      </button>
    </div>
  );
}

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, Globe, X } from "lucide-react";
import { Link, NavLink } from "react-router-dom";

import { DASH_NAV, FOUNDER } from "@/data/dashboard";
import type { DashNavItem } from "@/data/dashboard";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

function NavEntry({
  item,
  collapsed,
  onNavigate,
}: {
  item: DashNavItem;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          "group relative flex h-10 items-center gap-3 rounded-lg px-3 font-sans text-[13px] tracking-[0.02em] transition-all duration-200",
          collapsed && "justify-center px-0",
          isActive ? "bg-gold/[0.09] text-gold-light" : "text-cream/55 hover:bg-cream/[0.04] hover:text-cream",
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            aria-hidden
            className={cn(
              "absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-gold transition-opacity duration-300",
              isActive ? "opacity-100" : "opacity-0",
              collapsed && "left-0.5",
            )}
          />
          <Icon
            className={cn(
              "h-[17px] w-[17px] shrink-0 transition-transform duration-200",
              !isActive && "group-hover:scale-105",
            )}
          />
          {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
          {!collapsed && typeof item.badge === "number" && (
            <span className="rounded-full border border-gold/25 bg-gold/10 px-1.5 py-px font-sans text-[10px] font-medium text-gold-light">
              {item.badge}
            </span>
          )}
          {collapsed && typeof item.badge === "number" && (
            <span aria-hidden className="absolute right-2.5 top-2 h-1.5 w-1.5 rounded-full bg-gold" />
          )}
          {collapsed && (
            <span className="pointer-events-none absolute left-full top-1/2 z-[70] ml-3 -translate-y-1/2 whitespace-nowrap rounded-md border border-cream/10 bg-[#12110E] px-2.5 py-1.5 font-sans text-[11px] text-cream opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100">
              {item.label}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

/** Brand block, grouped nav, "view website" and founder chip — shared by desktop rail and mobile drawer. */
function SidebarBody({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  return (
    <>
      <div className={cn("flex h-16 shrink-0 items-center border-b border-cream/[0.06] px-4", collapsed && "justify-center px-0")}>
        <Link to="/dashboard" onClick={onNavigate} aria-label="Dashboard home" className="group flex items-center gap-2.5">
          {collapsed ? (
            <span className="grid h-9 w-9 place-items-center rounded-lg border border-gold/30 bg-gold/[0.08] font-serif text-lg italic text-gold transition-colors group-hover:border-gold/60">
              S
            </span>
          ) : (
            <>
              <span className="flex flex-col leading-none">
                <span className="font-sans text-[11px] font-semibold tracking-[0.42em] text-cream transition-colors duration-300 group-hover:text-gold-light">
                  LOGOUT
                </span>
                <span className="font-serif text-[16px] italic text-gold">Spells</span>
              </span>
              <span className="ml-1 rounded-full border border-gold/30 bg-gold/[0.08] px-2 py-0.5 font-sans text-[9px] font-medium uppercase tracking-[0.18em] text-gold-light">
                Admin
              </span>
            </>
          )}
        </Link>
      </div>

      <nav aria-label="Dashboard navigation" className="no-scrollbar flex-1 space-y-5 overflow-y-auto px-3 py-5">
        {DASH_NAV.map((group) => (
          <div key={group.label}>
            {collapsed ? (
              <div aria-hidden className="mx-auto mb-2 h-px w-6 bg-cream/[0.07]" />
            ) : (
              <p className="mb-2 px-3 font-sans text-[9.5px] uppercase tracking-[0.3em] text-cream/30">
                {group.label}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavEntry key={item.to} item={item} collapsed={collapsed} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className={cn("shrink-0 border-t border-cream/[0.06] p-3", collapsed && "px-2")}>
        <Link
          to="/"
          onClick={onNavigate}
          className={cn(
            "group flex h-9 items-center gap-3 rounded-lg px-3 font-sans text-[12px] text-cream/45 transition-colors duration-200 hover:bg-cream/[0.04] hover:text-cream",
            collapsed && "justify-center px-0",
          )}
        >
          <Globe className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:rotate-12" />
          {!collapsed && <span>View website</span>}
        </Link>
        <div
          className={cn(
            "mt-2 flex items-center gap-3 rounded-lg border border-cream/[0.06] bg-cream/[0.02] p-2.5",
            collapsed && "justify-center border-transparent bg-transparent p-1",
          )}
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-gold-light to-gold font-serif text-sm text-charcoal-deep ring-1 ring-gold/40">
            {FOUNDER.initial}
          </span>
          {!collapsed && (
            <span className="min-w-0 leading-tight">
              <span className="block truncate font-sans text-[12.5px] text-cream">{FOUNDER.name}</span>
              <span className="block font-sans text-[10.5px] text-cream/40">{FOUNDER.role}</span>
            </span>
          )}
        </div>
      </div>
    </>
  );
}

export default function Sidebar({ collapsed, onToggleCollapsed, mobileOpen, onCloseMobile }: SidebarProps) {
  return (
    <>
      {/* Desktop rail */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 hidden flex-col border-r border-cream/[0.06] bg-charcoal-deep/95 transition-[width] duration-300 ease-silk lg:flex",
          collapsed ? "w-[76px]" : "w-[248px]",
        )}
      >
        <SidebarBody collapsed={collapsed} />
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute -right-3 top-[68px] grid h-6 w-6 place-items-center rounded-full border border-cream/15 bg-charcoal text-cream/50 shadow-lg transition-all duration-300 hover:border-gold/50 hover:text-gold"
        >
          <ChevronLeft className={cn("h-3.5 w-3.5 transition-transform duration-300", collapsed && "rotate-180")} />
        </button>
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 z-[94] bg-charcoal-deep/70 backdrop-blur-sm lg:hidden"
              onClick={onCloseMobile}
              aria-hidden
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ duration: 0.35, ease: EASE }}
              className="fixed inset-y-0 left-0 z-[95] flex w-[280px] flex-col border-r border-cream/[0.08] bg-[#100F0D] lg:hidden"
            >
              <button
                type="button"
                onClick={onCloseMobile}
                aria-label="Close menu"
                className="absolute right-3 top-3.5 grid h-9 w-9 place-items-center rounded-lg text-cream/50 transition-colors hover:bg-cream/[0.05] hover:text-cream"
              >
                <X className="h-[18px] w-[18px]" />
              </button>
              <SidebarBody collapsed={false} onNavigate={onCloseMobile} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

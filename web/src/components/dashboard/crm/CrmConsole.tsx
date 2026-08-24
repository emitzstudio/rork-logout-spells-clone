import { LogOut } from "lucide-react";
import { Navigate, Route, Routes } from "react-router-dom";

import { useStaffAuth } from "@/integrations/supabase/staffAuth";
import Crm from "@/pages/dashboard/Crm";
import CrmTrip from "@/pages/dashboard/CrmTrip";

/**
 * CRM V1 - the sales-only console shell.
 *
 * Salespeople hold the `sales` role: they pass the console gate but are NOT
 * staff, so instead of the founder console (sidebar, bookings, settings,
 * bell) they get exactly this - the CRM and a door out. RLS enforces the
 * same boundary server-side; this shell is the honest UI for it.
 */
export default function CrmConsole() {
  const staff = useStaffAuth();

  return (
    <div className="min-h-screen bg-charcoal text-cream">
      {/* Same quiet ambience as the founder console */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(245,240,232,0.025)_1px,transparent_0)] bg-[size:26px_26px]" />
        <div className="absolute -top-48 left-1/3 h-[440px] w-[680px] rounded-full bg-gold/[0.05] blur-[150px]" />
        <div className="absolute -bottom-32 right-0 h-[320px] w-[460px] rounded-full bg-gold/[0.035] blur-[130px]" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="sticky top-0 z-40 border-b border-cream/[0.06] bg-charcoal/90 backdrop-blur-md">
          <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center justify-between gap-4 px-4 md:px-6 lg:px-8">
            <div className="flex items-center gap-2.5">
              <span className="flex flex-col leading-none">
                <span className="font-sans text-[11px] font-semibold tracking-[0.42em] text-cream">
                  LOGOUT
                </span>
                <span className="font-serif text-[16px] italic text-gold">Spells</span>
              </span>
              <span className="ml-1 rounded-full border border-gold/30 bg-gold/[0.08] px-2 py-0.5 font-sans text-[9px] font-medium uppercase tracking-[0.18em] text-gold-light">
                Sales CRM
              </span>
            </div>
            <div className="flex min-w-0 items-center gap-3">
              {staff !== null && (
                <>
                  <span className="hidden max-w-[240px] truncate font-sans text-[12px] text-cream/45 sm:block">
                    {staff.email}
                  </span>
                  <button
                    type="button"
                    onClick={() => void staff.signOut()}
                    className="flex h-9 items-center gap-2 rounded-lg border border-cream/12 px-3.5 font-sans text-[12px] text-cream/60 transition-colors duration-200 hover:border-gold/40 hover:text-gold-light"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Sign out
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1">
          <div className="mx-auto w-full max-w-[1280px] px-4 pb-16 pt-6 md:px-6 lg:px-8">
            <Routes>
              <Route index element={<Navigate to="crm" replace />} />
              <Route path="crm" element={<Crm />} />
              <Route path="crm/:formId" element={<CrmTrip />} />
              <Route path="*" element={<Navigate to="crm" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

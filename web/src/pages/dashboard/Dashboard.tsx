import { AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import { DASH_SECTIONS } from "@/data/dashboard";
import { StaffGate } from "@/integrations/supabase/staffAuth";
import { cn } from "@/lib/utils";

import BlogBuilder from "./BlogBuilder";
import BookingDetail from "./BookingDetail";
import Bookings from "./Bookings";
import Blogs from "./Blogs";
import FormBuilder from "./FormBuilder";
import FormResponses from "./FormResponses";
import Forms from "./Forms";
import Overview from "./Overview";
import Responses from "./Responses";
import Section from "./Section";
import Settings from "./Settings";
import SpellBuilder from "./SpellBuilder";
import SpellImport from "./SpellImport";
import Spells from "./Spells";
import Testimonials from "./Testimonials";

const STORAGE_KEY = "ls-dash-collapsed";

/**
 * Founder console shell: fixed collapsible sidebar, sticky topbar and animated
 * content outlet. Entirely separate from the public site shell (no portal,
 * no starfield, no custom cursor) — the foundation future phases plug into.
 */
export default function Dashboard() {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const location = useLocation();

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    } catch {
      /* storage unavailable — collapse state simply won't persist */
    }
  }, [collapsed]);

  useEffect(() => {
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname === "/dashboard/spells/import") {
      document.title = "Import Spell · Dashboard — Logout Spells";
      return;
    }
    if (location.pathname.startsWith("/dashboard/spells/")) {
      document.title = "Spell Builder · Dashboard — Logout Spells";
      return;
    }
    if (location.pathname.startsWith("/dashboard/forms/")) {
      document.title = "Form Builder · Dashboard — Logout Spells";
      return;
    }
    if (location.pathname === "/dashboard/forms") {
      document.title = "Forms · Dashboard — Logout Spells";
      return;
    }
    if (location.pathname.startsWith("/dashboard/responses/")) {
      document.title = "Form Responses · Dashboard — Logout Spells";
      return;
    }
    if (location.pathname.startsWith("/dashboard/blog/")) {
      document.title = "Blog Builder · Dashboard — Logout Spells";
      return;
    }
    if (location.pathname === "/dashboard/blog") {
      document.title = "Blog · Dashboard — Logout Spells";
      return;
    }
    if (location.pathname.startsWith("/dashboard/bookings")) {
      document.title = "Bookings · Dashboard — Logout Spells";
      return;
    }
    if (location.pathname === "/dashboard/testimonials") {
      document.title = "Testimonials · Dashboard — Logout Spells";
      return;
    }
    const section = DASH_SECTIONS.find((s) => location.pathname === `/dashboard/${s.slug}`);
    document.title = `${section ? `${section.label} · ` : ""}Dashboard — Logout Spells`;
  }, [location.pathname]);

  return (
    <StaffGate>
    <div className="min-h-screen bg-charcoal text-cream">
      {/* Quiet ambience: faint dot grid + two golden glows (no heavy 3D here) */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(245,240,232,0.025)_1px,transparent_0)] bg-[size:26px_26px]" />
        <div className="absolute -top-48 left-1/3 h-[440px] w-[680px] rounded-full bg-gold/[0.05] blur-[150px]" />
        <div className="absolute -bottom-32 right-0 h-[320px] w-[460px] rounded-full bg-gold/[0.035] blur-[130px]" />
      </div>

      <Sidebar
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((v) => !v)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div
        className={cn(
          "relative z-10 flex min-h-screen flex-col transition-[padding-left] duration-300 ease-silk",
          collapsed ? "lg:pl-[76px]" : "lg:pl-[248px]",
        )}
      >
        <Topbar onOpenMobileNav={() => setMobileOpen(true)} />
        <main className="flex-1">
          <div className="mx-auto w-full max-w-[1280px] px-4 pb-16 pt-6 md:px-6 lg:px-8">
            <AnimatePresence mode="wait">
              <Routes location={location} key={location.pathname}>
                <Route index element={<Overview />} />
                <Route path="spells" element={<Spells />} />
                <Route path="spells/new" element={<SpellBuilder />} />
                <Route path="spells/import" element={<SpellImport />} />
                <Route path="spells/:id/edit" element={<SpellBuilder />} />
                <Route path="forms" element={<Forms />} />
                <Route path="forms/new" element={<FormBuilder />} />
                <Route path="forms/:id/edit" element={<FormBuilder />} />
                {/* M11.6 — response management: forms overview → per-form list → detail. */}
                <Route path="responses" element={<Responses />} />
                <Route path="responses/:formId" element={<FormResponses />} />
                <Route path="blog" element={<Blogs />} />
                <Route path="blog/new" element={<BlogBuilder />} />
                <Route path="blog/:id/edit" element={<BlogBuilder />} />
                {/* Booking operations — live over the M7A backend. */}
                <Route path="bookings" element={<Bookings tab="bookings" />} />
                <Route path="bookings/waitlist" element={<Bookings tab="waitlist" />} />
                <Route path="bookings/requests" element={<Bookings tab="requests" />} />
                <Route path="bookings/:id" element={<BookingDetail />} />
                <Route path="testimonials" element={<Testimonials />} />
                {/* M12 — the control room. */}
                <Route path="settings" element={<Settings />} />
                {DASH_SECTIONS.filter((section) => !["spells", "bookings", "testimonials", "responses", "settings"].includes(section.slug)).map((section) => (
                  <Route key={section.slug} path={section.slug} element={<Section section={section} />} />
                ))}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
    </StaffGate>
  );
}

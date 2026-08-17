import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimatePresence, MotionConfig } from "framer-motion";
import { lazy, Suspense, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { Toaster } from "sonner";

import { ApplyProvider } from "@/components/site/ApplyModal";
import ConnectionBanner from "@/components/site/ConnectionBanner";
import PortalEntry from "@/components/site/PortalEntry";
import StarBackdrop from "@/components/site/StarBackdrop";
import { AccountProvider } from "@/data/account/AccountProvider";
import { BlogStoreProvider } from "@/data/blogStore";
import { BucketListProvider } from "@/data/bucketList";
import { FormStoreProvider } from "@/data/formStore";
import { SpellStoreProvider } from "@/data/spellStore";

import Blog from "./pages/Blog";
import BlogPostPage from "./pages/BlogPost";
import Creators from "./pages/Creators";
import Discover from "./pages/Discover";
import DiscoverCategoryPage from "./pages/DiscoverCategory";
import FormPage from "./pages/FormPage";
import Home from "./pages/Home";
import Live from "./pages/Live";
import NotFound from "./pages/NotFound";
import OurStory from "./pages/OurStory";
import PreviousSpellPage from "./pages/PreviousSpellPage";
import PreviousSpells from "./pages/PreviousSpells";
import SpellPage from "./pages/SpellPage";

/** Founder console — lazy chunk so the public site bundle is unaffected. */
const Dashboard = lazy(() => import("./pages/dashboard/Dashboard"));
/** Traveller space + auth — also lazy, same reasoning. */
const Account = lazy(() => import("./pages/account/Account"));
const AuthPage = lazy(() => import("./pages/account/AuthPage"));
const ResetPasswordPage = lazy(() => import("./pages/account/ResetPasswordPage"));

const queryClient = new QueryClient();

/** Auth screens live at these top-level paths. */
const AUTH_PATHS = ["/login", "/join", "/forgot-password", "/reset-password"] as const;

const isAccountArea = (pathname: string): boolean =>
  pathname.startsWith("/account") || AUTH_PATHS.some((p) => pathname.startsWith(p));

const DashboardFallback = () => (
  <div className="grid min-h-screen place-items-center bg-charcoal">
    <div className="flex flex-col items-center gap-4">
      <span aria-hidden className="h-9 w-9 animate-spin rounded-full border-2 border-gold/20 border-t-gold" />
      <p className="font-sans text-[11px] uppercase tracking-[0.32em] text-gold/70">Opening console</p>
    </div>
  </div>
);

const AccountFallback = ({ label }: { label: string }) => (
  <div className="grid min-h-screen place-items-center">
    <div className="flex flex-col items-center gap-4">
      <span aria-hidden className="h-9 w-9 animate-spin rounded-full border-2 border-gold/20 border-t-gold" />
      <p className="font-sans text-[11px] uppercase tracking-[0.32em] text-gold/70">{label}</p>
    </div>
  </div>
);

/** Old /spells/:slug and /spell/:slug links land on the new /live/:slug home. */
const LegacySpellRedirect = () => {
  const { slug } = useParams<{ slug: string }>();
  return <Navigate to={`/live/${slug ?? ""}`} replace />;
};

const AnimatedRoutes = () => {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith("/dashboard");
  const isAccount = location.pathname.startsWith("/account");
  return (
    <AnimatePresence mode="wait">
      {/* All /dashboard/* and /account/* paths share one key each so their shells never remount between sub-pages. */}
      <Routes
        location={location}
        key={isDashboard ? "dashboard" : isAccount ? "account" : location.pathname}
      >
        <Route path="/" element={<Home />} />
        <Route path="/creators" element={<Creators />} />
        <Route path="/our-story" element={<OurStory />} />
        {/* The Journal — Experience grew up into the blog. */}
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPostPage />} />
        <Route path="/experience" element={<Navigate to="/blog" replace />} />
        {/* Discover — mood categories, each opening a curated collection. */}
        <Route path="/discover" element={<Discover />} />
        <Route path="/discover/:slug" element={<DiscoverCategoryPage />} />
        <Route path="/live" element={<Live />} />
        {/* Completed journeys — the archive and its memory pages. */}
        <Route path="/live-spells/previous" element={<PreviousSpells />} />
        <Route path="/live-spells/previous/:slug" element={<PreviousSpellPage />} />
        <Route path="/live-spells" element={<Navigate to="/live" replace />} />
        {/* Generated spell pages — rendered dynamically from the local CMS. */}
        <Route path="/live/:slug" element={<SpellPage />} />
        <Route path="/spells/:slug" element={<LegacySpellRedirect />} />
        <Route path="/spell/:slug" element={<LegacySpellRedirect />} />
        {/* Public form pages — share links open straight into the questions. */}
        <Route path="/forms/:slug" element={<FormPage />} />
        {/* Traveller auth — native Supabase sessions (M6). */}
        <Route
          path="/login"
          element={
            <Suspense fallback={<AccountFallback label="Opening" />}>
              <AuthPage mode="login" />
            </Suspense>
          }
        />
        <Route
          path="/join"
          element={
            <Suspense fallback={<AccountFallback label="Opening" />}>
              <AuthPage mode="join" />
            </Suspense>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <Suspense fallback={<AccountFallback label="Opening" />}>
              <AuthPage mode="forgot" />
            </Suspense>
          }
        />
        {/* Where the password-recovery email lands. */}
        <Route
          path="/reset-password"
          element={
            <Suspense fallback={<AccountFallback label="Opening" />}>
              <ResetPasswordPage />
            </Suspense>
          }
        />
        {/* The traveller space — every logged-in page lives here. */}
        <Route
          path="/account/*"
          element={
            <Suspense fallback={<AccountFallback label="Opening your space" />}>
              <Account />
            </Suspense>
          }
        />
        <Route
          path="/dashboard/*"
          element={
            <Suspense fallback={<DashboardFallback />}>
              <Dashboard />
            </Suspense>
          }
        />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  );
};

/**
 * The ritual portal + starfield wrap the public site only — the founder
 * console at /dashboard bypasses both and renders immediately.
 */
const AppShell = () => {
  const [entered, setEntered] = useState<boolean>(false);
  const [portalDone, setPortalDone] = useState<boolean>(false);
  const location = useLocation();
  const isDashboard = location.pathname.startsWith("/dashboard");
  /* Shared form links skip the ritual portal — respondents land straight on the questions. */
  const isFormPage = location.pathname.startsWith("/forms/");
  /* The traveller space + auth also skip the portal — returning travellers land straight in. */
  const isAccount = isAccountArea(location.pathname);
  const skipPortal = isFormPage || isAccount;

  return (
    <ApplyProvider>
      {!isDashboard && <StarBackdrop />}
      {(entered || isDashboard || skipPortal) && <AnimatedRoutes />}
      {/* M11.5: the back orb now lives inside each page's own layout (PageBack via the Page shell) — no global fixed button. */}
      {!isDashboard && !skipPortal && !portalDone && (
        <PortalEntry onIgnite={() => setEntered(true)} onDone={() => setPortalDone(true)} />
      )}
    </ApplyProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    {/* One spell collection shared by the founder console and the public site. */}
    <SpellStoreProvider>
      {/* Forms + responses share the same local-CMS pattern as spells. */}
      <FormStoreProvider>
        {/* The Journal — blog posts managed in the console, rendered on the site. */}
        <BlogStoreProvider>
        {/* Traveller session + account data — native Supabase Auth (M6). */}
        <AccountProvider>
          {/* The traveller's bucket list — dreams dropped into the Discover cauldron. */}
          <BucketListProvider>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            {/* Honour the OS "reduce motion" preference across every animation. */}
            <MotionConfig reducedMotion="user">
              <AppShell />
            </MotionConfig>
          </BrowserRouter>
          {/* M10: honest offline indicator — appears only when the network drops. */}
          <ConnectionBanner />
          <Toaster
            position="bottom-right"
            gap={10}
            toastOptions={{
              style: {
                background: "rgba(22, 21, 15, 0.98)",
                border: "1px solid rgba(184, 150, 62, 0.3)",
                color: "#F5F0E8",
                fontFamily: "Inter, -apple-system, sans-serif",
                fontSize: "13px",
                boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
              },
            }}
          />
          </BucketListProvider>
        </AccountProvider>
        </BlogStoreProvider>
      </FormStoreProvider>
    </SpellStoreProvider>
  </QueryClientProvider>
);

export default App;

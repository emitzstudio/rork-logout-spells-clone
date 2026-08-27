import { AnimatePresence } from "framer-motion";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import AccountShell from "@/components/account/AccountShell";
import { useNoIndex } from "@/lib/seo";

import CalendarPage from "./CalendarPage";
import JourneyPage from "./JourneyPage";
import MemoriesPage from "./MemoriesPage";
import MemoryDetail from "./MemoryDetail";
import NotificationsPage from "./NotificationsPage";
import Overview from "./Overview";
import ProfilePage from "./ProfilePage";
import SettingsPage from "./SettingsPage";
import SupportPage from "./SupportPage";
import TransactionsPage from "./TransactionsPage";
import TripDetail from "./TripDetail";
import Trips from "./Trips";
import WishlistPage from "./WishlistPage";

/**
 * The traveller space - lazy chunk mounted at /account/*. The shell (guard,
 * ribbon nav, chrome) persists across sub-pages; only the content animates.
 */
export default function Account() {
  /* The traveller space is private - never indexed. */
  useNoIndex();

  const location = useLocation();

  return (
    <AccountShell>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route index element={<Overview />} />
          <Route path="trips" element={<Trips />} />
          <Route path="trips/:id" element={<TripDetail />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="wishlist" element={<WishlistPage />} />
          <Route path="memories" element={<MemoriesPage />} />
          <Route path="memories/:id" element={<MemoryDetail />} />
          <Route path="journey" element={<JourneyPage />} />
          <Route path="transactions" element={<TransactionsPage />} />
          {/* Wallet & referrals are parked for now - old links land gently. */}
          <Route path="wallet" element={<Navigate to="/account/transactions" replace />} />
          <Route path="referrals" element={<Navigate to="/account" replace />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="support" element={<SupportPage />} />
          <Route path="*" element={<Navigate to="/account" replace />} />
        </Routes>
      </AnimatePresence>
    </AccountShell>
  );
}

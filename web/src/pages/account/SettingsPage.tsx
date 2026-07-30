import { AnimatePresence, motion } from "framer-motion";
import { KeyRound, LogOut, ShieldAlert, X } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { AccountPage, EASE } from "@/components/account/bits";
import { Switch } from "@/components/ui/switch";
import { useAccount } from "@/data/account/AccountProvider";
import { AccountError } from "@/data/account/models";
import type { TravellerPrefs } from "@/data/account/models";
import { accountService } from "@/data/account/service";
import { cn } from "@/lib/utils";

interface PrefRowDef {
  key: keyof TravellerPrefs;
  label: string;
  line: string;
}

const NOTIFY_ROWS: PrefRowDef[] = [
  { key: "notifyTrips", label: "Trip updates", line: "Confirmations, documents, day-before whispers." },
  { key: "notifyReminders", label: "Gentle reminders", line: "Packing nudges and balance-due notes." },
  { key: "notifyOffers", label: "New spells & offers", line: "Early-bird circles that match your leanings." },
];

const CHANNEL_ROWS: PrefRowDef[] = [
  { key: "channelEmail", label: "Email", line: "The long-form channel." },
  { key: "channelWhatsapp", label: "WhatsApp", line: "For things that can't wait for email." },
];

const PRIVACY_ROWS: PrefRowDef[] = [
  { key: "profileVisible", label: "Visible to your circles", line: "Fellow travellers on a booked spell can see your first name and photo." },
  { key: "showMemories", label: "Share memory covers", line: "Hosts may feature an album cover (never your photos) on spell pages." },
];

/** Settings — preferences, privacy, password and the quiet exit. */
export default function SettingsPage() {
  const { data, updatePrefs, signOut, deleteAccount } = useAccount();
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);

  if (!data) return null;
  const prefs = data.prefs;

  const setPref = (key: keyof TravellerPrefs, value: boolean): void => {
    void updatePrefs({ [key]: value }).then(() => toast("Preference saved"));
  };

  const renderRows = (rows: PrefRowDef[]): ReactNode =>
    rows.map((row) => (
      <div key={row.key} className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
        <div className="min-w-0">
          <p className="font-sans text-[13.5px] text-cream/85">{row.label}</p>
          <p className="mt-0.5 font-sans text-[11.5px] text-cream/40">{row.line}</p>
        </div>
        <Switch
          checked={prefs[row.key]}
          onCheckedChange={(v) => setPref(row.key, v)}
          aria-label={row.label}
          className="data-[state=checked]:bg-gold data-[state=unchecked]:bg-cream/15"
        />
      </div>
    ));

  return (
    <AccountPage
      title="Settings"
      eyebrow="Settings"
      heading={
        <>
          Tuned to <span className="italic text-gold-gradient">your quiet.</span>
        </>
      }
      sub="How and when we reach you, who sees what, and the keys to your account."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Notifications */}
        <section className="card-glass rounded-2xl p-6">
          <p className="eyebrow !text-[10px]">Notifications</p>
          <div className="mt-4 divide-y divide-cream/[0.06]">{renderRows(NOTIFY_ROWS)}</div>
          <p className="mt-5 border-t border-cream/[0.07] pt-4 font-sans text-[9.5px] uppercase tracking-[0.24em] text-cream/35">
            Channels
          </p>
          <div className="mt-2 divide-y divide-cream/[0.06]">{renderRows(CHANNEL_ROWS)}</div>
        </section>

        <div className="space-y-6">
          {/* Privacy */}
          <section className="card-glass rounded-2xl p-6">
            <p className="eyebrow !text-[10px]">Privacy</p>
            <div className="mt-4 divide-y divide-cream/[0.06]">{renderRows(PRIVACY_ROWS)}</div>
          </section>

          {/* Password */}
          <PasswordCard />
        </div>
      </div>

      {/* Session + danger */}
      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card-glass flex flex-wrap items-center justify-between gap-4 rounded-2xl p-6">
          <div>
            <p className="font-serif text-xl text-cream">Step out for now</p>
            <p className="mt-1 font-sans text-[12px] text-cream/45">
              Your trips, memories and journey stay exactly where you left them.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              signOut();
              navigate("/");
              toast("Logged out — the circle keeps your seat ✦");
            }}
            className="btn-ghost-gold !px-5 !py-2.5 !text-[12px]"
          >
            <LogOut size={14} /> Log out
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-red-400/20 bg-red-400/[0.03] p-6">
          <div>
            <p className="flex items-center gap-2 font-serif text-xl text-cream">
              <ShieldAlert size={17} className="text-red-300/80" /> Leave the circle
            </p>
            <p className="mt-1 font-sans text-[12px] text-cream/45">
              Deletes your account and every trace of it. There's no undo spell.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="rounded-md border border-red-400/30 px-5 py-2.5 font-sans text-[12px] tracking-[0.08em] text-red-300/90 transition-all hover:border-red-400/60 hover:bg-red-400/[0.08] active:scale-[0.98]"
          >
            Delete account
          </button>
        </div>
      </section>

      <p className="mt-8 text-center font-hand text-lg text-gold/40">
        demo mode — everything here lives safely in your browser ✦
      </p>

      {/* Delete confirm */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setConfirmDelete(false)}
            role="presentation"
            className="fixed inset-0 z-[97] grid place-items-center bg-charcoal-deep/85 px-5 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.3, ease: EASE }}
              onClick={(e) => e.stopPropagation()}
              role="alertdialog"
              aria-modal="true"
              aria-label="Confirm account deletion"
              className="relative w-full max-w-sm rounded-2xl border border-red-400/25 bg-[#14130f] p-6 shadow-[0_40px_100px_rgba(0,0,0,0.65)]"
            >
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                aria-label="Close"
                className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg border border-cream/15 text-cream/60 transition-all hover:text-cream"
              >
                <X size={14} />
              </button>
              <span aria-hidden className="font-serif text-4xl text-red-300/70">☾</span>
              <h3 className="heading-serif mt-3 text-2xl text-cream">Truly leave?</h3>
              <p className="mt-2 font-sans text-[13px] leading-relaxed text-cream/50">
                Your {data.bookings.length} bookings, {data.memories.length} albums and every step of
                your journey will fade. This cannot be undone.
              </p>
              <div className="mt-6 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="btn-ghost-gold flex-1 !py-3 !text-[12px]"
                >
                  Stay
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => {
                    setDeleting(true);
                    void deleteAccount()
                      .then(() => {
                        navigate("/");
                        toast("Your account has faded. The door stays open.");
                      })
                      .finally(() => setDeleting(false));
                  }}
                  className="flex-1 rounded-md border border-red-400/40 bg-red-400/10 py-3 font-sans text-[12px] tracking-[0.08em] text-red-300 transition-all hover:bg-red-400/20 disabled:opacity-50"
                >
                  {deleting ? "Fading…" : "Delete forever"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AccountPage>
  );
}

/* ------------------------------ Password card ------------------------------ */

function PasswordCard() {
  const [current, setCurrent] = useState<string>("");
  const [next, setNext] = useState<string>("");
  const [confirm, setConfirm] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: FormEvent): void => {
    e.preventDefault();
    setError(null);
    if (next !== confirm) {
      setError("The new passwords don't match.");
      return;
    }
    setBusy(true);
    void accountService
      .changePassword(current, next)
      .then(() => {
        toast("Password updated ✦");
        setCurrent("");
        setNext("");
        setConfirm("");
      })
      .catch((err: unknown) => {
        setError(err instanceof AccountError ? err.message : "Something drifted — try again.");
      })
      .finally(() => setBusy(false));
  };

  const field =
    "mt-1.5 w-full rounded-lg border border-cream/15 bg-charcoal-soft/60 px-3.5 py-2.5 font-sans text-[13.5px] text-cream placeholder:text-cream/25 focus:border-gold/60 focus:outline-none";

  return (
    <section className="card-glass rounded-2xl p-6">
      <p className="eyebrow flex items-center gap-2 !text-[10px]">
        <KeyRound size={12} /> Password
      </p>
      <form onSubmit={onSubmit} className="mt-4 space-y-3.5" noValidate>
        <label className="block">
          <span className="font-sans text-[10px] uppercase tracking-[0.22em] text-cream/45">Current password</span>
          <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" className={field} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="font-sans text-[10px] uppercase tracking-[0.22em] text-cream/45">New password</span>
            <input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" className={field} />
          </label>
          <label className="block">
            <span className="font-sans text-[10px] uppercase tracking-[0.22em] text-cream/45">Confirm</span>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              className={cn(field, confirm !== "" && confirm !== next && "border-red-400/50")}
            />
          </label>
        </div>
        {error !== null && (
          <p className="rounded-lg border border-red-400/25 bg-red-400/[0.06] px-3.5 py-2.5 font-sans text-[12px] text-red-300/90" role="alert">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} className="btn-ghost-gold w-full !py-3 !text-[12px] disabled:opacity-50">
          {busy ? "Updating…" : "Update password"}
        </button>
      </form>
    </section>
  );
}

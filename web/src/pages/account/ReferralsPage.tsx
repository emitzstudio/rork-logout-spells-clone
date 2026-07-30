import { Check, Copy, Gift, Send, Sparkles, Ticket, UserPlus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { AccountPage, SectionTitle } from "@/components/account/bits";
import { CountUp } from "@/components/site/Reveal";
import { useAccount } from "@/data/account/AccountProvider";
import { fmtDayYear } from "@/data/account/derive";
import type { ReferralStatus } from "@/data/account/models";
import { formatINR } from "@/data/spells";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

const STATUS_META: Record<ReferralStatus, { label: string; chip: string }> = {
  invited: { label: "Invited", chip: "border-dashed border-cream/25 text-cream/50" },
  joined: { label: "Joined", chip: "border-amber-400/30 bg-amber-400/[0.07] text-amber-300" },
  booked: { label: "Booked ✦", chip: "border-gold/40 bg-gold/10 text-gold-light" },
};

const STEPS: { icon: LucideIcon; title: string; line: string }[] = [
  { icon: Send, title: "Share your code", line: "Send it to someone drowning in notifications." },
  { icon: UserPlus, title: "They join", line: "Your circle grows by one quiet rebel." },
  { icon: Ticket, title: "They book a spell", line: "Their first real logout — the moment that counts." },
  { icon: Gift, title: "You both win", line: "₹2,000 travel credit each, only after they book." },
];

/** Referral programme — rewards land only after a friend actually books. */
export default function ReferralsPage() {
  const { data } = useAccount();
  const [copied, setCopied] = useState<boolean>(false);

  if (!data) return null;

  const earned = data.referrals.reduce((sum, r) => sum + r.reward, 0);
  const bookedCount = data.referrals.filter((r) => r.status === "booked").length;

  const copyCode = (): void => {
    void navigator.clipboard
      .writeText(data.profile.referralCode)
      .then(() => {
        setCopied(true);
        toast("Code copied — send it somewhere real ✦");
        window.setTimeout(() => setCopied(false), 2_000);
      })
      .catch(() => toast(data.profile.referralCode));
  };

  const shareInvite = (): void => {
    const text = `I keep disappearing on these creator-led trips — use my code ${data.profile.referralCode} when you book your first Logout Spell. We both get ₹2,000 of travel credit.`;
    const url = `${window.location.origin}/live`;
    if (typeof navigator.share === "function") {
      void navigator.share({ title: "Logout Spells", text, url }).catch(() => undefined);
    } else {
      void navigator.clipboard
        .writeText(`${text}\n${url}`)
        .then(() => toast("Invite copied to your clipboard"))
        .catch(() => undefined);
    }
  };

  return (
    <AccountPage
      title="Referrals"
      eyebrow="Referral Programme"
      heading={
        <>
          Bring someone <span className="italic text-gold-gradient">real.</span>
        </>
      }
      sub="The best circles are built by the people already inside them. Credits unlock only when your friend books — that's the honest part."
    >
      {/* Code + earnings */}
      <div className="grid gap-5 lg:grid-cols-5">
        <div className="relative overflow-hidden rounded-3xl border border-gold/30 p-7 md:p-9 lg:col-span-3">
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ background: "radial-gradient(ellipse 70% 80% at 20% 0%, rgba(184,150,62,0.14), transparent 65%)" }}
          />
          <p className="eyebrow relative !text-[10px]">Your invitation code</p>
          <div className="relative mt-4 flex flex-wrap items-center gap-4">
            <span className="rounded-2xl border border-dashed border-gold/50 bg-charcoal-deep/60 px-6 py-4 font-serif text-3xl tracking-[0.14em] text-gold-light md:text-4xl">
              {data.profile.referralCode}
            </span>
            <div className="flex gap-2">
              <button type="button" onClick={copyCode} className="btn-gold !px-5 !py-3 !text-[12px]">
                {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}
              </button>
              <button type="button" onClick={shareInvite} className="btn-ghost-gold !px-5 !py-3 !text-[12px]">
                <Send size={14} /> Share invite
              </button>
            </div>
          </div>
          <p className="relative mt-5 font-hand text-xl text-gold/60">
            — worth ₹2,000 of wandering, for both of you
          </p>
        </div>

        <div className="card-glass flex flex-col justify-center rounded-3xl p-7 lg:col-span-2">
          <p className="font-sans text-[10px] uppercase tracking-[0.24em] text-cream/40">Earned so far</p>
          <p className="mt-2 font-serif text-5xl text-gold-light">
            ₹<CountUp to={earned} />
          </p>
          <p className="mt-2 font-sans text-[12px] leading-relaxed text-cream/45">
            From {bookedCount} friend{bookedCount === 1 ? "" : "s"} who booked their first spell.
          </p>
          <Link
            to="/account/wallet"
            className="mt-4 inline-flex items-center gap-2 font-sans text-[11px] uppercase tracking-[0.2em] text-gold transition-all hover:gap-3 hover:text-gold-light"
          >
            See credits in wallet <Sparkles size={13} />
          </Link>
        </div>
      </div>

      {/* How it works */}
      <section className="mt-12">
        <SectionTitle eyebrow="How it works">Four quiet steps</SectionTitle>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="card-glass relative rounded-2xl p-5">
                <span className="absolute right-4 top-4 font-serif text-3xl text-cream/[0.07]">{i + 1}</span>
                <span className="grid h-11 w-11 place-items-center rounded-full border border-gold/25 bg-gold/[0.06] text-gold/80">
                  <Icon size={16} />
                </span>
                <p className="mt-3.5 font-serif text-[17px] text-cream">{step.title}</p>
                <p className="mt-1 font-sans text-[12px] leading-relaxed text-cream/45">{step.line}</p>
              </div>
            );
          })}
        </div>
        <p className="mt-4 font-sans text-[11.5px] text-cream/35">
          No reward for signups alone — credits are earned when a friend takes their first real trip.
        </p>
      </section>

      {/* Your circle */}
      <section className="mt-12">
        <SectionTitle eyebrow="Your circle so far">People you've pulled offline</SectionTitle>
        <div className="mt-5 space-y-2.5">
          {data.referrals.map((r) => {
            const meta = STATUS_META[r.status];
            return (
              <div key={r.id} className="card-glass flex items-center gap-4 rounded-2xl p-4 md:px-5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-cream/12 bg-charcoal-deep/50 font-serif text-lg text-cream/70">
                  {r.name.charAt(0)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-sans text-[13.5px] text-cream/90">{r.name}</p>
                  <p className="mt-0.5 font-sans text-[11.5px] text-cream/40">
                    Invited {fmtDayYear(r.invitedAt)}
                    {r.bookedSpell !== undefined && ` · booked the ${r.bookedSpell}`}
                  </p>
                </div>
                {r.reward > 0 && (
                  <span className="shrink-0 font-serif text-[17px] text-gold-light">+ {formatINR(r.reward)}</span>
                )}
                <span
                  className={cn(
                    "shrink-0 rounded-full border px-2.5 py-1 font-sans text-[9.5px] uppercase tracking-[0.16em]",
                    meta.chip,
                  )}
                >
                  {meta.label}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </AccountPage>
  );
}

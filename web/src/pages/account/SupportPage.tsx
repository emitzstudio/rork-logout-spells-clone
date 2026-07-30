import { ArrowRight, LifeBuoy, Mail, MessageCircle, PhoneCall } from "lucide-react";
import { Link } from "react-router-dom";

import { AccountPage, SectionTitle } from "@/components/account/bits";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useAccount } from "@/data/account/AccountProvider";
import { nextTrip } from "@/data/account/derive";
import { CONTACT_EMAIL } from "@/data/site";

const FAQS: { q: string; a: string }[] = [
  {
    q: "How do bookings actually work?",
    a: "You apply for a spell, the host personally confirms your seat (circles are 8–12 people, so fit matters), you pay — in full or a deposit — and your travel pack arrives 10 days before departure. Every step shows live on your booking page.",
  },
  {
    q: "What if I need to cancel?",
    a: "Cancel 21+ days before departure for a 90% refund, 7–20 days for 50%. Inside 7 days we can usually move you to a later circle instead — talk to us first, there's almost always a kinder option.",
  },
  {
    q: "Do I really have to give up my phone?",
    a: "Mostly, yes — that's the spell. Phones rest in a lockbox during circle hours on most trips. Emergencies always reach you: hosts carry a phone, and your emergency contact has their number.",
  },
  {
    q: "Why do memory albums have photo limits?",
    a: "Because 400 photos is a camera roll, not a memory. Each trip keeps a small album — 8 to 12 keepsakes — so you choose what mattered. Travellers tell us it's their favourite rule.",
  },
  {
    q: "How do advance payments work?",
    a: "Most circles hold your seat with a small advance — the balance is due 21 days before departure. Every payment and its invoice lives in your Transactions, and we remind you well before anything is due.",
  },
  {
    q: "I'm travelling solo. Is that okay?",
    a: "Around 70% of travellers arrive solo. That's rather the point — you leave with a circle.",
  },
];

/** Support — help that sounds like a person, not a portal. */
export default function SupportPage() {
  const { data } = useAccount();
  if (!data) return null;

  const trip = nextTrip(data.bookings);

  return (
    <AccountPage
      title="Support"
      eyebrow="Support"
      heading={
        <>
          A human, <span className="italic text-gold-gradient">within reach.</span>
        </>
      }
      sub="No ticket numbers, no hold music. Write to us and a real person answers — usually within a few hours."
    >
      {/* Contact channels */}
      <div className="grid gap-4 sm:grid-cols-3">
        <a
          href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("A question from my Logout Space")}`}
          className="card-glass group rounded-2xl p-6 transition-colors hover:border-gold/30"
        >
          <span className="grid h-11 w-11 place-items-center rounded-full border border-gold/25 bg-gold/[0.06] text-gold/80">
            <Mail size={16} />
          </span>
          <p className="mt-3.5 font-serif text-xl text-cream group-hover:text-gold-light">Email us</p>
          <p className="mt-1 font-sans text-[12px] leading-relaxed text-cream/45">
            {CONTACT_EMAIL} · replies within ~4 hours, 9am–9pm IST
          </p>
        </a>
        <div className="card-glass rounded-2xl p-6">
          <span className="grid h-11 w-11 place-items-center rounded-full border border-emerald-400/25 bg-emerald-400/[0.06] text-emerald-300/80">
            <MessageCircle size={16} />
          </span>
          <p className="mt-3.5 font-serif text-xl text-cream">WhatsApp</p>
          <p className="mt-1 font-sans text-[12px] leading-relaxed text-cream/45">
            Arrives with the backend phase — email is the fast lane for now.
          </p>
        </div>
        <div className="card-glass rounded-2xl p-6">
          <span className="grid h-11 w-11 place-items-center rounded-full border border-red-400/25 bg-red-400/[0.06] text-red-300/80">
            <PhoneCall size={16} />
          </span>
          <p className="mt-3.5 font-serif text-xl text-cream">Mid-trip urgency</p>
          <p className="mt-1 font-sans text-[12px] leading-relaxed text-cream/45">
            Your host carries a phone at all times — the number is in your travel pack.
          </p>
        </div>
      </div>

      {/* Trip-specific help */}
      {trip && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gold/25 bg-gold/[0.05] p-6">
          <div className="flex items-center gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-gold/30 bg-charcoal-deep/50 text-gold">
              <LifeBuoy size={16} />
            </span>
            <div>
              <p className="font-serif text-[19px] text-cream">Question about {trip.spell.name}?</p>
              <p className="mt-0.5 font-sans text-[12px] text-cream/50">
                Your booking page has the timeline, documents and payment details.
              </p>
            </div>
          </div>
          <Link to={`/account/trips/${trip.id}`} className="btn-gold !px-5 !py-2.5 !text-[12px]">
            Open booking <ArrowRight size={13} />
          </Link>
        </div>
      )}

      {/* FAQ */}
      <section className="mt-12">
        <SectionTitle eyebrow="Asked often">The honest answers</SectionTitle>
        <Accordion type="single" collapsible className="mt-5">
          {FAQS.map((faq, i) => (
            <AccordionItem
              key={faq.q}
              value={`faq-${i}`}
              className="border-b border-cream/[0.08] px-1"
            >
              <AccordionTrigger className="py-5 text-left font-serif text-[18px] font-normal text-cream hover:text-gold-light hover:no-underline [&>svg]:text-gold/60">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="pb-6 font-sans text-[13.5px] leading-relaxed text-cream/55">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <p className="mt-12 text-center font-hand text-2xl leading-relaxed text-gold/55">
        “If something feels off, tell us early — <br className="hidden sm:block" />
        there is almost always a kinder option.” — Vidushi ✦
      </p>
    </AccountPage>
  );
}

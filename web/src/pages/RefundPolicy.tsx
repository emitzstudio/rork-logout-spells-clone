import {
  PolicyLead,
  PolicySection,
  PolicyShell,
  PolicyText,
} from "@/components/site/PolicyPage";

/**
 * Cancellation fee tiers - fixed policy numbers. The bar width mirrors the
 * share of the trip cost charged so the timeline reads at a glance.
 */
interface CancellationTier {
  window: string;
  timing: string;
  fee: string;
}

const CANCELLATION_TIERS: CancellationTier[] = [
  { window: "30 days or more", timing: "before the trip start date", fee: "50%" },
  { window: "15 to 30 days", timing: "before the trip start date", fee: "75%" },
  { window: "0 to 15 days", timing: "before the trip start date", fee: "100%" },
];

/** The official refund & cancellation policy. Route: /refund-policy. */
export default function RefundPolicy() {
  return (
    <PolicyShell
      title="Refund & Cancellation Policy"
      heading={
        <>
          Refund &amp; Cancellation <span className="italic text-gold-gradient">Policy</span>
        </>
      }
      description="How cancellations and refunds work at Logout Spells: cancellation charges by notice period, trip confirmation, changes due to weather or government restrictions, and refund processing timelines."
      path="/refund-policy"
      intro={
        <PolicyLead>
          At Logout Spells, we understand that plans can sometimes change. Our cancellation and
          refund policy is designed to keep things clear and fair for everyone involved, including
          our travellers, trip operators, and the people who make each experience possible.
        </PolicyLead>
      }
    >
      <PolicySection title="Cancellation & Refund Terms">
        <PolicyText>
          If you cancel your booking, the following cancellation charges will apply based on how
          far in advance the cancellation is made from the trip start date:
        </PolicyText>
        <div className="grid gap-4 pt-2 sm:grid-cols-3">
          {CANCELLATION_TIERS.map((tier) => (
            <div key={tier.window} className="card-glass rounded-[14px] p-6">
              {/* The filled share of this strip = the share of the trip cost charged. */}
              <div className="h-1 w-full overflow-hidden rounded-full bg-cream/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-gold to-gold-light"
                  style={{ width: tier.fee }}
                  aria-hidden
                />
              </div>
              <p className="mt-5 font-sans text-[11px] uppercase tracking-[0.22em] text-gold">
                {tier.window}
              </p>
              <p className="mt-1 font-sans text-xs text-cream/50">{tier.timing}</p>
              <p className="heading-serif mt-4 text-5xl">
                <span className="text-gold-gradient">{tier.fee}</span>
              </p>
              <p className="mt-3 font-sans text-[13px] leading-relaxed text-cream/55">
                of the total trip cost will be charged as cancellation fees.
              </p>
            </div>
          ))}
        </div>
      </PolicySection>

      <PolicySection title="Trip Confirmation">
        <PolicyText>
          The status of each trip will be confirmed on the date mentioned on the respective trip
          page, based on the minimum number of sign-ups required for that trip.
        </PolicyText>
        <PolicyText>
          If the entire group trip is cancelled due to unforeseen circumstances or because the
          minimum participation required for the trip is not met, travellers will be entitled to a{" "}
          <strong className="font-medium text-cream">full refund</strong>.
        </PolicyText>
      </PolicySection>

      <PolicySection title="Weather & Government Restrictions">
        <PolicyText>Travel sometimes comes with circumstances beyond anyone&apos;s control.</PolicyText>
        <PolicyText>
          In the event of unforeseen weather conditions, government restrictions, or similar
          circumstances, certain activities included in a trip may have to be cancelled or changed.
        </PolicyText>
        <PolicyText>
          In such situations, the trip operator will make reasonable efforts to provide an
          alternate and feasible activity.
        </PolicyText>
        <PolicyText>
          Cancellation or modification of an individual activity due to such circumstances will
          not be eligible for a refund.
        </PolicyText>
      </PolicySection>

      <PolicySection title="Booking Amount">
        <PolicyText>
          The booking amount is non-refundable if the trip itself is not cancelled.
        </PolicyText>
      </PolicySection>

      <PolicySection title="Refund Processing">
        <PolicyText>
          Where a refund is applicable under this policy, the refund will be processed within{" "}
          <strong className="font-medium text-cream">7–10 working days</strong>.
        </PolicyText>
      </PolicySection>
    </PolicyShell>
  );
}

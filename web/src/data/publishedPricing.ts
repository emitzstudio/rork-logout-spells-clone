import { pricingTiers } from "@/data/builder";
import type { PricingBlock, SpellDraft } from "@/data/builder";
import { formatINR } from "@/data/spells";

/** Accept only HTTPS PDFs or the site's brochure directory, never executable URLs. */
export function brochureLink(pricing: PricingBlock | undefined): string | null {
  const value = pricing?.brochureUrl?.trim() ?? "";
  if (/^\/brochures\/[a-zA-Z0-9_-]+\.pdf$/.test(value)) return value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.pathname.toLowerCase().endsWith(".pdf") && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}

/** Update only the brochure reference, retaining tiers and all existing commercial terms. */
export function withBrochureUrl(pricing: PricingBlock | undefined, brochureUrl: string): PricingBlock {
  return { tiers: [], remainingNote: "", taxNote: "", note: "", ...pricing, brochureUrl };
}

/** Published amounts for an offline quote request, not an online payment calculation. */
export function publishedRequestTerms(draft: SpellDraft | undefined, seats: number): string[] | null {
  if (draft?.pricing?.requestMode !== "published-terms") return null;
  const tiers = pricingTiers(draft).filter((tier) => tier.bookingAmount > 0 && tier.bookingAmount <= tier.price);
  if (tiers.length === 0 || !Number.isInteger(seats) || seats < 1) return null;
  const lines = tiers.map((tier) =>
    `${tier.label}: ${formatINR(tier.price)} per person × ${seats} = ${formatINR(tier.price * seats)}. ` +
    `Booking amount: ${formatINR(tier.bookingAmount * seats)} (${formatINR(tier.bookingAmount)} per person). ` +
    `Remaining trip amount: ${formatINR((tier.price - tier.bookingAmount) * seats)} before departure.`,
  );
  if (draft.pricing.taxNote.trim()) lines.push(draft.pricing.taxNote);
  lines.push("These are the published trip amounts. The team confirms your price tier, availability and any applicable taxes before collecting payment.");
  lines.push("No payment is taken online with this request.");
  return lines;
}

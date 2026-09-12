import { Download } from "lucide-react";
import { TextField } from "@/components/dashboard/builder/Fields";
import type { PricingBlock } from "@/data/builder";
import { brochureLink, withBrochureUrl } from "@/data/publishedPricing";

/** Edits the PDF reference independently of existing price tiers and booking terms. */
export default function BrochureField({ pricing, onChange }: {
  pricing: PricingBlock | undefined;
  onChange: (pricing: PricingBlock) => void;
}) {
  const link = brochureLink(pricing);
  const invalid = Boolean(pricing?.brochureUrl?.trim()) && !link;
  return <div className="space-y-2">
    <TextField
      label="Brochure PDF link"
      value={pricing?.brochureUrl ?? ""}
      onChange={(url) => onChange(withBrochureUrl(pricing, url))}
      placeholder="https://example.com/itinerary.pdf"
      helper="Every spell gets a download button automatically. Leave this blank to generate a PDF from the latest spell details when downloaded. Add an HTTPS PDF link or /brochures/filename.pdf to use a custom brochure instead; custom files stay unchanged until you replace the link."
      optional
    />
    {!pricing?.brochureUrl?.trim() && <p className="flex items-center gap-2 text-xs text-gold-light"><Download size={14} aria-hidden /> Automatic brochure enabled · try it in the preview</p>}
    {invalid && <p role="alert" className="text-xs text-red-300">Enter a valid HTTPS PDF link or a /brochures/filename.pdf path before saving.</p>}
    {link && <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 text-sm text-gold-light hover:underline"><Download size={16} aria-hidden /> Open current PDF</a>}
  </div>;
}

import { useEffect } from "react";
import { STARBOY_BROCHURE_URL } from "@/data/starboyBrochure";

/** Handles retired PDF links on static hosts that fall back to the site entry point. */
export default function BrochureRedirect() {
  useEffect(() => {
    window.location.replace(STARBOY_BROCHURE_URL);
  }, []);

  return <main className="grid min-h-screen place-items-center bg-charcoal px-6 text-cream">
    <div className="max-w-sm space-y-4 text-center">
      <h1 className="font-serif text-3xl">The Blinding Nights Spell</h1>
      <p role="status" className="text-sm text-cream/70">Opening the Grimoire itinerary.</p>
      <a href={STARBOY_BROCHURE_URL} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gold/40 px-5 py-3 text-sm text-gold-light hover:bg-gold/10">Download the Grimoire PDF</a>
    </div>
  </main>;
}

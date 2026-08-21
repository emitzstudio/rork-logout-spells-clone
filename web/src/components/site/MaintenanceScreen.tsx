import { useEffect } from "react";

import { useSiteSettings } from "@/data/siteSettingsStore";

/**
 * M12 — shown on every public route while the founder has the website set to
 * maintenance. The console, sign-in and traveller space stay reachable; no
 * invented ETA, just an honest rest note.
 */
export default function MaintenanceScreen() {
  const { site, contact } = useSiteSettings();

  useEffect(() => {
    document.title = `${site.siteName} — Back Soon`;
  }, [site.siteName]);

  return (
    <section className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-5 text-center">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 50% 45% at 50% 50%, rgba(184,150,62,0.12), transparent 70%)",
        }}
      />
      <div className="relative">
        <span
          className="animate-float-slow inline-block font-serif text-6xl text-gold/60"
          aria-hidden
        >
          ☾
        </span>
        <h1 className="heading-serif mt-6 text-5xl text-cream md:text-7xl">
          A quiet spell of <span className="italic text-gold-gradient">maintenance.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl font-serif text-2xl italic text-cream/60">
          The site is resting for a moment while we work backstage — back very soon.
        </p>
        {contact.contactEmail !== "" && (
          <p className="mt-10 font-sans text-[13px] text-cream/40">
            Need us meanwhile?{" "}
            <a
              href={`mailto:${contact.contactEmail}`}
              className="text-gold transition-colors hover:text-gold-light"
            >
              {contact.contactEmail}
            </a>
          </p>
        )}
      </div>
    </section>
  );
}

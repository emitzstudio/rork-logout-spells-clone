import { ArrowRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import RequestSpotDialog from "@/components/spell/RequestSpotDialog";
import Page from "@/components/site/Layout";
import LoadError from "@/components/site/LoadError";
import SpellHero from "@/components/spell/SpellHero";
import StarboyExperience from "@/components/spell/StarboyExperience";
import {
  BookingStrip,
  SpellAbout,
  SpellAudience,
  SpellFaqs,
  SpellFinalCta,
  SpellGallery,
  SpellHost,
  SpellInclusions,
  SpellJourney,
  SpellPricing,
  SpellQuickInfo,
  SpellStay,
  SpellTripHighlights,
} from "@/components/spell/SpellSections";
import { useAccount } from "@/data/account/AccountProvider";
import { draftFromSpell } from "@/data/builder";
import type { SpellDraft } from "@/data/builder";
import { isPublic, useSpellStore } from "@/data/spellStore";
import { isUuid, supabase } from "@/integrations/supabase/client";
import { breadcrumbJsonLd, tripJsonLd } from "@/lib/seo";

/**
 * The public Spell page - rendered dynamically from the local CMS at full,
 * natural editorial scale. Every request CTA opens the spell's saved form directly.
 */
/** Spell ids whose view was already counted this session. */
const viewedSpellIds = new Set<string>();

export default function SpellPage() {
  const { slug } = useParams<{ slug: string }>();
  const { getBySlug, ready, failed, retry } = useSpellStore();
  const { recordSpellView } = useAccount();

  const [requestedSpellId, setRequestedSpellId] = useState<string | null>(null);

  const spell = slug ? getBySlug(slug) : undefined;
  const visible = spell !== undefined && isPublic(spell);
  const visibleSlug = visible && spell !== undefined ? spell.slug : null;

  // Signed-in travellers quietly collect "recently viewed" spells here.
  useEffect(() => {
    if (visibleSlug !== null) recordSpellView(visibleSlug);
  }, [visibleSlug, recordSpellView]);

  // Public page views bump the real counter - once per spell per session.
  const spellDbId = spell !== undefined && visible && isUuid(spell.id) ? spell.id : null;
  useEffect(() => {
    if (spellDbId !== null && !viewedSpellIds.has(spellDbId)) {
      viewedSpellIds.add(spellDbId);
      void supabase.rpc("increment_spell_views", { _spell_id: spellDbId });
    }
  }, [spellDbId]);

  const draft = useMemo<SpellDraft | null>(() => {
    if (!spell || !visible) return null;
    return spell.draft ?? draftFromSpell(spell);
  }, [spell, visible]);

  if (!ready && !failed && !spell) {
    return (
      <Page title="Live Spell">
        <section className="grid min-h-[100svh] place-items-center" aria-busy>
          <span aria-hidden className="h-9 w-9 animate-spin rounded-full border-2 border-gold/20 border-t-gold" />
        </section>
      </Page>
    );
  }
  /* A failed read is NOT a faded spell - shared links deserve a retry (M10). */
  if (!spell && failed) {
    return (
      <Page title="Live Spell">
        <section className="flex min-h-[100svh] items-center justify-center px-5">
          <LoadError message="This spell couldn't be reached." onRetry={retry} className="w-full max-w-xl" />
        </section>
      </Page>
    );
  }
  if (!spell || !visible || !draft) return <SpellNotFound />;

  /* Search snippet + structured data built from the spell's real fields only. */
  const days = spell.durationDays > 0 ? `${spell.durationDays}-day ` : "";
  const where = spell.location.trim() !== "" ? ` in ${spell.location}` : "";
  const tripType = spell.host.name.trim() !== "" && spell.seatsTotal > 0 ? "creator-led small-group trip" : "trip";
  const seoDescription = `${spell.name} is a ${days}${tripType}${where}. ${spell.hook}`.trim();
  const heroImage = draft.hero?.url ?? draft.mobileHero?.url ?? (spell.image !== "" ? spell.image : null);

  const seatsLeft = Math.max(0, spell.seatsTotal - spell.seatsBooked);
  const openBooking = (): void => setRequestedSpellId(spell.id);

  return (
    /* SpellHero carries the back orb inside its badge row - no second orb (M11.5). */
    <Page
      title={spell.location.trim() !== "" ? `${spell.name} · ${spell.location}` : spell.name}
      description={seoDescription}
      image={heroImage ?? undefined}
      canonicalPath={`/live/${spell.slug}`}
      jsonLd={[
        tripJsonLd({
          name: spell.name,
          description: spell.hook.trim() !== "" ? spell.hook : seoDescription,
          path: `/live/${spell.slug}`,
          image: heroImage,
          location: spell.location,
          priceInr: spell.price,
          seatsTotal: spell.seatsTotal,
          soldOut: spell.status === "soldout",
        }),
        breadcrumbJsonLd([
          { name: "Live Spells", path: "/live" },
          { name: spell.name, path: `/live/${spell.slug}` },
        ]),
      ]}
      back={false}
      theme={spell.slug === "the-starboy-spell" ? "starboy" : undefined}
    >
      {spell.slug === "the-starboy-spell" ? (
        <StarboyExperience draft={draft} onBook={openBooking} />
      ) : <>
      <SpellHero draft={draft} seatsLeft={seatsLeft} onBook={openBooking} />
      <BookingStrip draft={draft} seatsLeft={seatsLeft} onBook={openBooking} />
      <SpellAbout draft={draft} />
      <SpellQuickInfo draft={draft} />
      <SpellHost draft={draft} />
      <SpellJourney draft={draft} />
      <SpellGallery draft={draft} />
      <SpellTripHighlights draft={draft} />
      <SpellStay draft={draft} />
      <SpellPricing draft={draft} onBook={openBooking} />
      <SpellInclusions draft={draft} />
      <SpellAudience draft={draft} />
      <SpellFaqs draft={draft} />
      <SpellFinalCta onBook={openBooking} />
      </>}

      <RequestSpotDialog
        key={spell.id}
        open={requestedSpellId === spell.id}
        spell={spell}
        onClose={() => setRequestedSpellId(null)}
      />
    </Page>
  );
}

/* -------------------------------- Not found -------------------------------- */

/** Shown when the slug is unknown - or the spell is a draft / archived. */
function SpellNotFound() {
  return (
    <Page title="Spell Not Found" noindex>
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
          <span className="animate-float-slow font-serif text-6xl text-gold/60" aria-hidden>
            ☾
          </span>
          <h1 className="heading-serif mt-6 text-5xl text-cream md:text-7xl">
            This spell has <span className="italic text-gold-gradient">faded.</span>
          </h1>
          <p className="mt-5 font-serif text-2xl italic text-cream/60">
            It may be resting as a draft, or it was never cast at all.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/discover" className="btn-gold">
              Discover Your Spell <ArrowRight size={16} />
            </Link>
            <Link to="/" className="btn-ghost-gold">
              Return Somewhere Real
            </Link>
          </div>
        </div>
      </section>
    </Page>
  );
}

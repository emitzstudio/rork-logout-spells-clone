import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import type { AnswerMap } from "@/components/dashboard/forms/FormRenderer";
import RequestSpotDialog from "@/components/spell/RequestSpotDialog";
import Page from "@/components/site/Layout";
import LoadError from "@/components/site/LoadError";
import SpellBatches from "@/components/spell/SpellBatches";
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
import { batchOptionLabel, batchQuestionOf, batchWindow, fetchSpellBatches, hasBatchChoice } from "@/data/batches";
import type { SpellBatch } from "@/data/batches";
import { concertThemeFor } from "@/data/concertThemes";
import { draftFromSpell } from "@/data/builder";
import type { SpellDraft } from "@/data/builder";
import { useFormStore } from "@/data/formStore";
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
  const { getFormById } = useFormStore();

  const [requestedSpellId, setRequestedSpellId] = useState<string | null>(null);
  /** The batch the visitor picked on the page - pre-filled in the request form, still editable there. */
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

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

  /* Batches (2026-10-01): a spell with two or more scheduled departures lets the visitor choose one. */
  const batchesQuery = useQuery({
    queryKey: ["spell-batches", spellDbId ?? ""],
    queryFn: () => fetchSpellBatches(spellDbId ?? ""),
    enabled: spellDbId !== null,
    staleTime: 30_000,
  });
  const batches: SpellBatch[] = useMemo(() => batchesQuery.data ?? [], [batchesQuery.data]);
  const batchChoice = hasBatchChoice(batches);
  const selectedBatch = batches.find((batch) => batch.id === selectedBatchId) ?? null;
  const requestForm = spell?.formId ? getFormById(spell.formId) : undefined;
  const batchAnswers = useMemo<AnswerMap | undefined>(() => {
    if (selectedBatch === null || requestForm === undefined) return undefined;
    const question = batchQuestionOf(requestForm);
    if (question === undefined) return undefined;
    const label = batchOptionLabel(question, selectedBatch);
    return label === undefined ? undefined : { [question.id]: label };
  }, [selectedBatch, requestForm]);

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
  /* Concert-poster spells (The Blinding Nights Spell, The Hong Kong × Macau Spell) use their own presentation. */
  const concertTheme = concertThemeFor(spell.slug);
  /* With several batches the hero and strip speak for the whole window; the picked batch takes over. */
  const pageDraft: SpellDraft = batchChoice
    ? {
        ...draft,
        dates: selectedBatch !== null ? selectedBatch.label : batchWindow(batches),
        maxSeats: selectedBatch !== null ? selectedBatch.seatsTotal : 0,
      }
    : draft;
  const pageSeatsLeft = batchChoice ? (selectedBatch !== null ? Math.max(0, selectedBatch.seatsTotal - selectedBatch.seatsBooked) : null) : seatsLeft;

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
      theme={concertTheme?.id}
    >
      {concertTheme !== undefined ? (
        <StarboyExperience draft={draft} onBook={openBooking} theme={concertTheme} />
      ) : <>
      <SpellHero draft={pageDraft} seatsLeft={pageSeatsLeft} onBook={openBooking} />
      <BookingStrip draft={pageDraft} seatsLeft={pageSeatsLeft} onBook={openBooking} />
      <SpellBatches draft={draft} batches={batches} selectedId={selectedBatchId} onSelect={setSelectedBatchId} onBook={openBooking} />
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
        key={`${spell.id}:${selectedBatchId ?? ""}`}
        open={requestedSpellId === spell.id}
        spell={spell}
        initialAnswers={batchAnswers}
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

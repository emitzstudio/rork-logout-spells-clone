import seedSql from "../../../backend/migrations/0069_archive_reviews.sql?raw";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ReviewCard } from "@/components/site/ReviewCard";
import { isRated, provenanceLine, ratingSummary, reviewSource } from "@/data/reviews";
import type { SpellReview } from "@/data/reviews";
import { mapReview } from "@/integrations/supabase/mappers";
import type { ReviewRow } from "@/integrations/supabase/mappers";

vi.mock("@/integrations/supabase/client", () => ({ isUuid: () => true, supabase: {} }));

interface SeedEntry {
  slug: string;
  author: string;
  rating: number;
  source: "google" | "whatsapp";
  body: string;
}

const seed = JSON.parse(seedSql.split("$reviews$")[1]) as SeedEntry[];
const forSlug = (slug: string): SeedEntry[] => seed.filter((entry) => entry.slug === slug);

const rowFor = (entry: SeedEntry, index: number, overrides: Partial<ReviewRow> = {}): ReviewRow => ({
  id: `review-${index}`,
  previous_spell_id: entry.slug,
  author_id: null,
  author_name: entry.author,
  author_avatar: "",
  rating: entry.rating,
  title: "",
  body: entry.body,
  travelled_on: "August 2026",
  verified: false,
  status: "approved",
  booking_id: null,
  spell_id: null,
  invitation_id: null,
  collection_id: null,
  consent_to_publish: true,
  answers: null,
  source: entry.source,
  created_at: "2026-09-11T00:00:00Z",
  updated_at: "2026-09-11T00:00:00Z",
  ...overrides,
});

const reviewsFor = (slug: string): SpellReview[] => forSlug(slug).map((entry, index) => mapReview(rowFor(entry, index)));

describe("archive reviews seed (0069)", () => {
  it("publishes every supplied voice on the journey it belongs to, exactly as collected", () => {
    expect(seed).toHaveLength(20);
    expect(forSlug("shubhangis-bir-spell")).toHaveLength(5);
    expect(forSlug("meghas-storytelling-spell")).toHaveLength(4);
    expect(forSlug("all-girls-spell-to-bir")).toHaveLength(5);
    expect(forSlug("udaipur-spell-with-anshika")).toHaveLength(6);
    for (const entry of seed) {
      /* Google reviewers gave five stars each; trip-group messages carry no rating at all. */
      expect(entry.rating).toBe(entry.source === "google" ? 5 : 0);
      expect(entry.body.trim().length).toBeGreaterThan(20);
      expect(entry.body).not.toMatch(/[—–@]/);
      expect(entry.body).not.toMatch(/[0-9]{5,}/);
      expect(entry.author).not.toMatch(/[0-9@~]/);
    }
    const udaipurAuthors = forSlug("udaipur-spell-with-anshika").map((entry) => entry.author);
    expect(udaipurAuthors).toEqual(["Lahek", "Shitiz", "Ankush", "Riya", "Arpita", "Mehak"]);
    for (const team of ["Anshika", "Piyush", "Sameer", "Vidushi"]) expect(udaipurAuthors).not.toContain(team);
    expect(forSlug("udaipur-spell-with-anshika").every((entry) => entry.source === "whatsapp")).toBe(true);
    expect(seed.filter((entry) => entry.slug !== "udaipur-spell-with-anshika").every((entry) => entry.source === "google")).toBe(true);
    expect(new Set(seed.map((entry) => `${entry.slug}:${entry.author}`)).size).toBe(20);
    expect(forSlug("shubhangis-bir-spell")[0].body).toContain("Paragliding adventure, Waterfall trek, Game Night");
  });

  it("averages only the reviews that carry stars, so trip-group words never read as one star", () => {
    const udaipur = ratingSummary(reviewsFor("udaipur-spell-with-anshika"));
    expect(udaipur).toEqual({ average: 0, rated: 0, total: 6, distribution: [0, 0, 0, 0, 0] });

    const bir = ratingSummary(reviewsFor("shubhangis-bir-spell"));
    expect(bir).toEqual({ average: 5, rated: 5, total: 5, distribution: [0, 0, 0, 0, 5] });

    const mixed = ratingSummary([...reviewsFor("meghas-storytelling-spell"), ...reviewsFor("udaipur-spell-with-anshika")]);
    expect(mixed.average).toBe(5);
    expect(mixed.rated).toBe(4);
    expect(mixed.total).toBe(10);
    expect(reviewsFor("udaipur-spell-with-anshika").some(isRated)).toBe(false);
  });

  it("says where the words came from and treats unknown sources as direct submissions", () => {
    expect(provenanceLine(reviewsFor("udaipur-spell-with-anshika"))).toBe("6 messages from the trip's WhatsApp group");
    expect(provenanceLine(reviewsFor("shubhangis-bir-spell"))).toBe("5 Google reviews");
    expect(provenanceLine([...reviewsFor("meghas-storytelling-spell").slice(0, 1), ...reviewsFor("udaipur-spell-with-anshika").slice(0, 1)])).toBe(
      "1 Google review · 1 message from the trip's WhatsApp group",
    );
    expect(provenanceLine([])).toBe("");
    expect(reviewSource("google")).toBe("google");
    expect(reviewSource("something-else")).toBe("logout_spells");
    expect(mapReview(rowFor(seed[0], 0, { source: "logout_spells", verified: true })).source).toBe("logout_spells");
  });

  it("renders Google words with their stars, trip-group words without any, and labels both", () => {
    const google = renderToStaticMarkup(createElement(ReviewCard, { review: reviewsFor("shubhangis-bir-spell")[0] }));
    expect(google).toContain('aria-label="Rated 5 out of 5"');
    expect(google).toContain("Google review");
    expect(google).toContain("Pranav Bhagwat");
    expect(google).not.toContain("Verified traveller");

    const whatsapp = renderToStaticMarkup(createElement(ReviewCard, { review: reviewsFor("udaipur-spell-with-anshika")[0] }));
    expect(whatsapp).not.toContain('role="img"');
    expect(whatsapp).toContain("From the trip&#x27;s WhatsApp group");
    expect(whatsapp).toContain("Lahek");

    const direct = renderToStaticMarkup(
      createElement(ReviewCard, { review: mapReview(rowFor(seed[0], 0, { source: "logout_spells", verified: true, title: "Strangers to family" })) }),
    );
    expect(direct).toContain("Verified traveller");
    expect(direct).toContain("Strangers to family");
    expect(direct).not.toMatch(/Google review|WhatsApp group/);
  });
});

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import packagesJson from "@/data/starboyPackages.json";
import { packageCardsSchema } from "@/data/packageCards";
import { createEmptyDraft } from "@/data/builder";
import { pageFromDraft, mapSpell, type SpellRow } from "@/integrations/supabase/mappers";
import StarboyPackages from "@/components/spell/StarboyPackages";
import StarboyExperience from "@/components/spell/StarboyExperience";
import { STARBOY_BROCHURE_URL } from "@/data/starboyBrochure";
import { STARBOY_PACKAGE_BROCHURES } from "@/data/starboyPackageBrochures";
import sql from "../../../backend/migrations/0091_starboy_three_packages.sql?raw";
import flightSql from "../../../backend/migrations/0096_starboy_outbound_flight_excluded.sql?raw";
import dragSql from "../../../backend/migrations/0105_blinding_nights_drag_tickets_included.sql?raw";

const packages = packageCardsSchema.parse(packagesJson);
const draft = {
  ...createEmptyDraft(),
  slug: "the-starboy-spell",
  name: "The Blinding Nights Spell",
  pricing: { tiers: [], remainingNote: "", taxNote: "", note: "", brochureUrl: STARBOY_BROCHURE_URL, packages },
};
const html = renderToStaticMarkup(createElement(StarboyPackages, { packages, draft, onBook: () => {} }));
const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

describe("Starboy three package comparison", () => {
  it("preserves the supplied prices, dates, durations and order", () => {
    expect(packages.map(({ name, earlyBird, regular, dates, duration, location }) => [name, earlyBird, regular, dates, duration, location])).toEqual([
      ["XO", 80000, 85000, "11–14 October", "4 Days / 3 Nights", "Bangkok"],
      ["STARBOY", 140000, 150000, "11–17 October", "7 Days / 6 Nights", "Bangkok + Phuket"],
      ["TIMELESS", 190000, 200000, "11–17 October", "7 Days / 6 Nights", "Bangkok + Phuket"],
    ]);
    expect(packages.map((p) => [p.included.length, p.excluded.length])).toEqual([[6, 4], [12, 5], [16, 2]]);
    expect(html).toContain("grid-cols-1");
    expect(html).toContain("lg:grid-cols-3");
    expect(html.indexOf('data-package="xo"')).toBeLessThan(html.indexOf('data-package="starboy"'));
    expect(html.indexOf('data-package="starboy"')).toBeLessThan(html.indexOf('data-package="timeless"'));
  });

  it("renders every supplied item verbatim with included before optional/excluded and no icons", () => {
    const articles = html.match(/<article[\s\S]*?<\/article>/g) ?? [];
    expect(articles).toHaveLength(3);
    packages.forEach((p, index) => {
      const card = articles[index];
      const positions = [p.name, `₹${p.earlyBird.toLocaleString("en-IN")}`, `₹${p.regular.toLocaleString("en-IN")}`, p.dates, p.duration, p.location, ">INCLUDED</h4>", `>${p.excludedHeading}</h4>`].map((text) => card.indexOf(text));
      expect(positions.every((value) => value >= 0)).toBe(true);
      expect(positions).toEqual([...positions].sort((a, b) => a - b));
      for (const item of [...p.included, ...p.excluded]) {
        expect(card).toContain(escape(item.title));
        if (item.detail) expect(card).toContain(escape(item.detail));
      }
      expect(card).not.toContain("<svg");
      expect(card.match(/<li>/g)).toHaveLength(p.included.length + p.excluded.length);
    });
    expect(html).not.toMatch(/cooking|deposit|Booking amount|GST|TCS|all activities|Most popular/i);
  });

  it("keeps the flight directions and premium-only experiences unambiguous", () => {
    expect(packages[0].included.some((i) => /flight|Phuket|Visa|Insurance|ATV/.test(i.title))).toBe(false);
    expect(packages[1].included.some((i) => /International Flight/.test(i.title))).toBe(false);
    expect(packages[1].excluded[0]).toEqual({ title: "International Flight", detail: "India → Bangkok" });
    expect(packages[1].excluded[1].detail).toBe("Phuket → India not included");
    expect(packages[1].included.find((i) => i.title === "Internal Flight")?.detail).toBe("Bangkok → Phuket");
    const starboyCard = (html.match(/<article[\s\S]*?<\/article>/g) ?? [])[1];
    expect(starboyCard.indexOf("International Flight")).toBeGreaterThan(starboyCard.indexOf(">NOT INCLUDED / OPTIONAL</h4>"));
    expect(packages[2].included.find((i) => i.title === "International Flights")?.detail).toBe("India → Bangkok\nPhuket → India");
    for (const text of ["ATV Ride", "Visa", "Travel Insurance", "Premium Traditional Thai Massage", "Premium The Weeknd Concert Tickets"]) {
      expect(packages[2].included.some((i) => i.title === text)).toBe(true);
      expect(packages[1].included.some((i) => i.title === text)).toBe(false);
    }
    expect(packages[2].excluded.map((i) => i.title)).toEqual(["Meals Not Specifically Mentioned", "Alcoholic Beverages"]);
  });

  it("replaces the old shared lists without changing the hero, navigation or CTA", () => {
    const live = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(StarboyExperience, { draft, onBook: () => {} })));
    const legacy = { ...draft, pricing: { ...draft.pricing, packages: undefined } };
    const old = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(StarboyExperience, { draft: legacy, onBook: () => {} })));
    // Only the download action changes in the hero: a package chooser replaces the shared PDF.
    const withoutDownload = (markup: string) => markup.split('id="price"')[0].replace(/<(a|button)\b[^>]*>(?:(?!<\/(?:a|button)>)[\s\S])*?Download itinerary \(PDF\)(?:(?!<\/(?:a|button)>)[\s\S])*?<\/\1>/, "DOWNLOAD");
    expect(withoutDownload(live)).toBe(withoutDownload(old));
    expect(live).not.toMatch(/Marked included|Optional \/ not included/);
    expect(live.match(/data-package=/g)).toHaveLength(3);
    expect(live.match(/Request your spot/g)).toHaveLength(3);
    expect(live).not.toContain(STARBOY_BROCHURE_URL);
    expect([...live.matchAll(/href="([^"]+\.pdf)"/g)].map((match) => match[1])).toEqual(Object.values(STARBOY_PACKAGE_BROCHURES));
    expect(live.match(/aria-haspopup="menu"/g)).toHaveLength(3);
  });

  it("round-trips package details in saved CMS pricing and rejects malformed packages", () => {
    const row = { id: "test", slug: draft.slug, name: draft.name, category: "celebration", status: "published", hook: "", hero_as_cover: true, hero_url: "", cover_url: "", mobile_hero_url: "", price_minor: 12000000, host_name: "", created_at: "2026-09-14", page: pageFromDraft(draft) } as unknown as SpellRow;
    const restored = mapSpell(row, undefined, []).draft!;
    expect(restored.pricing?.packages).toEqual(packages);
    expect(pageFromDraft(restored).pricing).toEqual(draft.pricing);
    expect(restored.pricing?.brochureUrl).toBe(STARBOY_BROCHURE_URL);
    expect(packageCardsSchema.safeParse([{ ...packages[0], included: "invalid" }]).success).toBe(false);
    expect(packageCardsSchema.safeParse([packages[0], packages[0]]).success).toBe(false);
  });

  it("publishes the exact same cards with a guarded page-only migration", () => {
    const original = packageCardsSchema.parse(JSON.parse(sql.split("$cards$")[1]));
    const flight = JSON.parse(flightSql.split("$flight$")[1]);
    const revised = original.map((p) => p.id !== "starboy" ? p : {
      ...p,
      included: p.included.filter((item) => item.title !== flight.title),
      excluded: [flight, ...p.excluded],
    });
    const dragTickets = { title: "Drag Show / Art Museum Tickets" };
    const withDrag = revised.map((p) => p.id === "timeless" ? p : {
      ...p,
      included: [...p.included, dragTickets],
      excluded: p.excluded.filter((item) => item.title !== dragTickets.title),
    });
    // 0110 moved the departure two days later; only the date labels differ from the reviewed cards.
    const shifted = withDrag.map((p) => ({ ...p, dates: p.id === "xo" ? "11–14 October" : "11–17 October" }));
    expect(withDrag.map((p) => p.dates)).toEqual(["9–12 October", "9–15 October", "9–15 October"]);
    expect(shifted).toEqual(packages);
    expect(flightSql).toContain("2026-09-14T12:24:57.698041+00:00");
    expect(flightSql).toContain("update public.spells set page = v_page where id = v_id");
    expect(flightSql).toContain("India → Bangkok and Phuket → India international flights are not included.");
    expect(flightSql).toContain("v_protected is distinct from v_after_protected");
    expect(flightSql).not.toMatch(/\b(?:alter table|drop table|delete from|truncate|create policy)\b/i);
    expect(dragSql).toContain("2026-09-15T08:17:32.660183+00:00");
    expect(dragSql).toContain("update public.spells set page = v_page where id = v_id");
    expect(dragSql).toContain("v_protected is distinct from v_after_protected");
    expect(dragSql).toContain("Grimoire-v14.pdf");
    expect(dragSql).not.toMatch(/\b(?:alter table|drop table|delete from|truncate|create policy)\b/i);
    expect(sql).toContain("2026-09-14T08:08:49.233689+00:00");
    expect(sql).toContain("update public.spells set page = v_page where id = v_id");
    expect(sql).toContain("v_protected is distinct from v_after_protected");
    expect(sql).toContain("Removed activity remains in Starboy page");
    expect(sql).not.toMatch(/\b(?:alter table|drop table|delete from|truncate|create policy)\b/i);
    expect(sql).not.toContain("the-halloween-spell");
  });
});

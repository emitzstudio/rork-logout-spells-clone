/**
 * The Spellcaster section is optional: an empty host publishes fine (the
 * public page skips the section), a half-filled host blocks publish until the
 * four card essentials are done, and no fake fallback host ("Vidushi") is ever
 * invented for hostless spells.
 */
import { describe, expect, it } from "vitest";

import { createEmptyDraft, hostHasContent, sectionStates } from "@/data/builder";
import type { SpellDraft } from "@/data/builder";
import { incompleteSections, spellFromDraft } from "@/data/publish";

const draftWithHost = (host: Partial<SpellDraft["host"]>): SpellDraft => {
  const draft = createEmptyDraft();
  draft.host = { ...draft.host, ...host };
  return draft;
};

describe("optional spell caster - section state", () => {
  it("an empty host section counts as ready (skippable)", () => {
    const state = sectionStates(createEmptyDraft()).host;
    expect(state.complete).toBe(true);
    expect(state.summary).toContain("Optional");
  });

  it("a half-filled host is incomplete until the four essentials are done", () => {
    const state = sectionStates(draftWithHost({ name: "Maya" })).host;
    expect(state.complete).toBe(false);
    expect(state.summary).toBe("1 of 4 required");
  });

  it("tags alone count as content, so the essentials become required", () => {
    const state = sectionStates(draftWithHost({ tags: ["Chai rituals"] })).host;
    expect(state.complete).toBe(false);
  });

  it("a fully-built host card is ready", () => {
    const state = sectionStates(
      draftWithHost({
        name: "Maya Sharma",
        title: "Your Mountain Host",
        about: "Born three ridges away.",
        image: { id: "img", url: "https://example.com/maya.jpg", name: "Maya", isLocal: false },
      }),
    ).host;
    expect(state.complete).toBe(true);
  });
});

describe("optional spell caster - publish gating", () => {
  it("an empty host never blocks publish; other sections still do", () => {
    const missing = incompleteSections(createEmptyDraft());
    expect(missing).not.toContain("host");
    expect(missing).toContain("basic");
  });

  it("a half-filled host blocks publish until finished or cleared", () => {
    expect(incompleteSections(draftWithHost({ name: "Maya" }))).toContain("host");
  });
});

describe("optional spell caster - record building", () => {
  it("hostless spells stay hostless - no invented fallback host", () => {
    const record = spellFromDraft({
      draft: createEmptyDraft(),
      slug: "test-spell",
      status: "draft",
      existing: null,
    });
    expect(record.host.name).toBe("");
    expect(record.host.role).toBe("");
    expect(record.host.initial).toBe("");
  });

  it("a named host carries through untouched", () => {
    const record = spellFromDraft({
      draft: draftWithHost({ name: "maya sharma", title: "Your Mountain Host" }),
      slug: "test-spell",
      status: "draft",
      existing: null,
    });
    expect(record.host.name).toBe("maya sharma");
    expect(record.host.initial).toBe("M");
    expect(record.host.role).toBe("Your Mountain Host");
  });

  it("an empty host section stays invisible on the public page", () => {
    expect(hostHasContent(createEmptyDraft())).toBe(false);
    expect(hostHasContent(draftWithHost({ quote: "Sit with the third cup." }))).toBe(true);
  });
});

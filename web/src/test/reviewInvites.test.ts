/**
 * M13 review collection rules — the client-side mirror of the server laws.
 * (The server-side enforcement itself is probed live in migrations 0025/0026.)
 */
import { describe, expect, it } from "vitest";

import {
  EMPTY_REVIEW_DRAFT,
  REVIEW_LIMITS,
  REVIEW_QUESTIONS,
  canPublishReview,
  collectionPhase,
  collectionStats,
  expiryFromDateInput,
  formatExpiryLabel,
  inviteErrorCode,
  inviteErrorCopy,
  inviteRowState,
  isExpired,
  looksLikeInviteToken,
  parseInviteLookup,
  reviewLinkPath,
  reviewLinkUrl,
  validateLinkCount,
  validateReviewDraft,
} from "@/data/reviewInvites";

const VALID_TOKEN = "a".repeat(32) + "0123456789abcdef0123456789abcdef";

const validDraft = {
  name: "Rahul Sharma",
  rating: 5,
  summary: "One of the most memorable journeys I've taken.",
  experience: "From the first circle to the last goodbye, everything felt real.",
  consent: true as boolean | null,
};

describe("review questions", () => {
  it("keeps the five questions verbatim", () => {
    expect(REVIEW_QUESTIONS.credit).toBe("Who should we credit this story to?");
    expect(REVIEW_QUESTIONS.rating).toBe("How would you rate your spell?");
    expect(REVIEW_QUESTIONS.summary).toBe("Sum up your spell in one line.");
    expect(REVIEW_QUESTIONS.experience).toBe("Tell us about your experience on this spell.");
    expect(REVIEW_QUESTIONS.consent).toBe("May we share your story with fellow travellers?");
  });
});

describe("token validation", () => {
  it("accepts a 64-char lowercase hex token", () => {
    expect(looksLikeInviteToken(VALID_TOKEN)).toBe(true);
  });

  it("rejects legacy/invalid shapes — short, uuid-with-dashes, non-hex, empty", () => {
    expect(looksLikeInviteToken("")).toBe(false);
    expect(looksLikeInviteToken("abc123")).toBe(false);
    expect(looksLikeInviteToken("a".repeat(63))).toBe(false);
    expect(looksLikeInviteToken("a".repeat(65))).toBe(false);
    expect(looksLikeInviteToken("g".repeat(64))).toBe(false);
    expect(looksLikeInviteToken("A".repeat(64))).toBe(false);
    expect(looksLikeInviteToken("123e4567-e89b-42d3-a456-426614174000123e4567-e89b-42d3-a456-42661417")).toBe(false);
  });

  it("builds the public link from the token only — no internal ids", () => {
    expect(reviewLinkPath(VALID_TOKEN)).toBe(`/review/${VALID_TOKEN}`);
    expect(reviewLinkUrl("https://logoutspells.com/", VALID_TOKEN)).toBe(
      `https://logoutspells.com/review/${VALID_TOKEN}`,
    );
  });
});

describe("lookup parsing", () => {
  it("narrows every legal state", () => {
    expect(parseInviteLookup({ state: "ok", spellName: "Meghalaya Wander", spellLocation: "Meghalaya", expiresAt: null }).state).toBe("ok");
    expect(parseInviteLookup({ state: "used", spellName: "X" }).state).toBe("used");
    expect(parseInviteLookup({ state: "expired", spellName: "X" }).state).toBe("expired");
    expect(parseInviteLookup({ state: "invalid" }).state).toBe("invalid");
  });

  it("THROWS on malformed payloads — a broken response is never a fake 'invalid link'", () => {
    expect(() => parseInviteLookup(null)).toThrow();
    expect(() => parseInviteLookup("nope")).toThrow();
    expect(() => parseInviteLookup({ state: "weird" })).toThrow();
  });
});

describe("draft validation (all five required)", () => {
  it("passes a complete draft and trims values", () => {
    const result = validateReviewDraft({ ...validDraft, name: "  Rahul Sharma  " });
    expect(result.ok).toBe(true);
    expect(result.clean.name).toBe("Rahul Sharma");
    expect(result.clean.consent).toBe(true);
  });

  it("requires every field", () => {
    const result = validateReviewDraft(EMPTY_REVIEW_DRAFT);
    expect(result.ok).toBe(false);
    expect(result.errors.name).toBeTruthy();
    expect(result.errors.rating).toBeTruthy();
    expect(result.errors.summary).toBeTruthy();
    expect(result.errors.experience).toBeTruthy();
    expect(result.errors.consent).toBeTruthy();
  });

  it("bounds the rating to 1–5 whole stars", () => {
    expect(validateReviewDraft({ ...validDraft, rating: 0 }).ok).toBe(false);
    expect(validateReviewDraft({ ...validDraft, rating: 6 }).ok).toBe(false);
    expect(validateReviewDraft({ ...validDraft, rating: 3.5 }).ok).toBe(false);
    expect(validateReviewDraft({ ...validDraft, rating: 1 }).ok).toBe(true);
    expect(validateReviewDraft({ ...validDraft, rating: 5 }).ok).toBe(true);
  });

  it("enforces the summary and experience limits", () => {
    expect(validateReviewDraft({ ...validDraft, summary: "x".repeat(REVIEW_LIMITS.summary + 1) }).ok).toBe(false);
    expect(validateReviewDraft({ ...validDraft, experience: "x".repeat(REVIEW_LIMITS.experience + 1) }).ok).toBe(false);
    expect(validateReviewDraft({ ...validDraft, name: "x".repeat(REVIEW_LIMITS.name + 1) }).ok).toBe(false);
  });

  it("consent must be answered EXPLICITLY — null fails, false passes and is stored as false", () => {
    expect(validateReviewDraft({ ...validDraft, consent: null }).ok).toBe(false);
    const declined = validateReviewDraft({ ...validDraft, consent: false });
    expect(declined.ok).toBe(true);
    expect(declined.clean.consent).toBe(false);
  });
});

describe("invitation states", () => {
  const now = new Date("2026-08-21T12:00:00Z");
  const past = "2026-08-20T00:00:00Z";
  const future = "2026-09-30T23:59:59Z";

  it("pending stays pending without expiry", () => {
    expect(inviteRowState("pending", null, now)).toBe("pending");
    expect(inviteRowState("pending", future, now)).toBe("pending");
  });

  it("expiry blocks pending links after the date", () => {
    expect(inviteRowState("pending", past, now)).toBe("expired");
    expect(isExpired(past, now)).toBe(true);
    expect(isExpired(future, now)).toBe(false);
    expect(isExpired(null, now)).toBe(false);
  });

  it("a USED link stays used even past expiry — submitted stories survive", () => {
    expect(inviteRowState("used", past, now)).toBe("used");
  });

  it("counts derive from the real invitation rows", () => {
    const invites = [{ status: "used" as const }, { status: "pending" as const }, { status: "pending" as const }];
    expect(collectionStats(invites)).toEqual({ total: 3, submitted: 1, pending: 2 });
    expect(collectionStats([])).toEqual({ total: 0, submitted: 0, pending: 0 });
  });

  it("derives the collection phase honestly", () => {
    const used = { status: "used" as const };
    const open = { status: "pending" as const };
    expect(collectionPhase([used, used], null, now)).toBe("complete");
    expect(collectionPhase([used, open], past, now)).toBe("expired");
    expect(collectionPhase([used, open], future, now)).toBe("open");
    expect(collectionPhase([], null, now)).toBe("open");
  });
});

describe("publishing gate", () => {
  const stored = {
    consentToPublish: true,
    authorName: "Rahul Sharma",
    rating: 5,
    body: "A journey I will not forget.",
  };

  it("allows publishing only with consent AND valid stored data", () => {
    expect(canPublishReview(stored)).toBe(true);
  });

  it("consent=false can NEVER publish", () => {
    expect(canPublishReview({ ...stored, consentToPublish: false })).toBe(false);
  });

  it("broken stored data cannot publish", () => {
    expect(canPublishReview({ ...stored, authorName: "  " })).toBe(false);
    expect(canPublishReview({ ...stored, body: "" })).toBe(false);
    expect(canPublishReview({ ...stored, rating: 0 })).toBe(false);
    expect(canPublishReview({ ...stored, rating: 9 })).toBe(false);
  });
});

describe("server error mapping", () => {
  it("maps every stable code from the message prefix", () => {
    expect(inviteErrorCode("review_link_used: this review link has already been used")).toBe("review_link_used");
    expect(inviteErrorCode("review_link_expired: …")).toBe("review_link_expired");
    expect(inviteErrorCode("review_link_invalid: …")).toBe("review_link_invalid");
    expect(inviteErrorCode("review_fields_invalid: …")).toBe("review_fields_invalid");
    expect(inviteErrorCode("review_consent_missing: …")).toBe("review_consent_missing");
    expect(inviteErrorCode("review_staff_only: …")).toBe("review_staff_only");
    expect(inviteErrorCode("network timeout")).toBe("unknown");
  });

  it("speaks the required sentences", () => {
    expect(inviteErrorCopy("review_link_used")).toBe("This review link has already been used.");
    expect(inviteErrorCopy("review_link_expired")).toBe("This review link has expired.");
    expect(inviteErrorCopy("review_link_invalid")).toBe("This review link is no longer available.");
  });
});

describe("link count + expiry inputs", () => {
  it("requires a positive whole number within server bounds", () => {
    expect(validateLinkCount("8")).toEqual({ ok: true, count: 8, error: "" });
    expect(validateLinkCount("1").ok).toBe(true);
    expect(validateLinkCount("200").ok).toBe(true);
    expect(validateLinkCount("").ok).toBe(false);
    expect(validateLinkCount("0").ok).toBe(false);
    expect(validateLinkCount("201").ok).toBe(false);
    expect(validateLinkCount("-3").ok).toBe(false);
    expect(validateLinkCount("3.5").ok).toBe(false);
    expect(validateLinkCount("eight").ok).toBe(false);
  });

  it("expiry becomes the END of the chosen day (links stop AFTER that date)", () => {
    const iso = expiryFromDateInput("2026-09-30");
    expect(iso).not.toBeNull();
    const end = new Date(iso ?? "");
    expect(end.getFullYear()).toBe(2026);
    expect(end.getMonth()).toBe(8);
    expect(end.getDate()).toBe(30);
    expect(end.getHours()).toBe(23);
    expect(expiryFromDateInput("")).toBeNull();
    expect(expiryFromDateInput("30-09-2026")).toBeNull();
  });

  it("labels expiry like the console — '30 Sept 2026' style day-month-year", () => {
    expect(formatExpiryLabel(null)).toBe("");
    expect(formatExpiryLabel("")).toBe("");
    const label = formatExpiryLabel(new Date(2026, 8, 30, 12).toISOString());
    expect(label).toContain("2026");
    expect(label).toContain("30");
  });
});

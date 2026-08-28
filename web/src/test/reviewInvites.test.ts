/**
 * Review link + allowance rules (V2) - the client-side mirror of the server
 * laws. The server-side enforcement itself lives in migration 0044 (atomic
 * counter, expiry, token validity) - these tests pin the pure client logic.
 */
import { describe, expect, it } from "vitest";

import {
  ALLOWANCE_MAX,
  canPublishReview,
  clampAllowance,
  collectionPhase,
  collectionStats,
  expiryFromDateInput,
  formatExpiryLabel,
  initialAllowance,
  inviteErrorCode,
  inviteErrorCopy,
  inviteErrorDetail,
  inviteRowState,
  isExpired,
  looksLikeReviewToken,
  parseReviewLinkLookup,
  reviewLinkPath,
  reviewLinkUrl,
  validateTravellerCount,
} from "@/data/reviewInvites";

const VALID_TOKEN = "a".repeat(32) + "0123456789abcdef0123456789abcdef";

describe("token validation", () => {
  it("accepts a 64-char lowercase hex token (shared and legacy alike)", () => {
    expect(looksLikeReviewToken(VALID_TOKEN)).toBe(true);
  });

  it("rejects invalid shapes - short, uuid-with-dashes, non-hex, empty", () => {
    expect(looksLikeReviewToken("")).toBe(false);
    expect(looksLikeReviewToken("abc123")).toBe(false);
    expect(looksLikeReviewToken("a".repeat(63))).toBe(false);
    expect(looksLikeReviewToken("a".repeat(65))).toBe(false);
    expect(looksLikeReviewToken("g".repeat(64))).toBe(false);
    expect(looksLikeReviewToken("A".repeat(64))).toBe(false);
  });

  it("builds the public link from the token only - no internal ids", () => {
    expect(reviewLinkPath(VALID_TOKEN)).toBe(`/review/${VALID_TOKEN}`);
    expect(reviewLinkUrl("https://logoutspells.com/", VALID_TOKEN)).toBe(
      `https://logoutspells.com/review/${VALID_TOKEN}`,
    );
  });
});

describe("allowance math", () => {
  it("a section for N travellers opens N + 1 review slots", () => {
    expect(initialAllowance(10)).toBe(11);
    expect(initialAllowance(5)).toBe(6);
    expect(initialAllowance(1)).toBe(2);
  });

  it("clamps stepper values to 0..ALLOWANCE_MAX whole numbers - never negative", () => {
    expect(clampAllowance(-1)).toBe(0);
    expect(clampAllowance(0)).toBe(0);
    expect(clampAllowance(11.6)).toBe(12);
    expect(clampAllowance(ALLOWANCE_MAX + 50)).toBe(ALLOWANCE_MAX);
    expect(clampAllowance(Number.NaN)).toBe(0);
  });

  it("requires a whole traveller count within server bounds", () => {
    expect(validateTravellerCount("10")).toEqual({ ok: true, count: 10, error: "" });
    expect(validateTravellerCount("1").ok).toBe(true);
    expect(validateTravellerCount("200").ok).toBe(true);
    expect(validateTravellerCount("").ok).toBe(false);
    expect(validateTravellerCount("0").ok).toBe(false);
    expect(validateTravellerCount("201").ok).toBe(false);
    expect(validateTravellerCount("-3").ok).toBe(false);
    expect(validateTravellerCount("3.5").ok).toBe(false);
    expect(validateTravellerCount("ten").ok).toBe(false);
  });
});

describe("collection phase (allowance + expiry)", () => {
  const now = new Date("2026-08-21T12:00:00Z");
  const past = "2026-08-20T00:00:00Z";
  const future = "2026-09-30T23:59:59Z";

  it("open while slots remain and the date has not passed", () => {
    expect(collectionPhase(11, null, now)).toBe("open");
    expect(collectionPhase(1, future, now)).toBe("open");
  });

  it("complete the moment the allowance reaches 0 - whichever came first", () => {
    expect(collectionPhase(0, null, now)).toBe("complete");
    expect(collectionPhase(0, future, now)).toBe("complete");
    expect(collectionPhase(0, past, now)).toBe("complete");
  });

  it("expired when the date passes with slots unused", () => {
    expect(collectionPhase(4, past, now)).toBe("expired");
  });

  it("expiry helper reads honestly", () => {
    expect(isExpired(past, now)).toBe(true);
    expect(isExpired(future, now)).toBe(false);
    expect(isExpired(null, now)).toBe(false);
  });
});

describe("legacy invitation rows", () => {
  const now = new Date("2026-08-21T12:00:00Z");
  const past = "2026-08-20T00:00:00Z";
  const future = "2026-09-30T23:59:59Z";

  it("pending stays pending while the pool is open", () => {
    expect(inviteRowState("pending", null, 3, now)).toBe("pending");
    expect(inviteRowState("pending", future, 1, now)).toBe("pending");
  });

  it("an exhausted pool expires unused legacy links too", () => {
    expect(inviteRowState("pending", null, 0, now)).toBe("expired");
  });

  it("the date expires unused links; USED links stay used forever", () => {
    expect(inviteRowState("pending", past, 3, now)).toBe("expired");
    expect(inviteRowState("used", past, 0, now)).toBe("used");
  });

  it("counts derive from the real invitation rows", () => {
    const invites = [{ status: "used" as const }, { status: "pending" as const }, { status: "pending" as const }];
    expect(collectionStats(invites)).toEqual({ total: 3, submitted: 1, pending: 2 });
    expect(collectionStats([])).toEqual({ total: 0, submitted: 0, pending: 0 });
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

  it("broken or not-asked stored data cannot publish", () => {
    expect(canPublishReview({ ...stored, authorName: "  " })).toBe(false);
    expect(canPublishReview({ ...stored, body: "" })).toBe(false);
    /* rating 0 = the rating question was switched off for that submission. */
    expect(canPublishReview({ ...stored, rating: 0 })).toBe(false);
    expect(canPublishReview({ ...stored, rating: 9 })).toBe(false);
  });
});

describe("lookup parsing", () => {
  it("narrows every legal state and both link modes", () => {
    const ok = parseReviewLinkLookup({
      state: "ok",
      mode: "shared",
      spellName: "The Ziro Spell",
      spellLocation: "Ziro Valley",
      expiresAt: null,
      questions: [
        {
          id: "q_credit",
          kind: "credit",
          type: "short_text",
          title: "Who should we credit this story to?",
          helper: "",
          placeholder: "Your name",
          required: true,
          options: [],
          ratingStyle: "star5",
        },
      ],
    });
    expect(ok.state).toBe("ok");
    expect(ok.mode).toBe("shared");
    expect(ok.questions).toHaveLength(1);
    expect(ok.questions[0].kind).toBe("credit");

    expect(parseReviewLinkLookup({ state: "used", spellName: "X" }).state).toBe("used");
    expect(parseReviewLinkLookup({ state: "expired", spellName: "X" }).state).toBe("expired");
    expect(parseReviewLinkLookup({ state: "invalid" }).state).toBe("invalid");
    expect(parseReviewLinkLookup({ state: "ok", mode: "personal", questions: [] }).mode).toBe("personal");
  });

  it("THROWS on malformed payloads - a broken response is never a fake 'invalid link'", () => {
    expect(() => parseReviewLinkLookup(null)).toThrow();
    expect(() => parseReviewLinkLookup("nope")).toThrow();
    expect(() => parseReviewLinkLookup({ state: "weird" })).toThrow();
  });
});

describe("server error mapping", () => {
  it("maps every stable code from the message prefix", () => {
    expect(inviteErrorCode("review_link_used: already told")).toBe("review_link_used");
    expect(inviteErrorCode("review_link_expired: …")).toBe("review_link_expired");
    expect(inviteErrorCode("review_link_invalid: …")).toBe("review_link_invalid");
    expect(inviteErrorCode("review_fields_invalid: …")).toBe("review_fields_invalid");
    expect(inviteErrorCode("review_consent_missing: …")).toBe("review_consent_missing");
    expect(inviteErrorCode("review_incomplete: …")).toBe("review_incomplete");
    expect(inviteErrorCode("review_questions_invalid: …")).toBe("review_questions_invalid");
    expect(inviteErrorCode("review_allowance_invalid: …")).toBe("review_allowance_invalid");
    expect(inviteErrorCode("review_collection_missing: …")).toBe("review_collection_missing");
    expect(inviteErrorCode("review_staff_only: …")).toBe("review_staff_only");
    expect(inviteErrorCode("network timeout")).toBe("unknown");
  });

  it("speaks the required sentences", () => {
    expect(inviteErrorCopy("review_link_used")).toBe("This review link has already been used.");
    expect(inviteErrorCopy("review_link_expired")).toBe("This review link has expired.");
    expect(inviteErrorCopy("review_link_invalid")).toBe("This review link is no longer available.");
  });

  it("surfaces the server's specific sentence when it matters", () => {
    expect(inviteErrorDetail("review_questions_invalid: choice questions need at least 2 options")).toBe(
      "choice questions need at least 2 options",
    );
    expect(inviteErrorDetail("no prefix here")).toBe("");
  });
});

describe("expiry inputs", () => {
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

  it("labels expiry like the console - day-month-year", () => {
    expect(formatExpiryLabel(null)).toBe("");
    expect(formatExpiryLabel("")).toBe("");
    const label = formatExpiryLabel(new Date(2026, 8, 30, 12).toISOString());
    expect(label).toContain("2026");
    expect(label).toContain("30");
  });
});

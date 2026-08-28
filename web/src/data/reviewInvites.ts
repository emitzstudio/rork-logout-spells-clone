/**
 * Review links + submission allowance - PURE rules for the V2 review system.
 *
 * One collection = ONE shared review link. The link stays open while the
 * server-side allowance (reviews_remaining) is above zero and the optional
 * expiry hasn't passed; every successful submission consumes exactly one
 * slot atomically. Legacy per-traveller links (pre-V2 collections) keep
 * working and drain the same pool. This module holds the client-side mirror
 * of the server laws (the database RPCs remain the authority): token shape,
 * link states, allowance math, consent-gated publishing and error mapping.
 * No Supabase imports here - everything is unit-testable.
 */
import { parseReviewQuestions, type ReviewQuestion } from "./reviewForm";

/* ---------------------------------- Tokens ---------------------------------- */

const TOKEN_RE = /^[0-9a-f]{64}$/;

/** Quick shape check for /review/:token - the server remains the authority. */
export const looksLikeReviewToken = (token: string): boolean => TOKEN_RE.test(token);

export const reviewLinkPath = (token: string): string => `/review/${token}`;

export const reviewLinkUrl = (origin: string, token: string): string =>
  `${origin.replace(/\/$/, "")}${reviewLinkPath(token)}`;

/* ---------------------------------- Expiry ----------------------------------- */

export const isExpired = (expiresAt: string | null, now: Date): boolean => {
  if (expiresAt === null || expiresAt === "") return false;
  const at = new Date(expiresAt).getTime();
  return Number.isFinite(at) && now.getTime() > at;
};

/**
 * "Stop accepting submissions AFTER that date": a date input value becomes the
 * end of that day in the founder's local timezone. Empty input = no expiry.
 */
export const expiryFromDateInput = (value: string): string | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [, y, m, d] = match;
  const end = new Date(Number(y), Number(m) - 1, Number(d), 23, 59, 59, 999);
  return Number.isNaN(end.getTime()) ? null : end.toISOString();
};

/** "2026-09-30T…" → "30 Sep 2026" (empty for none). */
export const formatExpiryLabel = (iso: string | null): string => {
  if (iso === null || iso === "") return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

/* ------------------------------- Allowance ----------------------------------- */

/** Hard ceiling the server enforces on manual allowance edits. */
export const ALLOWANCE_MAX = 500;

/** Creating a section with N travellers opens N + 1 review slots. */
export const initialAllowance = (travellers: number): number => travellers + 1;

/** Steppers can never leave 0..ALLOWANCE_MAX, and never a fraction. */
export const clampAllowance = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.min(ALLOWANCE_MAX, Math.max(0, Math.round(value)));
};

export const TRAVELLER_LIMITS = { min: 1, max: 200 } as const;

export interface TravellerCountValidation {
  ok: boolean;
  count: number;
  error: string;
}

/** "Number of travellers" - required positive integer within server bounds. */
export const validateTravellerCount = (value: string): TravellerCountValidation => {
  const trimmed = value.trim();
  if (trimmed === "") return { ok: false, count: 0, error: "How many travellers were on this spell?" };
  if (!/^\d+$/.test(trimmed)) return { ok: false, count: 0, error: "Please enter a whole number." };
  const count = Number(trimmed);
  if (count < TRAVELLER_LIMITS.min || count > TRAVELLER_LIMITS.max)
    return {
      ok: false,
      count,
      error: `Between ${TRAVELLER_LIMITS.min} and ${TRAVELLER_LIMITS.max} travellers per review section.`,
    };
  return { ok: true, count, error: "" };
};

/* ----------------------------- Collection phase ------------------------------- */

export type CollectionPhase = "open" | "expired" | "complete";

/**
 * The section's honest state: complete = the allowance is fully used
 * (every slot became a story or was closed by the team) · expired = the
 * date passed with slots unused · open = still accepting stories.
 */
export const collectionPhase = (
  reviewsRemaining: number,
  expiresAt: string | null,
  now: Date,
): CollectionPhase => {
  if (reviewsRemaining <= 0) return "complete";
  if (isExpired(expiresAt, now)) return "expired";
  return "open";
};

/* --------------------------- Legacy invitation rows --------------------------- */

export type InviteRowState = "pending" | "used" | "expired";

/**
 * The state a single legacy invitation shows in the console. A USED link
 * stays used forever - submitted stories outlive expiry. An unused one is
 * expired once the date passes OR the shared allowance is exhausted.
 */
export const inviteRowState = (
  status: "pending" | "used",
  expiresAt: string | null,
  reviewsRemaining: number,
  now: Date,
): InviteRowState => {
  if (status === "used") return "used";
  if (isExpired(expiresAt, now) || reviewsRemaining <= 0) return "expired";
  return "pending";
};

export interface CollectionStats {
  total: number;
  submitted: number;
  pending: number;
}

/** Counts derive from the REAL invitation rows - never from assumptions. */
export const collectionStats = (invites: { status: "pending" | "used" }[]): CollectionStats => {
  const submitted = invites.filter((i) => i.status === "used").length;
  return { total: invites.length, submitted, pending: invites.length - submitted };
};

/* ------------------------------- Publishing gate ----------------------------- */

/**
 * The UI-side mirror of the reviews_invite_guard trigger: a review may only be
 * published when it truly exists with valid stored data AND the traveller
 * consented. The database enforces this even if the UI is bypassed.
 */
export const canPublishReview = (review: {
  consentToPublish: boolean;
  authorName: string;
  rating: number;
  body: string;
}): boolean =>
  review.consentToPublish &&
  review.authorName.trim() !== "" &&
  Number.isInteger(review.rating) &&
  review.rating >= 1 &&
  review.rating <= 5 &&
  review.body.trim() !== "";

/* --------------------------------- Lookup RPC -------------------------------- */

export type ReviewLinkState = "ok" | "used" | "expired" | "invalid";
export type ReviewLinkMode = "shared" | "personal";

export interface ReviewLinkLookup {
  state: ReviewLinkState;
  /** shared = the one collection link · personal = a legacy traveller link. */
  mode: ReviewLinkMode;
  spellName: string;
  spellLocation: string;
  expiresAt: string | null;
  /** The enabled questions to ask, in the founder's order. */
  questions: ReviewQuestion[];
}

/**
 * Narrow the lookup RPC's jsonb. A malformed payload THROWS - a broken
 * response must surface as an error with retry, never as a fake "invalid link".
 */
export const parseReviewLinkLookup = (json: unknown): ReviewLinkLookup => {
  if (typeof json !== "object" || json === null) throw new Error("Unexpected lookup response");
  const record = json as Record<string, unknown>;
  const state = record.state;
  if (state !== "ok" && state !== "used" && state !== "expired" && state !== "invalid")
    throw new Error("Unexpected lookup state");
  return {
    state,
    mode: record.mode === "personal" ? "personal" : "shared",
    spellName: typeof record.spellName === "string" ? record.spellName : "",
    spellLocation: typeof record.spellLocation === "string" ? record.spellLocation : "",
    expiresAt: typeof record.expiresAt === "string" ? record.expiresAt : null,
    questions: parseReviewQuestions(record.questions),
  };
};

/* -------------------------------- Error mapping ------------------------------ */

export type InviteErrorCode =
  | "review_link_used"
  | "review_link_expired"
  | "review_link_invalid"
  | "review_fields_invalid"
  | "review_consent_missing"
  | "review_incomplete"
  | "review_staff_only"
  | "review_spell_missing"
  | "review_link_count_invalid"
  | "review_questions_invalid"
  | "review_allowance_invalid"
  | "review_collection_missing"
  | "unknown";

const KNOWN_CODES: InviteErrorCode[] = [
  "review_link_used",
  "review_link_expired",
  "review_link_invalid",
  "review_fields_invalid",
  "review_consent_missing",
  "review_incomplete",
  "review_staff_only",
  "review_spell_missing",
  "review_link_count_invalid",
  "review_questions_invalid",
  "review_allowance_invalid",
  "review_collection_missing",
];

/** Server errors carry a stable code prefix ("review_link_used: …"). */
export const inviteErrorCode = (message: string): InviteErrorCode => {
  const head = message.split(":")[0]?.trim() ?? "";
  return KNOWN_CODES.find((code) => code === head) ?? "unknown";
};

export const inviteErrorCopy = (code: InviteErrorCode): string => {
  switch (code) {
    case "review_link_used":
      return "This review link has already been used.";
    case "review_link_expired":
      return "This review link has expired.";
    case "review_link_invalid":
      return "This review link is no longer available.";
    case "review_fields_invalid":
      return "Please complete every question before sending.";
    case "review_consent_missing":
      return "This traveller did not consent to sharing their story publicly.";
    case "review_incomplete":
      return "This story is missing its name, rating or experience - it can't be published.";
    case "review_staff_only":
      return "Only staff can manage review sections.";
    case "review_spell_missing":
      return "The selected spell no longer exists - refresh and try again.";
    case "review_link_count_invalid":
      return `The number of travellers must be between ${TRAVELLER_LIMITS.min} and ${TRAVELLER_LIMITS.max}.`;
    case "review_questions_invalid":
      return "The form could not be saved - check the questions and try again.";
    case "review_allowance_invalid":
      return `Reviews remaining must be between 0 and ${ALLOWANCE_MAX}.`;
    case "review_collection_missing":
      return "This review section no longer exists - refresh and try again.";
    case "unknown":
      return "Something went wrong - nothing was saved. Please try again.";
  }
};

/**
 * The specific sentence the server raised (text after the code prefix) -
 * used where the server's detail beats the generic copy, e.g. form-save
 * validation ("choice questions need at least 2 options").
 */
export const inviteErrorDetail = (message: string): string => {
  const idx = message.indexOf(":");
  if (idx < 0) return "";
  return message.slice(idx + 1).trim();
};

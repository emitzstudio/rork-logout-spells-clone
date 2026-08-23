/**
 * Review invitations domain - PURE rules for the M13 review collection system.
 *
 * After a spell completes, staff generate N one-time links; each link submits
 * exactly one review. This module holds the client-side mirror of the server
 * rules (the database RPCs remain the authority): token shape, invitation
 * states, draft validation, consent-gated publishing, and error mapping.
 * No Supabase imports here - everything is unit-testable.
 */

/* --------------------------------- Questions -------------------------------- */

/** The five questions, verbatim - the public form and tests share one source. */
export const REVIEW_QUESTIONS = {
  credit: "Who should we credit this story to?",
  rating: "How would you rate your spell?",
  summary: "Sum up your spell in one line.",
  experience: "Tell us about your experience on this spell.",
  consent: "May we share your story with fellow travellers?",
} as const;

/** Server-enforced limits (mirrored in review_invite_submit). */
export const REVIEW_LIMITS = {
  name: 80,
  summary: 120,
  experience: 5000,
  minLinks: 1,
  maxLinks: 200,
} as const;

/* ---------------------------------- Drafts ---------------------------------- */

export interface ReviewDraft {
  name: string;
  /** 0 = not chosen yet; valid answers are 1-5. */
  rating: number;
  summary: string;
  experience: string;
  /** null = the traveller has not answered the consent question yet. */
  consent: boolean | null;
}

export const EMPTY_REVIEW_DRAFT: ReviewDraft = {
  name: "",
  rating: 0,
  summary: "",
  experience: "",
  consent: null,
};

export type DraftField = keyof ReviewDraft;
export type DraftErrors = Partial<Record<DraftField, string>>;

export interface DraftValidation {
  ok: boolean;
  errors: DraftErrors;
  /** Trimmed values, safe to send once ok. */
  clean: { name: string; rating: number; summary: string; experience: string; consent: boolean };
}

/** Client-side mirror of the server validation - a courtesy, never the law. */
export const validateReviewDraft = (draft: ReviewDraft): DraftValidation => {
  const name = draft.name.trim();
  const summary = draft.summary.trim();
  const experience = draft.experience.trim();
  const errors: DraftErrors = {};

  if (name === "") errors.name = "Please tell us your name.";
  else if (name.length > REVIEW_LIMITS.name) errors.name = `Please keep this under ${REVIEW_LIMITS.name} characters.`;

  if (!Number.isInteger(draft.rating) || draft.rating < 1 || draft.rating > 5)
    errors.rating = "Please choose a rating from 1 to 5 stars.";

  if (summary === "") errors.summary = "Please sum up your spell in one line.";
  else if (summary.length > REVIEW_LIMITS.summary)
    errors.summary = `Please keep your one-liner under ${REVIEW_LIMITS.summary} characters.`;

  if (experience === "") errors.experience = "Please tell us about your experience.";
  else if (experience.length > REVIEW_LIMITS.experience)
    errors.experience = `Please keep this under ${REVIEW_LIMITS.experience} characters.`;

  if (draft.consent === null) errors.consent = "Please choose an answer - yes or no.";

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    clean: { name, rating: draft.rating, summary, experience, consent: draft.consent === true },
  };
};

/* ---------------------------------- Tokens ---------------------------------- */

const TOKEN_RE = /^[0-9a-f]{64}$/;

/** Quick shape check for /review/:token - the server remains the authority. */
export const looksLikeInviteToken = (token: string): boolean => TOKEN_RE.test(token);

export const reviewLinkPath = (token: string): string => `/review/${token}`;

export const reviewLinkUrl = (origin: string, token: string): string =>
  `${origin.replace(/\/$/, "")}${reviewLinkPath(token)}`;

/* ------------------------------ Invitation states ---------------------------- */

export type InviteRowState = "pending" | "used" | "expired";

export const isExpired = (expiresAt: string | null, now: Date): boolean => {
  if (expiresAt === null || expiresAt === "") return false;
  const at = new Date(expiresAt).getTime();
  return Number.isFinite(at) && now.getTime() > at;
};

/**
 * The state a single invitation shows in the console.
 * A USED link stays used forever - submitted stories outlive expiry.
 */
export const inviteRowState = (
  status: "pending" | "used",
  expiresAt: string | null,
  now: Date,
): InviteRowState => {
  if (status === "used") return "used";
  if (isExpired(expiresAt, now)) return "expired";
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

export type CollectionPhase = "open" | "expired" | "complete";

/** Complete = every story is in · expired = time ran out with links unused. */
export const collectionPhase = (
  invites: { status: "pending" | "used" }[],
  expiresAt: string | null,
  now: Date,
): CollectionPhase => {
  const { total, submitted } = collectionStats(invites);
  if (total > 0 && submitted === total) return "complete";
  if (isExpired(expiresAt, now)) return "expired";
  return "open";
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

export type InviteLookupState = "ok" | "used" | "expired" | "invalid";

export interface InviteLookup {
  state: InviteLookupState;
  spellName: string;
  spellLocation: string;
  expiresAt: string | null;
}

/**
 * Narrow the lookup RPC's jsonb. A malformed payload THROWS - a broken
 * response must surface as an error with retry, never as a fake "invalid link".
 */
export const parseInviteLookup = (json: unknown): InviteLookup => {
  if (typeof json !== "object" || json === null) throw new Error("Unexpected lookup response");
  const record = json as Record<string, unknown>;
  const state = record.state;
  if (state !== "ok" && state !== "used" && state !== "expired" && state !== "invalid")
    throw new Error("Unexpected lookup state");
  return {
    state,
    spellName: typeof record.spellName === "string" ? record.spellName : "",
    spellLocation: typeof record.spellLocation === "string" ? record.spellLocation : "",
    expiresAt: typeof record.expiresAt === "string" ? record.expiresAt : null,
  };
};

/* -------------------------------- Error mapping ------------------------------ */

export type InviteErrorCode =
  | "review_link_used"
  | "review_link_expired"
  | "review_link_invalid"
  | "review_fields_invalid"
  | "review_consent_missing"
  | "review_staff_only"
  | "review_spell_missing"
  | "review_link_count_invalid"
  | "unknown";

const KNOWN_CODES: InviteErrorCode[] = [
  "review_link_used",
  "review_link_expired",
  "review_link_invalid",
  "review_fields_invalid",
  "review_consent_missing",
  "review_staff_only",
  "review_spell_missing",
  "review_link_count_invalid",
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
    case "review_staff_only":
      return "Only staff can create review collections.";
    case "review_spell_missing":
      return "The selected spell no longer exists - refresh and try again.";
    case "review_link_count_invalid":
      return `The number of review links must be between ${REVIEW_LIMITS.minLinks} and ${REVIEW_LIMITS.maxLinks}.`;
    case "unknown":
      return "Something went wrong - nothing was saved. Please try again.";
  }
};

/* ---------------------------------- Expiry ----------------------------------- */

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

/* -------------------------------- Link count --------------------------------- */

export interface LinkCountValidation {
  ok: boolean;
  count: number;
  error: string;
}

/** "Number of Review Links" - required positive integer within server bounds. */
export const validateLinkCount = (value: string): LinkCountValidation => {
  const trimmed = value.trim();
  if (trimmed === "") return { ok: false, count: 0, error: "How many travellers were on this spell?" };
  if (!/^\d+$/.test(trimmed)) return { ok: false, count: 0, error: "Please enter a whole number." };
  const count = Number(trimmed);
  if (count < REVIEW_LIMITS.minLinks || count > REVIEW_LIMITS.maxLinks)
    return {
      ok: false,
      count,
      error: `Between ${REVIEW_LIMITS.minLinks} and ${REVIEW_LIMITS.maxLinks} links per collection.`,
    };
  return { ok: true, count, error: "" };
};

/**
 * The "stay connected" sign-off (2026-09-29) - the founder's exact wording,
 * shown at the end of every public form (question page and thank-you page)
 * and stamped on every page of every brochure PDF. One source of truth so a
 * new form or PDF carries it by default; change the link here and everything
 * follows.
 */
export const STAY_CONNECTED = {
  heading: "Stay connected for future trips\u{1F98B} :",
  instagram: {
    label: "Follow us on instagram \u{1F41D}:",
    url: "https://www.instagram.com/logout.spells?stkn=YmhrOHl0YTZuaTNz&utm_source=qr",
    /** What people read on a printed page (the tracking parameters stay in the link). */
    display: "instagram.com/logout.spells",
  },
  whatsapp: {
    label: "Join our community \u{1F41D}:",
    url: "https://chat.whatsapp.com/DGwmta7DNS2EJZQDxyySAI",
    display: "chat.whatsapp.com/DGwmta7DNS2EJZQDxyySAI",
  },
} as const;

/** Every link the sign-off carries - PDF verifiers use this to tell them apart from booking links. */
export const STAY_CONNECTED_URLS: readonly string[] = [STAY_CONNECTED.instagram.url, STAY_CONNECTED.whatsapp.url];

/** The sign-off as plain text, exactly as the founder wrote it (emails, captions, exports). */
export const STAY_CONNECTED_TEXT = [
  STAY_CONNECTED.heading,
  "",
  STAY_CONNECTED.instagram.label,
  STAY_CONNECTED.instagram.url,
  "",
  STAY_CONNECTED.whatsapp.label,
  STAY_CONNECTED.whatsapp.url,
].join("\n");

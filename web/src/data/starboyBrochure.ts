/** The approved Starboy edition, shared by downloads, redirects and build checks. */
export const STARBOY_BROCHURE_PATH = "/brochures/Logout-Spells-Starboy-9-15-Oct-2026-Grimoire-v7.pdf";
export const STARBOY_BROCHURE_URL = `https://z57wkqd89o09lsi6kc7v1-web.rork.live${STARBOY_BROCHURE_PATH}`;

/** Superseded public editions. Keep these paths reserved for redirects, never PDF files. */
export const RETIRED_STARBOY_BROCHURE_PATHS: readonly string[] = [
  "/brochures/Logout-Spells-Starboy-9-15-Oct-2026-Grimoire.pdf",
  "/brochures/Logout-Spells-Starboy-9-15-Oct-2026-Grimoire-Weeknd.pdf",
  "/brochures/Logout-Spells-Starboy-9-15-Oct-2026-Grimoire-Weeknd-v3.pdf",
  "/brochures/Logout-Spells-Starboy-9-15-Oct-2026-Grimoire-Weeknd-v4.pdf",
  "/brochures/Logout-Spells-Starboy-9-15-Oct-2026-Dashboard-v5.pdf",
];

/** Earlier Grimoire assets remain immutable, but saved download references use the latest terms. */
export const SUPERSEDED_STARBOY_BROCHURE_PATHS: readonly string[] = [
  ...RETIRED_STARBOY_BROCHURE_PATHS,
  "/brochures/Logout-Spells-Starboy-9-15-Oct-2026-Grimoire-v6.pdf",
];

/** Only replaces known superseded Starboy references; unrelated and invalid inputs stay untouched. */
export function replaceRetiredStarboyBrochure(value: string): string {
  const trimmed = value.trim();
  if (SUPERSEDED_STARBOY_BROCHURE_PATHS.includes(trimmed)) return STARBOY_BROCHURE_PATH;
  try {
    const url = new URL(trimmed);
    if (url.protocol === "https:" && !url.username && !url.password && SUPERSEDED_STARBOY_BROCHURE_PATHS.includes(decodeURIComponent(url.pathname))) {
      return STARBOY_BROCHURE_URL;
    }
  } catch {
    // Validation remains the responsibility of brochureLink, including incomplete editor input.
  }
  return value;
}

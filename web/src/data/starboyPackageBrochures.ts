/** Immutable, independently shareable PDFs; 11-17 October dates and the stay-connected strip on every page (2026-09-29). */
export const STARBOY_PACKAGE_BROCHURES = {
  xo: "/brochures/Logout-Spells-Blinding-Nights-XO-11-14-Oct-2026-Grimoire-v4.pdf",
  starboy: "/brochures/Logout-Spells-Blinding-Nights-STARBOY-11-17-Oct-2026-Grimoire-v5.pdf",
  timeless: "/brochures/Logout-Spells-Blinding-Nights-TIMELESS-11-17-Oct-2026-Grimoire-v3.pdf",
} as const;

/** Unknown package IDs must never silently download another package's terms. */
export function starboyPackageBrochure(id: string): string | undefined {
  return Object.prototype.hasOwnProperty.call(STARBOY_PACKAGE_BROCHURES, id)
    ? STARBOY_PACKAGE_BROCHURES[id as keyof typeof STARBOY_PACKAGE_BROCHURES]
    : undefined;
}

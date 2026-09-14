/** Immutable, independently shareable PDFs for the September 14 package terms. */
export const STARBOY_PACKAGE_BROCHURES = {
  xo: "/brochures/Logout-Spells-Blinding-Nights-XO-9-12-Oct-2026-Grimoire-v1.pdf",
  starboy: "/brochures/Logout-Spells-Blinding-Nights-STARBOY-9-15-Oct-2026-Grimoire-v2.pdf",
  timeless: "/brochures/Logout-Spells-Blinding-Nights-TIMELESS-9-15-Oct-2026-Grimoire-v1.pdf",
} as const;

/** Unknown package IDs must never silently download another package's terms. */
export function starboyPackageBrochure(id: string): string | undefined {
  return Object.prototype.hasOwnProperty.call(STARBOY_PACKAGE_BROCHURES, id)
    ? STARBOY_PACKAGE_BROCHURES[id as keyof typeof STARBOY_PACKAGE_BROCHURES]
    : undefined;
}

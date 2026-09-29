/** Immutable, independently shareable PDFs; dates moved to 11-17 October on September 29 (drag-show/art-museum tickets included since September 25). */
export const STARBOY_PACKAGE_BROCHURES = {
  xo: "/brochures/Logout-Spells-Blinding-Nights-XO-11-14-Oct-2026-Grimoire-v3.pdf",
  starboy: "/brochures/Logout-Spells-Blinding-Nights-STARBOY-11-17-Oct-2026-Grimoire-v4.pdf",
  timeless: "/brochures/Logout-Spells-Blinding-Nights-TIMELESS-11-17-Oct-2026-Grimoire-v2.pdf",
} as const;

/** Unknown package IDs must never silently download another package's terms. */
export function starboyPackageBrochure(id: string): string | undefined {
  return Object.prototype.hasOwnProperty.call(STARBOY_PACKAGE_BROCHURES, id)
    ? STARBOY_PACKAGE_BROCHURES[id as keyof typeof STARBOY_PACKAGE_BROCHURES]
    : undefined;
}

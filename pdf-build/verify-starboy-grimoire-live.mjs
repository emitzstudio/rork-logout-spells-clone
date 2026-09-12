/** Current Grimoire distribution checks. Run with Bun from web/.
 * The earlier standalone-v6 rollout baseline is historical and must not be reset.
 * Website publication uses a separate, exclusive pre-switch baseline.
 */
await import("../web/scripts/verify-starboy-grimoire-website.mjs");

import { lazy, memo, Suspense } from "react";

/**
 * The 3D starfield (three.js + react-three-fiber) is by far the heaviest
 * dependency on the site, so it's code-split into its own async chunk.
 * The gradient sky paints instantly; the stars fade in the moment the
 * chunk arrives — usually while the portal gate is still covering the page.
 */
const GoldDust = lazy(() => import("@/components/site/GoldDust"));

/**
 * Site-wide fixed golden starfield rendered once behind every route.
 * Sits at negative z-index so page content (with translucent section
 * tints) floats above a continuous night sky — even during page
 * transitions, since it lives outside the animated routes.
 * Memoised: app-level state changes (portal phases) never re-render it.
 */
const StarBackdrop = memo(function StarBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 60% at 50% -5%, rgba(184,150,62,0.07), transparent 60%), radial-gradient(ellipse 70% 50% at 50% 110%, rgba(184,150,62,0.05), transparent 65%), linear-gradient(180deg, #181613 0%, #1C1C1A 48%, #121110 100%)",
        }}
      />
      <Suspense
        fallback={
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 60% 45% at 50% 42%, rgba(184,150,62,0.1), transparent 70%)",
            }}
          />
        }
      >
        <GoldDust density={750} />
      </Suspense>
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 130% 100% at 50% 50%, transparent 58%, rgba(8,7,5,0.5) 100%)",
        }}
      />
    </div>
  );
});

export default StarBackdrop;

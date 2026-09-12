import { createRoot } from "react-dom/client";

import App from "./App.tsx";
import BrochureRedirect from "./components/site/BrochureRedirect";
import { RETIRED_STARBOY_BROCHURE_PATHS } from "./data/starboyBrochure";
import { missingSupabaseConfig } from "./integrations/supabase/client";
import "./index.css";

/**
 * Fail fast, visibly (M10): a missing backend configuration renders an
 * explicit screen naming the absent variables (names only - never values)
 * instead of booting the app into mysterious runtime failures.
 */
const ConfigurationError = () => (
  <div className="grid min-h-screen place-items-center bg-charcoal px-6">
    <div
      role="alert"
      className="w-full max-w-md rounded-[14px] border border-gold/25 bg-charcoal-deep/70 px-8 py-10 text-center"
    >
      <span aria-hidden className="font-serif text-4xl text-gold/70">
        ☾
      </span>
      <h1 className="heading-serif mt-4 text-2xl text-cream">The site isn't configured yet</h1>
      <p className="mt-3 font-sans text-sm leading-relaxed text-cream/60">
        Required environment variables are missing, so the site can't reach its backend:
      </p>
      <ul className="mt-4 space-y-1.5">
        {missingSupabaseConfig.map((name) => (
          <li key={name} className="font-mono text-xs text-gold-light">
            {name}
          </li>
        ))}
      </ul>
      <p className="mt-5 font-sans text-xs text-cream/40">
        Add them to the project's environment, rebuild, and reload this page.
      </p>
    </div>
  </div>
);

createRoot(document.getElementById("root")!).render(
  RETIRED_STARBOY_BROCHURE_PATHS.includes(window.location.pathname)
    ? <BrochureRedirect />
    : missingSupabaseConfig.length > 0 ? <ConfigurationError /> : <App />,
);

/**
 * Maps website-shaped paths (from shared links and notification records)
 * onto this app's routes so every tap lands somewhere real.
 */
const RULES: readonly { test: RegExp; to: string }[] = [
  { test: /^\/account\/trips\/([^/]+)\/?$/, to: "/space/trip/$1" },
  { test: /^\/account\/trips\/?$/, to: "/space/trips" },
  { test: /^\/account\/transactions\/?$/, to: "/space/wallet" },
  { test: /^\/account\/wallet\/?$/, to: "/space/wallet" },
  { test: /^\/account\/wishlist\/?$/, to: "/space/wishlist" },
  { test: /^\/account\/memories\/?$/, to: "/space/memories" },
  { test: /^\/account\/journey\/?$/, to: "/space/journey" },
  { test: /^\/account\/notifications\/?$/, to: "/space/notifications" },
  { test: /^\/account\/settings\/?$/, to: "/space/settings" },
  { test: /^\/account\/?$/, to: "/space" },
  { test: /^\/space\/referrals\/?$/, to: "/space" },
  { test: /^\/live-spells\/previous\/([^/]+)\/?$/, to: "/previous/$1" },
  { test: /^\/live-spells\/previous\/?$/, to: "/previous" },
  { test: /^\/live-spells\/?$/, to: "/live" },
  { test: /^\/spells?\/([^/]+)\/?$/, to: "/live/$1" },
  { test: /^\/(login|join|forgot-password|reset-password)\/?$/, to: "/auth" },
  { test: /^\/experience\/?$/, to: "/blog" },
];

/** Paths the app can actually open (static prefixes). */
const KNOWN_PREFIXES = [
  "/live",
  "/discover",
  "/blog",
  "/previous",
  "/space",
  "/our-story",
  "/creators",
  "/auth",
] as const;

/** Normalize any shared/notification link into an app route. Unknowns go home. */
export function toAppPath(link: string): string {
  let path = link.trim();
  if (path.length === 0) return "/";

  if (path.startsWith("http://") || path.startsWith("https://")) {
    try {
      path = new URL(path).pathname;
    } catch {
      return "/";
    }
  }
  if (!path.startsWith("/")) path = `/${path}`;
  const queryless = path.split("?")[0].split("#")[0];

  for (const rule of RULES) {
    if (rule.test.test(queryless)) {
      return queryless.replace(rule.test, rule.to);
    }
  }

  if (queryless === "/") return "/";
  if (KNOWN_PREFIXES.some((p) => queryless === p || queryless.startsWith(`${p}/`))) {
    return queryless;
  }
  return "/";
}

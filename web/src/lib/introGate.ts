/**
 * The one-time intro gate. The ritual portal (PortalEntry) greets each
 * traveller exactly once: after the animation fully completes we remember it
 * in localStorage, so refreshes, in-site navigation and every later browser
 * session land straight on the site. The read happens synchronously before
 * first paint - a returning visitor never sees a single frame of the portal.
 *
 * Fail-open by design: when storage is unavailable (some private modes,
 * blocked site data), the gate reports "not seen" and the portal simply plays
 * again - never a crash.
 */

/** Storage key remembering the portal intro has fully played on this browser. */
export const INTRO_SEEN_KEY = "ls-portal-seen-v1";

/** True when this browser has already watched the intro to the end. */
export const hasSeenIntro = (): boolean => {
  try {
    return window.localStorage.getItem(INTRO_SEEN_KEY) === "1";
  } catch {
    return false;
  }
};

/** Persist the flag the moment the intro finishes - it survives across sessions. */
export const markIntroSeen = (): void => {
  try {
    window.localStorage.setItem(INTRO_SEEN_KEY, "1");
  } catch {
    /* Storage blocked - the portal will simply greet them again next visit. */
  }
};

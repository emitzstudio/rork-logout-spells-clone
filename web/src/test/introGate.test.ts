/**
 * One-time intro gate contract tests: a first-time visitor sees the portal,
 * completing it persists the flag, refreshes and brand-new browser sessions
 * skip it (only the stored value matters), and blocked or absent storage
 * fails open - show the intro, never crash.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { hasSeenIntro, INTRO_SEEN_KEY, markIntroSeen } from "@/lib/introGate";

/** Minimal localStorage double backed by a Map - the node test env has no real window. */
const stubBrowser = (store: Map<string, string> = new Map<string, string>()): Map<string, string> => {
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string): string | null => store.get(key) ?? null,
      setItem: (key: string, value: string): void => {
        store.set(key, value);
      },
    },
  });
  return store;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("intro gate", () => {
  it("first-time visitor: no flag stored, the portal shows", () => {
    stubBrowser();
    expect(hasSeenIntro()).toBe(false);
  });

  it("completing the intro persists the flag and skips it from then on", () => {
    const store = stubBrowser();
    expect(hasSeenIntro()).toBe(false);
    markIntroSeen();
    expect(store.get(INTRO_SEEN_KEY)).toBe("1");
    expect(hasSeenIntro()).toBe(true);
  });

  it("survives closing and reopening the browser (fresh window, same disk)", () => {
    const store = stubBrowser();
    markIntroSeen();
    vi.unstubAllGlobals();
    stubBrowser(store);
    expect(hasSeenIntro()).toBe(true);
  });

  it("only the exact completed value counts as seen", () => {
    const store = stubBrowser();
    store.set(INTRO_SEEN_KEY, "yes");
    expect(hasSeenIntro()).toBe(false);
  });

  it("blocked storage fails open: intro shows, nothing throws", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (): string | null => {
          throw new Error("storage disabled");
        },
        setItem: (): void => {
          throw new Error("storage disabled");
        },
      },
    });
    expect(hasSeenIntro()).toBe(false);
    expect(() => markIntroSeen()).not.toThrow();
  });

  it("no window at all fails open the same way", () => {
    expect(hasSeenIntro()).toBe(false);
    expect(() => markIntroSeen()).not.toThrow();
  });
});

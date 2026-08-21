/**
 * M12 — settings model contract tests: normalizers fail open (a broken or
 * missing payload can never take the site down, close registration or hide
 * forms by accident), empty links never render, payment stays locked to
 * "coming soon", and validation treats empty as a valid state.
 */
import { describe, expect, it } from "vitest";

import {
  DEFAULT_SITE_SETTINGS,
  emailFieldError,
  normalizeContactSection,
  normalizeLaunchSection,
  normalizeRoutingSection,
  normalizeSiteSection,
  normalizeSocialsSection,
  urlFieldError,
  visibleSocials,
} from "@/data/siteSettings";

describe("normalizeLaunchSection", () => {
  it("defaults fail-open: live, registration on, verification required, forms on", () => {
    expect(normalizeLaunchSection(undefined)).toEqual({
      websiteStatus: "live",
      paymentStatus: "coming_soon",
      registrationEnabled: true,
      emailVerificationRequired: true,
      publicFormsEnabled: true,
    });
  });

  it("round-trips a maintenance + paused configuration", () => {
    const launch = normalizeLaunchSection({
      websiteStatus: "maintenance",
      registrationEnabled: false,
      publicFormsEnabled: false,
    });
    expect(launch.websiteStatus).toBe("maintenance");
    expect(launch.registrationEnabled).toBe(false);
    expect(launch.publicFormsEnabled).toBe(false);
    expect(launch.emailVerificationRequired).toBe(true);
  });

  it("ignores garbage payloads and unknown statuses", () => {
    expect(normalizeLaunchSection("nope").websiteStatus).toBe("live");
    expect(normalizeLaunchSection({ websiteStatus: "offline" }).websiteStatus).toBe("live");
    expect(normalizeLaunchSection({ registrationEnabled: "no" }).registrationEnabled).toBe(true);
    expect(normalizeLaunchSection(null).publicFormsEnabled).toBe(true);
  });

  it("keeps payment locked to coming_soon no matter what is stored", () => {
    expect(normalizeLaunchSection({ paymentStatus: "live" }).paymentStatus).toBe("coming_soon");
  });
});

describe("normalizeSiteSection", () => {
  it("never lets the site name go blank", () => {
    expect(normalizeSiteSection({ siteName: "   " }).siteName).toBe(
      DEFAULT_SITE_SETTINGS.site.siteName,
    );
    expect(normalizeSiteSection(undefined).siteName).toBe(DEFAULT_SITE_SETTINGS.site.siteName);
  });

  it("allows clearing tagline and description (honest empties)", () => {
    const site = normalizeSiteSection({ siteName: "X", tagline: "", description: "" });
    expect(site.tagline).toBe("");
    expect(site.description).toBe("");
  });

  it("trims whitespace", () => {
    expect(normalizeSiteSection({ siteName: "  Logout Spells  " }).siteName).toBe("Logout Spells");
  });
});

describe("contact + routing sections", () => {
  it("missing payloads normalize to honest empties — nothing invented", () => {
    expect(normalizeContactSection(undefined)).toEqual({
      contactEmail: "",
      supportEmail: "",
      phone: "",
      whatsapp: "",
    });
    expect(normalizeRoutingSection(undefined)).toEqual({
      generalRecipient: "",
      bookingRecipient: "",
      formRecipient: "",
    });
  });
});

describe("visibleSocials", () => {
  it("filters empty links and keeps the footer order", () => {
    const socials = normalizeSocialsSection({
      youtube: "https://youtube.com/@b",
      instagram: "https://instagram.com/a",
    });
    expect(visibleSocials(socials)).toEqual([
      { id: "instagram", url: "https://instagram.com/a" },
      { id: "youtube", url: "https://youtube.com/@b" },
    ]);
  });

  it("renders nothing when nothing is configured — no dead buttons", () => {
    expect(visibleSocials(normalizeSocialsSection({}))).toEqual([]);
    expect(visibleSocials(normalizeSocialsSection({ instagram: "   " }))).toEqual([]);
  });
});

describe("field validation", () => {
  it("treats empty as a valid state, not an error", () => {
    expect(emailFieldError("")).toBeNull();
    expect(urlFieldError("")).toBeNull();
  });

  it("flags malformed emails and non-https links", () => {
    expect(emailFieldError("not-an-email")).not.toBeNull();
    expect(emailFieldError("a@b.co")).toBeNull();
    expect(urlFieldError("http://insecure.example")).not.toBeNull();
    expect(urlFieldError("https://ok.example")).toBeNull();
  });
});

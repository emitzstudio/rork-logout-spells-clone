/**
 * M12 — central site configuration model (pure: safe to import anywhere,
 * including tests — no Supabase client in this file).
 *
 * The `site_settings` table holds ONE row per section. These types, defaults
 * and normalizers are the single contract between that table, the founder
 * console and every public consumer.
 *
 * DEFAULTS mirror the 0022 seeds — the pre-M12 hardcoded truth — so first
 * paint and any fetch failure fall back to exactly what the site always
 * showed. Launch switches normalize FAIL-OPEN (live · registration on ·
 * forms on): a dropped request can never accidentally lock the site down.
 */
import { CONTACT_EMAIL, SOCIALS } from "@/data/site";

export type SettingsSectionKey = "site" | "contact" | "socials" | "launch" | "routing";

export type WebsiteStatus = "live" | "maintenance";

export interface SiteIdentitySettings {
  siteName: string;
  tagline: string;
  description: string;
}

export interface ContactSettings {
  /** General contact — the address the public site links to. */
  contactEmail: string;
  /** Support desk — falls back to contactEmail when empty. */
  supportEmail: string;
  phone: string;
  whatsapp: string;
}

export interface SocialLinkSettings {
  instagram: string;
  linkedin: string;
  facebook: string;
  youtube: string;
  whatsapp: string;
}

export interface LaunchSettings {
  websiteStatus: WebsiteStatus;
  /** Informational only until the payments milestone — always "coming_soon". */
  paymentStatus: "coming_soon";
  registrationEnabled: boolean;
  /** Mirrors the auth server's policy — locked to true until email delivery. */
  emailVerificationRequired: boolean;
  publicFormsEnabled: boolean;
}

/** Internal recipients — staff-only, DORMANT until email delivery exists. */
export interface RoutingSettings {
  generalRecipient: string;
  bookingRecipient: string;
  formRecipient: string;
}

export interface SectionPayloadMap {
  site: SiteIdentitySettings;
  contact: ContactSettings;
  socials: SocialLinkSettings;
  launch: LaunchSettings;
  routing: RoutingSettings;
}

export interface SiteSettings extends SectionPayloadMap {
  /** Per-section save timestamps from the database (console display only). */
  updatedAt: Partial<Record<SettingsSectionKey, string>>;
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  site: {
    siteName: "Logout Spells",
    tagline: "Belonging > Bookings",
    description:
      "Logout Spells is a creator-led travel community. We turn digital followers into real-world community. Choose your spell and belong somewhere real.",
  },
  contact: {
    contactEmail: CONTACT_EMAIL,
    supportEmail: "",
    phone: "",
    whatsapp: "",
  },
  socials: {
    instagram: SOCIALS.instagram,
    linkedin: SOCIALS.linkedin,
    facebook: "",
    youtube: SOCIALS.youtube,
    whatsapp: "",
  },
  launch: {
    websiteStatus: "live",
    paymentStatus: "coming_soon",
    registrationEnabled: true,
    emailVerificationRequired: true,
    publicFormsEnabled: true,
  },
  routing: {
    generalRecipient: "",
    bookingRecipient: "",
    formRecipient: "",
  },
  updatedAt: {},
};

/* ------------------------------ Normalizers ------------------------------- */

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const str = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value.trim() : fallback;

const bool = (value: unknown, fallback: boolean): boolean =>
  typeof value === "boolean" ? value : fallback;

export const normalizeSiteSection = (data: unknown): SiteIdentitySettings => {
  const d = asRecord(data);
  const name = str(d.siteName);
  return {
    /* The site always has a name — a blank save can't erase the identity. */
    siteName: name !== "" ? name : DEFAULT_SITE_SETTINGS.site.siteName,
    tagline: str(d.tagline),
    description: str(d.description),
  };
};

export const normalizeContactSection = (data: unknown): ContactSettings => {
  const d = asRecord(data);
  return {
    contactEmail: str(d.contactEmail),
    supportEmail: str(d.supportEmail),
    phone: str(d.phone),
    whatsapp: str(d.whatsapp),
  };
};

export const normalizeSocialsSection = (data: unknown): SocialLinkSettings => {
  const d = asRecord(data);
  return {
    instagram: str(d.instagram),
    linkedin: str(d.linkedin),
    facebook: str(d.facebook),
    youtube: str(d.youtube),
    whatsapp: str(d.whatsapp),
  };
};

export const normalizeLaunchSection = (data: unknown): LaunchSettings => {
  const d = asRecord(data);
  return {
    websiteStatus: d.websiteStatus === "maintenance" ? "maintenance" : "live",
    paymentStatus: "coming_soon",
    registrationEnabled: bool(d.registrationEnabled, true),
    emailVerificationRequired: bool(d.emailVerificationRequired, true),
    publicFormsEnabled: bool(d.publicFormsEnabled, true),
  };
};

export const normalizeRoutingSection = (data: unknown): RoutingSettings => {
  const d = asRecord(data);
  return {
    generalRecipient: str(d.generalRecipient),
    bookingRecipient: str(d.bookingRecipient),
    formRecipient: str(d.formRecipient),
  };
};

export const SECTION_NORMALIZERS: {
  [K in SettingsSectionKey]: (data: unknown) => SectionPayloadMap[K];
} = {
  site: normalizeSiteSection,
  contact: normalizeContactSection,
  socials: normalizeSocialsSection,
  launch: normalizeLaunchSection,
  routing: normalizeRoutingSection,
};

/* ------------------------------ Social links ------------------------------ */

/** Stable footer order for social buttons. */
export const SOCIAL_ORDER: (keyof SocialLinkSettings)[] = [
  "instagram",
  "linkedin",
  "facebook",
  "youtube",
  "whatsapp",
];

export const SOCIAL_LABELS: Record<keyof SocialLinkSettings, string> = {
  instagram: "Instagram",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  youtube: "YouTube",
  whatsapp: "WhatsApp",
};

export interface VisibleSocial {
  id: keyof SocialLinkSettings;
  url: string;
}

/** Only links that are actually configured — empty ones never render. */
export const visibleSocials = (socials: SocialLinkSettings): VisibleSocial[] =>
  SOCIAL_ORDER.map((id) => ({ id, url: socials[id].trim() })).filter((s) => s.url !== "");

/** Light validation shared by the console forms. */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const emailFieldError = (value: string): string | null =>
  value !== "" && !EMAIL_RE.test(value) ? "That doesn't look like an email." : null;

export const urlFieldError = (value: string): string | null =>
  value !== "" && !/^https:\/\/.+/.test(value) ? "Links start with https://" : null;

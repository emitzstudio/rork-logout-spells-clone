/**
 * Logout Spells brand system — colors, fonts, links.
 * These hex values are the brand identity. Never change them.
 */
export const Colors = {
  charcoal: "#1C1C1A",
  charcoalSoft: "#222220",
  charcoalDeep: "#0A0806",
  cream: "#F5F0E8",
  creamMuted: "#C8C1B4",
  gold: "#B8963E",
  goldLight: "#CFA85A",
  goldHi: "#F0DFAE",
  tan: "#8B7956",
  glass: "rgba(245,240,232,0.04)",
  glassBorder: "rgba(245,240,232,0.08)",
  goldBorder: "rgba(184,150,62,0.35)",
  goldGlow: "rgba(184,150,62,0.12)",
  error: "#C96F5A",
} as const;

export const GOLD_GRADIENT: readonly [string, string, string] = [
  "#CFA85A",
  "#F0DFAE",
  "#B8963E",
];

export const Fonts = {
  serif: "CormorantGaramond_500Medium",
  serifItalic: "CormorantGaramond_500Medium_Italic",
  serifSemi: "CormorantGaramond_600SemiBold",
  serifSemiItalic: "CormorantGaramond_600SemiBold_Italic",
  sans: "Inter_400Regular",
  sansMedium: "Inter_500Medium",
  sansSemi: "Inter_600SemiBold",
  sansBold: "Inter_700Bold",
} as const;

export const EMAIL = "vidushi@logoutspells.com";

export const LINKS = {
  linkedin: "https://linkedin.com/in/vidushiverma2409",
  instagram: "https://instagram.com/veedoshe",
  youtube: "https://youtube.com/@TalkETM",
} as const;

/** Bottom padding so scroll content clears the floating tab bar */
export const TAB_BAR_SPACE = 128;

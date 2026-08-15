/**
 * Logout Spells brand system — single source of truth for design tokens.
 * Mirrors the website (web/src/index.css + tailwind.config.ts).
 * Brand hex values are the brand identity. Never change them.
 */
export const Colors = {
  /* Brand core — identical to the website */
  charcoal: "#1C1C1A",
  charcoalSoft: "#222220",
  charcoalDeep: "#0A0806",
  cream: "#F5F0E8",
  creamMuted: "#C8C1B4",
  gold: "#B8963E",
  goldLight: "#CFA85A",
  goldHi: "#F0DFAE",
  tan: "#8B7956",

  /* Panel surfaces — the website's solid card literals */
  panel: "#14130F",
  panelHi: "#18160F",
  panelDeep: "#12100B",
  /** Warm gold-tinted disc behind avatar initials. */
  goldDeep: "#221B0E",

  /* Glass recipe — web .card-glass (gradient painted by GlassCard) */
  glass: "rgba(245,240,232,0.04)",
  glassHi: "rgba(245,240,232,0.07)",
  glassBase: "rgba(24,23,20,0.42)",
  glassBorder: "rgba(245,240,232,0.08)",

  /* Gold accents */
  goldBorder: "rgba(184,150,62,0.35)",
  goldBorderSoft: "rgba(184,150,62,0.2)",
  goldGlow: "rgba(184,150,62,0.12)",
  focus: "rgba(207,168,90,0.65)",

  /* Status tints — same emerald/amber/red family the website uses */
  emerald: "#34D399",
  emeraldSoft: "#6EE7B7",
  emeraldBg: "rgba(13,32,22,0.85)",
  emeraldBorder: "rgba(52,211,153,0.3)",
  amber: "#FBBF24",
  amberSoft: "#FCD34D",
  amberBg: "rgba(40,30,8,0.72)",
  amberBorder: "rgba(251,191,36,0.3)",
  red: "#F87171",
  redSoft: "#FCA5A5",
  redBg: "rgba(42,13,10,0.85)",
  redBorder: "rgba(248,113,113,0.3)",

  /* Errors — the website's coral treatment */
  error: "#C96F5A",
  coral: "#C65F52",
  coralText: "#D98A7F",
  coralBg: "rgba(198,95,82,0.08)",
  coralBorder: "rgba(198,95,82,0.45)",
} as const;

/** Signature gold gradient — web .text-gold-gradient (120deg). */
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
  hand: "Caveat_500Medium",
  handSemi: "Caveat_600SemiBold",
} as const;

/** Serif display ladder — web .heading-serif sizes adapted to mobile. */
export const Type = {
  display: 44,
  h1: 36,
  h2: 30,
  h3: 24,
  h4: 20,
  bodyLg: 16.5,
  body: 15,
  caption: 13,
  micro: 11,
} as const;

/** Corner radius scale — editorial, close to the web's tight radii. */
export const Radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

/** One horizontal gutter everywhere. */
export const GUTTER = 20;

/** Gold glow shadow preset (web hover glow, resting state on native). */
export const GOLD_SHADOW = {
  shadowColor: "#B8963E",
  shadowOpacity: 0.35,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 6,
} as const;

/** Deep card lift shadow. */
export const CARD_SHADOW = {
  shadowColor: "#000000",
  shadowOpacity: 0.35,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: 12 },
  elevation: 8,
} as const;

export const EMAIL = "hello@logoutspells.com";

export const LINKS = {
  linkedin: "https://linkedin.com/in/vidushiverma2409",
  instagram: "https://instagram.com/veedoshe",
  youtube: "https://youtube.com/@TalkETM",
} as const;

/** Bottom padding so scroll content clears the floating tab bar */
export const TAB_BAR_SPACE = 128;

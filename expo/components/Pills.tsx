import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

import PulsingDot from "@/components/PulsingDot";
import { Colors, Fonts } from "@/constants/theme";

type Tone = "gold" | "neutral" | "dark" | "live" | "soldout" | "urgent";

interface Props {
  label: string;
  tone?: Tone;
  style?: StyleProp<ViewStyle>;
}

/**
 * Website pill family:
 * gold badge · neutral tag · dark photo-overlay chip · pulsing LIVE badge ·
 * sold-out chip · urgent seats-left chip.
 */
export default function Pill({ label, tone = "neutral", style }: Props) {
  const showDot = tone === "live";
  return (
    <View style={[styles.pill, toneStyles[tone].box, style]}>
      {showDot ? <PulsingDot size={5} color={Colors.charcoalDeep} /> : null}
      <Text style={[styles.label, toneStyles[tone].text]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  label: {
    fontFamily: Fonts.sansSemi,
    fontSize: 9.5,
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
});

const toneStyles: Record<Tone, { box: ViewStyle; text: { color: string } }> = {
  gold: {
    box: {
      backgroundColor: Colors.goldGlow,
      borderColor: Colors.goldBorder,
    },
    text: { color: Colors.goldLight },
  },
  neutral: {
    box: {
      backgroundColor: "rgba(245,240,232,0.05)",
      borderColor: Colors.glassBorder,
    },
    text: { color: Colors.creamMuted },
  },
  dark: {
    box: {
      backgroundColor: "rgba(10,8,6,0.72)",
      borderColor: "rgba(245,240,232,0.14)",
    },
    text: { color: Colors.cream },
  },
  live: {
    box: {
      backgroundColor: Colors.gold,
      borderColor: Colors.gold,
    },
    text: { color: Colors.charcoalDeep },
  },
  soldout: {
    box: {
      backgroundColor: "rgba(10,8,6,0.72)",
      borderColor: "rgba(245,240,232,0.14)",
    },
    text: { color: "rgba(245,240,232,0.55)" },
  },
  urgent: {
    box: {
      backgroundColor: "rgba(42,13,10,0.8)",
      borderColor: Colors.redBorder,
    },
    text: { color: Colors.redSoft },
  },
};

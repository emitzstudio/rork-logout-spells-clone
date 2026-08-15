import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { Colors, Radius } from "@/constants/theme";

type Tone = "glass" | "panel" | "gold";

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  radius?: number;
  padded?: boolean;
  /** glass = web .card-glass · panel = solid editorial surface · gold = gold-tinted */
  tone?: Tone;
}

/**
 * Signature card — exact port of the website's .card-glass recipe:
 * a faint cream gradient painted over a dark translucent base, hairline border.
 */
export default function GlassCard({
  children,
  style,
  radius = Radius.lg,
  padded = true,
  tone = "glass",
}: Props) {
  return (
    <View
      style={[
        styles.card,
        tone === "glass" ? styles.glass : null,
        tone === "panel" ? styles.panel : null,
        tone === "gold" ? styles.gold : null,
        { borderRadius: radius },
        padded ? styles.padded : null,
        style,
      ]}
    >
      {tone === "glass" ? (
        <LinearGradient
          colors={["rgba(245,240,232,0.045)", "rgba(245,240,232,0.015)"]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.75, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    overflow: "hidden",
  },
  glass: {
    backgroundColor: Colors.glassBase,
    borderColor: Colors.glassBorder,
  },
  panel: {
    backgroundColor: Colors.panel,
    borderColor: Colors.glassBorder,
  },
  gold: {
    backgroundColor: Colors.goldGlow,
    borderColor: Colors.goldBorder,
  },
  padded: {
    padding: 20,
  },
});

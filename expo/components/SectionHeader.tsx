import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

import Eyebrow from "@/components/Eyebrow";
import GradientText from "@/components/GradientText";
import { Colors, Fonts, Type } from "@/constants/theme";

/** Thin gold divider fading to transparent — web .gold-line. */
export function GoldLine({
  width = 64,
  center = false,
  style,
}: {
  width?: number;
  center?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <LinearGradient
      colors={[Colors.gold, "rgba(184,150,62,0)"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[
        styles.line,
        { width },
        center ? styles.lineCenter : null,
        style,
      ]}
    />
  );
}

interface Props {
  /** Micro gold label above the heading. */
  eyebrow?: string;
  /** Plain serif part of the heading. */
  title: string;
  /** Italic gold-gradient words that finish the heading (web signature). */
  accent?: string;
  /** Optional italic serif subline below. */
  sub?: string;
  size?: number;
  center?: boolean;
  /** Show the fading gold line under the heading. */
  line?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Website section header: eyebrow → serif heading whose final words are
 * italic gold-gradient → gold line → optional italic subline.
 */
export default function SectionHeader({
  eyebrow,
  title,
  accent,
  sub,
  size = Type.h2,
  center = false,
  line = false,
  style,
}: Props) {
  const lineHeight = Math.round(size * 1.06);
  const words = title.trim().length > 0 ? title.trim().split(/\s+/) : [];
  const accentWords = accent ? accent.trim().split(/\s+/) : [];

  return (
    <View style={[center ? styles.center : null, style]}>
      {eyebrow ? (
        <Eyebrow center={center} style={styles.eyebrow}>
          {eyebrow}
        </Eyebrow>
      ) : null}
      <View
        style={[styles.wrap, center ? styles.wrapCenter : null]}
        accessibilityRole="header"
      >
        {words.map((word, i) => (
          <Text
            key={`w-${i}`}
            style={[styles.word, { fontSize: size, lineHeight }]}
          >
            {word}
          </Text>
        ))}
        {accentWords.map((word, i) => (
          <GradientText
            key={`a-${i}`}
            style={[styles.accentWord, { fontSize: size, lineHeight }]}
          >
            {word}
          </GradientText>
        ))}
      </View>
      {line ? <GoldLine center={center} style={styles.underline} /> : null}
      {sub ? (
        <Text style={[styles.sub, center ? styles.subCenter : null]}>{sub}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
  },
  eyebrow: {
    marginBottom: 12,
  },
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 8,
    alignItems: "baseline",
  },
  wrapCenter: {
    justifyContent: "center",
  },
  word: {
    fontFamily: Fonts.serif,
    color: Colors.cream,
    letterSpacing: -0.3,
  },
  accentWord: {
    fontFamily: Fonts.serifItalic,
    letterSpacing: -0.3,
  },
  underline: {
    marginTop: 14,
  },
  sub: {
    marginTop: 12,
    fontFamily: Fonts.serifItalic,
    fontSize: 17,
    lineHeight: 25,
    color: Colors.creamMuted,
  },
  subCenter: {
    textAlign: "center",
  },
  line: {
    height: 1,
  },
  lineCenter: {
    alignSelf: "center",
  },
});

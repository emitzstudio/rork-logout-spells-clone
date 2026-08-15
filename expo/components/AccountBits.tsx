import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

import { Colors, Fonts } from "@/constants/theme";
import type { TripStatus } from "@/data/account/models";

/* ------------------------------- Status chip ------------------------------ */

const STATUS_STYLES: Record<TripStatus, { label: string; color: string; bg: string; border: string }> = {
  upcoming: { label: "Upcoming", color: Colors.goldLight, bg: Colors.goldGlow, border: Colors.goldBorder },
  ongoing: { label: "Happening now", color: Colors.emeraldSoft, bg: Colors.emeraldBg, border: Colors.emeraldBorder },
  completed: { label: "Completed", color: "rgba(245,240,232,0.75)", bg: "rgba(245,240,232,0.06)", border: "rgba(245,240,232,0.16)" },
  cancelled: { label: "Cancelled", color: Colors.redSoft, bg: Colors.redBg, border: Colors.redBorder },
  draft: { label: "Draft", color: "rgba(245,240,232,0.55)", bg: "rgba(245,240,232,0.04)", border: "rgba(245,240,232,0.14)" },
};

/** Status chip with the website's colored dot. */
export function StatusChip({ status }: { status: TripStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <View style={[styles.chip, { backgroundColor: s.bg, borderColor: s.border }]}>
      <View style={[styles.chipDot, { backgroundColor: s.color }]} />
      <Text style={[styles.chipText, { color: s.color }]}>{s.label.toUpperCase()}</Text>
    </View>
  );
}

/* ------------------------------- Progress bar ----------------------------- */

export function GoldProgress({
  progress,
  height = 6,
  style,
}: {
  /** 0–1 */
  progress: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const pct = Math.max(0, Math.min(1, progress));
  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }, style]}>
      <View
        style={[
          styles.fill,
          { width: `${pct * 100}%`, height, borderRadius: height / 2 },
        ]}
      />
    </View>
  );
}

/* ------------------------------ Section title ----------------------------- */

export function SpaceSectionTitle({ children, right }: { children: string; right?: React.ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {right ?? null}
    </View>
  );
}

/* -------------------------------- Stars row ------------------------------- */

export function Stars({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Text
          key={star}
          style={{
            fontSize: size,
            lineHeight: size + 3,
            color: star <= Math.round(rating) ? Colors.goldLight : "rgba(245,240,232,0.2)",
          }}
        >
          ★
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  chipText: {
    fontFamily: Fonts.sansSemi,
    fontSize: 9,
    letterSpacing: 1.4,
  },
  track: {
    backgroundColor: "rgba(245,240,232,0.08)",
    overflow: "hidden",
  },
  fill: {
    backgroundColor: Colors.gold,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionTitle: {
    fontFamily: Fonts.serif,
    fontSize: 26,
    color: Colors.cream,
  },
  stars: {
    flexDirection: "row",
    gap: 2,
  },
});

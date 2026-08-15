import React, { useEffect, useState } from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

import { Colors, Fonts, Radius } from "@/constants/theme";

interface Parts {
  days: number;
  hours: number;
  minutes: number;
}

function partsUntil(target: Date): Parts {
  const diff = Math.max(0, target.getTime() - Date.now());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  return { days, hours, minutes };
}

/** One glass unit box — serif gold number over a micro label. */
export function UnitBox({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.box}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

interface CountdownProps {
  /** ISO date string or Date the ritual begins. */
  target: string | Date;
  style?: StyleProp<ViewStyle>;
}

/** The website's countdown boxes: days · hours · minutes until departure. */
export default function Countdown({ target, style }: CountdownProps) {
  const targetDate = typeof target === "string" ? new Date(target) : target;
  const [parts, setParts] = useState<Parts>(() => partsUntil(targetDate));

  useEffect(() => {
    const tick = () => setParts(partsUntil(targetDate));
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetDate.getTime()]);

  return (
    <View style={[styles.row, style]}>
      <UnitBox value={String(parts.days)} label="days" />
      <UnitBox value={String(parts.hours).padStart(2, "0")} label="hours" />
      <UnitBox value={String(parts.minutes).padStart(2, "0")} label="mins" />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 10,
  },
  box: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: Radius.md,
    backgroundColor: "rgba(10,8,6,0.45)",
    borderWidth: 1,
    borderColor: Colors.goldBorderSoft,
  },
  value: {
    fontFamily: Fonts.serifSemi,
    fontSize: 28,
    lineHeight: 32,
    color: Colors.goldHi,
  },
  label: {
    marginTop: 2,
    fontFamily: Fonts.sansMedium,
    fontSize: 9,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: "rgba(245,240,232,0.5)",
  },
});

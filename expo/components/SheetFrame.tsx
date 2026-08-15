import { X } from "lucide-react-native";
import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

import { PressableScale } from "@/components/Buttons";
import { Colors, Fonts, Radius } from "@/constants/theme";

interface Props {
  children: React.ReactNode;
  /** Gold micro title centered in the header row. */
  title?: string;
  onClose?: () => void;
  /** 1-based current step — renders the gold progress dots. */
  step?: number;
  totalSteps?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * One bottom-sheet chrome for the whole app: dark panel, gold hairline top
 * border, drag handle, optional step dots — the website's modal voice.
 */
export default function SheetFrame({
  children,
  title,
  onClose,
  step,
  totalSteps,
  style,
}: Props) {
  return (
    <View style={[styles.sheet, style]}>
      <View style={styles.handle} />
      {title || onClose ? (
        <View style={styles.headerRow}>
          <View style={styles.headerSide} />
          {title ? <Text style={styles.title}>{title}</Text> : <View />}
          <View style={styles.headerSide}>
            {onClose ? (
              <PressableScale onPress={onClose} scaleTo={0.88} style={styles.close}>
                <X size={16} color={Colors.creamMuted} />
              </PressableScale>
            ) : null}
          </View>
        </View>
      ) : null}
      {step && totalSteps ? (
        <View style={styles.dots}>
          {Array.from({ length: totalSteps }, (_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i + 1 === step ? styles.dotActive : null,
                i + 1 < step ? styles.dotDone : null,
              ]}
            />
          ))}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: Colors.panel,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: Colors.goldBorderSoft,
    paddingTop: 10,
    overflow: "hidden",
  },
  handle: {
    alignSelf: "center",
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(245,240,232,0.18)",
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  headerSide: {
    width: 32,
    alignItems: "flex-end",
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontFamily: Fonts.sansSemi,
    fontSize: 11,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: Colors.goldLight,
  },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(245,240,232,0.06)",
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 7,
    marginTop: 10,
    marginBottom: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(245,240,232,0.15)",
  },
  dotActive: {
    backgroundColor: Colors.goldLight,
    width: 18,
    shadowColor: Colors.gold,
    shadowOpacity: 0.8,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  dotDone: {
    backgroundColor: Colors.goldBorder,
  },
});

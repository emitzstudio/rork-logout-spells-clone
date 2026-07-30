import React from "react";
import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from "react-native";

import { Colors, Fonts } from "@/constants/theme";

interface Props {
  children: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  size?: number;
  color?: string;
  /** Renders a small gold line before the label. */
  withLine?: boolean;
  center?: boolean;
}

/** Uppercase, wide-tracked gold micro label used above every section title. */
export default function Eyebrow({
  children,
  style,
  textStyle,
  size = 11,
  color = Colors.gold,
  withLine = false,
  center = false,
}: Props) {
  return (
    <View
      style={[
        styles.row,
        center ? styles.center : null,
        style,
      ]}
    >
      {withLine ? <View style={[styles.line, { backgroundColor: color }]} /> : null}
      <Text
        style={[
          styles.text,
          { fontSize: size, letterSpacing: size * 0.32, color },
          textStyle,
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  center: {
    justifyContent: "center",
  },
  line: {
    width: 24,
    height: 1,
    opacity: 0.8,
  },
  text: {
    fontFamily: Fonts.sansSemi,
    textTransform: "uppercase",
  },
});

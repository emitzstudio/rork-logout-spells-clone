import React from "react";
import { StyleProp, StyleSheet, Text, TextStyle } from "react-native";

import { Colors, Fonts } from "@/constants/theme";

interface Props {
  children: React.ReactNode;
  size?: number;
  color?: string;
  /** Slight tilt in degrees, like a note scribbled in a margin. */
  tilt?: number;
  center?: boolean;
  style?: StyleProp<TextStyle>;
}

/** Handwritten margin note — the website's Caveat accents. */
export default function Handwritten({
  children,
  size = 21,
  color = Colors.goldLight,
  tilt = -2,
  center = false,
  style,
}: Props) {
  return (
    <Text
      style={[
        styles.text,
        {
          fontSize: size,
          lineHeight: Math.round(size * 1.25),
          color,
          transform: [{ rotate: `${tilt}deg` }],
        },
        center ? styles.center : null,
        style,
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontFamily: Fonts.hand,
  },
  center: {
    textAlign: "center",
  },
});

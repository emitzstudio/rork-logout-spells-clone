import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { Colors } from "@/constants/theme";

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  radius?: number;
  padded?: boolean;
}

/** Signature glass card: cream-tinted translucent surface with a hairline border. */
export default function GlassCard({ children, style, radius = 18, padded = true }: Props) {
  return (
    <View
      style={[
        styles.card,
        { borderRadius: radius },
        padded ? styles.padded : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    overflow: "hidden",
  },
  padded: {
    padding: 22,
  },
});

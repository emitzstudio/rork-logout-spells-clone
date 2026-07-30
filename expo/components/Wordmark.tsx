import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

import GradientText from "@/components/GradientText";
import { Colors, Fonts } from "@/constants/theme";

interface Props {
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/** The LOGOUT / Spells brand wordmark. */
export default function Wordmark({ size = 1, style }: Props) {
  return (
    <View style={[styles.container, style]}>
      <Text
        style={{
          fontFamily: Fonts.sansSemi,
          fontSize: 14 * size,
          letterSpacing: 5.5 * size,
          color: Colors.cream,
        }}
      >
        LOGOUT
      </Text>
      <GradientText
        style={{
          fontFamily: Fonts.serifSemiItalic,
          fontSize: 23 * size,
          marginTop: -4 * size,
        }}
      >
        Spells
      </GradientText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
});

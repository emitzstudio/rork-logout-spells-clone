import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Platform, StyleProp, Text, TextStyle } from "react-native";

import { GOLD_GRADIENT } from "@/constants/theme";

interface Props {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  colors?: readonly [string, string, string];
  numberOfLines?: number;
  /** Stretch to fill the parent width (needed for wrapping multi-line text). */
  block?: boolean;
}

/** Serif text filled with the signature gold gradient. */
export default function GradientText({
  children,
  style,
  colors = GOLD_GRADIENT,
  numberOfLines,
  block = false,
}: Props) {
  if (Platform.OS === "web") {
    const webStyle = {
      backgroundImage: `linear-gradient(100deg, ${colors[0]} 0%, ${colors[1]} 55%, ${colors[2]} 100%)`,
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      WebkitTextFillColor: "transparent",
      color: colors[1],
    } as unknown as TextStyle;
    return (
      <Text numberOfLines={numberOfLines} style={[style, webStyle]}>
        {children}
      </Text>
    );
  }

  return (
    <MaskedView
      style={block ? { alignSelf: "stretch" } : undefined}
      maskElement={
        <Text
          numberOfLines={numberOfLines}
          style={[style, { backgroundColor: "transparent" }]}
        >
          {children}
        </Text>
      }
    >
      <LinearGradient
        colors={[colors[0], colors[1], colors[2]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.85 }}
      >
        <Text numberOfLines={numberOfLines} style={[style, { opacity: 0 }]}>
          {children}
        </Text>
      </LinearGradient>
    </MaskedView>
  );
}

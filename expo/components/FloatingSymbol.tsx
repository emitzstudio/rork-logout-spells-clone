import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleProp, TextStyle } from "react-native";

import { Colors } from "@/constants/theme";

interface Props {
  symbol: string;
  size: number;
  color?: string;
  opacity?: number;
  glow?: boolean;
  style?: StyleProp<TextStyle>;
  duration?: number;
}

/** A brand glyph that gently floats and sways. */
export default function FloatingSymbol({
  symbol,
  size,
  color = Colors.goldLight,
  opacity = 1,
  glow = false,
  style,
  duration = 5200,
}: Props) {
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [float, duration]);

  return (
    <Animated.Text
      style={[
        {
          fontSize: size,
          color,
          opacity,
          transform: [
            {
              translateY: float.interpolate({
                inputRange: [0, 1],
                outputRange: [6, -6],
              }),
            },
            {
              rotate: float.interpolate({
                inputRange: [0, 1],
                outputRange: ["-3deg", "3deg"],
              }),
            },
          ],
        },
        glow
          ? {
              textShadowColor: "rgba(207,168,90,0.55)",
              textShadowRadius: 18,
              textShadowOffset: { width: 0, height: 0 },
            }
          : null,
        style,
      ]}
    >
      {symbol}
    </Animated.Text>
  );
}

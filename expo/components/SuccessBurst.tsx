import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { AnimatedPath } from "@/components/AnimatedSvgPath";
import { Colors } from "@/constants/theme";
import { hapticSuccess } from "@/lib/haptics";

const RING_LENGTH = 2 * Math.PI * 30;
const TICK_LENGTH = 40;

interface Props {
  size?: number;
  /** Fires the success haptic when the ring finishes drawing. */
  haptic?: boolean;
}

/** The website's confirmation moment: a gold ring draws itself, then the tick. */
export default function SuccessBurst({ size = 84, haptic = true }: Props) {
  const ring = useRef(new Animated.Value(RING_LENGTH)).current;
  const tick = useRef(new Animated.Value(TICK_LENGTH)).current;
  const scale = useRef(new Animated.Value(0.7)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(ring, {
          toValue: 0,
          duration: 700,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.spring(scale, {
          toValue: 1,
          speed: 16,
          bounciness: 9,
          useNativeDriver: false,
        }),
      ]),
      Animated.timing(tick, {
        toValue: 0,
        duration: 340,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.timing(glow, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
    ]).start(() => {
      if (haptic) hapticSuccess();
    });
  }, [ring, tick, scale, glow, haptic]);

  return (
    <Animated.View style={[styles.wrap, { width: size, height: size, transform: [{ scale }] }]}>
      <Animated.View style={[styles.halo, { opacity: glow }]} />
      <View style={StyleSheet.absoluteFill}>
        <Svg width={size} height={size} viewBox="0 0 68 68">
          <Circle
            cx={34}
            cy={34}
            r={30}
            stroke="rgba(184,150,62,0.18)"
            strokeWidth={1.5}
            fill="rgba(184,150,62,0.06)"
          />
          <AnimatedPath
            d="M34 4 a30 30 0 1 1 -0.01 0"
            stroke={Colors.goldLight}
            strokeWidth={2}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${RING_LENGTH}`}
            strokeDashoffset={ring}
          />
          <AnimatedPath
            d="M22 35 L30.5 43.5 L47 25"
            stroke={Colors.goldHi}
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            strokeDasharray={`${TICK_LENGTH}`}
            strokeDashoffset={tick}
          />
        </Svg>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  halo: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    backgroundColor: "rgba(184,150,62,0.14)",
    shadowColor: Colors.gold,
    shadowOpacity: 0.6,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
});

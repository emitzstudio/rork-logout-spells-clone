import { LinearGradient } from "expo-linear-gradient";
import React, { memo, useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from "react-native";
import Svg, { Defs, Ellipse, RadialGradient, Rect, Stop } from "react-native-svg";

const STAR_COLORS = ["#CFA85A", "#B8963E", "#F0DFAE", "#8B7956"] as const;

interface StarSpec {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  minOpacity: number;
  maxOpacity: number;
  twinkleDuration: number;
  delay: number;
  drift: number;
  driftDuration: number;
  glyph: boolean;
}

function makeStars(width: number, height: number): StarSpec[] {
  const stars: StarSpec[] = [];
  for (let i = 0; i < 52; i++) {
    const glyph = i % 12 === 0;
    stars.push({
      id: i,
      x: Math.random() * width,
      y: Math.random() * height,
      size: glyph ? 9 + Math.random() * 6 : 1.5 + Math.random() * 2.4,
      color: STAR_COLORS[i % STAR_COLORS.length],
      minOpacity: 0.06 + Math.random() * 0.12,
      maxOpacity: 0.4 + Math.random() * 0.45,
      twinkleDuration: 1600 + Math.random() * 3400,
      delay: Math.random() * 4000,
      drift: 12 + Math.random() * 26,
      driftDuration: 16000 + Math.random() * 20000,
      glyph,
    });
  }
  return stars;
}

const Star = memo(function Star({ spec }: { spec: StarSpec }) {
  const opacity = useRef(new Animated.Value(spec.minOpacity)).current;
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const twinkle = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: spec.maxOpacity,
          duration: spec.twinkleDuration,
          delay: spec.delay,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: spec.minOpacity,
          duration: spec.twinkleDuration,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    const drifting = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: spec.drift,
          duration: spec.driftDuration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: spec.driftDuration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    twinkle.start();
    drifting.start();
    return () => {
      twinkle.stop();
      drifting.stop();
    };
  }, [drift, opacity, spec]);

  if (spec.glyph) {
    return (
      <Animated.Text
        style={[
          styles.glyph,
          {
            left: spec.x,
            top: spec.y,
            fontSize: spec.size,
            color: spec.color,
            opacity,
            transform: [{ translateY: drift }],
          },
        ]}
      >
        ✦
      </Animated.Text>
    );
  }

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: spec.x,
        top: spec.y,
        width: spec.size,
        height: spec.size,
        borderRadius: spec.size / 2,
        backgroundColor: spec.color,
        opacity,
        transform: [{ translateY: drift }],
      }}
    />
  );
});

/**
 * Site-wide golden starfield rendered once behind every screen — mirrors
 * the web StarBackdrop: gradient sky, gold glows top & bottom, drifting
 * gold dust and a soft edge vignette.
 */
function Starfield() {
  const { width, height } = useWindowDimensions();
  const stars = useMemo(() => makeStars(width, height + 80), [width, height]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={["#181613", "#1C1C1A", "#121110"]}
        locations={[0, 0.48, 1]}
        style={StyleSheet.absoluteFill}
      />
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="skyTop" cx="50%" cy="0%" rx="90%" ry="60%">
            <Stop offset="0%" stopColor="#B8963E" stopOpacity={0.07} />
            <Stop offset="100%" stopColor="#B8963E" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="skyBottom" cx="50%" cy="100%" rx="70%" ry="50%">
            <Stop offset="0%" stopColor="#B8963E" stopOpacity={0.05} />
            <Stop offset="100%" stopColor="#B8963E" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height * 0.6} fill="url(#skyTop)" />
        <Rect x={0} y={height * 0.5} width={width} height={height * 0.5} fill="url(#skyBottom)" />
      </Svg>
      {stars.map((s) => (
        <Star key={s.id} spec={s} />
      ))}
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="vignette" cx="50%" cy="50%" rx="72%" ry="58%">
            <Stop offset="0%" stopColor="#080705" stopOpacity={0} />
            <Stop offset="58%" stopColor="#080705" stopOpacity={0} />
            <Stop offset="100%" stopColor="#080705" stopOpacity={0.5} />
          </RadialGradient>
        </Defs>
        <Ellipse cx={width / 2} cy={height / 2} rx={width} ry={height} fill="url(#vignette)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  glyph: {
    position: "absolute",
  },
});

export default memo(Starfield);

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

/**
 * Magic dust — the gold sparkle burst that plays over the team cards when
 * they flip (ported from the website's MagicDust). Every time `trigger`
 * increments, a fresh burst of particles scatters and fades. Purely
 * decorative: pointerEvents none, native-driver transforms only.
 */

const DUST_COLORS = ["#CFA85A", "#F0DFAE", "#B8963E", "#F5F0E8"] as const;
const SYMBOLS = ["✦", "✧", "❋"] as const;
const PARTICLES_PER_BURST = 16;

interface ParticleSpec {
  id: string;
  /** Start position as a fraction of the container. */
  x: number;
  y: number;
  /** Flight vector in px. */
  dx: number;
  dy: number;
  size: number;
  color: string;
  /** Some particles are tiny star glyphs instead of dots. */
  symbol: string | null;
  delay: number;
  duration: number;
}

const makeBurst = (burstId: number): ParticleSpec[] =>
  Array.from({ length: PARTICLES_PER_BURST }, (_, i) => {
    const angle = Math.random() * Math.PI * 2;
    const distance = 26 + Math.random() * 64;
    return {
      id: `${burstId}-${i}`,
      x: 0.18 + Math.random() * 0.64,
      y: 0.18 + Math.random() * 0.64,
      dx: Math.cos(angle) * distance,
      dy: Math.sin(angle) * distance - 18,
      size: 3 + Math.random() * 5,
      color: DUST_COLORS[Math.floor(Math.random() * DUST_COLORS.length)],
      symbol: Math.random() < 0.3 ? SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)] : null,
      delay: Math.random() * 120,
      duration: 620 + Math.random() * 420,
    };
  });

function Particle({ spec, onDone }: { spec: ParticleSpec; onDone: () => void }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: spec.duration,
      delay: spec.delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start(({ finished }) => {
      if (finished) onDone();
    });
    return () => anim.stop();
  }, [progress, spec, onDone]);

  const style = {
    position: "absolute" as const,
    left: `${spec.x * 100}%` as const,
    top: `${spec.y * 100}%` as const,
    opacity: progress.interpolate({
      inputRange: [0, 0.15, 0.7, 1],
      outputRange: [0, 1, 0.9, 0],
    }),
    transform: [
      { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, spec.dx] }) },
      { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, spec.dy] }) },
      { scale: progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.4, 1, 0.2] }) },
    ],
  };

  if (spec.symbol) {
    return (
      <Animated.View style={style}>
        <Text style={[styles.symbol, { color: spec.color, fontSize: spec.size + 6 }]}>
          {spec.symbol}
        </Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        style,
        {
          width: spec.size,
          height: spec.size,
          borderRadius: spec.size / 2,
          backgroundColor: spec.color,
          shadowColor: spec.color,
          shadowOpacity: 0.9,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 0 },
        },
      ]}
    />
  );
}

interface MagicDustProps {
  /** Increment to fire a new burst of dust. */
  trigger: number;
}

export default function MagicDust({ trigger }: MagicDustProps) {
  const [particles, setParticles] = useState<ParticleSpec[]>([]);
  const lastTrigger = useRef<number>(0);

  useEffect(() => {
    if (trigger === 0 || trigger === lastTrigger.current) return;
    lastTrigger.current = trigger;
    setParticles((prev) => [...prev, ...makeBurst(trigger)]);
  }, [trigger]);

  const removeParticle = useMemo(
    () => (id: string) => setParticles((prev) => prev.filter((p) => p.id !== id)),
    [],
  );

  if (particles.length === 0) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((spec) => (
        <Particle key={spec.id} spec={spec} onDone={() => removeParticle(spec.id)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  symbol: {
    fontFamily: undefined,
  },
});

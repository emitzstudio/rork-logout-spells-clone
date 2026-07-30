import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Heart, RotateCcw, X } from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Svg, { Polygon } from "react-native-svg";

import { PressableScale } from "@/components/Buttons";
import GoldGlow from "@/components/GoldGlow";
import { Colors, Fonts } from "@/constants/theme";
import { formatINR, gradientColors } from "@/data/spells";
import type { ManagedSpell } from "@/data/spells";
import { hapticHeavy, hapticLight, hapticSuccess } from "@/lib/haptics";

const CARD_H = 480;

/* ------------------------------ Hearts burst ------------------------------ */

interface HeartSpec {
  id: number;
  x: number;
  y: number;
  rise: number;
  drift: number;
  rotate: number;
  delay: number;
  duration: number;
  scale: number;
  filled: boolean;
  size: number;
}

const FloatingHeart = React.memo(function FloatingHeart({ spec }: { spec: HeartSpec }) {
  const p = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(p, {
      toValue: 1,
      duration: spec.duration,
      delay: spec.delay,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [p, spec]);

  return (
    <Animated.View
      style={{
        position: "absolute",
        opacity: p.interpolate({
          inputRange: [0, 0.08, 0.72, 1],
          outputRange: [0, 1, 1, 0],
        }),
        transform: [
          {
            translateX: p.interpolate({
              inputRange: [0, 1],
              outputRange: [spec.x, spec.x + spec.drift],
            }),
          },
          {
            translateY: p.interpolate({
              inputRange: [0, 1],
              outputRange: [spec.y, spec.y - spec.rise],
            }),
          },
          {
            rotate: p.interpolate({
              inputRange: [0, 1],
              outputRange: ["0deg", `${spec.rotate}deg`],
            }),
          },
          {
            scale: p.interpolate({
              inputRange: [0, 0.2, 1],
              outputRange: [0.3, spec.scale, spec.scale * 0.9],
            }),
          },
        ],
      }}
    >
      <Heart
        size={spec.size}
        color={spec.filled ? Colors.goldLight : "rgba(245,240,232,0.75)"}
        fill={spec.filled ? Colors.gold : "transparent"}
        strokeWidth={1.6}
      />
    </Animated.View>
  );
});

function HeartsBurst({ onComplete }: { onComplete: () => void }) {
  const specs = useMemo<HeartSpec[]>(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 150,
        y: 30 + Math.random() * 90,
        rise: 210 + Math.random() * 200,
        drift: (Math.random() - 0.5) * 150,
        rotate: (Math.random() - 0.5) * 55,
        delay: i * 45,
        duration: 1050 + Math.random() * 550,
        scale: 0.75 + Math.random() * 0.6,
        filled: Math.random() > 0.22,
        size: 13 + Math.random() * 18,
      })),
    [],
  );
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.timing(glow, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
    const t = setTimeout(onComplete, 2000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View pointerEvents="none" style={styles.effectFill}>
      <Animated.View
        style={{
          position: "absolute",
          opacity: glow,
          transform: [
            { scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.25] }) },
          ],
        }}
      >
        <GoldGlow size={300} opacity={0.4} style={{ position: "relative" }} />
      </Animated.View>
      {specs.map((s) => (
        <FloatingHeart key={s.id} spec={s} />
      ))}
    </View>
  );
}

/* ------------------------------ Glass shatter ------------------------------ */

interface ShardSpec {
  id: number;
  ox: number;
  oy: number;
  dx: number;
  dy: number;
  rotate: number;
  duration: number;
  delay: number;
  points: string;
  fill: string;
  size: number;
}

const Shard = React.memo(function Shard({ spec }: { spec: ShardSpec }) {
  const p = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(p, {
      toValue: 1,
      duration: spec.duration,
      delay: spec.delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [p, spec]);

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: spec.ox,
        top: spec.oy,
        opacity: p.interpolate({
          inputRange: [0, 0.55, 1],
          outputRange: [0.95, 0.8, 0],
        }),
        transform: [
          { translateX: p.interpolate({ inputRange: [0, 1], outputRange: [0, spec.dx] }) },
          { translateY: p.interpolate({ inputRange: [0, 1], outputRange: [0, spec.dy] }) },
          {
            rotate: p.interpolate({
              inputRange: [0, 1],
              outputRange: ["0deg", `${spec.rotate}deg`],
            }),
          },
          { scale: p.interpolate({ inputRange: [0, 1], outputRange: [1, 0.75] }) },
        ],
      }}
    >
      <Svg width={spec.size} height={spec.size}>
        <Polygon
          points={spec.points}
          fill={spec.fill}
          stroke="rgba(207,168,90,0.35)"
          strokeWidth={0.8}
        />
      </Svg>
    </Animated.View>
  );
});

interface SparkSpec {
  id: number;
  dx: number;
  dy: number;
  size: number;
  duration: number;
}

const ImpactSpark = React.memo(function ImpactSpark({ spec }: { spec: SparkSpec }) {
  const p = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(p, {
      toValue: 1,
      duration: spec.duration,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();
  }, [p, spec]);

  return (
    <Animated.View
      style={{
        position: "absolute",
        width: spec.size,
        height: spec.size,
        borderRadius: spec.size / 2,
        backgroundColor: Colors.goldHi,
        opacity: p.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 0.9, 0] }),
        transform: [
          { translateX: p.interpolate({ inputRange: [0, 1], outputRange: [0, spec.dx] }) },
          { translateY: p.interpolate({ inputRange: [0, 1], outputRange: [0, spec.dy] }) },
        ],
      }}
    />
  );
});

interface ShatterProps {
  colors: string[];
  cardW: number;
  offsetX: number;
  onComplete: () => void;
}

function ShatterEffect({ colors, cardW, offsetX, onComplete }: ShatterProps) {
  const impact = useMemo(
    () => ({
      x: cardW * (0.28 + Math.random() * 0.44),
      y: CARD_H * (0.22 + Math.random() * 0.48),
    }),
    [cardW],
  );

  const shards = useMemo<ShardSpec[]>(
    () =>
      Array.from({ length: 24 }, (_, i) => {
        const ox = Math.random() * cardW;
        const oy = Math.random() * CARD_H;
        let vx = ox - impact.x;
        let vy = oy - impact.y;
        const len = Math.hypot(vx, vy) || 1;
        vx /= len;
        vy /= len;
        const dist = 130 + Math.random() * 180;
        const size = 18 + Math.random() * 34;
        const p1 = `${(Math.random() * size * 0.3).toFixed(1)},0`;
        const p2 = `${size.toFixed(1)},${(Math.random() * size * 0.6).toFixed(1)}`;
        const p3 = `${(Math.random() * size).toFixed(1)},${size.toFixed(1)}`;
        const fill =
          i % 6 === 0
            ? "rgba(207,168,90,0.85)"
            : i % 2 === 0
              ? colors[0]
              : (colors[1] ?? colors[0]);
        return {
          id: i,
          ox,
          oy,
          dx: vx * dist,
          dy: vy * dist + 70,
          rotate: (Math.random() - 0.5) * 420,
          duration: 640 + Math.random() * 400,
          delay: (len / Math.hypot(cardW, CARD_H)) * 150,
          points: `${p1} ${p2} ${p3}`,
          fill,
          size,
        };
      }),
    [cardW, colors, impact],
  );

  const sparks = useMemo<SparkSpec[]>(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const angle = Math.random() * Math.PI * 2;
        const dist = 50 + Math.random() * 130;
        return {
          id: i,
          dx: Math.cos(angle) * dist,
          dy: Math.sin(angle) * dist,
          size: 2 + Math.random() * 3,
          duration: 450 + Math.random() * 400,
        };
      }),
    [],
  );

  const flash = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(flash, {
      toValue: 1,
      duration: 450,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
    const t = setTimeout(onComplete, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View
      pointerEvents="none"
      style={[styles.effectFill, { transform: [{ translateX: offsetX }] }]}
    >
      <View style={{ width: cardW, height: CARD_H }}>
        <Animated.View
          style={{
            position: "absolute",
            left: impact.x - 60,
            top: impact.y - 60,
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: Colors.goldHi,
            opacity: flash.interpolate({
              inputRange: [0, 0.2, 1],
              outputRange: [0, 0.75, 0],
            }),
            transform: [
              { scale: flash.interpolate({ inputRange: [0, 1], outputRange: [0.25, 2.2] }) },
            ],
          }}
        />
        <View style={{ position: "absolute", left: impact.x, top: impact.y }}>
          {sparks.map((s) => (
            <ImpactSpark key={s.id} spec={s} />
          ))}
        </View>
        {shards.map((s) => (
          <Shard key={s.id} spec={s} />
        ))}
      </View>
    </View>
  );
}

/* -------------------------------- Card face -------------------------------- */

function DeckCardFace({ spell, cardW }: { spell: ManagedSpell; cardW: number }) {
  const colors = gradientColors(spell.gradient);

  return (
    <LinearGradient
      colors={colors as [string, string, ...string[]]}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 0.85, y: 1 }}
      style={[styles.cardFace, { width: cardW, height: CARD_H }]}
    >
      {spell.image !== "" ? (
        <>
          <Image source={{ uri: spell.image }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
          <LinearGradient
            colors={["rgba(10,8,6,0.25)", "rgba(10,8,6,0.55)", "rgba(10,8,6,0.95)"]}
            style={StyleSheet.absoluteFill}
          />
        </>
      ) : (
        <Text style={styles.cardSymbol}>{spell.symbol}</Text>
      )}
      <View style={styles.cardBody}>
        <Text style={styles.cardType}>{spell.type.toUpperCase()}</Text>
        <Text style={styles.cardName}>{spell.name}</Text>
        <Text style={styles.cardTagline}>{spell.hook}</Text>
        <Text style={styles.cardMeta}>
          UP TO {spell.seatsTotal} PEOPLE · {formatINR(spell.price)} PER SEAT
        </Text>
      </View>
    </LinearGradient>
  );
}

/* --------------------------------- The deck -------------------------------- */

type EffectInstance =
  | { key: number; kind: "hearts" }
  | { key: number; kind: "shatter"; colors: string[]; offsetX: number };

interface SwipeDeckProps {
  spells: ManagedSpell[];
  onSave: (spell: ManagedSpell) => void;
  onOpen: (spell: ManagedSpell) => void;
  onReset: () => void;
}

/** Tinder-style deck of live spells — hearts burst on save, glass shatter on skip. */
export default function SwipeDeck({ spells, onSave, onOpen, onReset }: SwipeDeckProps) {
  const { width } = useWindowDimensions();
  const cardW = Math.min(width - 56, 330);

  const [index, setIndex] = useState<number>(0);
  const [effects, setEffects] = useState<EffectInstance[]>([]);
  const effectKeyRef = useRef<number>(0);
  const animatingRef = useRef<boolean>(false);
  const indexRef = useRef<number>(0);

  const pan = useRef(new Animated.ValueXY()).current;
  const settle = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  const removeEffect = (key: number) => {
    setEffects((prev) => prev.filter((e) => e.key !== key));
  };

  const advance = () => {
    setIndex((i) => i + 1);
    pan.setValue({ x: 0, y: 0 });
    settle.setValue(0.94);
    Animated.spring(settle, {
      toValue: 1,
      friction: 6,
      tension: 90,
      useNativeDriver: false,
    }).start(() => {
      animatingRef.current = false;
    });
  };

  const swipeRight = (dy: number) => {
    const spell = spells[indexRef.current];
    if (!spell || animatingRef.current) return;
    animatingRef.current = true;
    hapticSuccess();
    effectKeyRef.current += 1;
    setEffects((prev) => [...prev, { key: effectKeyRef.current, kind: "hearts" }]);
    Animated.timing(pan, {
      toValue: { x: width * 1.35, y: dy * 0.4 - 46 },
      duration: 430,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start(() => {
      onSave(spell);
      advance();
    });
  };

  const swipeLeft = () => {
    const spell = spells[indexRef.current];
    if (!spell || animatingRef.current) return;
    animatingRef.current = true;
    hapticHeavy();
    const driftX = -width * 0.3;
    Animated.timing(pan, {
      toValue: { x: driftX, y: 8 },
      duration: 150,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start(() => {
      effectKeyRef.current += 1;
      setEffects((prev) => [
        ...prev,
        {
          key: effectKeyRef.current,
          kind: "shatter",
          colors: gradientColors(spell.gradient),
          offsetX: driftX,
        },
      ]);
      advance();
    });
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_evt, g) =>
          !animatingRef.current &&
          Math.abs(g.dx) > 7 &&
          Math.abs(g.dx) > Math.abs(g.dy) * 1.15,
        onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
          useNativeDriver: false,
        }),
        onPanResponderTerminationRequest: () => false,
        onPanResponderRelease: (_evt, g) => {
          if (g.dx > 110 || g.vx > 0.9) {
            swipeRight(g.dy);
          } else if (g.dx < -110 || g.vx < -0.9) {
            swipeLeft();
          } else {
            Animated.spring(pan, {
              toValue: { x: 0, y: 0 },
              friction: 5,
              tension: 70,
              useNativeDriver: false,
            }).start();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            friction: 5,
            tension: 70,
            useNativeDriver: false,
          }).start();
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [width, spells],
  );

  const rotate = pan.x.interpolate({
    inputRange: [-width * 0.6, 0, width * 0.6],
    outputRange: ["-14deg", "0deg", "14deg"],
    extrapolate: "clamp",
  });
  const savedStamp = pan.x.interpolate({
    inputRange: [40, 140],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const skipStamp = pan.x.interpolate({
    inputRange: [-140, -40],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });
  const behindScale = pan.x.interpolate({
    inputRange: [-260, 0, 260],
    outputRange: [1, 0.95, 1],
    extrapolate: "clamp",
  });
  const behindTranslate = pan.x.interpolate({
    inputRange: [-260, 0, 260],
    outputRange: [0, 16, 0],
    extrapolate: "clamp",
  });

  const visible = spells.slice(index, index + 3);
  const deckEmpty = index >= spells.length;

  return (
    <View>
      <View style={[styles.deckZone, { height: CARD_H + 52 }]}>
        <GoldGlow
          size={380}
          opacity={0.13}
          style={{ alignSelf: "center", top: (CARD_H + 52) / 2 - 190 }}
        />

        {deckEmpty ? (
          <View style={[styles.emptyCard, { width: cardW }]}>
            <Text style={styles.emptySymbol}>✦</Text>
            <Text style={styles.emptyText}>
              You&apos;ve seen all the spells. The ones that called to you are saved below.
            </Text>
            <PressableScale
              onPress={() => {
                hapticLight();
                setIndex(0);
                onReset();
              }}
              style={styles.castAgain}
              testID="deck-reset"
            >
              <View style={styles.castAgainRow}>
                <RotateCcw size={15} color={Colors.goldLight} />
                <Text style={styles.castAgainText}>CAST AGAIN</Text>
              </View>
            </PressableScale>
          </View>
        ) : (
          visible
            .map((spell, i) => {
              const isTop = i === 0;
              const isSecond = i === 1;
              if (isTop) {
                return (
                  <Animated.View
                    key={spell.id}
                    {...panResponder.panHandlers}
                    style={[
                      styles.cardSlot,
                      {
                        zIndex: 30,
                        transform: [
                          { translateX: pan.x },
                          { translateY: pan.y },
                          { rotate },
                          { scale: settle },
                        ],
                      },
                    ]}
                  >
                    <Pressable onPress={() => onOpen(spell)}>
                      <DeckCardFace spell={spell} cardW={cardW} />
                      <Animated.View
                        style={[styles.stamp, styles.stampSaved, { opacity: savedStamp }]}
                      >
                        <Text style={styles.stampSavedText}>SAVED ✨</Text>
                      </Animated.View>
                      <Animated.View
                        style={[styles.stamp, styles.stampSkip, { opacity: skipStamp }]}
                      >
                        <Text style={styles.stampSkipText}>SKIP</Text>
                      </Animated.View>
                    </Pressable>
                  </Animated.View>
                );
              }
              return (
                <Animated.View
                  key={spell.id}
                  pointerEvents="none"
                  style={[
                    styles.cardSlot,
                    isSecond
                      ? {
                          zIndex: 20,
                          transform: [{ scale: behindScale }, { translateY: behindTranslate }],
                        }
                      : {
                          zIndex: 10,
                          opacity: 0.7,
                          transform: [{ scale: 0.9 }, { translateY: 32 }],
                        },
                  ]}
                >
                  <DeckCardFace spell={spell} cardW={cardW} />
                </Animated.View>
              );
            })
            .reverse()
        )}

        <View pointerEvents="none" style={styles.effectLayer}>
          {effects.map((e) =>
            e.kind === "hearts" ? (
              <HeartsBurst key={e.key} onComplete={() => removeEffect(e.key)} />
            ) : (
              <ShatterEffect
                key={e.key}
                colors={e.colors}
                cardW={cardW}
                offsetX={e.offsetX}
                onComplete={() => removeEffect(e.key)}
              />
            ),
          )}
        </View>
      </View>

      <View style={styles.actions}>
        <PressableScale
          onPress={() => {
            if (!deckEmpty) swipeLeft();
          }}
          scaleTo={0.88}
          haptic="none"
          style={[styles.actionButton, styles.actionSkip, deckEmpty ? styles.actionDisabled : null]}
          testID="deck-skip"
        >
          <X size={22} color="rgba(245,240,232,0.6)" strokeWidth={2.2} />
        </PressableScale>
        <PressableScale
          onPress={() => {
            if (!deckEmpty) swipeRight(0);
          }}
          scaleTo={0.88}
          haptic="none"
          style={[styles.actionButton, styles.actionLove, deckEmpty ? styles.actionDisabled : null]}
          testID="deck-save"
        >
          <Heart size={22} color={Colors.gold} strokeWidth={1.8} />
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  deckZone: {
    alignItems: "center",
    justifyContent: "center",
  },
  cardSlot: {
    position: "absolute",
    alignSelf: "center",
  },
  cardFace: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.1)",
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  cardSymbol: {
    position: "absolute",
    alignSelf: "center",
    top: "22%",
    fontFamily: Fonts.serif,
    fontSize: 130,
    color: "rgba(184,150,62,0.3)",
  },
  cardBody: {
    padding: 28,
    gap: 8,
  },
  cardType: {
    fontFamily: Fonts.sansSemi,
    fontSize: 10,
    letterSpacing: 3.2,
    color: Colors.gold,
  },
  cardName: {
    fontFamily: Fonts.serif,
    fontSize: 34,
    lineHeight: 38,
    color: Colors.cream,
  },
  cardTagline: {
    fontFamily: Fonts.serifItalic,
    fontSize: 17,
    lineHeight: 23,
    color: "rgba(245,240,232,0.7)",
  },
  cardMeta: {
    marginTop: 6,
    fontFamily: Fonts.sans,
    fontSize: 11,
    letterSpacing: 1.8,
    color: "rgba(184,150,62,0.8)",
  },
  stamp: {
    position: "absolute",
    top: 24,
    borderWidth: 2,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  stampSaved: {
    left: 24,
    borderColor: Colors.gold,
    transform: [{ rotate: "-8deg" }],
  },
  stampSavedText: {
    fontFamily: Fonts.sansSemi,
    fontSize: 14,
    letterSpacing: 2.8,
    color: Colors.gold,
  },
  stampSkip: {
    right: 24,
    borderColor: "rgba(245,240,232,0.5)",
    transform: [{ rotate: "8deg" }],
  },
  stampSkipText: {
    fontFamily: Fonts.sansSemi,
    fontSize: 14,
    letterSpacing: 2.8,
    color: "rgba(245,240,232,0.7)",
  },
  effectLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  effectFill: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCard: {
    height: CARD_H,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    paddingHorizontal: 32,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.08)",
    backgroundColor: "rgba(245,240,232,0.04)",
  },
  emptySymbol: {
    fontFamily: Fonts.serif,
    fontSize: 44,
    color: Colors.gold,
  },
  emptyText: {
    fontFamily: Fonts.serifItalic,
    fontSize: 20,
    lineHeight: 27,
    color: Colors.cream,
    textAlign: "center",
  },
  castAgain: {
    borderWidth: 1,
    borderColor: Colors.goldBorder,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  castAgainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  castAgainText: {
    fontFamily: Fonts.sansSemi,
    fontSize: 12,
    letterSpacing: 1.8,
    color: Colors.goldLight,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginTop: 20,
  },
  actionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  actionSkip: {
    borderColor: "rgba(245,240,232,0.2)",
  },
  actionLove: {
    borderColor: "rgba(184,150,62,0.4)",
  },
  actionDisabled: {
    opacity: 0.35,
  },
});

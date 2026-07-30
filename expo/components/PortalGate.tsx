import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

import { AnimatedPath } from "@/components/AnimatedSvgPath";
import { Colors, Fonts } from "@/constants/theme";
import { hapticHeavy, hapticSuccess } from "@/lib/haptics";

/**
 * The logout power mark — same 24×24 geometry as the web PortalEntry.
 * Lengths are pre-measured for the stroke draw-on animation.
 */
const MARK = {
  line: { d: "M12 2.6v7.9", length: 8.2 },
  arc: { d: "M5.64 6.64A9 9 0 1 0 18.36 6.64", length: 42.9 },
  tick: { d: "M18.36 6.64L20.5 4.5", length: 3.2 },
  arrow: { d: "M20 7.4L20.5 4.5L17.6 5", length: 6.1 },
} as const;

const GOLDS = ["#CFA85A", "#B8963E", "#F0DFAE", "#8B7956"] as const;

type Phase = "idle" | "burst" | "brand" | "exit";

/* ------------------------------ Ambient dust ------------------------------ */

interface DustSpec {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  base: number;
  duration: number;
  delay: number;
  driftY: number;
}

const DustMote = React.memo(function DustMote({ spec }: { spec: DustSpec }) {
  const p = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(p, {
          toValue: 1,
          duration: spec.duration,
          delay: spec.delay,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(p, {
          toValue: 0,
          duration: spec.duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [p, spec]);

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
        opacity: p.interpolate({
          inputRange: [0, 1],
          outputRange: [spec.base * 0.35, spec.base],
        }),
        transform: [
          {
            translateY: p.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -spec.driftY],
            }),
          },
        ],
      }}
    />
  );
});

/* ----------------------------- Burst particles ---------------------------- */

interface BurstSpec {
  id: number;
  dx: number;
  dy: number;
  size: number;
  color: string;
  duration: number;
  delay: number;
}

const BurstParticle = React.memo(function BurstParticle({ spec }: { spec: BurstSpec }) {
  const p = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(p, {
      toValue: 1,
      duration: spec.duration,
      delay: spec.delay,
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
        backgroundColor: spec.color,
        opacity: p.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 0.9, 0] }),
        transform: [
          { translateX: p.interpolate({ inputRange: [0, 1], outputRange: [0, spec.dx] }) },
          { translateY: p.interpolate({ inputRange: [0, 1], outputRange: [0, spec.dy] }) },
          { scale: p.interpolate({ inputRange: [0, 1], outputRange: [1, 0.3] }) },
        ],
      }}
    />
  );
});

/* ------------------------------ Brand letters ----------------------------- */

function BrandLetter({
  letter,
  index,
  fontSize,
}: {
  letter: string;
  index: number;
  fontSize: number;
}) {
  const p = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(p, {
      toValue: 1,
      duration: 700,
      delay: 100 + index * 60,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();
  }, [p, index]);

  return (
    <View style={{ overflow: "hidden" }}>
      <Animated.Text
        style={{
          fontFamily: Fonts.serif,
          fontSize,
          lineHeight: fontSize * 1.08,
          letterSpacing: fontSize * 0.38,
          color: "rgba(245,240,232,0.7)",
          opacity: p,
          transform: [
            { translateY: p.interpolate({ inputRange: [0, 1], outputRange: [26, 0] }) },
          ],
        }}
      >
        {letter}
      </Animated.Text>
    </View>
  );
}

interface Props {
  onDone: () => void;
}

/**
 * Full-screen ritual gate — mirrors the web PortalEntry: the logout mark
 * draws itself with "Ready?", a tap detonates a golden sparkle burst,
 * reveals the LOGOUT Spells wordmark, then melts into the app.
 */
export default function PortalGate({ onDone }: Props) {
  const { width, height } = useWindowDimensions();
  const [phase, setPhase] = useState<Phase>("idle");
  const phaseRef = useRef<Phase>("idle");
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const setPh = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const lineDraw = useRef(new Animated.Value(0)).current;
  const arcDraw = useRef(new Animated.Value(0)).current;
  const tickDraw = useRef(new Animated.Value(0)).current;
  const arrowDraw = useRef(new Animated.Value(0)).current;
  const markPulse = useRef(new Animated.Value(0)).current;
  const readyPulse = useRef(new Animated.Value(0)).current;
  const hintIn = useRef(new Animated.Value(0)).current;
  const markOut = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const lineIn = useRef(new Animated.Value(0)).current;
  const spellsIn = useRef(new Animated.Value(0)).current;
  const taglineIn = useRef(new Animated.Value(0)).current;
  const exitOut = useRef(new Animated.Value(0)).current;

  const markCenterY = height * 0.46;

  const dust = useMemo<DustSpec[]>(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        id: i,
        x: Math.random() * width,
        y: Math.random() * height,
        size: 1.4 + Math.random() * 2.4,
        color: GOLDS[i % GOLDS.length],
        base: 0.16 + Math.random() * 0.3,
        duration: 2200 + Math.random() * 3200,
        delay: Math.random() * 3000,
        driftY: 14 + Math.random() * 30,
      })),
    [width, height],
  );

  const burst = useMemo<BurstSpec[]>(() => {
    if (phase === "idle") return [];
    return Array.from({ length: 72 }, (_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const dist = 30 + Math.pow(Math.random(), 0.55) * 230;
      return {
        id: i,
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist - 14,
        size: 2 + Math.random() * 4 + (Math.random() > 0.92 ? 3 : 0),
        color: GOLDS[Math.floor(Math.random() * GOLDS.length)],
        duration: 700 + Math.random() * 600,
        delay: Math.random() * 90,
      };
    });
  }, [phase]);

  /** Draw the mark, breathe, pulse "Ready?", reveal the hint. */
  useEffect(() => {
    Animated.sequence([
      Animated.delay(250),
      Animated.timing(lineDraw, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.timing(arcDraw, {
        toValue: 1,
        duration: 1000,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(tickDraw, {
        toValue: 1,
        duration: 250,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.timing(arrowDraw, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
    ]).start();

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(markPulse, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(markPulse, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    const readyLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(readyPulse, {
          toValue: 1,
          duration: 1300,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(readyPulse, {
          toValue: 0,
          duration: 1300,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    pulseLoop.start();
    readyLoop.start();
    Animated.timing(hintIn, {
      toValue: 1,
      duration: 1200,
      delay: 3600,
      useNativeDriver: true,
    }).start();

    return () => {
      pulseLoop.stop();
      readyLoop.stop();
    };
  }, [lineDraw, arcDraw, tickDraw, arrowDraw, markPulse, readyPulse, hintIn]);

  useEffect(
    () => () => {
      timersRef.current.forEach((t) => clearTimeout(t));
    },
    [],
  );

  const finish = useCallback(() => {
    setPh("exit");
    Animated.timing(exitOut, {
      toValue: 1,
      duration: 950,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onDone();
    });
  }, [exitOut, onDone, setPh]);

  const ignite = useCallback(() => {
    const ph = phaseRef.current;
    if (ph === "idle") {
      setPh("burst");
      hapticHeavy();
      Animated.parallel([
        Animated.timing(markOut, {
          toValue: 1,
          duration: 550,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(flash, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();

      timersRef.current.push(
        setTimeout(() => {
          setPh("brand");
          hapticSuccess();
          Animated.stagger(0, [
            Animated.timing(lineIn, {
              toValue: 1,
              duration: 1000,
              delay: 300,
              easing: Easing.inOut(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(spellsIn, {
              toValue: 1,
              duration: 700,
              delay: 550,
              easing: Easing.out(Easing.exp),
              useNativeDriver: true,
            }),
            Animated.timing(taglineIn, {
              toValue: 1,
              duration: 600,
              delay: 900,
              useNativeDriver: true,
            }),
          ]).start();
        }, 480),
      );
      timersRef.current.push(
        setTimeout(() => {
          if (phaseRef.current === "brand") finish();
        }, 3050),
      );
    } else if (ph === "brand") {
      finish();
    }
  }, [finish, flash, lineIn, markOut, setPh, spellsIn, taglineIn]);

  const logoutFontSize = Math.min(64, Math.max(42, width * 0.125));
  const spellsFontSize = Math.min(54, Math.max(30, width * 0.075));

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.container,
        {
          opacity: exitOut.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
        },
      ]}
    >
      <LinearGradient
        colors={["#191713", "#1C1C1A", "#131211"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="portalGlow" cx="50%" cy="42%" rx="70%" ry="55%">
            <Stop offset="0%" stopColor="#B8963E" stopOpacity={0.06} />
            <Stop offset="62%" stopColor="#B8963E" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={width / 2} cy={height * 0.42} r={Math.max(width, height)} fill="url(#portalGlow)" />
      </Svg>

      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={ignite}
        accessibilityRole="button"
        accessibilityLabel="Enter Logout Spells"
        disabled={phase === "exit"}
      >
        {dust.map((d) => (
          <DustMote key={d.id} spec={d} />
        ))}

        {/* Idle mark + Ready? */}
        {(phase === "idle" || phase === "burst") && (
          <Animated.View
            style={[
              styles.markWrap,
              {
                top: markCenterY - 39,
                opacity: markOut.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
                transform: [
                  {
                    scale: Animated.multiply(
                      markPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.045] }),
                      markOut.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] }),
                    ),
                  },
                ],
              },
            ]}
          >
            <Svg width={78} height={78} viewBox="0 0 24 24">
              <AnimatedPath
                d={MARK.line.d}
                stroke="#CFA85A"
                strokeWidth={1.5}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${MARK.line.length} ${MARK.line.length}`}
                strokeDashoffset={
                  lineDraw.interpolate({
                    inputRange: [0, 1],
                    outputRange: [MARK.line.length, 0],
                  }) as unknown as number
                }
              />
              <AnimatedPath
                d={MARK.arc.d}
                stroke="#CFA85A"
                strokeWidth={1.5}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${MARK.arc.length} ${MARK.arc.length}`}
                strokeDashoffset={
                  arcDraw.interpolate({
                    inputRange: [0, 1],
                    outputRange: [MARK.arc.length, 0],
                  }) as unknown as number
                }
              />
              <AnimatedPath
                d={MARK.tick.d}
                stroke="#CFA85A"
                strokeWidth={1.5}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${MARK.tick.length} ${MARK.tick.length}`}
                strokeDashoffset={
                  tickDraw.interpolate({
                    inputRange: [0, 1],
                    outputRange: [MARK.tick.length, 0],
                  }) as unknown as number
                }
              />
              <AnimatedPath
                d={MARK.arrow.d}
                stroke="#CFA85A"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                strokeDasharray={`${MARK.arrow.length} ${MARK.arrow.length}`}
                strokeDashoffset={
                  arrowDraw.interpolate({
                    inputRange: [0, 1],
                    outputRange: [MARK.arrow.length, 0],
                  }) as unknown as number
                }
              />
            </Svg>

            <Animated.Text
              style={[
                styles.ready,
                {
                  opacity: readyPulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 0.75],
                  }),
                },
              ]}
            >
              READY?
            </Animated.Text>
            <Animated.Text
              style={[
                styles.hint,
                { opacity: hintIn.interpolate({ inputRange: [0, 1], outputRange: [0, 0.7] }) },
              ]}
            >
              TAP ANYWHERE
            </Animated.Text>
          </Animated.View>
        )}

        {/* Burst flash + ring + particles */}
        {phase !== "idle" && (
          <View pointerEvents="none" style={[styles.burstLayer, { top: markCenterY }]}>
            <Animated.View
              style={[
                styles.flashCore,
                {
                  opacity: flash.interpolate({
                    inputRange: [0, 0.25, 1],
                    outputRange: [0, 0.9, 0],
                  }),
                  transform: [
                    {
                      scale: flash.interpolate({ inputRange: [0, 1], outputRange: [0.2, 2.6] }),
                    },
                  ],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.flashRing,
                {
                  opacity: flash.interpolate({
                    inputRange: [0, 0.2, 1],
                    outputRange: [0, 0.9, 0],
                  }),
                  transform: [
                    {
                      scale: flash.interpolate({ inputRange: [0, 1], outputRange: [0.15, 3.4] }),
                    },
                  ],
                },
              ]}
            />
            {burst.map((b) => (
              <BurstParticle key={b.id} spec={b} />
            ))}
          </View>
        )}

        {/* Brand reveal */}
        {(phase === "brand" || phase === "exit") && (
          <Animated.View
            style={[
              styles.brandLayer,
              {
                transform: [
                  {
                    scale: exitOut.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.brandInner}>
              <View style={styles.logoutRow}>
                <Animated.View
                  style={[
                    styles.brandLine,
                    {
                      opacity: lineIn,
                      transform: [
                        { scaleX: lineIn.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) },
                      ],
                    },
                  ]}
                >
                  <LinearGradient
                    colors={[
                      "rgba(207,168,90,0)",
                      "rgba(207,168,90,0.7)",
                      "rgba(207,168,90,0.7)",
                      "rgba(207,168,90,0)",
                    ]}
                    locations={[0, 0.18, 0.82, 1]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.brandLineFill}
                  />
                </Animated.View>
                <View style={[styles.lettersRow, { marginRight: -logoutFontSize * 0.38 }]}>
                  {"LOGOUT".split("").map((ch, i) => (
                    <BrandLetter key={`${ch}-${i}`} letter={ch} index={i} fontSize={logoutFontSize} />
                  ))}
                </View>
              </View>

              <Animated.Text
                style={[
                  styles.spells,
                  {
                    fontSize: spellsFontSize,
                    lineHeight: spellsFontSize * 1.2,
                    marginTop: -spellsFontSize * 0.14,
                    opacity: spellsIn,
                    transform: [
                      {
                        translateY: spellsIn.interpolate({
                          inputRange: [0, 1],
                          outputRange: [14, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                Spells
              </Animated.Text>

              <Animated.Text style={[styles.tagline, { opacity: taglineIn }]}>
                BELONG SOMEWHERE REAL
              </Animated.Text>
            </View>
          </Animated.View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 1000,
    elevation: 24,
  },
  markWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  ready: {
    marginTop: 56,
    fontFamily: Fonts.sans,
    fontSize: 11,
    letterSpacing: 6.6,
    color: "rgba(245,240,232,0.45)",
  },
  hint: {
    marginTop: 20,
    fontFamily: Fonts.sans,
    fontSize: 9,
    letterSpacing: 3.8,
    color: "rgba(245,240,232,0.25)",
  },
  burstLayer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  flashCore: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(245,240,232,0.9)",
  },
  flashRing: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.7)",
  },
  brandLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  brandInner: {
    alignItems: "center",
  },
  logoutRow: {
    justifyContent: "center",
  },
  brandLine: {
    position: "absolute",
    left: "-10%",
    right: "-10%",
    top: "50%",
    height: 1,
  },
  brandLineFill: {
    flex: 1,
  },
  lettersRow: {
    flexDirection: "row",
  },
  spells: {
    fontFamily: Fonts.serifItalic,
    color: Colors.gold,
  },
  tagline: {
    marginTop: 34,
    fontFamily: Fonts.sans,
    fontSize: 10,
    letterSpacing: 5,
    color: "rgba(245,240,232,0.35)",
  },
});

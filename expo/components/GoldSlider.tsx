import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  PanResponder,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";

import { Colors, Fonts } from "@/constants/theme";
import { hapticSelection } from "@/lib/haptics";

const THUMB = 26;

interface Props {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  ticks?: string[];
  style?: StyleProp<ViewStyle>;
}

/** Custom slider with a gold-gradient track and a glowing gold thumb. */
export default function GoldSlider({
  min,
  max,
  step,
  value,
  onChange,
  ticks,
  style,
}: Props) {
  const [trackW, setTrackW] = useState<number>(0);
  const trackWRef = useRef<number>(0);
  const valueRef = useRef<number>(value);
  const startValRef = useRef<number>(value);
  const onChangeRef = useRef<(v: number) => void>(onChange);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const responder = useMemo(() => {
    const clampSnap = (v: number): number => {
      const snapped = Math.round((v - min) / step) * step + min;
      return Math.min(max, Math.max(min, snapped));
    };
    const emit = (raw: number) => {
      const next = clampSnap(raw);
      if (next !== valueRef.current) {
        valueRef.current = next;
        hapticSelection();
        onChangeRef.current(next);
      }
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt) => {
        const w = trackWRef.current;
        if (w <= 0) return;
        const ratio = Math.min(1, Math.max(0, evt.nativeEvent.locationX / w));
        const raw = min + ratio * (max - min);
        emit(raw);
        startValRef.current = clampSnap(raw);
      },
      onPanResponderMove: (_evt, g) => {
        const w = trackWRef.current;
        if (w <= 0) return;
        emit(startValRef.current + (g.dx / w) * (max - min));
      },
    });
  }, [min, max, step]);

  const ratio = max > min ? (value - min) / (max - min) : 0;
  const thumbLeft = Math.max(0, Math.min(trackW - THUMB, ratio * trackW - THUMB / 2));

  return (
    <View style={style}>
      <View
        {...responder.panHandlers}
        style={styles.touchArea}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          setTrackW(w);
          trackWRef.current = w;
        }}
      >
        <View style={styles.track} pointerEvents="none">
          <LinearGradient
            colors={["#B8963E", "#CFA85A", "#F0DFAE"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[styles.fill, { width: `${Math.max(0, Math.min(1, ratio)) * 100}%` }]}
          />
        </View>
        <View pointerEvents="none" style={[styles.thumb, { left: thumbLeft }]}>
          <View style={styles.thumbInner} />
        </View>
      </View>
      {ticks && ticks.length > 0 ? (
        <View style={styles.ticksRow}>
          {ticks.map((t) => (
            <Text key={t} style={styles.tick}>
              {t}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  touchArea: {
    height: 44,
    justifyContent: "center",
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(245,240,232,0.12)",
    overflow: "hidden",
  },
  fill: {
    height: 4,
    borderRadius: 2,
  },
  thumb: {
    position: "absolute",
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: Colors.gold,
    borderWidth: 2,
    borderColor: Colors.goldHi,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.goldLight,
    shadowOpacity: 0.65,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  thumbInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.charcoalDeep,
    opacity: 0.55,
  },
  ticksRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
  },
  tick: {
    fontFamily: Fonts.sansMedium,
    fontSize: 11,
    color: "rgba(200,193,180,0.6)",
  },
});

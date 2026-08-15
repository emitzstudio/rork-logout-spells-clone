import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";

import { GhostButton } from "@/components/Buttons";
import FloatingSymbol from "@/components/FloatingSymbol";
import { Colors, Fonts } from "@/constants/theme";

/* ------------------------------ Empty state ------------------------------- */

interface EmptyStateProps {
  glyph?: string;
  /** Poetic serif-italic line. */
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** The website's poetic empty state: floating glyph, italic serif line, quiet caption. */
export function EmptyState({
  glyph = "✦",
  title,
  body,
  actionLabel,
  onAction,
  compact = false,
  style,
}: EmptyStateProps) {
  return (
    <View style={[styles.empty, compact ? styles.emptyCompact : null, style]}>
      <FloatingSymbol symbol={glyph} size={compact ? 26 : 34} glow opacity={0.85} />
      <Text style={[styles.emptyTitle, compact ? styles.emptyTitleCompact : null]}>
        {title}
      </Text>
      {body ? <Text style={styles.emptyBody}>{body}</Text> : null}
      {actionLabel && onAction ? (
        <GhostButton label={actionLabel} onPress={onAction} small style={styles.emptyAction} />
      ) : null}
    </View>
  );
}

/* ------------------------------ Loading ring ------------------------------ */

interface LoadingRingProps {
  size?: number;
  label?: string;
  style?: StyleProp<ViewStyle>;
}

/** Rotating gold arc — the app's only spinner. */
export function LoadingRing({ size = 30, label, style }: LoadingRingProps) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={[styles.loading, style]}>
      <Animated.View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            transform: [{ rotate }],
          },
        ]}
      />
      {label ? <Text style={styles.loadingLabel}>{label}</Text> : null}
    </View>
  );
}

/* -------------------------------- Skeleton -------------------------------- */

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/** Soft pulsing placeholder block. */
export function Skeleton({ width = "100%", height = 16, radius = 8, style }: SkeletonProps) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width, height, borderRadius: radius, opacity },
        style,
      ]}
    />
  );
}

/* ------------------------------ Error banner ------------------------------ */

interface ErrorBannerProps {
  message: string;
  style?: StyleProp<ViewStyle>;
}

/** Coral-tinted error card — the website's error voice. */
export function ErrorBanner({ message, style }: ErrorBannerProps) {
  return (
    <View style={[styles.errorBox, style]}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: "center",
    paddingVertical: 56,
    paddingHorizontal: 32,
    gap: 6,
  },
  emptyCompact: {
    paddingVertical: 32,
  },
  emptyTitle: {
    marginTop: 14,
    fontFamily: Fonts.serifItalic,
    fontSize: 22,
    lineHeight: 30,
    color: Colors.cream,
    textAlign: "center",
  },
  emptyTitleCompact: {
    fontSize: 19,
    lineHeight: 26,
  },
  emptyBody: {
    fontFamily: Fonts.sans,
    fontSize: 13.5,
    lineHeight: 21,
    color: "rgba(245,240,232,0.55)",
    textAlign: "center",
    maxWidth: 280,
  },
  emptyAction: {
    marginTop: 16,
  },
  loading: {
    alignItems: "center",
    gap: 14,
    paddingVertical: 32,
  },
  ring: {
    borderWidth: 2,
    borderColor: "rgba(184,150,62,0.22)",
    borderTopColor: Colors.goldLight,
  },
  loadingLabel: {
    fontFamily: Fonts.serifItalic,
    fontSize: 15,
    color: "rgba(245,240,232,0.6)",
  },
  skeleton: {
    backgroundColor: "rgba(245,240,232,0.06)",
    overflow: "hidden",
  },
  errorBox: {
    backgroundColor: Colors.coralBg,
    borderWidth: 1,
    borderColor: Colors.coralBorder,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  errorText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.coralText,
  },
});

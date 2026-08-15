import React, { useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";

import { Colors, Fonts, GOLD_SHADOW, Radius } from "@/constants/theme";
import { hapticLight, hapticMedium } from "@/lib/haptics";

interface PressableScaleProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  haptic?: "light" | "medium" | "none";
  disabled?: boolean;
  testID?: string;
}

/** Pressable wrapper with spring scale-down + haptic feedback. */
export function PressableScale({
  children,
  onPress,
  style,
  scaleTo = 0.965,
  haptic = "light",
  disabled = false,
  testID,
}: PressableScaleProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () => {
    Animated.spring(scale, {
      toValue: scaleTo,
      speed: 40,
      bounciness: 4,
      useNativeDriver: true,
    }).start();
  };

  const pressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      speed: 24,
      bounciness: 8,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    if (haptic === "light") hapticLight();
    if (haptic === "medium") hapticMedium();
    onPress?.();
  };

  return (
    <Pressable
      onPressIn={pressIn}
      onPressOut={pressOut}
      onPress={handlePress}
      disabled={disabled}
      testID={testID}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

interface ButtonProps {
  label: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  small?: boolean;
  /** Shows a spinner in place of the label while keeping the button's size. */
  busy?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  testID?: string;
}

/** Primary button — exact port of the website's .btn-gold. */
export function GoldButton({
  label,
  onPress,
  style,
  textStyle,
  small = false,
  busy = false,
  disabled = false,
  icon,
  testID,
}: ButtonProps) {
  const blocked = disabled || busy;
  return (
    <PressableScale
      onPress={onPress}
      haptic="medium"
      disabled={blocked}
      style={[
        styles.gold,
        small ? styles.smallButton : null,
        disabled ? styles.disabled : null,
        style,
      ]}
      testID={testID}
    >
      <View style={[styles.inner, busy ? styles.innerHidden : null]}>
        {icon ?? null}
        <Text style={[styles.goldLabel, small ? styles.smallLabel : null, textStyle]}>
          {label}
        </Text>
      </View>
      {busy ? (
        <View style={styles.spinner}>
          <ActivityIndicator size="small" color={Colors.charcoalDeep} />
        </View>
      ) : null}
    </PressableScale>
  );
}

/** Secondary button — exact port of the website's .btn-ghost-gold. */
export function GhostButton({
  label,
  onPress,
  style,
  textStyle,
  small = false,
  busy = false,
  disabled = false,
  icon,
  testID,
}: ButtonProps) {
  const blocked = disabled || busy;
  return (
    <PressableScale
      onPress={onPress}
      haptic="light"
      disabled={blocked}
      style={[
        styles.ghost,
        small ? styles.smallButton : null,
        disabled ? styles.disabled : null,
        style,
      ]}
      testID={testID}
    >
      <View style={[styles.inner, busy ? styles.innerHidden : null]}>
        {icon ?? null}
        <Text style={[styles.ghostLabel, small ? styles.smallLabel : null, textStyle]}>
          {label}
        </Text>
      </View>
      {busy ? (
        <View style={styles.spinner}>
          <ActivityIndicator size="small" color={Colors.goldLight} />
        </View>
      ) : null}
    </PressableScale>
  );
}

interface ArrowLinkProps {
  label: string;
  onPress?: () => void;
  color?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Uppercase micro link with an arrow that stretches away on press. */
export function ArrowLink({
  label,
  onPress,
  color = Colors.goldLight,
  style,
  testID,
}: ArrowLinkProps) {
  const shift = useRef(new Animated.Value(0)).current;

  const slide = (toValue: number) => {
    Animated.spring(shift, {
      toValue,
      speed: 30,
      bounciness: 6,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPressIn={() => slide(5)}
      onPressOut={() => slide(0)}
      onPress={() => {
        hapticLight();
        onPress?.();
      }}
      style={[styles.arrowRow, style]}
      hitSlop={10}
      testID={testID}
    >
      <Text style={[styles.arrowLabel, { color }]}>{label}</Text>
      <Animated.Text
        style={[styles.arrowGlyph, { color, transform: [{ translateX: shift }] }]}
      >
        →
      </Animated.Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gold: {
    backgroundColor: Colors.gold,
    borderRadius: Radius.sm,
    paddingVertical: 15,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
    ...GOLD_SHADOW,
  },
  ghost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: Colors.goldBorder,
    borderRadius: Radius.sm,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  innerHidden: {
    opacity: 0,
  },
  spinner: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  goldLabel: {
    fontFamily: Fonts.sansMedium,
    fontSize: 14,
    letterSpacing: 1.1,
    color: Colors.charcoalDeep,
  },
  ghostLabel: {
    fontFamily: Fonts.sansMedium,
    fontSize: 14,
    letterSpacing: 1.1,
    color: Colors.gold,
  },
  smallButton: {
    paddingVertical: 11,
    paddingHorizontal: 18,
  },
  smallLabel: {
    fontSize: 13,
    letterSpacing: 0.8,
  },
  disabled: {
    opacity: 0.45,
  },
  arrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
  },
  arrowLabel: {
    fontFamily: Fonts.sansSemi,
    fontSize: 12,
    letterSpacing: 2.2,
    textTransform: "uppercase",
  },
  arrowGlyph: {
    fontSize: 15,
    marginTop: -1,
  },
});

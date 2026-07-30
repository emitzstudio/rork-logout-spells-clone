import React, { useRef } from "react";
import {
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  ViewStyle,
} from "react-native";

import { Colors, Fonts } from "@/constants/theme";
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
  testID?: string;
}

/** Solid gold primary button with dark letterspaced label. */
export function GoldButton({ label, onPress, style, textStyle, small = false, testID }: ButtonProps) {
  return (
    <PressableScale
      onPress={onPress}
      haptic="medium"
      style={[styles.gold, small ? styles.smallButton : null, style]}
      testID={testID}
    >
      <Text style={[styles.goldLabel, small ? styles.smallLabel : null, textStyle]}>
        {label}
      </Text>
    </PressableScale>
  );
}

/** Transparent button with a gold border and gold label. */
export function GhostButton({ label, onPress, style, textStyle, small = false, testID }: ButtonProps) {
  return (
    <PressableScale
      onPress={onPress}
      haptic="light"
      style={[styles.ghost, small ? styles.smallButton : null, style]}
      testID={testID}
    >
      <Text style={[styles.ghostLabel, small ? styles.smallLabel : null, textStyle]}>
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  gold: {
    backgroundColor: Colors.gold,
    borderRadius: 14,
    paddingVertical: 17,
    paddingHorizontal: 26,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.gold,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  goldLabel: {
    fontFamily: Fonts.sansSemi,
    fontSize: 13,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: Colors.charcoalDeep,
  },
  ghost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: Colors.goldBorder,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  ghostLabel: {
    fontFamily: Fonts.sansSemi,
    fontSize: 13,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: Colors.goldLight,
  },
  smallButton: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  smallLabel: {
    fontSize: 11,
    letterSpacing: 1.6,
  },
});

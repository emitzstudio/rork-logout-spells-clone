/**
 * The whisper banner (decision Y) — when a notification lands over the live
 * socket, a quiet house-voiced banner slides down from the top, holds for a
 * few seconds, and lets go. Tapping it opens the inbox. The soft haptic
 * fires in the provider the moment the row arrives; the badge moves itself.
 */
import { useRouter } from "expo-router";
import { Bell, X } from "lucide-react-native";
import React, { useCallback, useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PressableScale } from "@/components/Buttons";
import { Colors, Fonts } from "@/constants/theme";
import { useAccount } from "@/providers/AccountProvider";

const HOLD_MS = 4_600;

export default function WhisperBanner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { whisper, dismissWhisper } = useAccount();

  const slide = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(
    (after?: () => void) => {
      Animated.timing(slide, {
        toValue: 0,
        duration: 260,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        dismissWhisper();
        after?.();
      });
    },
    [slide, dismissWhisper],
  );

  useEffect(() => {
    if (!whisper) return;
    slide.setValue(0);
    Animated.timing(slide, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => hide(), HOLD_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [whisper, slide, hide]);

  if (!whisper) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        {
          top: insets.top + 6,
          opacity: slide,
          transform: [
            { translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [-70, 0] }) },
          ],
        },
      ]}
    >
      <PressableScale
        onPress={() => hide(() => router.push("/space/notifications"))}
        scaleTo={0.98}
        style={styles.card}
        testID="whisper-banner"
      >
        <View style={styles.icon}>
          <Bell size={14} color={Colors.goldLight} />
        </View>
        <View style={styles.text}>
          <Text style={styles.title} numberOfLines={1}>
            {whisper.title}
          </Text>
          {whisper.body !== "" ? (
            <Text style={styles.body} numberOfLines={2}>
              {whisper.body}
            </Text>
          ) : null}
        </View>
        <PressableScale onPress={() => hide()} scaleTo={0.85} style={styles.close} testID="whisper-dismiss">
          <X size={13} color="rgba(245,240,232,0.5)" />
        </PressableScale>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 14,
    right: 14,
    zIndex: 60,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.4)",
    backgroundColor: "rgba(20,19,15,0.97)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  icon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.4)",
    backgroundColor: "rgba(184,150,62,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    flex: 1,
    gap: 1,
  },
  title: {
    fontFamily: Fonts.sansSemi,
    fontSize: 13,
    color: Colors.cream,
  },
  body: {
    fontFamily: Fonts.sans,
    fontSize: 11.5,
    lineHeight: 15,
    color: "rgba(245,240,232,0.55)",
  },
  close: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
});

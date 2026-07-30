import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PressableScale } from "@/components/Buttons";
import { Colors, Fonts } from "@/constants/theme";
import { useApp } from "@/providers/AppProvider";

/**
 * Fixed top bar — the app version of the web Nav: the stacked
 * LOGOUT / Spells wordmark plus the "Apply to Host" call to action.
 */
export default function SiteHeader() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { openApply } = useApp();

  return (
    <View style={[styles.bar, { paddingTop: insets.top + 8 }]}>
      <PressableScale
        onPress={() => router.push("/")}
        scaleTo={0.97}
        haptic="light"
        testID="header-wordmark"
      >
        <Text style={styles.logout}>LOGOUT</Text>
        <Text style={styles.spells}>Spells</Text>
      </PressableScale>

      <PressableScale onPress={openApply} scaleTo={0.95} style={styles.apply}>
        <Text style={styles.applyText}>Apply to Host</Text>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  logout: {
    fontFamily: Fonts.sansSemi,
    fontSize: 13,
    letterSpacing: 5.4,
    color: Colors.cream,
  },
  spells: {
    fontFamily: Fonts.serifItalic,
    fontSize: 19,
    lineHeight: 21,
    color: Colors.gold,
  },
  apply: {
    borderWidth: 1,
    borderColor: Colors.goldBorder,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  applyText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 12,
    letterSpacing: 1,
    color: Colors.gold,
  },
});

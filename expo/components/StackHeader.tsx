import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PressableScale } from "@/components/Buttons";
import { Colors, Fonts } from "@/constants/theme";

interface Props {
  title?: string;
  /** Route to land on when there is no history (deep links). */
  fallback?: string;
  right?: React.ReactNode;
}

/** Shared top bar for stack screens: back chip + centred micro title. */
export default function StackHeader({ title, fallback = "/", right }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const goBack = (): void => {
    if (router.canGoBack()) router.back();
    else router.replace(fallback as never);
  };

  return (
    <View style={[styles.bar, { paddingTop: insets.top + 8 }]}>
      <PressableScale onPress={goBack} scaleTo={0.9} style={styles.back} testID="stack-back">
        <ArrowLeft size={18} color="rgba(245,240,232,0.65)" />
      </PressableScale>
      {title ? (
        <Text style={styles.title} numberOfLines={1}>
          {title.toUpperCase()}
        </Text>
      ) : (
        <View style={styles.flex} />
      )}
      <View style={styles.right}>{right ?? null}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 12,
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontFamily: Fonts.sansSemi,
    fontSize: 11,
    letterSpacing: 3,
    color: Colors.gold,
  },
  flex: {
    flex: 1,
  },
  right: {
    minWidth: 44,
    alignItems: "flex-end",
  },
});

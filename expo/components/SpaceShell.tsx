import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GoldButton } from "@/components/Buttons";
import StackHeader from "@/components/StackHeader";
import { LoadingRing } from "@/components/States";
import { Colors, Fonts } from "@/constants/theme";
import { useAccount } from "@/providers/AccountProvider";

interface Props {
  title: string;
  children: React.ReactNode;
  /** Extra element pinned under the header (e.g. filters). */
  header?: React.ReactNode;
}

/**
 * Shared shell for every My Logout Space sub-screen: stack header, the
 * signed-out gate and the scroll container. Screens only render content.
 */
export default function SpaceShell({ title, children, header }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signedIn, booting } = useAccount();

  return (
    <View style={styles.flex}>
      <StackHeader title={title} fallback="/space" />
      {header ?? null}
      {booting ? (
        <View style={styles.center}>
          <LoadingRing size={36} label="Opening your space…" />
        </View>
      ) : !signedIn ? (
        <View style={styles.center}>
          <Text style={styles.gateSymbol}>✦</Text>
          <Text style={styles.gateTitle}>This room is for travellers.</Text>
          <Text style={styles.gateSub}>Sign in to open your Logout Space.</Text>
          <GoldButton
            label="Sign In / Join"
            onPress={() => router.push("/auth")}
            style={styles.gateBtn}
            testID="shell-signin"
          />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 60 }]}
        >
          {children}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 34,
    paddingBottom: 90,
    gap: 12,
  },
  gateSymbol: {
    fontFamily: Fonts.serif,
    fontSize: 40,
    color: "rgba(184,150,62,0.65)",
  },
  gateTitle: {
    fontFamily: Fonts.serif,
    fontSize: 25,
    color: Colors.cream,
    textAlign: "center",
  },
  gateSub: {
    fontFamily: Fonts.sans,
    fontSize: 13.5,
    color: "rgba(245,240,232,0.55)",
    textAlign: "center",
  },
  gateBtn: {
    marginTop: 14,
    alignSelf: "stretch",
  },
  scroll: {
    paddingTop: 8,
  },
});

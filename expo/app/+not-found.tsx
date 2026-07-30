import { Stack, useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { GoldButton } from "@/components/Buttons";
import FloatingSymbol from "@/components/FloatingSymbol";
import { Colors, Fonts } from "@/constants/theme";

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ title: "Page Not Found" }} />
      <View style={styles.container}>
        <FloatingSymbol symbol="✦" size={56} color={Colors.gold} opacity={0.6} />
        <Text style={styles.code}>404</Text>
        <Text style={styles.message}>This spell doesn&apos;t exist… yet.</Text>
        <GoldButton
          label="Return Somewhere Real"
          onPress={() => router.replace("/")}
          style={styles.button}
          testID="notfound-home"
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  code: {
    marginTop: 24,
    fontFamily: Fonts.serif,
    fontSize: 76,
    lineHeight: 82,
    color: Colors.cream,
  },
  message: {
    marginTop: 14,
    textAlign: "center",
    fontFamily: Fonts.serifItalic,
    fontSize: 22,
    color: "rgba(245,240,232,0.6)",
  },
  button: {
    marginTop: 40,
    alignSelf: "stretch",
  },
});

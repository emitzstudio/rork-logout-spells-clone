import {
  CormorantGaramond_500Medium,
  CormorantGaramond_500Medium_Italic,
  CormorantGaramond_600SemiBold,
  CormorantGaramond_600SemiBold_Italic,
} from "@expo-google-fonts/cormorant-garamond";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { DarkTheme, ThemeProvider, type Theme } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import ApplyHostSheet from "@/components/ApplyHostSheet";
import PortalGate from "@/components/PortalGate";
import Starfield from "@/components/Starfield";
import { Colors } from "@/constants/theme";
import { SpellStoreProvider } from "@/data/spellStore";
import { AccountProvider } from "@/providers/AccountProvider";
import { AppProvider, useApp } from "@/providers/AppProvider";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

const navTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: "transparent",
    card: Colors.charcoalDeep,
    border: "rgba(245,240,232,0.08)",
    primary: Colors.goldLight,
    text: Colors.cream,
  },
};

function AppShell() {
  const { portalDone, setPortalDone } = useApp();

  return (
    <View style={styles.root}>
      <Starfield />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "transparent" },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="live/[slug]" />
        <Stack.Screen name="auth" options={{ presentation: "modal" }} />
      </Stack>
      <ApplyHostSheet />
      {!portalDone ? <PortalGate onDone={() => setPortalDone(true)} /> : null}
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    CormorantGaramond_500Medium,
    CormorantGaramond_500Medium_Italic,
    CormorantGaramond_600SemiBold,
    CormorantGaramond_600SemiBold_Italic,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return <View style={styles.root} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      {/* One spell collection shared across every screen — same API as the website. */}
      <SpellStoreProvider>
        {/* Traveller session + account bundle — same seam as the website. */}
        <AccountProvider>
          <AppProvider>
            <GestureHandlerRootView style={styles.flex}>
              <ThemeProvider value={navTheme}>
                <StatusBar style="light" />
                <AppShell />
              </ThemeProvider>
            </GestureHandlerRootView>
          </AppProvider>
        </AccountProvider>
      </SpellStoreProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.charcoal,
  },
  flex: {
    flex: 1,
  },
});

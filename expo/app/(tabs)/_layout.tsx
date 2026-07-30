import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { BookOpen, CircleUserRound, Compass, Radio, Sparkle } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import PulsingDot from "@/components/PulsingDot";
import { Colors, Fonts } from "@/constants/theme";
import { useAccount } from "@/providers/AccountProvider";

function TabBarBackground() {
  return (
    <View style={StyleSheet.absoluteFill}>
      <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFill} />
      <View
        style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(10,8,6,0.78)" }]}
      />
    </View>
  );
}

export default function TabLayout() {
  const { unreadCount, signedIn } = useAccount();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: "transparent" },
        tabBarActiveTintColor: Colors.goldLight,
        tabBarInactiveTintColor: "rgba(200,193,180,0.45)",
        tabBarStyle: {
          position: "absolute",
          backgroundColor: "transparent",
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: "rgba(245,240,232,0.1)",
          elevation: 0,
        },
        tabBarBackground: () => <TabBarBackground />,
        tabBarLabelStyle: {
          fontFamily: Fonts.sansMedium,
          fontSize: 10,
          letterSpacing: 0.4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <Sparkle size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="live"
        options={{
          title: "Live",
          tabBarIcon: ({ color }) => <Radio size={22} color={color} />,
          tabBarLabel: ({ color }) => (
            <View style={styles.liveLabel}>
              <Text style={[styles.liveLabelText, { color }]}>Live</Text>
              <PulsingDot size={4.5} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: "Discover",
          tabBarIcon: ({ color }) => <Compass size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="blog"
        options={{
          title: "Journal",
          tabBarIcon: ({ color }) => <BookOpen size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="space"
        options={{
          title: "My Space",
          tabBarIcon: ({ color }) => (
            <View>
              <CircleUserRound size={22} color={color} />
              {signedIn && unreadCount > 0 ? <View style={styles.badge} /> : null}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  liveLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  liveLabelText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 10,
    letterSpacing: 0.4,
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.goldLight,
  },
});

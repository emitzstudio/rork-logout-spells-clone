import { useRouter } from "expo-router";
import { Instagram, Linkedin, Mail, Youtube } from "lucide-react-native";
import React from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";

import { PressableScale } from "@/components/Buttons";
import GradientText from "@/components/GradientText";
import { Colors, Fonts } from "@/constants/theme";
import { CONTACT_EMAIL, SOCIALS } from "@/data/site";
import { composeEmail } from "@/lib/mail";

interface FooterLink {
  label: string;
  onPress: () => void;
}

function SocialCircle({ icon: Icon, onPress, label }: { icon: LucideIcon; onPress: () => void; label: string }) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.9} style={styles.social} testID={`footer-${label}`}>
      <Icon size={17} color="rgba(184,150,62,0.7)" />
    </PressableScale>
  );
}

/** Site footer — mirrors the web Footer, shown at the end of every screen. */
export default function Footer() {
  const router = useRouter();

  const explore: FooterLink[] = [
    { label: "Live Spells", onPress: () => router.push("/live") },
    { label: "Previous Spells", onPress: () => router.push("/previous") },
    { label: "Discover", onPress: () => router.push("/discover") },
    { label: "The Journal", onPress: () => router.push("/blog") },
  ];

  const connect: FooterLink[] = [
    { label: "Our Story", onPress: () => router.push("/our-story") },
    { label: "Become a Spellcaster", onPress: () => router.push("/creators") },
    { label: "My Logout Space", onPress: () => router.push("/space") },
    { label: "Contact", onPress: () => composeEmail("Hello Logout Spells") },
  ];

  return (
    <View style={styles.footer}>
      <View style={styles.inner}>
        <View>
          <Text style={styles.logout}>LOGOUT</Text>
          <GradientText style={styles.spells}>Spells</GradientText>
          <Text style={styles.motto}>Belonging &gt; Bookings</Text>
          <View style={styles.socialRow}>
            <SocialCircle icon={Instagram} label="Instagram" onPress={() => Linking.openURL(SOCIALS.instagram)} />
            <SocialCircle icon={Linkedin} label="LinkedIn" onPress={() => Linking.openURL(SOCIALS.linkedin)} />
            <SocialCircle icon={Youtube} label="YouTube" onPress={() => Linking.openURL(SOCIALS.youtube)} />
            <SocialCircle icon={Mail} label="Email" onPress={() => composeEmail("Hello Logout Spells")} />
          </View>
        </View>

        <View style={styles.columns}>
          <View style={styles.column}>
            <Text style={styles.columnTitle}>EXPLORE</Text>
            {explore.map((link) => (
              <PressableScale key={link.label} onPress={link.onPress} scaleTo={0.97} haptic="light">
                <Text style={styles.link}>{link.label}</Text>
              </PressableScale>
            ))}
          </View>
          <View style={styles.column}>
            <Text style={styles.columnTitle}>CONNECT</Text>
            {connect.map((link) => (
              <PressableScale key={link.label} onPress={link.onPress} scaleTo={0.97} haptic="light">
                <Text style={styles.link}>{link.label}</Text>
              </PressableScale>
            ))}
          </View>
        </View>

        <View style={styles.bottom}>
          <Text style={styles.copyright}>
            © {new Date().getFullYear()} Logout Spells. All rights reserved.
          </Text>
          <Text style={styles.tagline}>A private invitation. A quiet movement.</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    borderTopWidth: 1,
    borderTopColor: "rgba(245,240,232,0.06)",
    backgroundColor: "rgba(10,8,6,0.6)",
  },
  inner: {
    paddingHorizontal: 24,
    paddingVertical: 56,
    gap: 44,
  },
  logout: {
    fontFamily: Fonts.sansSemi,
    fontSize: 17,
    letterSpacing: 7,
    color: Colors.cream,
  },
  spells: {
    fontFamily: Fonts.serifItalic,
    fontSize: 30,
    lineHeight: 38,
  },
  motto: {
    marginTop: 12,
    fontFamily: Fonts.serifItalic,
    fontSize: 18,
    color: "rgba(245,240,232,0.5)",
  },
  socialRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 22,
  },
  social: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  columns: {
    flexDirection: "row",
    gap: 56,
  },
  column: {
    gap: 13,
  },
  columnTitle: {
    fontFamily: Fonts.sansSemi,
    fontSize: 11,
    letterSpacing: 3.5,
    color: Colors.gold,
    marginBottom: 6,
  },
  link: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: "rgba(245,240,232,0.55)",
  },
  bottom: {
    borderTopWidth: 1,
    borderTopColor: "rgba(245,240,232,0.06)",
    paddingTop: 26,
    gap: 8,
  },
  copyright: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: "rgba(245,240,232,0.35)",
  },
  tagline: {
    fontFamily: Fonts.serifItalic,
    fontSize: 14,
    color: "rgba(184,150,62,0.6)",
  },
});

import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Linking, StyleSheet, Text, View } from "react-native";

import { GhostButton, GoldButton, PressableScale } from "@/components/Buttons";
import CountUp from "@/components/CountUp";
import Eyebrow from "@/components/Eyebrow";
import FloatingSymbol from "@/components/FloatingSymbol";
import Footer from "@/components/Footer";
import GradientText from "@/components/GradientText";
import Handwritten from "@/components/Handwritten";
import { Reveal, RevealScrollView } from "@/components/RevealScroll";
import StackHeader from "@/components/StackHeader";
import TeamSection from "@/components/TeamSection";
import { Colors, Fonts } from "@/constants/theme";
import { DIARY, SOCIALS } from "@/data/site";
import { useSpellStore } from "@/data/spellStore";
import { useApp } from "@/providers/AppProvider";

/** Our Story — how Logout Spells began, the philosophy and the coven. */
export default function OurStoryScreen() {
  const router = useRouter();
  const { openApply } = useApp();
  const { publicSpells } = useSpellStore();

  const stats: { num: number; label: string }[] = [
    { num: Math.max(publicSpells.length, 1), label: "ACTIVE SPELLS" },
    { num: 300, label: "COMMUNITY MEMBERS" },
    { num: 6, label: "SPELL TYPES" },
  ];

  return (
    <View style={styles.flex}>
      <StackHeader title="Our Story" />
      <RevealScrollView contentContainerStyle={styles.scroll}>
        {/* Hero */}
        <View style={styles.hero}>
          <Reveal style={styles.centered}>
            <Eyebrow center>A quiet rebellion</Eyebrow>
            <View style={styles.heroTitleRow}>
              <Text style={styles.heroTitle}>This Is Not </Text>
              <GradientText style={styles.heroTitleItalic}>a Tour.</GradientText>
            </View>
            <Text style={styles.heroSub}>
              Logout Spells is a creator-led community platform. We design intimate experiences
              around identity — small groups, real connection, no itineraries, no posing.
            </Text>
          </Reveal>

          <Reveal delay={120}>
            <View style={styles.quoteCard}>
              <LinearGradient
                colors={["#2a2113", "#0f0c07"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <FloatingSymbol symbol="✦" size={110} color={Colors.gold} opacity={0.25} />
              <Text style={styles.quote}>
                You don't just go somewhere.{" "}
                <Text style={styles.quoteGold}>You belong somewhere.</Text>
              </Text>
              <Handwritten size={19} tilt={-2.5} style={styles.quoteNote}>
                — scribbled on the first trip, 2am
              </Handwritten>
            </View>
          </Reveal>

          <Reveal delay={180}>
            <View style={styles.statsRow}>
              {stats.map((s) => (
                <View key={s.label} style={styles.statCell}>
                  <CountUp to={s.num} style={styles.statNum} />
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
          </Reveal>
        </View>

        {/* Founding diary */}
        <View style={styles.section}>
          <Reveal style={styles.centered}>
            <Eyebrow center>The First Spell</Eyebrow>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>How It </Text>
              <GradientText style={styles.sectionTitleItalic}>Began</GradientText>
            </View>
          </Reveal>

          <View style={styles.timeline}>
            <LinearGradient
              colors={["rgba(184,150,62,0.5)", "rgba(184,150,62,0.2)", "rgba(184,150,62,0)"]}
              style={styles.timelineLine}
            />
            {DIARY.map((entry) => (
              <Reveal key={entry.day} delay={50}>
                <View style={styles.timelineEntry}>
                  <View style={styles.timelineNode}>
                    <Text style={styles.timelineNodeText}>✦</Text>
                  </View>
                  <Eyebrow size={10}>{entry.day}</Eyebrow>
                  <Text style={styles.timelineTitle}>{entry.title}</Text>
                  {entry.lines.map((line) => (
                    <Text key={line.slice(0, 24)} style={styles.timelineBody}>
                      {line}
                    </Text>
                  ))}
                  {entry.highlight ? (
                    <Text style={styles.timelineHighlight}>{entry.highlight}</Text>
                  ) : null}
                </View>
              </Reveal>
            ))}
          </View>

          {/* The Spellcaster */}
          <Reveal delay={80}>
            <View style={styles.casterCard}>
              <Eyebrow>The Spellcaster</Eyebrow>
              <View style={styles.casterTitleRow}>
                <Text style={styles.casterTitle}>Hi, I&apos;m </Text>
                <GradientText style={styles.casterTitleItalic}>Vidushi.</GradientText>
              </View>
              <View style={styles.casterParas}>
                <Text style={styles.casterPara}>
                  Logout Spells is my little experiment with the world. I believe experiences are
                  the closest thing we have to magic.
                </Text>
                <Text style={styles.casterPara}>
                  A shared meal can change a stranger into a friend. A journey can shift how you
                  see life. And sometimes all we really need… is a reason to log out and step into
                  something new.
                </Text>
              </View>
              <Handwritten size={40} tilt={-3} color={Colors.gold} style={styles.signature}>
                Vidushi
              </Handwritten>
              <View style={styles.socialChips}>
                {[
                  { label: "LINKEDIN", href: SOCIALS.linkedin },
                  { label: "INSTAGRAM", href: SOCIALS.instagram },
                  { label: "YOUTUBE", href: SOCIALS.youtube },
                ].map((s) => (
                  <PressableScale
                    key={s.label}
                    onPress={() => Linking.openURL(s.href)}
                    scaleTo={0.94}
                    style={styles.socialChip}
                  >
                    <Text style={styles.socialChipText}>{s.label}</Text>
                  </PressableScale>
                ))}
              </View>
            </View>
          </Reveal>
        </View>

        {/* The team — flip cards + magic dust */}
        <Reveal>
          <TeamSection />
        </Reveal>

        {/* CTA */}
        <View style={[styles.section, styles.centered]}>
          <Reveal style={styles.centered}>
            <Text style={styles.ctaStar}>✦</Text>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Write yourself </Text>
              <GradientText style={styles.sectionTitleItalic}>in.</GradientText>
            </View>
            <Text style={styles.ctaSub}>
              The next chapter is a circle with an empty seat — yours, if you want it.
            </Text>
            <View style={styles.ctaButtons}>
              <GoldButton
                label="Find Your Spell →"
                onPress={() => router.push("/live")}
                testID="story-live"
              />
              <GhostButton label="Become a Spellcaster" onPress={openApply} />
            </View>
          </Reveal>
        </View>

        <Footer />
      </RevealScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scroll: {
    paddingBottom: 40,
  },
  centered: {
    alignItems: "center",
  },
  hero: {
    paddingHorizontal: 20,
    paddingTop: 22,
  },
  heroTitleRow: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  heroTitle: {
    fontFamily: Fonts.serif,
    fontSize: 40,
    lineHeight: 46,
    color: Colors.cream,
    textAlign: "center",
  },
  heroTitleItalic: {
    fontFamily: Fonts.serifItalic,
    fontSize: 40,
    lineHeight: 46,
  },
  heroSub: {
    marginTop: 16,
    maxWidth: 330,
    textAlign: "center",
    fontFamily: Fonts.sans,
    fontSize: 14.5,
    lineHeight: 23,
    color: "rgba(245,240,232,0.6)",
  },
  quoteCard: {
    marginTop: 34,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.3)",
    overflow: "hidden",
    paddingVertical: 54,
    paddingHorizontal: 28,
    alignItems: "center",
  },
  quote: {
    textAlign: "center",
    fontFamily: Fonts.serifItalic,
    fontSize: 26,
    lineHeight: 36,
    color: "rgba(245,240,232,0.92)",
  },
  quoteGold: {
    color: Colors.goldLight,
  },
  statsRow: {
    marginTop: 30,
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "rgba(245,240,232,0.08)",
    paddingTop: 26,
  },
  statCell: {
    flex: 1,
    gap: 8,
    alignItems: "center",
  },
  statNum: {
    fontFamily: Fonts.serif,
    fontSize: 32,
    color: Colors.gold,
  },
  statLabel: {
    fontFamily: Fonts.sans,
    fontSize: 9,
    letterSpacing: 1.4,
    lineHeight: 14,
    color: "rgba(245,240,232,0.45)",
    textAlign: "center",
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 70,
  },
  sectionTitleRow: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  sectionTitle: {
    fontFamily: Fonts.serif,
    fontSize: 34,
    lineHeight: 40,
    color: Colors.cream,
    textAlign: "center",
  },
  sectionTitleItalic: {
    fontFamily: Fonts.serifItalic,
    fontSize: 34,
    lineHeight: 40,
  },
  timeline: {
    marginTop: 50,
    position: "relative",
  },
  timelineLine: {
    position: "absolute",
    left: 19,
    top: 0,
    bottom: 0,
    width: 1,
  },
  timelineEntry: {
    paddingLeft: 56,
    marginBottom: 48,
    gap: 13,
  },
  timelineNode: {
    position: "absolute",
    left: 8,
    top: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.5)",
    backgroundColor: Colors.charcoal,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineNodeText: {
    fontSize: 10,
    color: Colors.gold,
  },
  timelineTitle: {
    fontFamily: Fonts.serifItalic,
    fontSize: 26,
    lineHeight: 31,
    color: Colors.cream,
  },
  timelineBody: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 22,
    color: "rgba(245,240,232,0.55)",
  },
  timelineHighlight: {
    fontFamily: Fonts.serifItalic,
    fontSize: 19,
    lineHeight: 25,
    color: Colors.goldLight,
  },
  casterCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.08)",
    backgroundColor: "rgba(245,240,232,0.04)",
    padding: 26,
  },
  casterTitleRow: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  casterTitle: {
    fontFamily: Fonts.serif,
    fontSize: 32,
    lineHeight: 38,
    color: Colors.cream,
  },
  casterTitleItalic: {
    fontFamily: Fonts.serifItalic,
    fontSize: 32,
    lineHeight: 38,
  },
  casterParas: {
    marginTop: 18,
    gap: 13,
  },
  casterPara: {
    fontFamily: Fonts.sans,
    fontSize: 14.5,
    lineHeight: 23,
    color: "rgba(245,240,232,0.6)",
  },
  signature: {
    marginTop: 24,
    textShadowColor: "rgba(184,150,62,0.45)",
    textShadowRadius: 24,
    textShadowOffset: { width: 0, height: 0 },
  },
  quoteNote: {
    marginTop: 18,
    opacity: 0.85,
  },
  socialChips: {
    marginTop: 22,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 11,
  },
  socialChip: {
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.3)",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  socialChipText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 10.5,
    letterSpacing: 1.6,
    color: "rgba(184,150,62,0.8)",
  },
  ctaStar: {
    fontFamily: Fonts.serif,
    fontSize: 40,
    color: "rgba(184,150,62,0.7)",
  },
  ctaSub: {
    marginTop: 16,
    maxWidth: 300,
    textAlign: "center",
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 21,
    color: "rgba(245,240,232,0.55)",
  },
  ctaButtons: {
    marginTop: 30,
    alignSelf: "stretch",
    gap: 12,
  },
});

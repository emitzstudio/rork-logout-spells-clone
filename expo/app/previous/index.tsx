import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { MapPin, Users } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { Stars } from "@/components/AccountBits";
import { PressableScale } from "@/components/Buttons";
import Eyebrow from "@/components/Eyebrow";
import Footer from "@/components/Footer";
import GradientText from "@/components/GradientText";
import { Reveal, RevealScrollView } from "@/components/RevealScroll";
import StackHeader from "@/components/StackHeader";
import { Colors, Fonts } from "@/constants/theme";
import { previousSpellsService } from "@/data/previousSpells";
import type { PreviousSpell } from "@/data/previousSpells";
import { ratingSummary, reviewService } from "@/data/reviews";

function PastCard({ spell, index }: { spell: PreviousSpell; index: number }) {
  const router = useRouter();
  const summary = ratingSummary(reviewService.listSync(spell.id));

  return (
    <Reveal delay={Math.min(index * 80, 320)}>
      <PressableScale
        onPress={() => router.push(`/previous/${spell.slug}`)}
        scaleTo={0.98}
        style={styles.card}
        testID={`previous-${spell.slug}`}
      >
        <Image source={{ uri: spell.hero }} style={StyleSheet.absoluteFill} contentFit="cover" transition={400} />
        <LinearGradient
          colors={["rgba(10,8,6,0.1)", "rgba(10,8,6,0.5)", "rgba(10,8,6,0.96)"]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.seasonChip}>
          <Text style={styles.seasonChipText}>{spell.season.toUpperCase()}</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>{spell.title}</Text>
          <Text style={styles.cardCaption} numberOfLines={2}>
            {spell.caption}
          </Text>
          <View style={styles.cardMetaRow}>
            <MapPin size={12} color="rgba(184,150,62,0.75)" />
            <Text style={styles.cardMeta}>{spell.location}</Text>
            <Users size={12} color="rgba(184,150,62,0.75)" />
            <Text style={styles.cardMeta}>{spell.travellers} travellers</Text>
          </View>
          {summary.count > 0 ? (
            <View style={styles.ratingRow}>
              <Stars rating={summary.average} size={12} />
              <Text style={styles.ratingText}>
                {summary.average} · {summary.count} review{summary.count > 1 ? "s" : ""}
              </Text>
            </View>
          ) : null}
        </View>
      </PressableScale>
    </Reveal>
  );
}

/** Previous Spells — completed journeys kept as memory pages. */
export default function PreviousSpellsScreen() {
  const spells = previousSpellsService.list();

  return (
    <View style={styles.flex}>
      <StackHeader title="Previous Spells" fallback="/live" />
      <RevealScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Reveal style={styles.centered}>
            <Eyebrow center>Where the circle has been</Eyebrow>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Spells Already </Text>
              <GradientText style={styles.titleItalic}>Cast</GradientText>
            </View>
            <Text style={styles.sub}>
              Every journey leaves a page — what happened, what was kept, and what the circle
              says now.
            </Text>
          </Reveal>
        </View>

        <View style={styles.cards}>
          {spells.map((spell, i) => (
            <PastCard key={spell.id} spell={spell} index={i} />
          ))}
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 30,
  },
  centered: {
    alignItems: "center",
  },
  titleRow: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  title: {
    fontFamily: Fonts.serif,
    fontSize: 36,
    lineHeight: 42,
    color: Colors.cream,
    textAlign: "center",
  },
  titleItalic: {
    fontFamily: Fonts.serifItalic,
    fontSize: 36,
    lineHeight: 42,
  },
  sub: {
    marginTop: 14,
    maxWidth: 320,
    textAlign: "center",
    fontFamily: Fonts.sans,
    fontSize: 13.5,
    lineHeight: 20,
    color: "rgba(245,240,232,0.5)",
  },
  cards: {
    paddingHorizontal: 20,
    gap: 16,
  },
  card: {
    height: 300,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.08)",
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  seasonChip: {
    position: "absolute",
    top: 14,
    left: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.2)",
    backgroundColor: "rgba(10,8,6,0.7)",
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  seasonChipText: {
    fontFamily: Fonts.sansSemi,
    fontSize: 8.5,
    letterSpacing: 1.6,
    color: "rgba(245,240,232,0.8)",
  },
  cardBody: {
    padding: 18,
    gap: 6,
  },
  cardTitle: {
    fontFamily: Fonts.serif,
    fontSize: 27,
    color: Colors.cream,
  },
  cardCaption: {
    fontFamily: Fonts.serifItalic,
    fontSize: 14,
    lineHeight: 19,
    color: "rgba(245,240,232,0.7)",
  },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  cardMeta: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: "rgba(245,240,232,0.6)",
    marginRight: 8,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  ratingText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 11.5,
    color: "rgba(245,240,232,0.6)",
  },
});

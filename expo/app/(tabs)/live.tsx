import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { MapPin } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { PressableScale } from "@/components/Buttons";
import Eyebrow from "@/components/Eyebrow";
import FilterChip from "@/components/FilterChip";
import Footer from "@/components/Footer";
import GradientText from "@/components/GradientText";
import Pill from "@/components/Pills";
import PulsingDot from "@/components/PulsingDot";
import { Reveal, RevealScrollView } from "@/components/RevealScroll";
import { EmptyState } from "@/components/States";
import SiteHeader from "@/components/SiteHeader";
import { Colors, Fonts, TAB_BAR_SPACE } from "@/constants/theme";
import { CATEGORY_META, gradientColors } from "@/data/spells";
import type { ManagedSpell, SpellCategoryId } from "@/data/spells";
import { useSpellStore } from "@/data/spellStore";

type Filter = "all" | SpellCategoryId;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "✺ All Spells" },
  ...(Object.keys(CATEGORY_META) as SpellCategoryId[]).map((id) => ({
    id: id as Filter,
    label: `${CATEGORY_META[id].symbol} ${CATEGORY_META[id].label}`,
  })),
];

function LiveCard({ spell, onPress }: { spell: ManagedSpell; onPress: () => void }) {
  const colors = gradientColors(spell.gradient);
  const live = spell.status === "published";

  return (
    <PressableScale onPress={onPress} scaleTo={0.985} style={styles.card} testID={`live-${spell.slug}`}>
      <LinearGradient
        colors={colors as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {spell.image !== "" ? (
        <>
          <Image source={{ uri: spell.image }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
          <LinearGradient
            colors={["rgba(10,8,6,0.25)", "rgba(10,8,6,0.55)", "rgba(10,8,6,0.95)"]}
            style={StyleSheet.absoluteFill}
          />
        </>
      ) : null}

      <View style={styles.cardTop}>
        <Text style={styles.cardSymbol}>{spell.symbol}</Text>
        {live ? <Pill label="Live" tone="live" /> : <Pill label="Sold out" tone="soldout" />}
      </View>

      <View style={styles.cardBody}>
        <Eyebrow size={10}>{CATEGORY_META[spell.category].label}</Eyebrow>
        <Text style={styles.cardName}>{spell.name}</Text>
        <View style={styles.cardLocation}>
          <MapPin size={14} color="rgba(184,150,62,0.7)" />
          <Text style={styles.cardLocationText}>
            {spell.location} · {spell.dates}
          </Text>
        </View>
        {spell.hook.trim() !== "" ? <Text style={styles.cardHook}>{spell.hook}</Text> : null}
        <Text style={styles.cardLink}>
          {live ? "JOIN THIS CIRCLE" : "VIEW THIS SPELL"} →
        </Text>
      </View>
    </PressableScale>
  );
}

/** The public Live Spells page — every spell that is live on the site. */
export default function LiveScreen() {
  const router = useRouter();
  const { publicSpells } = useSpellStore();
  const [filter, setFilter] = useState<Filter>("all");

  const visible = useMemo(
    () => (filter === "all" ? publicSpells : publicSpells.filter((s) => s.category === filter)),
    [filter, publicSpells],
  );

  return (
    <View style={styles.flex}>
      <SiteHeader />
      <RevealScrollView contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE }}>
        <View style={styles.header}>
          <Reveal>
            <View style={styles.eyebrowRow}>
              <PulsingDot size={8} />
              <Eyebrow>Happening now</Eyebrow>
            </View>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Live </Text>
              <GradientText style={styles.titleItalic}>Spells</GradientText>
            </View>
            <Text style={styles.sub}>Every spell that is live on the site. Right now.</Text>
          </Reveal>

          <Reveal delay={100}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filters}
              style={styles.filtersScroll}
            >
              {FILTERS.map((f) => (
                <FilterChip
                  key={f.id}
                  label={f.label}
                  active={filter === f.id}
                  onPress={() => setFilter(f.id)}
                />
              ))}
            </ScrollView>
          </Reveal>

          <View style={styles.list}>
            {visible.map((spell, i) => (
              <Reveal key={spell.id} delay={Math.min(i * 70, 280)}>
                <LiveCard spell={spell} onPress={() => router.push(`/live/${spell.slug}`)} />
              </Reveal>
            ))}
          </View>

          {visible.length === 0 ? (
            <Reveal>
              <View style={styles.empty}>
                <EmptyState
                  glyph="☾"
                  title={
                    publicSpells.length === 0
                      ? "No spells are live right now."
                      : "No live spells in this circle yet."
                  }
                  body="The moment one is published, it appears here."
                />
              </View>
            </Reveal>
          ) : null}

          {/* Door to the archive — completed journeys with reviews. */}
          <Reveal>
            <PressableScale
              onPress={() => router.push("/previous")}
              scaleTo={0.98}
              style={styles.previousDoor}
              testID="live-previous-door"
            >
              <Text style={styles.previousSymbol}>☾</Text>
              <View style={styles.previousText}>
                <Text style={styles.previousTitle}>Missed a circle?</Text>
                <Text style={styles.previousSub}>
                  Walk through the spells already cast — stories, galleries and traveller
                  reviews.
                </Text>
              </View>
              <Text style={styles.previousLink}>VISIT →</Text>
            </PressableScale>
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 26,
    paddingBottom: 60,
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  titleRow: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  title: {
    fontFamily: Fonts.serif,
    fontSize: 52,
    lineHeight: 58,
    color: Colors.cream,
  },
  titleItalic: {
    fontFamily: Fonts.serifItalic,
    fontSize: 52,
    lineHeight: 58,
  },
  sub: {
    marginTop: 18,
    fontFamily: Fonts.serifItalic,
    fontSize: 22,
    lineHeight: 28,
    color: "rgba(245,240,232,0.6)",
  },
  filtersScroll: {
    marginTop: 36,
    marginHorizontal: -20,
  },
  filters: {
    paddingHorizontal: 20,
    gap: 10,
  },
  list: {
    marginTop: 32,
    gap: 20,
  },
  card: {
    minHeight: 300,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.07)",
    overflow: "hidden",
    padding: 26,
    justifyContent: "space-between",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  cardSymbol: {
    fontFamily: Fonts.serif,
    fontSize: 36,
    color: "rgba(184,150,62,0.7)",
  },

  cardBody: {
    marginTop: 40,
    gap: 9,
  },
  cardName: {
    fontFamily: Fonts.serif,
    fontSize: 30,
    lineHeight: 34,
    color: Colors.cream,
  },
  cardLocation: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardLocationText: {
    fontFamily: Fonts.sans,
    fontSize: 13.5,
    color: "rgba(245,240,232,0.55)",
  },
  cardHook: {
    fontFamily: Fonts.serifItalic,
    fontSize: 17,
    lineHeight: 23,
    color: "rgba(245,240,232,0.65)",
  },
  cardLink: {
    marginTop: 12,
    fontFamily: Fonts.sansMedium,
    fontSize: 12,
    letterSpacing: 2.4,
    color: Colors.gold,
  },
  empty: {
    marginTop: 32,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.07)",
    backgroundColor: "rgba(10,8,6,0.4)",
  },
  previousDoor: {
    marginTop: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.35)",
    backgroundColor: "rgba(184,150,62,0.06)",
    padding: 18,
  },
  previousSymbol: {
    fontFamily: Fonts.serif,
    fontSize: 28,
    color: "rgba(184,150,62,0.8)",
  },
  previousText: {
    flex: 1,
    gap: 3,
  },
  previousTitle: {
    fontFamily: Fonts.serif,
    fontSize: 20,
    color: Colors.cream,
  },
  previousSub: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    lineHeight: 17,
    color: "rgba(245,240,232,0.55)",
  },
  previousLink: {
    fontFamily: Fonts.sansSemi,
    fontSize: 10,
    letterSpacing: 1.8,
    color: Colors.gold,
  },
});

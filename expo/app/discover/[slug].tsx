import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GoldButton, PressableScale } from "@/components/Buttons";
import SpellRail from "@/components/SpellRail";
import StackHeader from "@/components/StackHeader";
import { Colors, Fonts } from "@/constants/theme";
import { discoverService } from "@/data/discover";
import { useSpellStore } from "@/data/spellStore";

/** One Discover category — mood board, curated live spells, past journeys. */
export default function DiscoverCategoryScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { publicSpells } = useSpellStore();

  const category = slug ? discoverService.bySlug(slug) : undefined;
  const curated = useMemo(
    () => (category ? discoverService.curatedSpells(category, publicSpells) : []),
    [category, publicSpells],
  );
  const past = useMemo(
    () => (category ? discoverService.relatedPast(category) : []),
    [category],
  );
  const gallery = useMemo(
    () => (category ? discoverService.galleryUrls(category) : []),
    [category],
  );

  if (!category) {
    return (
      <View style={styles.flex}>
        <StackHeader title="Discover" fallback="/discover" />
        <View style={styles.missing}>
          <Text style={styles.missingSymbol}>☾</Text>
          <Text style={styles.missingTitle}>This mood has drifted away.</Text>
          <GoldButton label="Back to Discover" onPress={() => router.replace("/discover")} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <StackHeader title={category.name} fallback="/discover" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 60 }}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Image source={{ uri: category.image }} style={StyleSheet.absoluteFill} contentFit="cover" transition={400} />
          <LinearGradient
            colors={["rgba(10,8,6,0.2)", "rgba(10,8,6,0.55)", "rgba(28,28,26,1)"]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroBody}>
            <Text style={styles.heroSymbol}>{category.symbol}</Text>
            <Text style={styles.heroName}>{category.name}</Text>
            <Text style={styles.heroEssence}>{category.essence}</Text>
          </View>
        </View>

        <View style={styles.intro}>
          <Text style={styles.description}>{category.description}</Text>
          <View style={styles.moods}>
            {category.moods.map((mood) => (
              <View key={mood} style={styles.mood}>
                <Text style={styles.moodText}>✦ {mood}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Curated live spells */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Live circles in this mood</Text>
          {curated.length > 0 ? (
            <View style={styles.rail}>
              <SpellRail items={curated.map((spell) => ({ spell }))} testID="category-live" />
            </View>
          ) : (
            <Text style={styles.emptyLine}>
              Nothing live right now — the next {category.name.toLowerCase()} circle is being
              written ✦
            </Text>
          )}
        </View>

        {/* Past journeys */}
        {past.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Journeys that carried it</Text>
            <View style={styles.pastList}>
              {past.map((p) => (
                <PressableScale
                  key={p.id}
                  onPress={() => router.push(`/previous/${p.slug}`)}
                  scaleTo={0.98}
                  style={styles.pastCard}
                  testID={`category-past-${p.slug}`}
                >
                  <Image source={{ uri: p.hero }} style={styles.pastImage} contentFit="cover" transition={300} />
                  <View style={styles.pastBody}>
                    <Text style={styles.pastSeason}>{p.season.toUpperCase()}</Text>
                    <Text style={styles.pastTitle}>{p.title}</Text>
                    <Text style={styles.pastCaption} numberOfLines={2}>
                      {p.caption}
                    </Text>
                  </View>
                </PressableScale>
              ))}
            </View>
          </View>
        ) : null}

        {/* Inspiration gallery */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>The feeling, roughly</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.galleryRow}
          >
            {gallery.map((src, i) => (
              <Image
                key={src}
                source={{ uri: src }}
                style={[styles.galleryShot, i % 2 === 1 ? styles.galleryShotTall : null]}
                contentFit="cover"
                transition={300}
              />
            ))}
          </ScrollView>
        </View>

        <Text style={styles.footerLine}>Every mood becomes a circle, eventually ✦</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  hero: {
    height: 300,
    justifyContent: "flex-end",
  },
  heroBody: {
    padding: 22,
    gap: 6,
  },
  heroSymbol: {
    fontFamily: Fonts.serif,
    fontSize: 30,
    color: "rgba(240,223,174,0.9)",
  },
  heroName: {
    fontFamily: Fonts.serif,
    fontSize: 42,
    lineHeight: 48,
    color: Colors.cream,
  },
  heroEssence: {
    fontFamily: Fonts.serifItalic,
    fontSize: 16.5,
    lineHeight: 23,
    color: "rgba(245,240,232,0.75)",
  },
  intro: {
    paddingHorizontal: 22,
    paddingTop: 18,
  },
  description: {
    fontFamily: Fonts.sans,
    fontSize: 14.5,
    lineHeight: 23,
    color: "rgba(245,240,232,0.65)",
  },
  moods: {
    marginTop: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  mood: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.3)",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  moodText: {
    fontFamily: Fonts.sans,
    fontSize: 11.5,
    color: "rgba(245,240,232,0.65)",
  },
  section: {
    marginTop: 36,
  },
  sectionTitle: {
    paddingHorizontal: 22,
    fontFamily: Fonts.serif,
    fontSize: 26,
    color: Colors.cream,
    marginBottom: 16,
  },
  rail: {},
  emptyLine: {
    paddingHorizontal: 22,
    fontFamily: Fonts.serifItalic,
    fontSize: 14.5,
    color: "rgba(245,240,232,0.45)",
  },
  pastList: {
    paddingHorizontal: 22,
    gap: 12,
  },
  pastCard: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.08)",
    backgroundColor: "rgba(245,240,232,0.03)",
    overflow: "hidden",
  },
  pastImage: {
    width: 104,
  },
  pastBody: {
    flex: 1,
    padding: 14,
    gap: 4,
  },
  pastSeason: {
    fontFamily: Fonts.sansSemi,
    fontSize: 8.5,
    letterSpacing: 1.8,
    color: Colors.gold,
  },
  pastTitle: {
    fontFamily: Fonts.serif,
    fontSize: 20,
    color: Colors.cream,
  },
  pastCaption: {
    fontFamily: Fonts.serifItalic,
    fontSize: 12.5,
    lineHeight: 17,
    color: "rgba(245,240,232,0.55)",
  },
  galleryRow: {
    paddingHorizontal: 22,
    gap: 12,
    alignItems: "flex-start",
  },
  galleryShot: {
    width: 180,
    height: 220,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.08)",
  },
  galleryShotTall: {
    height: 260,
  },
  footerLine: {
    marginTop: 44,
    textAlign: "center",
    fontFamily: Fonts.serifItalic,
    fontSize: 14,
    color: "rgba(245,240,232,0.3)",
  },
  missing: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  missingSymbol: {
    fontFamily: Fonts.serif,
    fontSize: 48,
    color: "rgba(184,150,62,0.6)",
  },
  missingTitle: {
    fontFamily: Fonts.serif,
    fontSize: 26,
    color: Colors.cream,
    textAlign: "center",
  },
});

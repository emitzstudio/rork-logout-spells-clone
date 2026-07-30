import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowRight } from "lucide-react-native";
import React, { useMemo } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { PressableScale } from "@/components/Buttons";
import Eyebrow from "@/components/Eyebrow";
import Footer from "@/components/Footer";
import GradientText from "@/components/GradientText";
import { Reveal, RevealScrollView } from "@/components/RevealScroll";
import SiteHeader from "@/components/SiteHeader";
import { Colors, Fonts, TAB_BAR_SPACE } from "@/constants/theme";
import { discoverService } from "@/data/discover";
import type { DiscoverCategory } from "@/data/discover";
import { useSpellStore } from "@/data/spellStore";

function CategoryTile({
  category,
  height,
  index,
  liveCount,
}: {
  category: DiscoverCategory;
  height: number;
  index: number;
  liveCount: number;
}) {
  const router = useRouter();
  return (
    <Reveal delay={Math.min(index * 80, 320)}>
      <PressableScale
        onPress={() => router.push(`/discover/${category.slug}`)}
        scaleTo={0.975}
        style={[styles.tile, { height }]}
        testID={`discover-${category.slug}`}
      >
        <Image source={{ uri: category.image }} style={StyleSheet.absoluteFill} contentFit="cover" transition={400} />
        <LinearGradient
          colors={["rgba(10,8,6,0.05)", "rgba(10,8,6,0.4)", "rgba(10,8,6,0.94)"]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.tileSymbolWrap}>
          <Text style={styles.tileSymbol}>{category.symbol}</Text>
        </View>
        {liveCount > 0 ? (
          <View style={styles.liveChip}>
            <Text style={styles.liveChipText}>
              {liveCount} LIVE
            </Text>
          </View>
        ) : null}
        <View style={styles.tileBody}>
          <Text style={styles.tileName}>{category.name}</Text>
          <Text style={styles.tileEssence} numberOfLines={2}>
            {category.essence}
          </Text>
          <View style={styles.tileLink}>
            <Text style={styles.tileLinkText}>STEP IN</Text>
            <ArrowRight size={12} color={Colors.gold} />
          </View>
        </View>
      </PressableScale>
    </Reveal>
  );
}

/** Discover — the six generic spell moods, Pinterest meets luxury travel. */
export default function DiscoverScreen() {
  const { width } = useWindowDimensions();
  const { publicSpells } = useSpellStore();
  const categories = discoverService.list();

  const columnWidth = (width - 52) / 2;

  const columns = useMemo(() => {
    const left: DiscoverCategory[] = [];
    const right: DiscoverCategory[] = [];
    let leftH = 0;
    let rightH = 0;
    for (const category of categories) {
      const h = category.tall === true ? 300 : 230;
      if (leftH <= rightH) {
        left.push(category);
        leftH += h;
      } else {
        right.push(category);
        rightH += h;
      }
    }
    return { left, right };
  }, [categories]);

  const liveCountFor = (category: DiscoverCategory): number =>
    discoverService.curatedSpells(category, publicSpells).length;

  const renderColumn = (list: DiscoverCategory[], offset: number) => (
    <View style={[styles.column, { width: columnWidth }]}>
      {list.map((category, i) => (
        <CategoryTile
          key={category.id}
          category={category}
          height={category.tall === true ? 300 : 230}
          index={offset + i}
          liveCount={liveCountFor(category)}
        />
      ))}
    </View>
  );

  return (
    <View style={styles.flex}>
      <SiteHeader />
      <RevealScrollView contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE }}>
        <View style={styles.header}>
          <Reveal style={styles.centered}>
            <Eyebrow center>Six ways to disappear</Eyebrow>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Find Your </Text>
              <GradientText style={styles.titleItalic}>Kind of Magic</GradientText>
            </View>
            <Text style={styles.sub}>
              Not itineraries — moods. Step into a board and see the circles it gathers.
            </Text>
          </Reveal>
        </View>

        <View style={styles.masonry}>
          {renderColumn(columns.left, 0)}
          {renderColumn(columns.right, 1)}
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
    fontSize: 34,
    lineHeight: 40,
    color: Colors.cream,
    textAlign: "center",
  },
  titleItalic: {
    fontFamily: Fonts.serifItalic,
    fontSize: 34,
    lineHeight: 40,
  },
  sub: {
    marginTop: 14,
    maxWidth: 300,
    textAlign: "center",
    fontFamily: Fonts.sans,
    fontSize: 13.5,
    lineHeight: 20,
    color: "rgba(245,240,232,0.5)",
  },
  masonry: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
  },
  column: {
    gap: 12,
  },
  tile: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.08)",
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  tileSymbolWrap: {
    position: "absolute",
    top: 12,
    left: 12,
  },
  tileSymbol: {
    fontFamily: Fonts.serif,
    fontSize: 22,
    color: "rgba(240,223,174,0.85)",
  },
  liveChip: {
    position: "absolute",
    top: 14,
    right: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.45)",
    backgroundColor: "rgba(10,8,6,0.7)",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  liveChipText: {
    fontFamily: Fonts.sansSemi,
    fontSize: 8,
    letterSpacing: 1.4,
    color: Colors.goldLight,
  },
  tileBody: {
    padding: 14,
    gap: 5,
  },
  tileName: {
    fontFamily: Fonts.serif,
    fontSize: 24,
    color: Colors.cream,
  },
  tileEssence: {
    fontFamily: Fonts.serifItalic,
    fontSize: 12.5,
    lineHeight: 17,
    color: "rgba(245,240,232,0.65)",
  },
  tileLink: {
    marginTop: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tileLinkText: {
    fontFamily: Fonts.sansSemi,
    fontSize: 9,
    letterSpacing: 2,
    color: Colors.gold,
  },
});

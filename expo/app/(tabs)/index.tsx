import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowDown, Feather, Users } from "lucide-react-native";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import { ArrowLink, GhostButton, GoldButton, PressableScale } from "@/components/Buttons";
import Eyebrow from "@/components/Eyebrow";
import Footer from "@/components/Footer";
import GradientText from "@/components/GradientText";
import Handwritten from "@/components/Handwritten";
import HomeWelcome from "@/components/HomeWelcome";
import Marquee from "@/components/Marquee";
import { Reveal, RevealScrollView } from "@/components/RevealScroll";
import SiteHeader from "@/components/SiteHeader";
import SpellRail from "@/components/SpellRail";
import { Colors, Fonts, TAB_BAR_SPACE } from "@/constants/theme";
import { BLOG_CATEGORIES, fmtBlogDate, useBlogPosts } from "@/data/blog";
import { discoverService } from "@/data/discover";
import { usePreviousSpells } from "@/data/previousSpells";
import { MARQUEE_ITEMS } from "@/data/site";
import { useSpellStore } from "@/data/spellStore";
import { useApp } from "@/providers/AppProvider";

/* --------------------------------- Hero ---------------------------------- */

function HeroWord({
  children,
  index,
  fontSize,
  gradient = false,
}: {
  children: string;
  index: number;
  fontSize: number;
  gradient?: boolean;
}) {
  const p = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(p, {
      toValue: 1,
      duration: 1100,
      delay: 350 + index * 140,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();
  }, [p, index]);

  const textStyle = {
    fontFamily: gradient ? Fonts.serifItalic : Fonts.serif,
    fontSize,
    lineHeight: fontSize * 1.02,
  } as const;

  return (
    <View style={{ overflow: "hidden" }}>
      <Animated.View
        style={{
          transform: [
            { translateY: p.interpolate({ inputRange: [0, 1], outputRange: [fontSize * 1.1, 0] }) },
          ],
        }}
      >
        {gradient ? (
          <GradientText style={textStyle}>{children}</GradientText>
        ) : (
          <Text style={[textStyle, { color: Colors.cream }]}>{children}</Text>
        )}
      </Animated.View>
    </View>
  );
}

function Hero({ onChooseSpell }: { onChooseSpell: () => void }) {
  const { width, height } = useWindowDimensions();
  const { openApply } = useApp();
  const fadeIn = useRef(new Animated.Value(0)).current;
  const ctaIn = useRef(new Animated.Value(0)).current;
  const hintIn = useRef(new Animated.Value(0)).current;
  const hintFloat = useRef(new Animated.Value(0)).current;

  const wordSize = Math.min(64, width * 0.17);

  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 900,
      delay: 1000,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();
    Animated.timing(ctaIn, {
      toValue: 1,
      duration: 900,
      delay: 1200,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();
    Animated.timing(hintIn, { toValue: 1, duration: 1000, delay: 2000, useNativeDriver: true }).start();
    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(hintFloat, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(hintFloat, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    float.start();
    return () => float.stop();
  }, [fadeIn, ctaIn, hintIn, hintFloat]);

  return (
    <View style={[styles.hero, { minHeight: height * 0.82 }]}>
      <Animated.View style={{ opacity: fadeIn }}>
        <Eyebrow center>A quiet rebellion</Eyebrow>
      </Animated.View>

      <View style={styles.heroWords}>
        <HeroWord index={0} fontSize={wordSize}>
          Belong
        </HeroWord>
        <HeroWord index={1} fontSize={wordSize}>
          Somewhere
        </HeroWord>
        <HeroWord index={2} fontSize={wordSize} gradient>
          Real.
        </HeroWord>
      </View>

      <Animated.Text style={[styles.heroSub, { opacity: fadeIn }]}>
        We turn digital followers into real-world community.
      </Animated.Text>

      <Animated.View
        style={[
          styles.heroCtas,
          {
            opacity: ctaIn,
            transform: [
              { translateY: ctaIn.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
            ],
          },
        ]}
      >
        <GoldButton label="Choose Your Spell →" onPress={onChooseSpell} testID="hero-choose" />
        <GhostButton label="Apply to Host" onPress={openApply} testID="hero-apply" />
      </Animated.View>

      <Animated.View style={[styles.scrollHint, { opacity: hintIn }]}>
        <Text style={styles.scrollHintText}>SCROLL</Text>
        <Animated.View
          style={{
            transform: [
              { translateY: hintFloat.interpolate({ inputRange: [0, 1], outputRange: [0, 7] }) },
            ],
          }}
        >
          <ArrowDown size={14} color="rgba(184,150,62,0.7)" />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

/* ------------------------------ Section header ---------------------------- */

function SectionHeader({
  eyebrow,
  title,
  italic,
  onSeeAll,
  seeAllLabel = "SEE ALL",
}: {
  eyebrow: string;
  title: string;
  italic: string;
  onSeeAll?: () => void;
  seeAllLabel?: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderText}>
        <Eyebrow>{eyebrow}</Eyebrow>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>{title} </Text>
          <GradientText style={styles.sectionTitleItalic}>{italic}</GradientText>
        </View>
      </View>
      {onSeeAll ? (
        <ArrowLink label={seeAllLabel} onPress={onSeeAll} style={styles.seeAll} />
      ) : null}
    </View>
  );
}

/* --------------------------------- Screen --------------------------------- */

export default function HomeScreen() {
  const router = useRouter();
  const { openApply } = useApp();
  const { publicSpells } = useSpellStore();
  const scrollRef = useRef<ScrollView>(null);
  const spellsY = useRef<number>(0);

  const previous = usePreviousSpells().slice(0, 6);
  const categories = discoverService.list();
  const posts = useBlogPosts().slice(0, 2);

  return (
    <View style={styles.flex}>
      <SiteHeader />
      <RevealScrollView
        scrollRef={scrollRef}
        contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE }}
      >
        <Hero
          onChooseSpell={() =>
            scrollRef.current?.scrollTo({ y: spellsY.current - 60, animated: true })
          }
        />

        {/* Signed-in greeting + next trip + recommendations */}
        <HomeWelcome />

        {/* Marquee */}
        <View style={styles.marqueeWrap}>
          <Marquee speed={46}>
            {MARQUEE_ITEMS.map((item) => (
              <View key={item} style={styles.marqueeItem}>
                <Text style={styles.marqueeText}>{item}</Text>
                <Text style={styles.marqueeStar}>✦</Text>
              </View>
            ))}
          </Marquee>
        </View>

        {/* Live spells rail */}
        <View
          style={styles.section}
          onLayout={(e) => {
            spellsY.current = e.nativeEvent.layout.y;
          }}
        >
          <Reveal>
            <SectionHeader
              eyebrow="Live this season"
              title="Choose Your"
              italic="Spell"
              onSeeAll={() => router.push("/live")}
            />
          </Reveal>
          <Reveal delay={80}>
            <View style={styles.rail}>
              <SpellRail
                items={publicSpells.map((spell) => ({ spell }))}
                testID="home-live-rail"
              />
            </View>
          </Reveal>
        </View>

        {/* Previous spells rail */}
        <View style={[styles.section, styles.sectionDeep]}>
          <Reveal>
            <SectionHeader
              eyebrow="Already cast"
              title="Previous"
              italic="Spells"
              onSeeAll={() => router.push("/previous")}
            />
          </Reveal>
          <Reveal delay={80}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pastRow}
            >
              {previous.map((p) => (
                <PressableScale
                  key={p.id}
                  onPress={() => router.push(`/previous/${p.slug}`)}
                  scaleTo={0.97}
                  style={styles.pastCard}
                  testID={`home-past-${p.slug}`}
                >
                  <Image source={{ uri: p.hero }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
                  <LinearGradient
                    colors={["rgba(10,8,6,0.05)", "rgba(10,8,6,0.55)", "rgba(10,8,6,0.95)"]}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={styles.pastChip}>
                    <Text style={styles.pastChipText}>{p.season.toUpperCase()}</Text>
                  </View>
                  <View style={styles.pastBody}>
                    <Text style={styles.pastName} numberOfLines={1}>
                      {p.title}
                    </Text>
                    <Text style={styles.pastCaption} numberOfLines={2}>
                      {p.caption}
                    </Text>
                  </View>
                </PressableScale>
              ))}
            </ScrollView>
          </Reveal>
        </View>

        {/* Discover categories */}
        <View style={styles.section}>
          <Reveal>
            <SectionHeader
              eyebrow="Six moods"
              title="Discover Your"
              italic="Kind of Magic"
              onSeeAll={() => router.push("/discover")}
            />
          </Reveal>
          <Reveal delay={80}>
            <View style={styles.categoryGrid}>
              {categories.map((category) => (
                <PressableScale
                  key={category.id}
                  onPress={() => router.push(`/discover/${category.slug}`)}
                  scaleTo={0.96}
                  style={styles.categoryTile}
                  testID={`home-category-${category.slug}`}
                >
                  <Image source={{ uri: category.image }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
                  <LinearGradient
                    colors={["rgba(10,8,6,0.15)", "rgba(10,8,6,0.55)", "rgba(10,8,6,0.92)"]}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={styles.categoryBody}>
                    <Text style={styles.categorySymbol}>{category.symbol}</Text>
                    <Text style={styles.categoryName}>{category.name}</Text>
                  </View>
                </PressableScale>
              ))}
            </View>
          </Reveal>
        </View>

        {/* Journal teaser */}
        <View style={[styles.section, styles.sectionDeep]}>
          <Reveal>
            <SectionHeader
              eyebrow="The Logout Journal"
              title="Stories From"
              italic="the Circle"
              onSeeAll={() => router.push("/blog")}
              seeAllLabel="THE JOURNAL"
            />
          </Reveal>
          <Reveal delay={80}>
            <View style={styles.postList}>
              {posts.map((post) => (
                <PressableScale
                  key={post.id}
                  onPress={() => router.push(`/blog/${post.slug}`)}
                  scaleTo={0.98}
                  style={styles.postCard}
                  testID={`home-post-${post.slug}`}
                >
                  <Image source={{ uri: post.hero }} style={styles.postImage} contentFit="cover" transition={300} />
                  <View style={styles.postBody}>
                    <Text style={styles.postCategory}>
                      {BLOG_CATEGORIES[post.category].symbol}{" "}
                      {BLOG_CATEGORIES[post.category].label.toUpperCase()}
                    </Text>
                    <Text style={styles.postTitle} numberOfLines={2}>
                      {post.title}
                    </Text>
                    <Text style={styles.postMeta}>
                      {post.author.name} · {fmtBlogDate(post.publishedAt)} · {post.readMinutes} min
                    </Text>
                  </View>
                </PressableScale>
              ))}
            </View>
          </Reveal>
        </View>

        {/* Story + Spellcaster doors */}
        <View style={styles.section}>
          <Reveal>
            <View style={styles.doors}>
              <PressableScale
                onPress={() => router.push("/our-story")}
                scaleTo={0.97}
                style={styles.door}
                testID="home-our-story"
              >
                <LinearGradient
                  colors={["#2a2113", "#14100a"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Feather size={20} color={Colors.goldLight} />
                <Text style={styles.doorTitle}>Our Story</Text>
                <Text style={styles.doorSub}>
                  The question that started it, and the people keeping it alive.
                </Text>
                <Handwritten size={20} style={styles.doorNote}>
                  “what if strangers became your people?”
                </Handwritten>
                <Text style={styles.doorLink}>MEET THE COVEN →</Text>
              </PressableScale>

              <PressableScale
                onPress={() => router.push("/creators")}
                scaleTo={0.97}
                style={styles.door}
                testID="home-creators"
              >
                <LinearGradient
                  colors={["#241d10", "#100d08"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Users size={20} color={Colors.goldLight} />
                <Text style={styles.doorTitle}>Become a Spellcaster</Text>
                <Text style={styles.doorSub}>
                  Turn your travels into income — host circles, earn up to 50%.
                </Text>
                <Text style={styles.doorLink}>CAST WITH US →</Text>
              </PressableScale>
            </View>
          </Reveal>
        </View>

        {/* Final CTA */}
        <View style={[styles.section, styles.sectionDeep, styles.centerBlock]}>
          <Reveal style={styles.centerBlock}>
            <Text style={styles.ctaStar}>✦</Text>
            <View style={styles.ctaTitleRow}>
              <Text style={styles.ctaTitle}>Ready to </Text>
              <GradientText style={styles.ctaTitleItalic}>log out?</GradientText>
            </View>
            <Text style={styles.ctaSub}>
              A private invitation. A quiet movement. Find the spell that calls to you — or cast
              one of your own.
            </Text>
            <View style={styles.ctaButtons}>
              <GoldButton
                label="Discover Your Spell →"
                onPress={() => router.push("/discover")}
                testID="cta-discover"
              />
              <GhostButton label="Apply to Host" onPress={openApply} />
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
  hero: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  heroWords: {
    marginTop: 26,
    alignItems: "center",
  },
  heroSub: {
    marginTop: 30,
    maxWidth: 320,
    textAlign: "center",
    fontFamily: Fonts.sans,
    fontSize: 16,
    lineHeight: 25,
    color: "rgba(245,240,232,0.55)",
  },
  heroCtas: {
    marginTop: 38,
    gap: 12,
    alignSelf: "stretch",
    paddingHorizontal: 22,
  },
  scrollHint: {
    position: "absolute",
    bottom: 26,
    alignItems: "center",
    gap: 8,
  },
  scrollHintText: {
    fontFamily: Fonts.sans,
    fontSize: 10,
    letterSpacing: 3,
    color: "rgba(245,240,232,0.4)",
  },
  marqueeWrap: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(245,240,232,0.06)",
    backgroundColor: "rgba(28,28,26,0.4)",
    paddingVertical: 20,
  },
  marqueeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 32,
    paddingRight: 32,
  },
  marqueeText: {
    fontFamily: Fonts.serifItalic,
    fontSize: 20,
    color: "rgba(245,240,232,0.35)",
  },
  marqueeStar: {
    fontSize: 16,
    color: "rgba(184,150,62,0.6)",
  },
  section: {
    paddingVertical: 56,
  },
  sectionDeep: {
    backgroundColor: "rgba(10,8,6,0.4)",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 14,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeaderText: {
    flex: 1,
    gap: 8,
  },
  sectionTitleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  sectionTitle: {
    fontFamily: Fonts.serif,
    fontSize: 30,
    lineHeight: 35,
    color: Colors.cream,
  },
  sectionTitleItalic: {
    fontFamily: Fonts.serifItalic,
    fontSize: 30,
    lineHeight: 35,
  },
  seeAll: {
    paddingBottom: 6,
  },
  rail: {},
  pastRow: {
    paddingHorizontal: 20,
    gap: 14,
  },
  pastCard: {
    width: 230,
    height: 260,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.08)",
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  pastChip: {
    position: "absolute",
    top: 12,
    left: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.2)",
    backgroundColor: "rgba(10,8,6,0.7)",
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  pastChipText: {
    fontFamily: Fonts.sansSemi,
    fontSize: 8,
    letterSpacing: 1.4,
    color: "rgba(245,240,232,0.8)",
  },
  pastBody: {
    padding: 15,
    gap: 4,
  },
  pastName: {
    fontFamily: Fonts.serif,
    fontSize: 21,
    color: Colors.cream,
  },
  pastCaption: {
    fontFamily: Fonts.serifItalic,
    fontSize: 12.5,
    lineHeight: 17,
    color: "rgba(245,240,232,0.6)",
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingHorizontal: 20,
  },
  categoryTile: {
    width: "48%",
    flexGrow: 1,
    height: 120,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.08)",
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  categoryBody: {
    padding: 12,
    gap: 2,
  },
  categorySymbol: {
    fontFamily: Fonts.serif,
    fontSize: 16,
    color: "rgba(240,223,174,0.85)",
  },
  categoryName: {
    fontFamily: Fonts.serif,
    fontSize: 19,
    color: Colors.cream,
  },
  postList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  postCard: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.08)",
    backgroundColor: "rgba(245,240,232,0.03)",
    overflow: "hidden",
  },
  postImage: {
    width: 104,
  },
  postBody: {
    flex: 1,
    padding: 14,
    gap: 5,
  },
  postCategory: {
    fontFamily: Fonts.sansSemi,
    fontSize: 8.5,
    letterSpacing: 1.8,
    color: Colors.gold,
  },
  postTitle: {
    fontFamily: Fonts.serif,
    fontSize: 18,
    lineHeight: 22,
    color: Colors.cream,
  },
  postMeta: {
    fontFamily: Fonts.sans,
    fontSize: 10.5,
    color: "rgba(245,240,232,0.45)",
  },
  doors: {
    paddingHorizontal: 20,
    gap: 14,
  },
  door: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.25)",
    overflow: "hidden",
    padding: 22,
    gap: 8,
  },
  doorTitle: {
    fontFamily: Fonts.serif,
    fontSize: 26,
    color: Colors.cream,
  },
  doorSub: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    lineHeight: 19,
    color: "rgba(245,240,232,0.55)",
  },
  doorNote: {
    marginTop: 2,
  },
  doorLink: {
    marginTop: 6,
    fontFamily: Fonts.sansSemi,
    fontSize: 10.5,
    letterSpacing: 2,
    color: Colors.gold,
  },
  centerBlock: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  ctaStar: {
    fontFamily: Fonts.serif,
    fontSize: 44,
    color: "rgba(184,150,62,0.7)",
  },
  ctaTitleRow: {
    marginTop: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  ctaTitle: {
    fontFamily: Fonts.serif,
    fontSize: 42,
    lineHeight: 48,
    color: Colors.cream,
  },
  ctaTitleItalic: {
    fontFamily: Fonts.serifItalic,
    fontSize: 42,
    lineHeight: 48,
  },
  ctaSub: {
    marginTop: 20,
    maxWidth: 340,
    textAlign: "center",
    fontFamily: Fonts.sans,
    fontSize: 15,
    lineHeight: 24,
    color: "rgba(245,240,232,0.55)",
  },
  ctaButtons: {
    marginTop: 36,
    gap: 12,
    alignSelf: "stretch",
  },
});

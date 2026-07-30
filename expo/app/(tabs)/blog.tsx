import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Clock } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { PressableScale } from "@/components/Buttons";
import Eyebrow from "@/components/Eyebrow";
import FilterChip from "@/components/FilterChip";
import Footer from "@/components/Footer";
import GradientText from "@/components/GradientText";
import { Reveal, RevealScrollView } from "@/components/RevealScroll";
import SiteHeader from "@/components/SiteHeader";
import { Colors, Fonts, TAB_BAR_SPACE } from "@/constants/theme";
import { BLOG_CATEGORIES, blogService, fmtBlogDate } from "@/data/blog";
import type { BlogCategoryId, BlogPost } from "@/data/blog";

type Filter = "all" | BlogCategoryId;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "✺ Everything" },
  ...(Object.keys(BLOG_CATEGORIES) as BlogCategoryId[]).map((id) => ({
    id: id as Filter,
    label: `${BLOG_CATEGORIES[id].symbol} ${BLOG_CATEGORIES[id].label}`,
  })),
];

function AuthorLine({ post }: { post: BlogPost }) {
  return (
    <View style={styles.authorLine}>
      {post.author.avatar !== "" ? (
        <Image source={{ uri: post.author.avatar }} style={styles.authorAvatar} contentFit="cover" />
      ) : (
        <View style={[styles.authorAvatar, styles.authorFallback]}>
          <Text style={styles.authorInitial}>{post.author.initial}</Text>
        </View>
      )}
      <Text style={styles.authorMeta} numberOfLines={1}>
        {post.author.name} · {fmtBlogDate(post.publishedAt)}
      </Text>
      <View style={styles.readChip}>
        <Clock size={10} color="rgba(184,150,62,0.8)" />
        <Text style={styles.readChipText}>{post.readMinutes} MIN</Text>
      </View>
    </View>
  );
}

function FeaturedCard({ post }: { post: BlogPost }) {
  const router = useRouter();
  return (
    <PressableScale
      onPress={() => router.push(`/blog/${post.slug}`)}
      scaleTo={0.985}
      style={styles.featured}
      testID={`blog-featured-${post.slug}`}
    >
      <Image source={{ uri: post.hero }} style={StyleSheet.absoluteFill} contentFit="cover" transition={400} />
      <LinearGradient
        colors={["rgba(10,8,6,0.15)", "rgba(10,8,6,0.55)", "rgba(10,8,6,0.97)"]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.featuredChip}>
        <Text style={styles.featuredChipText}>✦ FEATURED</Text>
      </View>
      <View style={styles.featuredBody}>
        <Text style={styles.featuredCategory}>
          {BLOG_CATEGORIES[post.category].symbol} {BLOG_CATEGORIES[post.category].label.toUpperCase()}
        </Text>
        <Text style={styles.featuredTitle}>{post.title}</Text>
        <Text style={styles.featuredDeck} numberOfLines={2}>
          {post.deck}
        </Text>
        <AuthorLine post={post} />
      </View>
    </PressableScale>
  );
}

function PostCard({ post, index }: { post: BlogPost; index: number }) {
  const router = useRouter();
  return (
    <Reveal delay={Math.min(index * 70, 280)}>
      <PressableScale
        onPress={() => router.push(`/blog/${post.slug}`)}
        scaleTo={0.98}
        style={styles.post}
        testID={`blog-post-${post.slug}`}
      >
        <Image source={{ uri: post.hero }} style={styles.postImage} contentFit="cover" transition={300} />
        <View style={styles.postBody}>
          <Text style={styles.postCategory}>
            {BLOG_CATEGORIES[post.category].symbol} {BLOG_CATEGORIES[post.category].label.toUpperCase()}
          </Text>
          <Text style={styles.postTitle} numberOfLines={2}>
            {post.title}
          </Text>
          <Text style={styles.postDeck} numberOfLines={2}>
            {post.deck}
          </Text>
          <AuthorLine post={post} />
        </View>
      </PressableScale>
    </Reveal>
  );
}

/** The Logout Journal — travel guides, community stories and founder letters. */
export default function BlogScreen() {
  const [filter, setFilter] = useState<Filter>("all");

  const posts = useMemo(() => blogService.list(), []);
  const featured = useMemo(() => blogService.featured(), []);
  const visible = useMemo(
    () =>
      (filter === "all" ? posts : posts.filter((p) => p.category === filter)).filter(
        (p) => filter !== "all" || p.id !== featured.id,
      ),
    [filter, posts, featured],
  );

  return (
    <View style={styles.flex}>
      <SiteHeader />
      <RevealScrollView contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE }}>
        <View style={styles.header}>
          <Reveal style={styles.centered}>
            <Eyebrow center>The Logout Journal</Eyebrow>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Stories From </Text>
              <GradientText style={styles.titleItalic}>the Circle</GradientText>
            </View>
            <Text style={styles.sub}>
              Guides, recaps, host interviews and letters — everything we learn out there, written
              down.
            </Text>
          </Reveal>
        </View>

        {filter === "all" ? (
          <Reveal style={styles.featuredWrap}>
            <FeaturedCard post={featured} />
          </Reveal>
        ) : null}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
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

        <View style={styles.list}>
          {visible.map((post, i) => (
            <PostCard key={post.id} post={post} index={i} />
          ))}
          {visible.length === 0 ? (
            <Text style={styles.empty}>Nothing written here yet — soon ✦</Text>
          ) : null}
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
    fontSize: 38,
    lineHeight: 44,
    color: Colors.cream,
    textAlign: "center",
  },
  titleItalic: {
    fontFamily: Fonts.serifItalic,
    fontSize: 38,
    lineHeight: 44,
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
  featuredWrap: {
    paddingHorizontal: 20,
    marginBottom: 26,
  },
  featured: {
    height: 380,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.3)",
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  featuredChip: {
    position: "absolute",
    top: 16,
    left: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.45)",
    backgroundColor: "rgba(10,8,6,0.75)",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  featuredChipText: {
    fontFamily: Fonts.sansSemi,
    fontSize: 9,
    letterSpacing: 1.8,
    color: Colors.goldLight,
  },
  featuredBody: {
    padding: 20,
    gap: 8,
  },
  featuredCategory: {
    fontFamily: Fonts.sansSemi,
    fontSize: 9.5,
    letterSpacing: 2,
    color: Colors.gold,
  },
  featuredTitle: {
    fontFamily: Fonts.serif,
    fontSize: 30,
    lineHeight: 35,
    color: Colors.cream,
  },
  featuredDeck: {
    fontFamily: Fonts.sans,
    fontSize: 13.5,
    lineHeight: 20,
    color: "rgba(245,240,232,0.65)",
  },
  filters: {
    paddingHorizontal: 20,
    gap: 10,
    paddingBottom: 4,
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 22,
    gap: 18,
  },
  post: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.08)",
    backgroundColor: "rgba(245,240,232,0.03)",
    overflow: "hidden",
  },
  postImage: {
    height: 170,
    width: "100%",
  },
  postBody: {
    padding: 18,
    gap: 7,
  },
  postCategory: {
    fontFamily: Fonts.sansSemi,
    fontSize: 9,
    letterSpacing: 2,
    color: Colors.gold,
  },
  postTitle: {
    fontFamily: Fonts.serif,
    fontSize: 23,
    lineHeight: 28,
    color: Colors.cream,
  },
  postDeck: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    lineHeight: 19,
    color: "rgba(245,240,232,0.55)",
  },
  authorLine: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  authorAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.4)",
  },
  authorFallback: {
    backgroundColor: "#221b0e",
    alignItems: "center",
    justifyContent: "center",
  },
  authorInitial: {
    fontFamily: Fonts.serif,
    fontSize: 13,
    color: Colors.goldLight,
  },
  authorMeta: {
    flex: 1,
    fontFamily: Fonts.sans,
    fontSize: 11.5,
    color: "rgba(245,240,232,0.5)",
  },
  readChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.25)",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  readChipText: {
    fontFamily: Fonts.sansSemi,
    fontSize: 8.5,
    letterSpacing: 1.2,
    color: "rgba(184,150,62,0.9)",
  },
  empty: {
    textAlign: "center",
    paddingVertical: 40,
    fontFamily: Fonts.serifItalic,
    fontSize: 16,
    color: "rgba(245,240,232,0.4)",
  },
});

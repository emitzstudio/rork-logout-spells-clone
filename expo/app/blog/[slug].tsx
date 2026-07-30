import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Clock } from "lucide-react-native";
import React, { useMemo, useRef, useState } from "react";
import {
  Animated,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { GoldButton, PressableScale } from "@/components/Buttons";
import GradientText from "@/components/GradientText";
import StackHeader from "@/components/StackHeader";
import { Colors, Fonts } from "@/constants/theme";
import { BLOG_CATEGORIES, blogService, fmtBlogDate } from "@/data/blog";
import type { BlogBlock, BlogPost } from "@/data/blog";

function Block({ block }: { block: BlogBlock }) {
  switch (block.kind) {
    case "heading":
      return <Text style={styles.blockHeading}>{block.text}</Text>;
    case "quote":
      return (
        <View style={styles.blockQuote}>
          <Text style={styles.blockQuoteText}>“{block.text}”</Text>
          {block.by ? <Text style={styles.blockQuoteBy}>— {block.by}</Text> : null}
        </View>
      );
    case "list":
      return (
        <View style={styles.blockList}>
          {block.items.map((item) => (
            <View key={item.slice(0, 32)} style={styles.blockListRow}>
              <Text style={styles.blockListStar}>✦</Text>
              <Text style={styles.blockListText}>{item}</Text>
            </View>
          ))}
        </View>
      );
    case "image":
      return (
        <View style={styles.blockImageWrap}>
          <Image source={{ uri: block.src }} style={styles.blockImage} contentFit="cover" transition={300} />
          {block.caption ? <Text style={styles.blockCaption}>{block.caption}</Text> : null}
        </View>
      );
    default:
      return <Text style={styles.blockParagraph}>{block.text}</Text>;
  }
}

function RelatedCard({ post }: { post: BlogPost }) {
  const router = useRouter();
  return (
    <PressableScale
      onPress={() => router.replace(`/blog/${post.slug}`)}
      scaleTo={0.97}
      style={styles.related}
      testID={`related-${post.slug}`}
    >
      <Image source={{ uri: post.hero }} style={styles.relatedImage} contentFit="cover" transition={300} />
      <View style={styles.relatedBody}>
        <Text style={styles.relatedCategory}>
          {BLOG_CATEGORIES[post.category].label.toUpperCase()}
        </Text>
        <Text style={styles.relatedTitle} numberOfLines={2}>
          {post.title}
        </Text>
        <Text style={styles.relatedMeta}>{post.readMinutes} min read</Text>
      </View>
    </PressableScale>
  );
}

/** One journal entry — hero, byline, article blocks, reading progress. */
export default function BlogPostScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const progress = useRef(new Animated.Value(0)).current;
  const [contentHeight, setContentHeight] = useState<number>(1);
  const [viewportHeight, setViewportHeight] = useState<number>(1);

  const post = slug ? blogService.bySlug(slug) : undefined;
  const related = useMemo(() => (post ? blogService.related(post) : []), [post]);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
    const max = Math.max(1, contentHeight - viewportHeight);
    const value = Math.max(0, Math.min(1, event.nativeEvent.contentOffset.y / max));
    progress.setValue(value);
  };

  if (!post) {
    return (
      <View style={styles.flex}>
        <StackHeader title="The Journal" fallback="/blog" />
        <View style={styles.missing}>
          <Text style={styles.missingSymbol}>✎</Text>
          <Text style={styles.missingTitle}>This page has drifted away.</Text>
          <GoldButton label="Back to the Journal" onPress={() => router.replace("/blog")} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <StackHeader title={BLOG_CATEGORIES[post.category].label} fallback="/blog" />

      {/* Reading progress — thin gold bar under the header. */}
      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              transform: [
                { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-1000, 0] }) },
              ],
            },
          ]}
        />
      </View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onContentSizeChange={(_w, h) => setContentHeight(h)}
        onLayout={(e) => setViewportHeight(e.nativeEvent.layout.height)}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.hero}>
          <Image source={{ uri: post.hero }} style={StyleSheet.absoluteFill} contentFit="cover" transition={400} />
          <LinearGradient
            colors={["rgba(10,8,6,0.1)", "rgba(10,8,6,0.45)", "rgba(28,28,26,1)"]}
            style={StyleSheet.absoluteFill}
          />
        </View>

        <View style={styles.article}>
          <Text style={styles.category}>
            {BLOG_CATEGORIES[post.category].symbol}{" "}
            {BLOG_CATEGORIES[post.category].label.toUpperCase()}
          </Text>
          <Text style={styles.title}>{post.title}</Text>
          <GradientText style={styles.deck} block>
            {post.deck}
          </GradientText>

          <View style={styles.byline}>
            {post.author.avatar !== "" ? (
              <Image source={{ uri: post.author.avatar }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitial}>{post.author.initial}</Text>
              </View>
            )}
            <View style={styles.bylineText}>
              <Text style={styles.authorName}>{post.author.name}</Text>
              <Text style={styles.authorRole}>{post.author.role}</Text>
            </View>
            <View style={styles.readChip}>
              <Clock size={11} color="rgba(184,150,62,0.85)" />
              <Text style={styles.readChipText}>
                {fmtBlogDate(post.publishedAt)} · {post.readMinutes} MIN
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.blocks}>
            {post.blocks.map((block, i) => (
              <Block key={`${block.kind}-${i}`} block={block} />
            ))}
          </View>

          <View style={styles.tags}>
            {post.tags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        </View>

        {related.length > 0 ? (
          <View style={styles.relatedSection}>
            <Text style={styles.relatedHeading}>Keep reading ✦</Text>
            {related.map((p) => (
              <RelatedCard key={p.id} post={p} />
            ))}
          </View>
        ) : null}

        <Text style={styles.footerLine}>The Logout Journal · written slowly ✦</Text>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  progressTrack: {
    height: 2,
    backgroundColor: "rgba(245,240,232,0.06)",
    overflow: "hidden",
  },
  progressFill: {
    width: 1000,
    height: 2,
    backgroundColor: Colors.gold,
  },
  scroll: {
    paddingBottom: 70,
  },
  hero: {
    height: 260,
  },
  article: {
    paddingHorizontal: 22,
    marginTop: -40,
  },
  category: {
    fontFamily: Fonts.sansSemi,
    fontSize: 10,
    letterSpacing: 2.4,
    color: Colors.gold,
  },
  title: {
    marginTop: 10,
    fontFamily: Fonts.serif,
    fontSize: 36,
    lineHeight: 42,
    color: Colors.cream,
  },
  deck: {
    marginTop: 12,
    fontFamily: Fonts.serifItalic,
    fontSize: 19,
    lineHeight: 26,
  },
  byline: {
    marginTop: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.45)",
  },
  avatarFallback: {
    backgroundColor: "#221b0e",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontFamily: Fonts.serif,
    fontSize: 19,
    color: Colors.goldLight,
  },
  bylineText: {
    flex: 1,
  },
  authorName: {
    fontFamily: Fonts.sansMedium,
    fontSize: 14,
    color: Colors.cream,
  },
  authorRole: {
    marginTop: 1,
    fontFamily: Fonts.sans,
    fontSize: 11.5,
    color: "rgba(245,240,232,0.5)",
  },
  readChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.25)",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  readChipText: {
    fontFamily: Fonts.sansSemi,
    fontSize: 8.5,
    letterSpacing: 1,
    color: "rgba(184,150,62,0.9)",
  },
  divider: {
    marginTop: 24,
    height: 1,
    backgroundColor: "rgba(245,240,232,0.08)",
  },
  blocks: {
    marginTop: 26,
    gap: 20,
  },
  blockParagraph: {
    fontFamily: Fonts.sans,
    fontSize: 15.5,
    lineHeight: 26,
    color: "rgba(245,240,232,0.72)",
  },
  blockHeading: {
    marginTop: 8,
    fontFamily: Fonts.serif,
    fontSize: 25,
    lineHeight: 31,
    color: Colors.cream,
  },
  blockQuote: {
    borderLeftWidth: 2,
    borderLeftColor: Colors.gold,
    paddingLeft: 18,
    paddingVertical: 4,
    gap: 8,
  },
  blockQuoteText: {
    fontFamily: Fonts.serifItalic,
    fontSize: 21,
    lineHeight: 29,
    color: Colors.goldLight,
  },
  blockQuoteBy: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    letterSpacing: 1,
    color: "rgba(245,240,232,0.45)",
  },
  blockList: {
    gap: 12,
  },
  blockListRow: {
    flexDirection: "row",
    gap: 12,
  },
  blockListStar: {
    fontSize: 13,
    lineHeight: 24,
    color: "rgba(184,150,62,0.8)",
  },
  blockListText: {
    flex: 1,
    fontFamily: Fonts.sans,
    fontSize: 14.5,
    lineHeight: 24,
    color: "rgba(245,240,232,0.7)",
  },
  blockImageWrap: {
    gap: 8,
  },
  blockImage: {
    height: 220,
    borderRadius: 14,
  },
  blockCaption: {
    fontFamily: Fonts.serifItalic,
    fontSize: 13,
    color: "rgba(245,240,232,0.45)",
    textAlign: "center",
  },
  tags: {
    marginTop: 30,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  tag: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.14)",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 11.5,
    color: "rgba(245,240,232,0.55)",
  },
  relatedSection: {
    marginTop: 46,
    paddingHorizontal: 22,
    gap: 14,
  },
  relatedHeading: {
    fontFamily: Fonts.serif,
    fontSize: 25,
    color: Colors.cream,
    marginBottom: 4,
  },
  related: {
    flexDirection: "row",
    gap: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.08)",
    backgroundColor: "rgba(245,240,232,0.03)",
    overflow: "hidden",
  },
  relatedImage: {
    width: 96,
    height: 96,
  },
  relatedBody: {
    flex: 1,
    paddingVertical: 12,
    paddingRight: 12,
    gap: 4,
    justifyContent: "center",
  },
  relatedCategory: {
    fontFamily: Fonts.sansSemi,
    fontSize: 8.5,
    letterSpacing: 1.8,
    color: Colors.gold,
  },
  relatedTitle: {
    fontFamily: Fonts.serif,
    fontSize: 17,
    lineHeight: 21,
    color: Colors.cream,
  },
  relatedMeta: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: "rgba(245,240,232,0.45)",
  },
  footerLine: {
    marginTop: 48,
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

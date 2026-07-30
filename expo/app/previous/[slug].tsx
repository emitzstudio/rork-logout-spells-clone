import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { BadgeCheck, PenLine } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GoldProgress, Stars } from "@/components/AccountBits";
import { GoldButton, PressableScale } from "@/components/Buttons";
import StackHeader from "@/components/StackHeader";
import { Colors, Fonts } from "@/constants/theme";
import { previousSpellsService } from "@/data/previousSpells";
import {
  canReviewSpell,
  hasReviewed,
  ratingSummary,
  reviewService,
} from "@/data/reviews";
import type { SpellReview } from "@/data/reviews";
import { hapticSuccess } from "@/lib/haptics";
import { useAccount } from "@/providers/AccountProvider";

function ReviewCard({ review }: { review: SpellReview }) {
  return (
    <View style={styles.review} testID={`review-${review.id}`}>
      <View style={styles.reviewTop}>
        {review.avatar !== "" ? (
          <Image source={{ uri: review.avatar }} style={styles.reviewAvatar} contentFit="cover" />
        ) : (
          <View style={[styles.reviewAvatar, styles.reviewAvatarFallback]}>
            <Text style={styles.reviewInitial}>{review.author.charAt(0)}</Text>
          </View>
        )}
        <View style={styles.reviewMeta}>
          <Text style={styles.reviewAuthor}>{review.author}</Text>
          <Text style={styles.reviewWhen}>Travelled {review.travelledOn}</Text>
        </View>
        {review.verified ? (
          <View style={styles.verified}>
            <BadgeCheck size={11} color={Colors.goldLight} />
            <Text style={styles.verifiedText}>VERIFIED</Text>
          </View>
        ) : null}
      </View>
      <Stars rating={review.rating} />
      <Text style={styles.reviewTitle}>{review.title}</Text>
      <Text style={styles.reviewBody}>{review.body}</Text>
    </View>
  );
}

/** One completed journey — story, recap, gallery, community and reviews. */
export default function PreviousSpellScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, session, signedIn } = useAccount();

  const spell = slug ? previousSpellsService.bySlug(slug) : undefined;

  const [reviews, setReviews] = useState<SpellReview[]>([]);
  const [loadingReviews, setLoadingReviews] = useState<boolean>(true);
  const [rating, setRating] = useState<number>(5);
  const [reviewTitle, setReviewTitle] = useState<string>("");
  const [reviewBody, setReviewBody] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formOpen, setFormOpen] = useState<boolean>(false);

  const loadReviews = useCallback(async () => {
    if (!spell) return;
    setLoadingReviews(true);
    try {
      const list = await reviewService.list(spell.id);
      setReviews(list);
    } finally {
      setLoadingReviews(false);
    }
  }, [spell]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  const summary = useMemo(() => ratingSummary(reviews), [reviews]);
  const eligible = spell ? canReviewSpell(data, spell) : false;
  const alreadyReviewed = hasReviewed(reviews, session?.userId ?? null);

  const submitReview = async (): Promise<void> => {
    if (!spell || !session || !data) return;
    if (reviewTitle.trim().length < 3 || reviewBody.trim().length < 10) return;
    setSubmitting(true);
    try {
      await reviewService.add({
        spellId: spell.id,
        authorId: session.userId,
        author: `${data.profile.firstName} ${data.profile.lastName}`.trim(),
        avatar: session.avatar,
        rating,
        title: reviewTitle,
        body: reviewBody,
        travelledOn: spell.season,
      });
      hapticSuccess();
      setFormOpen(false);
      setReviewTitle("");
      setReviewBody("");
      await loadReviews();
    } finally {
      setSubmitting(false);
    }
  };

  if (!spell) {
    return (
      <View style={styles.flex}>
        <StackHeader title="Previous Spells" fallback="/previous" />
        <View style={styles.missing}>
          <Text style={styles.missingSymbol}>☾</Text>
          <Text style={styles.missingTitle}>This memory has faded.</Text>
          <GoldButton label="All Previous Spells" onPress={() => router.replace("/previous")} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <StackHeader title={spell.season} fallback="/previous" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + 60 }}
        >
          {/* Hero */}
          <View style={styles.hero}>
            <Image source={{ uri: spell.hero }} style={StyleSheet.absoluteFill} contentFit="cover" transition={400} />
            <LinearGradient
              colors={["rgba(10,8,6,0.15)", "rgba(10,8,6,0.5)", "rgba(28,28,26,1)"]}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.heroBody}>
              <Text style={styles.heroChip}>
                {spell.symbol} COMPLETED · {spell.season.toUpperCase()}
              </Text>
              <Text style={styles.heroTitle}>{spell.title}</Text>
              <Text style={styles.heroMeta}>
                {spell.location}, {spell.region} · {spell.durationDays} days · {spell.travellers}{" "}
                travellers · hosted by {spell.host.name}
              </Text>
              {summary.count > 0 ? (
                <View style={styles.heroRating}>
                  <Stars rating={summary.average} />
                  <Text style={styles.heroRatingText}>
                    {summary.average} · {summary.count} review{summary.count > 1 ? "s" : ""}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Story */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What happened</Text>
            <View style={styles.story}>
              {spell.story.map((para) => (
                <Text key={para.slice(0, 32)} style={styles.storyPara}>
                  {para}
                </Text>
              ))}
            </View>
          </View>

          {/* Highlights */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Kept from the week</Text>
            <View style={styles.highlights}>
              {spell.highlights.map((h) => (
                <View key={h} style={styles.highlightRow}>
                  <Text style={styles.highlightStar}>✦</Text>
                  <Text style={styles.highlightText}>{h}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Journey recap */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How the days went</Text>
            <View style={styles.chapters}>
              {spell.chapters.map((chapter, i) => (
                <View key={chapter.day} style={styles.chapterRow}>
                  <View style={styles.chapterRail}>
                    <View style={styles.chapterNode} />
                    {i < spell.chapters.length - 1 ? <View style={styles.chapterLine} /> : null}
                  </View>
                  <View style={styles.chapterText}>
                    <Text style={styles.chapterDay}>{chapter.day.toUpperCase()}</Text>
                    <Text style={styles.chapterTitle}>{chapter.title}</Text>
                    <Text style={styles.chapterLineText}>{chapter.line}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Gallery */}
          <View style={styles.sectionWide}>
            <Text style={[styles.sectionTitle, styles.sectionTitlePadded]}>The gallery</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.galleryRow}
            >
              {spell.gallery.map((shotItem) => (
                <View key={shotItem.id} style={styles.shotWrap}>
                  <Image
                    source={{ uri: shotItem.src }}
                    style={[styles.shot, shotItem.tall === true ? styles.shotTall : null]}
                    contentFit="cover"
                    transition={300}
                  />
                  <Text style={styles.shotCaption} numberOfLines={1}>
                    {shotItem.caption}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Memory notes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Small things we kept</Text>
            <View style={styles.memories}>
              {spell.memories.map((m) => (
                <View key={m.id} style={styles.memory}>
                  <Text style={styles.memorySymbol}>{m.symbol}</Text>
                  <Text style={styles.memoryTitle}>{m.title}</Text>
                  <Text style={styles.memoryLine}>{m.line}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Community voices */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Voices from the circle</Text>
            <View style={styles.community}>
              {spell.community.map((c) => (
                <View key={c.id} style={styles.voice}>
                  <Text style={styles.voiceQuote}>“{c.quote}”</Text>
                  <Text style={styles.voiceName}>
                    {c.name} · <Text style={styles.voiceDetail}>{c.detail}</Text>
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Reviews */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Traveller reviews</Text>

            {summary.count > 0 ? (
              <View style={styles.summaryCard}>
                <View style={styles.summaryLeft}>
                  <Text style={styles.summaryAverage}>{summary.average}</Text>
                  <Stars rating={summary.average} />
                  <Text style={styles.summaryCount}>
                    {summary.count} review{summary.count > 1 ? "s" : ""}
                  </Text>
                </View>
                <View style={styles.summaryBars}>
                  {[5, 4, 3, 2, 1].map((star) => (
                    <View key={star} style={styles.summaryBarRow}>
                      <Text style={styles.summaryBarLabel}>{star}★</Text>
                      <GoldProgress
                        progress={
                          summary.count === 0
                            ? 0
                            : summary.distribution[star - 1] / summary.count
                        }
                        height={5}
                        style={styles.summaryBar}
                      />
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Review gate */}
            {eligible && !alreadyReviewed ? (
              formOpen ? (
                <View style={styles.form}>
                  <Text style={styles.formTitle}>Your review</Text>
                  <View style={styles.starPicker}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <PressableScale
                        key={star}
                        onPress={() => setRating(star)}
                        scaleTo={0.8}
                        testID={`star-${star}`}
                      >
                        <Text
                          style={[
                            styles.starPick,
                            { color: star <= rating ? Colors.goldLight : "rgba(245,240,232,0.2)" },
                          ]}
                        >
                          ★
                        </Text>
                      </PressableScale>
                    ))}
                  </View>
                  <TextInput
                    value={reviewTitle}
                    onChangeText={setReviewTitle}
                    placeholder="A line that sums it up"
                    placeholderTextColor="rgba(245,240,232,0.25)"
                    style={styles.input}
                    testID="review-title"
                  />
                  <TextInput
                    value={reviewBody}
                    onChangeText={setReviewBody}
                    placeholder="What should the next traveller know?"
                    placeholderTextColor="rgba(245,240,232,0.25)"
                    multiline
                    style={[styles.input, styles.inputMultiline]}
                    testID="review-body"
                  />
                  <PressableScale
                    onPress={() => void submitReview()}
                    haptic="medium"
                    style={[
                      styles.submitBtn,
                      reviewTitle.trim().length < 3 || reviewBody.trim().length < 10
                        ? styles.submitDisabled
                        : null,
                    ]}
                    testID="review-submit"
                  >
                    {submitting ? (
                      <ActivityIndicator color={Colors.charcoalDeep} />
                    ) : (
                      <Text style={styles.submitText}>PUBLISH REVIEW</Text>
                    )}
                  </PressableScale>
                </View>
              ) : (
                <PressableScale
                  onPress={() => setFormOpen(true)}
                  scaleTo={0.98}
                  style={styles.writeCta}
                  testID="review-open"
                >
                  <PenLine size={16} color={Colors.goldLight} />
                  <View style={styles.writeText}>
                    <Text style={styles.writeTitle}>You were in this circle</Text>
                    <Text style={styles.writeSub}>Leave a verified review for the next traveller.</Text>
                  </View>
                </PressableScale>
              )
            ) : null}

            {alreadyReviewed ? (
              <Text style={styles.reviewedNote}>
                ✦ Your review is here — thank you for writing it down.
              </Text>
            ) : null}

            {!signedIn && spell.spellSlug !== null ? (
              <Text style={styles.gateNote}>
                Travelled this spell? Sign in — verified travellers can write reviews.
              </Text>
            ) : null}

            {loadingReviews ? (
              <ActivityIndicator color={Colors.goldLight} style={styles.reviewsLoading} />
            ) : (
              <View style={styles.reviews}>
                {reviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
                {reviews.length === 0 ? (
                  <Text style={styles.gateNote}>No reviews yet — the circle is still writing ✦</Text>
                ) : null}
              </View>
            )}
          </View>

          <Text style={styles.footerLine}>
            {spell.title} · {spell.season} · kept forever ✦
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
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
  hero: {
    minHeight: 330,
    justifyContent: "flex-end",
  },
  heroBody: {
    padding: 22,
    gap: 8,
  },
  heroChip: {
    fontFamily: Fonts.sansSemi,
    fontSize: 9.5,
    letterSpacing: 2,
    color: Colors.goldLight,
  },
  heroTitle: {
    fontFamily: Fonts.serif,
    fontSize: 40,
    lineHeight: 46,
    color: Colors.cream,
  },
  heroMeta: {
    fontFamily: Fonts.sans,
    fontSize: 12.5,
    lineHeight: 18,
    color: "rgba(245,240,232,0.65)",
  },
  heroRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: 2,
  },
  heroRatingText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 12.5,
    color: "rgba(245,240,232,0.7)",
  },
  section: {
    marginTop: 38,
    paddingHorizontal: 22,
  },
  sectionWide: {
    marginTop: 38,
  },
  sectionTitle: {
    fontFamily: Fonts.serif,
    fontSize: 27,
    color: Colors.cream,
    marginBottom: 16,
  },
  sectionTitlePadded: {
    paddingHorizontal: 22,
  },
  story: {
    gap: 14,
  },
  storyPara: {
    fontFamily: Fonts.sans,
    fontSize: 14.5,
    lineHeight: 24,
    color: "rgba(245,240,232,0.68)",
  },
  highlights: {
    gap: 11,
  },
  highlightRow: {
    flexDirection: "row",
    gap: 12,
  },
  highlightStar: {
    fontSize: 13,
    lineHeight: 22,
    color: "rgba(184,150,62,0.8)",
  },
  highlightText: {
    flex: 1,
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 22,
    color: "rgba(245,240,232,0.72)",
  },
  chapters: {},
  chapterRow: {
    flexDirection: "row",
    gap: 15,
  },
  chapterRail: {
    alignItems: "center",
    width: 12,
  },
  chapterNode: {
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.7)",
    backgroundColor: Colors.charcoal,
    marginTop: 4,
  },
  chapterLine: {
    width: 1,
    flex: 1,
    backgroundColor: "rgba(184,150,62,0.25)",
  },
  chapterText: {
    flex: 1,
    paddingBottom: 22,
  },
  chapterDay: {
    fontFamily: Fonts.sansSemi,
    fontSize: 9,
    letterSpacing: 1.8,
    color: Colors.gold,
  },
  chapterTitle: {
    marginTop: 3,
    fontFamily: Fonts.serifItalic,
    fontSize: 19,
    color: Colors.cream,
  },
  chapterLineText: {
    marginTop: 3,
    fontFamily: Fonts.sans,
    fontSize: 13,
    lineHeight: 19,
    color: "rgba(245,240,232,0.55)",
  },
  galleryRow: {
    paddingHorizontal: 22,
    gap: 13,
    alignItems: "flex-start",
  },
  shotWrap: {
    width: 210,
    gap: 8,
  },
  shot: {
    width: 210,
    height: 230,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.08)",
  },
  shotTall: {
    height: 280,
  },
  shotCaption: {
    fontFamily: Fonts.serifItalic,
    fontSize: 12.5,
    color: "rgba(245,240,232,0.5)",
  },
  memories: {
    gap: 12,
  },
  memory: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.08)",
    backgroundColor: "rgba(245,240,232,0.03)",
    padding: 16,
    gap: 5,
  },
  memorySymbol: {
    fontFamily: Fonts.serif,
    fontSize: 20,
    color: "rgba(184,150,62,0.75)",
  },
  memoryTitle: {
    fontFamily: Fonts.serif,
    fontSize: 18,
    color: Colors.cream,
  },
  memoryLine: {
    fontFamily: Fonts.sans,
    fontSize: 12.5,
    lineHeight: 18,
    color: "rgba(245,240,232,0.55)",
  },
  community: {
    gap: 14,
  },
  voice: {
    borderLeftWidth: 2,
    borderLeftColor: "rgba(184,150,62,0.5)",
    paddingLeft: 16,
    gap: 7,
  },
  voiceQuote: {
    fontFamily: Fonts.serifItalic,
    fontSize: 16.5,
    lineHeight: 24,
    color: "rgba(245,240,232,0.85)",
  },
  voiceName: {
    fontFamily: Fonts.sansMedium,
    fontSize: 12,
    color: Colors.goldLight,
  },
  voiceDetail: {
    fontFamily: Fonts.sans,
    color: "rgba(245,240,232,0.45)",
  },
  summaryCard: {
    flexDirection: "row",
    gap: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.3)",
    backgroundColor: "rgba(184,150,62,0.06)",
    padding: 18,
    marginBottom: 16,
  },
  summaryLeft: {
    alignItems: "center",
    gap: 5,
  },
  summaryAverage: {
    fontFamily: Fonts.serif,
    fontSize: 42,
    lineHeight: 46,
    color: Colors.goldHi,
  },
  summaryCount: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: "rgba(245,240,232,0.5)",
  },
  summaryBars: {
    flex: 1,
    justifyContent: "center",
    gap: 6,
  },
  summaryBarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  summaryBarLabel: {
    width: 24,
    fontFamily: Fonts.sansMedium,
    fontSize: 10.5,
    color: "rgba(245,240,232,0.5)",
  },
  summaryBar: {
    flex: 1,
  },
  writeCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.4)",
    backgroundColor: "rgba(184,150,62,0.08)",
    padding: 16,
    marginBottom: 16,
  },
  writeText: {
    flex: 1,
    gap: 2,
  },
  writeTitle: {
    fontFamily: Fonts.serif,
    fontSize: 18,
    color: Colors.cream,
  },
  writeSub: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: "rgba(245,240,232,0.55)",
  },
  form: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.35)",
    backgroundColor: "rgba(184,150,62,0.05)",
    padding: 18,
    gap: 13,
    marginBottom: 16,
  },
  formTitle: {
    fontFamily: Fonts.serif,
    fontSize: 21,
    color: Colors.cream,
  },
  starPicker: {
    flexDirection: "row",
    gap: 10,
  },
  starPick: {
    fontSize: 30,
    lineHeight: 34,
  },
  input: {
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.12)",
    backgroundColor: "rgba(10,8,6,0.4)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Colors.cream,
  },
  inputMultiline: {
    minHeight: 96,
    textAlignVertical: "top",
  },
  submitBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitDisabled: {
    opacity: 0.5,
  },
  submitText: {
    fontFamily: Fonts.sansSemi,
    fontSize: 12,
    letterSpacing: 1.8,
    color: Colors.charcoalDeep,
  },
  reviewedNote: {
    fontFamily: Fonts.serifItalic,
    fontSize: 14,
    color: Colors.goldLight,
    marginBottom: 14,
  },
  gateNote: {
    fontFamily: Fonts.serifItalic,
    fontSize: 13.5,
    color: "rgba(245,240,232,0.45)",
    marginBottom: 14,
  },
  reviewsLoading: {
    paddingVertical: 20,
  },
  reviews: {
    gap: 14,
  },
  review: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.08)",
    backgroundColor: "rgba(245,240,232,0.025)",
    padding: 16,
    gap: 8,
  },
  reviewTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.35)",
  },
  reviewAvatarFallback: {
    backgroundColor: "#221b0e",
    alignItems: "center",
    justifyContent: "center",
  },
  reviewInitial: {
    fontFamily: Fonts.serif,
    fontSize: 16,
    color: Colors.goldLight,
  },
  reviewMeta: {
    flex: 1,
    gap: 1,
  },
  reviewAuthor: {
    fontFamily: Fonts.sansMedium,
    fontSize: 13.5,
    color: Colors.cream,
  },
  reviewWhen: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: "rgba(245,240,232,0.45)",
  },
  verified: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.35)",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  verifiedText: {
    fontFamily: Fonts.sansSemi,
    fontSize: 7.5,
    letterSpacing: 1.2,
    color: Colors.goldLight,
  },
  reviewTitle: {
    fontFamily: Fonts.serif,
    fontSize: 18,
    color: Colors.cream,
  },
  reviewBody: {
    fontFamily: Fonts.sans,
    fontSize: 13.5,
    lineHeight: 20,
    color: "rgba(245,240,232,0.65)",
  },
  footerLine: {
    marginTop: 48,
    textAlign: "center",
    fontFamily: Fonts.serifItalic,
    fontSize: 14,
    color: "rgba(245,240,232,0.3)",
  },
});

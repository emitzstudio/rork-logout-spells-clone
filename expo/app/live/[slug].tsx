import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BookingFlow from "@/components/BookingFlow";
import { GhostButton, GoldButton, PressableScale } from "@/components/Buttons";
import FloatingSymbol from "@/components/FloatingSymbol";
import GradientText from "@/components/GradientText";
import SpellPageBody from "@/components/SpellPageBody";
import Wordmark from "@/components/Wordmark";
import { Colors, Fonts } from "@/constants/theme";
import { draftFromSpell } from "@/data/builder";
import type { SpellDraft } from "@/data/builder";
import { isPublic, useSpellStore } from "@/data/spellStore";
import { useAccount } from "@/providers/AccountProvider";

/**
 * The generated public Spell page — rendered dynamically from the shared
 * spell collection with the same section renderer the website uses.
 */
export default function SpellPageScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { getBySlug } = useSpellStore();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { recordSpellView } = useAccount();
  const [bookingOpen, setBookingOpen] = useState<boolean>(false);

  const spell = slug ? getBySlug(slug) : undefined;
  const visible = spell !== undefined && isPublic(spell);

  /* Signed-in travellers see this spell surface in "recently viewed". */
  useEffect(() => {
    if (spell && visible) recordSpellView(spell.slug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spell?.slug, visible]);

  const draft = useMemo<SpellDraft | null>(() => {
    if (!spell || !visible) return null;
    return draftFromSpell(spell);
  }, [spell, visible]);

  const goBack = (): void => {
    if (router.canGoBack()) router.back();
    else router.replace("/live");
  };

  if (!spell || !visible || !draft) {
    return (
      <View style={[styles.flex, { paddingTop: insets.top + 8 }]}>
        <View style={styles.topBar}>
          <PressableScale onPress={goBack} scaleTo={0.9} style={styles.backButton} testID="spell-back">
            <ArrowLeft size={18} color="rgba(245,240,232,0.6)" />
          </PressableScale>
          <Wordmark size={0.8} />
          <View style={styles.topBarSpacer} />
        </View>
        <View style={styles.notFound}>
          <FloatingSymbol symbol="☾" size={56} color={Colors.gold} opacity={0.6} />
          <View style={styles.notFoundTitleRow}>
            <Text style={styles.notFoundTitle}>This spell has </Text>
            <GradientText style={styles.notFoundTitleItalic}>faded.</GradientText>
          </View>
          <Text style={styles.notFoundSub}>
            It may be resting as a draft — or it was never cast at all.
          </Text>
          <View style={styles.notFoundButtons}>
            <GoldButton
              label="Discover Live Spells →"
              onPress={() => router.replace("/discover")}
            />
            <GhostButton label="Return Somewhere Real" onPress={() => router.replace("/")} />
          </View>
        </View>
      </View>
    );
  }

  const cardWidth = width - 32;

  return (
    <View style={[styles.flex, { paddingTop: insets.top + 8 }]}>
      <View style={styles.topBar}>
        <PressableScale onPress={goBack} scaleTo={0.9} style={styles.backButton} testID="spell-back">
          <ArrowLeft size={18} color="rgba(245,240,232,0.6)" />
        </PressableScale>
        <Wordmark size={0.8} />
        <View style={styles.topBarSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 48 }]}
      >
        <View style={styles.pageCard}>
          <SpellPageBody draft={draft} width={cardWidth} onBook={() => setBookingOpen(true)} />
        </View>
        <Text style={styles.caption}>
          Logout Spells · Disappear for a while <Text style={styles.captionStar}>✦</Text>
        </Text>
      </ScrollView>

      <BookingFlow open={bookingOpen} spell={spell} onClose={() => setBookingOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  topBarSpacer: {
    width: 44,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  pageCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.09)",
    backgroundColor: Colors.charcoal,
    overflow: "hidden",
  },
  caption: {
    marginTop: 30,
    textAlign: "center",
    fontFamily: Fonts.serifItalic,
    fontSize: 15,
    color: "rgba(245,240,232,0.3)",
  },
  captionStar: {
    color: "rgba(184,150,62,0.5)",
  },
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingBottom: 80,
  },
  notFoundTitleRow: {
    marginTop: 24,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  notFoundTitle: {
    textAlign: "center",
    fontFamily: Fonts.serif,
    fontSize: 36,
    lineHeight: 42,
    color: Colors.cream,
  },
  notFoundTitleItalic: {
    fontFamily: Fonts.serifItalic,
    fontSize: 36,
    lineHeight: 42,
  },
  notFoundSub: {
    marginTop: 18,
    textAlign: "center",
    fontFamily: Fonts.serifItalic,
    fontSize: 20,
    lineHeight: 27,
    color: "rgba(245,240,232,0.6)",
  },
  notFoundButtons: {
    marginTop: 38,
    alignSelf: "stretch",
    gap: 12,
  },
});

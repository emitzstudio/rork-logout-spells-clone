import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { ArrowLeft } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
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
import { SITE_URL } from "@/data/site";
import { isPublic, useSpellStore } from "@/data/spellStore";
import { isUuid, supabase } from "@/src/integrations/supabase/client";
import { useAccount } from "@/providers/AccountProvider";

/**
 * The generated public Spell page — rendered dynamically from the shared
 * spell collection with the same section renderer the website uses.
 */
export default function SpellPageScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { getBySlug, ready } = useSpellStore();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { recordSpellView } = useAccount();
  const [bookingOpen, setBookingOpen] = useState<boolean>(false);

  const spell = slug ? getBySlug(slug) : undefined;
  const visible = spell !== undefined && isPublic(spell);

  /**
   * Decision X — a spell with an attached PUBLISHED form routes its Inquire
   * door to that form on the website (in the in-app browser); responses land
   * in the founder's inbox exactly like on the web.
   */
  const formQuery = useQuery({
    queryKey: ["spell-form", spell?.formId ?? "none"],
    queryFn: async () => {
      const formId = spell?.formId ?? "";
      if (formId === "" || !isUuid(formId)) return null;
      const { data, error } = await supabase
        .from("forms")
        .select("id, slug, status")
        .eq("id", formId)
        .eq("status", "published")
        .maybeSingle();
      if (error || !data) return null;
      return data;
    },
    enabled: visible && typeof spell?.formId === "string" && spell.formId !== "",
    staleTime: 60_000,
  });
  const attachedForm = formQuery.data ?? null;

  /* Signed-in travellers see this spell surface in "recently viewed". */
  useEffect(() => {
    if (spell && visible) recordSpellView(spell.slug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spell?.slug, visible]);

  /* The full published page when the builder wrote one; card-derived otherwise. */
  const draft = useMemo<SpellDraft | null>(() => {
    if (!spell || !visible) return null;
    return spell.draft ?? draftFromSpell(spell);
  }, [spell, visible]);

  const goBack = (): void => {
    if (router.canGoBack()) router.back();
    else router.replace("/live");
  };

  /* The collection is still opening — hold the page rather than call it faded. */
  if (!ready && !spell) {
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
          <ActivityIndicator color={Colors.goldLight} />
        </View>
      </View>
    );
  }

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

      <BookingFlow
        open={bookingOpen}
        spell={spell}
        onClose={() => setBookingOpen(false)}
        onInquireViaForm={
          attachedForm
            ? () => {
                setBookingOpen(false);
                void WebBrowser.openBrowserAsync(`${SITE_URL}/forms/${attachedForm.slug}`);
              }
            : null
        }
      />
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

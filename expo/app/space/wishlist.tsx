import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Heart, MapPin } from "lucide-react-native";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { GoldButton, PressableScale } from "@/components/Buttons";
import SpaceShell from "@/components/SpaceShell";
import { Colors, Fonts } from "@/constants/theme";
import { formatINR, gradientColors } from "@/data/spells";
import type { ManagedSpell } from "@/data/spells";
import { useSpellStore } from "@/data/spellStore";
import { useAccount } from "@/providers/AccountProvider";

function WishCard({ spell, onRemove }: { spell: ManagedSpell; onRemove: () => void }) {
  const router = useRouter();
  const colors = gradientColors(spell.gradient);
  const seatsLeft = Math.max(0, spell.seatsTotal - spell.seatsBooked);

  return (
    <PressableScale
      onPress={() => router.push(`/live/${spell.slug}`)}
      scaleTo={0.98}
      style={styles.card}
      testID={`wish-${spell.slug}`}
    >
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
            colors={["rgba(10,8,6,0.15)", "rgba(10,8,6,0.6)", "rgba(10,8,6,0.95)"]}
            style={StyleSheet.absoluteFill}
          />
        </>
      ) : null}
      <PressableScale onPress={onRemove} scaleTo={0.85} style={styles.heart} testID={`wish-remove-${spell.slug}`}>
        <Heart size={16} color={Colors.goldLight} fill={Colors.goldLight} />
      </PressableScale>
      <View style={styles.cardBody}>
        <Text style={styles.cardName}>{spell.name}</Text>
        <View style={styles.cardMetaRow}>
          <MapPin size={12} color="rgba(184,150,62,0.75)" />
          <Text style={styles.cardMeta}>
            {spell.location} · {spell.dates}
          </Text>
        </View>
        <Text style={styles.cardPrice}>
          {spell.price > 0 ? formatINR(spell.price) : "Prices TBA"} {spell.price > 0 && <Text style={styles.cardSeat}>/ seat</Text>}
          {seatsLeft > 0 && seatsLeft <= 3 ? (
            <Text style={styles.cardUrgent}>  · only {seatsLeft} left</Text>
          ) : null}
        </Text>
      </View>
    </PressableScale>
  );
}

/** Wishlist — the spells saved for a braver month. */
export default function WishlistScreen() {
  const router = useRouter();
  const { data, toggleWishlist } = useAccount();
  const { spells } = useSpellStore();

  const saved = useMemo(() => {
    if (!data) return [];
    const out: ManagedSpell[] = [];
    for (const id of data.wishlist) {
      const spell = spells.find((s) => s.id === id);
      if (spell) out.push(spell);
    }
    return out;
  }, [data, spells]);

  return (
    <SpaceShell title="Wishlist">
      <View style={styles.header}>
        <Text style={styles.title}>Saved for a braver month</Text>
        <Text style={styles.sub}>
          {saved.length === 0
            ? "Nothing here yet — hearts you leave on spells gather in this room."
            : `${saved.length} spell${saved.length === 1 ? "" : "s"} waiting for a yes.`}
        </Text>
      </View>

      <View style={styles.cards}>
        {saved.map((spell) => (
          <WishCard
            key={spell.id}
            spell={spell}
            onRemove={() => void toggleWishlist(spell.id)}
          />
        ))}
      </View>

      {saved.length === 0 ? (
        <GoldButton
          label="Browse Live Spells →"
          onPress={() => router.push("/live")}
          style={styles.browse}
          testID="wishlist-browse"
        />
      ) : null}
    </SpaceShell>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  title: {
    fontFamily: Fonts.serif,
    fontSize: 26,
    color: Colors.cream,
  },
  sub: {
    marginTop: 5,
    fontFamily: Fonts.serifItalic,
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(245,240,232,0.5)",
  },
  cards: {
    marginTop: 20,
    paddingHorizontal: 20,
    gap: 14,
  },
  card: {
    height: 200,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.08)",
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  heart: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.45)",
    backgroundColor: "rgba(10,8,6,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    padding: 16,
    gap: 5,
  },
  cardName: {
    fontFamily: Fonts.serif,
    fontSize: 24,
    color: Colors.cream,
  },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardMeta: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: "rgba(245,240,232,0.6)",
  },
  cardPrice: {
    fontFamily: Fonts.sansSemi,
    fontSize: 14,
    color: Colors.goldLight,
  },
  cardSeat: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: "rgba(245,240,232,0.45)",
  },
  cardUrgent: {
    fontFamily: Fonts.sansMedium,
    fontSize: 11.5,
    color: "#FCD34D",
  },
  browse: {
    marginTop: 24,
    marginHorizontal: 20,
  },
});

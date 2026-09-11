import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { MapPin } from "lucide-react-native";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { PressableScale } from "@/components/Buttons";
import { Colors, Fonts } from "@/constants/theme";
import { formatINR, gradientColors } from "@/data/spells";
import type { ManagedSpell } from "@/data/spells";

export interface RailItem {
  spell: ManagedSpell;
  /** Optional personalised line above the name ("Because you lean toward…"). */
  reason?: string;
}

interface SpellRailProps {
  items: RailItem[];
  testID?: string;
}

/**
 * Horizontal carousel of live spell cards — the shared rail used by the
 * homepage (recommendations + live spells) and the category pages.
 */
export default function SpellRail({ items, testID }: SpellRailProps) {
  const router = useRouter();

  if (items.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      testID={testID}
    >
      {items.map(({ spell, reason }) => {
        const colors = gradientColors(spell.gradient);
        const seatsLeft = Math.max(0, spell.seatsTotal - spell.seatsBooked);
        const soldOut = spell.status === "soldout" || (spell.seatsTotal > 0 && seatsLeft === 0);
        return (
          <PressableScale
            key={spell.id}
            onPress={() => router.push(`/live/${spell.slug}`)}
            scaleTo={0.97}
            style={styles.card}
            testID={`rail-${spell.slug}`}
          >
            <LinearGradient
              colors={colors as [string, string, ...string[]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {spell.image !== "" ? (
              <>
                <Image
                  source={{ uri: spell.image }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  transition={300}
                />
                <LinearGradient
                  colors={["rgba(10,8,6,0.05)", "rgba(10,8,6,0.55)", "rgba(10,8,6,0.96)"]}
                  style={StyleSheet.absoluteFill}
                />
              </>
            ) : null}

            {soldOut ? (
              <View style={styles.soldChip}>
                <Text style={styles.soldChipText}>SOLD OUT</Text>
              </View>
            ) : null}

            <View style={styles.body}>
              {reason ? (
                <Text style={styles.reason} numberOfLines={1}>
                  {reason}
                </Text>
              ) : (
                <Text style={styles.type} numberOfLines={1}>
                  {spell.type.toUpperCase()}
                </Text>
              )}
              <Text style={styles.name} numberOfLines={1}>
                {spell.name}
              </Text>
              <View style={styles.metaRow}>
                <MapPin size={12} color="rgba(184,150,62,0.75)" />
                <Text style={styles.meta} numberOfLines={1}>
                  {spell.location} · {spell.dates}
                </Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.price}>{spell.price > 0 ? formatINR(spell.price) : "Prices TBA"}</Text>
                {spell.price > 0 && <Text style={styles.perSeat}> / seat</Text>}
              </View>
            </View>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 20,
    gap: 14,
  },
  card: {
    width: 252,
    height: 320,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.08)",
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  soldChip: {
    position: "absolute",
    top: 14,
    right: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.2)",
    backgroundColor: "rgba(10,8,6,0.7)",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  soldChipText: {
    fontFamily: Fonts.sansSemi,
    fontSize: 9,
    letterSpacing: 1.6,
    color: "rgba(245,240,232,0.7)",
  },
  body: {
    padding: 18,
    gap: 6,
  },
  reason: {
    fontFamily: Fonts.serifItalic,
    fontSize: 13,
    color: Colors.goldLight,
  },
  type: {
    fontFamily: Fonts.sansSemi,
    fontSize: 9,
    letterSpacing: 2,
    color: Colors.gold,
  },
  name: {
    fontFamily: Fonts.serif,
    fontSize: 24,
    lineHeight: 28,
    color: Colors.cream,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  meta: {
    flex: 1,
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: "rgba(245,240,232,0.6)",
  },
  priceRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "baseline",
  },
  price: {
    fontFamily: Fonts.sansSemi,
    fontSize: 15,
    color: Colors.goldLight,
  },
  perSeat: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: "rgba(245,240,232,0.45)",
  },
});

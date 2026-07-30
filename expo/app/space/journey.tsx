import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { GoldProgress } from "@/components/AccountBits";
import SpaceShell from "@/components/SpaceShell";
import { Colors, Fonts } from "@/constants/theme";
import {
  LEVELS,
  XP_RULES,
  deriveBadges,
  deriveJourney,
  fmtDay,
} from "@/data/account/derive";
import type { XpEvent } from "@/data/account/models";
import { useAccount } from "@/providers/AccountProvider";

const KIND_SYMBOL: Record<XpEvent["kind"], string> = {
  booking: "✦",
  trip: "☾",
  memory: "◐",
  referral: "✧",
  profile: "✳",
  wishlist: "❋",
  joined: "✦",
};

/** Journey — XP path, levels, badges and the activity that earned them. */
export default function JourneyScreen() {
  const { data } = useAccount();

  const journey = useMemo(() => (data ? deriveJourney(data) : null), [data]);
  const badges = useMemo(
    () => (data && journey ? deriveBadges(data, journey) : []),
    [data, journey],
  );
  const unlockedCount = badges.filter((b) => b.unlocked).length;

  return (
    <SpaceShell title="Journey">
      {journey ? (
        <>
          {/* Level card */}
          <View style={styles.levelCard}>
            <Text style={styles.levelEyebrow}>YOUR LOGOUT PATH</Text>
            <Text style={styles.levelTitle}>
              Level {journey.level} · {journey.levelTitle}
            </Text>
            <Text style={styles.levelXp}>
              {journey.xp.toLocaleString("en-IN")} XP
              {journey.nextAt !== null
                ? ` — ${(journey.nextAt - journey.xp).toLocaleString("en-IN")} to ${journey.nextTitle}`
                : " — the summit"}
            </Text>
            <GoldProgress progress={journey.progress} style={styles.levelBar} height={8} />
            <View style={styles.levelScale}>
              {LEVELS.map((level, i) => (
                <Text
                  key={level.title}
                  style={[
                    styles.levelTick,
                    i + 1 <= journey.level ? styles.levelTickDone : null,
                  ]}
                >
                  {level.title}
                </Text>
              ))}
            </View>
          </View>

          {/* Badges */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Badges</Text>
            <Text style={styles.sectionSub}>
              {unlockedCount} of {badges.length} earned — the rest are directions, not locks.
            </Text>
            <View style={styles.badgeGrid}>
              {badges.map((badge) => (
                <View
                  key={badge.id}
                  style={[styles.badge, !badge.unlocked ? styles.badgeLocked : null]}
                  testID={`badge-${badge.id}`}
                >
                  <Text style={[styles.badgeSymbol, !badge.unlocked ? styles.badgeSymbolLocked : null]}>
                    {badge.symbol}
                  </Text>
                  <Text style={[styles.badgeName, !badge.unlocked ? styles.badgeNameLocked : null]}>
                    {badge.name}
                  </Text>
                  <Text style={styles.badgeLine} numberOfLines={2}>
                    {badge.unlocked ? badge.line : badge.hint}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* How XP works */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How the path counts</Text>
            <View style={styles.rules}>
              {XP_RULES.map((rule) => (
                <View key={rule.label} style={styles.ruleRow}>
                  <Text style={styles.ruleLabel}>{rule.label}</Text>
                  <Text style={styles.ruleXp}>{rule.xp}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Activity */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Every step so far</Text>
            <View style={styles.events}>
              {journey.events.map((event) => (
                <View key={event.id} style={styles.eventRow}>
                  <Text style={styles.eventSymbol}>{KIND_SYMBOL[event.kind]}</Text>
                  <View style={styles.eventText}>
                    <Text style={styles.eventLabel}>{event.label}</Text>
                    <Text style={styles.eventDetail}>
                      {event.detail} · {fmtDay(event.date)}
                    </Text>
                  </View>
                  <Text style={styles.eventXp}>+{event.xp}</Text>
                </View>
              ))}
            </View>
          </View>
        </>
      ) : null}
    </SpaceShell>
  );
}

const styles = StyleSheet.create({
  levelCard: {
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.4)",
    backgroundColor: "rgba(184,150,62,0.07)",
    padding: 20,
  },
  levelEyebrow: {
    fontFamily: Fonts.sansSemi,
    fontSize: 9.5,
    letterSpacing: 2.4,
    color: Colors.gold,
  },
  levelTitle: {
    marginTop: 10,
    fontFamily: Fonts.serif,
    fontSize: 30,
    color: Colors.cream,
  },
  levelXp: {
    marginTop: 4,
    fontFamily: Fonts.sans,
    fontSize: 12.5,
    color: "rgba(245,240,232,0.6)",
  },
  levelBar: {
    marginTop: 16,
  },
  levelScale: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  levelTick: {
    fontFamily: Fonts.sansMedium,
    fontSize: 10,
    color: "rgba(245,240,232,0.3)",
  },
  levelTickDone: {
    color: Colors.goldLight,
  },
  section: {
    marginTop: 30,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontFamily: Fonts.serif,
    fontSize: 25,
    color: Colors.cream,
  },
  sectionSub: {
    marginTop: 3,
    fontFamily: Fonts.serifItalic,
    fontSize: 13.5,
    color: "rgba(245,240,232,0.5)",
  },
  badgeGrid: {
    marginTop: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  badge: {
    width: "48%",
    flexGrow: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.35)",
    backgroundColor: "rgba(184,150,62,0.06)",
    padding: 14,
    gap: 5,
  },
  badgeLocked: {
    borderColor: "rgba(245,240,232,0.08)",
    backgroundColor: "rgba(245,240,232,0.02)",
  },
  badgeSymbol: {
    fontFamily: Fonts.serif,
    fontSize: 22,
    color: Colors.goldLight,
  },
  badgeSymbolLocked: {
    color: "rgba(245,240,232,0.25)",
  },
  badgeName: {
    fontFamily: Fonts.sansSemi,
    fontSize: 13,
    color: Colors.cream,
  },
  badgeNameLocked: {
    color: "rgba(245,240,232,0.45)",
  },
  badgeLine: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    lineHeight: 15,
    color: "rgba(245,240,232,0.45)",
  },
  rules: {
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.08)",
    overflow: "hidden",
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(245,240,232,0.05)",
  },
  ruleLabel: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: "rgba(245,240,232,0.65)",
  },
  ruleXp: {
    fontFamily: Fonts.sansSemi,
    fontSize: 13,
    color: Colors.goldLight,
  },
  events: {
    marginTop: 14,
    gap: 10,
  },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.06)",
    backgroundColor: "rgba(245,240,232,0.02)",
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  eventSymbol: {
    fontFamily: Fonts.serif,
    fontSize: 17,
    color: "rgba(184,150,62,0.7)",
  },
  eventText: {
    flex: 1,
    gap: 1,
  },
  eventLabel: {
    fontFamily: Fonts.sansMedium,
    fontSize: 13,
    color: "rgba(245,240,232,0.85)",
  },
  eventDetail: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: "rgba(245,240,232,0.4)",
  },
  eventXp: {
    fontFamily: Fonts.sansSemi,
    fontSize: 13,
    color: Colors.goldLight,
  },
});

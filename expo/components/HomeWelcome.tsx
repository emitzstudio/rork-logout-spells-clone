import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowRight, Bell, CalendarDays, Heart, Wallet } from "lucide-react-native";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";

import { PressableScale } from "@/components/Buttons";
import GradientText from "@/components/GradientText";
import SpellRail from "@/components/SpellRail";
import { Colors, Fonts } from "@/constants/theme";
import { daysUntil, deriveRecommendations, fmtRange, nextTrip } from "@/data/account/derive";
import { useSpellStore } from "@/data/spellStore";
import { timeGreeting } from "@/lib/greeting";
import { useAccount } from "@/providers/AccountProvider";

/**
 * The signed-in welcome band on the homepage — time-of-day greeting, the
 * next journey with its countdown, quick doors into the traveller space and
 * a personalised recommendation rail. Mirrors the website's HomeWelcome.
 */
export default function HomeWelcome() {
  const router = useRouter();
  const { session, data, signedIn, unreadCount } = useAccount();
  const { publicSpells } = useSpellStore();

  const trip = useMemo(() => (data ? nextTrip(data.bookings) : null), [data]);
  const recommendations = useMemo(
    () => (data ? deriveRecommendations(data, publicSpells, 6) : []),
    [data, publicSpells],
  );

  if (!signedIn || !session || !data) return null;

  const greeting = timeGreeting();
  const days = trip ? daysUntil(trip.start) : null;

  const quickDoors: { icon: LucideIcon; label: string; to: string; badge?: number }[] = [
    { icon: CalendarDays, label: "My Trips", to: "/space/trips" },
    { icon: Heart, label: "Wishlist", to: "/space/wishlist", badge: data.wishlist.length },
    { icon: Wallet, label: "Wallet", to: "/space/wallet" },
    { icon: Bell, label: "Alerts", to: "/space/notifications", badge: unreadCount },
  ];

  return (
    <View style={styles.section}>
      <View style={styles.greetingRow}>
        <View style={styles.greetingText}>
          <Text style={styles.eyebrow}>✦ {greeting.toUpperCase()}</Text>
          <View style={styles.nameRow}>
            <GradientText style={styles.name}>{session.firstName}</GradientText>
            <Text style={styles.namePeriod}>.</Text>
          </View>
          <Text style={styles.sub}>
            {trip
              ? "Your next circle is drawing closer."
              : "The map is quiet — time to choose a new spell."}
          </Text>
        </View>
        <PressableScale
          onPress={() => router.push("/space")}
          scaleTo={0.94}
          style={styles.avatarWrap}
          testID="welcome-avatar"
        >
          {session.avatar !== "" ? (
            <Image source={{ uri: session.avatar }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitial}>{session.firstName.charAt(0)}</Text>
            </View>
          )}
          {unreadCount > 0 ? <View style={styles.avatarDot} /> : null}
        </PressableScale>
      </View>

      {trip ? (
        <PressableScale
          onPress={() => router.push(`/space/trip/${trip.id}`)}
          scaleTo={0.98}
          style={styles.tripCard}
          testID="welcome-next-trip"
        >
          <Image source={{ uri: trip.spell.image }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
          <LinearGradient
            colors={["rgba(10,8,6,0.3)", "rgba(10,8,6,0.72)", "rgba(10,8,6,0.96)"]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.tripTop}>
            <Text style={styles.tripLabel}>NEXT JOURNEY</Text>
            {days !== null ? (
              <View style={styles.countdownChip}>
                <Text style={styles.countdownNumber}>{Math.max(0, days)}</Text>
                <Text style={styles.countdownUnit}>{days === 1 ? "DAY" : "DAYS"}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.tripBody}>
            <Text style={styles.tripName}>{trip.spell.name}</Text>
            <Text style={styles.tripMeta}>
              {trip.spell.location} · {fmtRange(trip.start, trip.end)}
            </Text>
            <View style={styles.tripLink}>
              <Text style={styles.tripLinkText}>OPEN TRIP</Text>
              <ArrowRight size={13} color={Colors.gold} />
            </View>
          </View>
        </PressableScale>
      ) : null}

      <View style={styles.doors}>
        {quickDoors.map((door) => {
          const Icon = door.icon;
          return (
            <PressableScale
              key={door.label}
              onPress={() => router.push(door.to as never)}
              scaleTo={0.94}
              style={styles.door}
              testID={`welcome-door-${door.label}`}
            >
              <View>
                <Icon size={18} color={Colors.goldLight} />
                {door.badge !== undefined && door.badge > 0 ? (
                  <View style={styles.doorBadge}>
                    <Text style={styles.doorBadgeText}>{door.badge > 9 ? "9+" : door.badge}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.doorLabel}>{door.label}</Text>
            </PressableScale>
          );
        })}
      </View>

      {recommendations.length > 0 ? (
        <View style={styles.recs}>
          <View style={styles.recsHeader}>
            <Text style={styles.recsTitle}>Cast for you</Text>
            <Text style={styles.recsSub}>Spells chosen from the way you travel</Text>
          </View>
          <View style={styles.recsRail}>
            <SpellRail
              items={recommendations.map((r) => ({ spell: r.spell, reason: r.reason }))}
              testID="welcome-recommendations"
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingTop: 6,
    paddingBottom: 40,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(245,240,232,0.06)",
  },
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 20,
  },
  greetingText: {
    flex: 1,
  },
  eyebrow: {
    fontFamily: Fonts.sansSemi,
    fontSize: 10,
    letterSpacing: 2.8,
    color: Colors.gold,
  },
  nameRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "baseline",
  },
  name: {
    fontFamily: Fonts.serifItalic,
    fontSize: 40,
    lineHeight: 48,
  },
  namePeriod: {
    fontFamily: Fonts.serif,
    fontSize: 40,
    color: Colors.cream,
  },
  sub: {
    marginTop: 4,
    fontFamily: Fonts.sans,
    fontSize: 13.5,
    lineHeight: 20,
    color: "rgba(245,240,232,0.55)",
  },
  avatarWrap: {
    width: 56,
    height: 56,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: "rgba(184,150,62,0.5)",
  },
  avatarFallback: {
    backgroundColor: "#221b0e",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontFamily: Fonts.serif,
    fontSize: 24,
    color: Colors.goldLight,
  },
  avatarDot: {
    position: "absolute",
    top: 1,
    right: 1,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: Colors.goldLight,
    borderWidth: 2,
    borderColor: Colors.charcoal,
  },
  tripCard: {
    marginTop: 22,
    marginHorizontal: 20,
    height: 190,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.3)",
    overflow: "hidden",
    justifyContent: "space-between",
  },
  tripTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: 16,
  },
  tripLabel: {
    fontFamily: Fonts.sansSemi,
    fontSize: 9.5,
    letterSpacing: 2.4,
    color: Colors.goldLight,
  },
  countdownChip: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.45)",
    backgroundColor: "rgba(10,8,6,0.75)",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  countdownNumber: {
    fontFamily: Fonts.serif,
    fontSize: 24,
    lineHeight: 26,
    color: Colors.goldHi,
  },
  countdownUnit: {
    fontFamily: Fonts.sansSemi,
    fontSize: 8,
    letterSpacing: 1.8,
    color: "rgba(245,240,232,0.6)",
  },
  tripBody: {
    padding: 16,
    gap: 4,
  },
  tripName: {
    fontFamily: Fonts.serif,
    fontSize: 26,
    color: Colors.cream,
  },
  tripMeta: {
    fontFamily: Fonts.sans,
    fontSize: 12.5,
    color: "rgba(245,240,232,0.65)",
  },
  tripLink: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tripLinkText: {
    fontFamily: Fonts.sansSemi,
    fontSize: 10,
    letterSpacing: 2,
    color: Colors.gold,
  },
  doors: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    marginTop: 14,
  },
  door: {
    flex: 1,
    alignItems: "center",
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.08)",
    backgroundColor: "rgba(245,240,232,0.03)",
    paddingVertical: 14,
  },
  doorLabel: {
    fontFamily: Fonts.sansMedium,
    fontSize: 10.5,
    color: "rgba(245,240,232,0.65)",
  },
  doorBadge: {
    position: "absolute",
    top: -6,
    right: -10,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: Colors.gold,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  doorBadgeText: {
    fontFamily: Fonts.sansBold,
    fontSize: 8.5,
    color: Colors.charcoalDeep,
  },
  recs: {
    marginTop: 30,
  },
  recsHeader: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  recsTitle: {
    fontFamily: Fonts.serif,
    fontSize: 26,
    color: Colors.cream,
  },
  recsSub: {
    marginTop: 3,
    fontFamily: Fonts.serifItalic,
    fontSize: 13.5,
    color: "rgba(245,240,232,0.5)",
  },
  recsRail: {
    marginHorizontal: -0,
  },
});

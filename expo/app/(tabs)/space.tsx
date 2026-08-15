import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import {
  Bell,
  CalendarDays,
  ChevronRight,
  Heart,
  Images,
  LifeBuoy,
  LogOut,
  Settings,
  Sparkles,
  Wallet,
} from "lucide-react-native";
import React, { useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";

import { GoldButton, PressableScale } from "@/components/Buttons";
import { GoldProgress } from "@/components/AccountBits";
import Eyebrow from "@/components/Eyebrow";
import GradientText from "@/components/GradientText";
import { Reveal, RevealScrollView } from "@/components/RevealScroll";
import SiteHeader from "@/components/SiteHeader";
import { Colors, Fonts, TAB_BAR_SPACE } from "@/constants/theme";
import {
  daysUntil,
  deriveJourney,
  deriveStats,
  fmtRange,
  nextTrip,
} from "@/data/account/derive";
import { timeGreeting } from "@/lib/greeting";
import { composeEmail } from "@/lib/mail";
import { useAccount } from "@/providers/AccountProvider";

interface SpaceLink {
  icon: LucideIcon;
  label: string;
  sub: string;
  to?: string;
  badge?: number;
  onPress?: () => void;
}

function SignedOut() {
  const router = useRouter();
  return (
    <View style={styles.signedOut}>
      <Text style={styles.signedOutSymbol}>✦</Text>
      <View style={styles.signedOutTitleRow}>
        <Text style={styles.signedOutTitle}>Your Logout </Text>
        <GradientText style={styles.signedOutTitleItalic}>Space</GradientText>
      </View>
      <Text style={styles.signedOutSub}>
        Trips with countdowns, a wallet of journeys, badges, memories and a path that levels up as
        you log out. Sign in to open yours.
      </Text>
      <GoldButton
        label="Sign In / Join the Circle"
        onPress={() => router.push("/auth")}
        style={styles.signedOutBtn}
        testID="space-signin"
      />
      <Text style={styles.signedOutHint}>
        New here? The same door creates your account — it takes a minute.
      </Text>
    </View>
  );
}

/** My Logout Space — the traveller's home inside the app. */
export default function SpaceScreen() {
  const router = useRouter();
  const { session, data, booting, signedIn, unreadCount, signOut } = useAccount();

  const trip = useMemo(() => (data ? nextTrip(data.bookings) : null), [data]);
  const journey = useMemo(() => (data ? deriveJourney(data) : null), [data]);
  const stats = useMemo(() => (data ? deriveStats(data) : null), [data]);

  if (booting) {
    return (
      <View style={styles.flex}>
        <SiteHeader />
        <View style={styles.loading}>
          <ActivityIndicator color={Colors.goldLight} size="large" />
          <Text style={styles.loadingText}>Opening your space…</Text>
        </View>
      </View>
    );
  }

  if (!signedIn || !session || !data || !journey || !stats) {
    return (
      <View style={styles.flex}>
        <SiteHeader />
        <SignedOut />
      </View>
    );
  }

  const days = trip ? Math.max(0, daysUntil(trip.start)) : null;

  const links: SpaceLink[] = [
    {
      icon: CalendarDays,
      label: "My Trips & Calendar",
      sub: "Upcoming, past and cancelled journeys",
      to: "/space/trips",
    },
    { icon: Wallet, label: "Wallet", sub: "Payments, refunds and travel credit", to: "/space/wallet" },
    { icon: Heart, label: "Wishlist", sub: `${data.wishlist.length} spell${data.wishlist.length === 1 ? "" : "s"} saved for later`, to: "/space/wishlist" },
    { icon: Images, label: "Memories", sub: "Your kept photographs, trip by trip", to: "/space/memories" },
    { icon: Sparkles, label: "Journey & Badges", sub: `Level ${journey.level} · ${journey.levelTitle}`, to: "/space/journey" },
    { icon: Bell, label: "Notifications", sub: "Everything that moved recently", to: "/space/notifications", badge: unreadCount },
    { icon: Settings, label: "Settings & Profile", sub: "Who you are and how we reach you", to: "/space/settings" },
    {
      icon: LifeBuoy,
      label: "Support",
      sub: "A real person replies — usually same day",
      onPress: () => void composeEmail("Help with my Logout Space"),
    },
  ];

  return (
    <View style={styles.flex}>
      <SiteHeader />
      <RevealScrollView contentContainerStyle={{ paddingBottom: TAB_BAR_SPACE }}>
        {/* Profile header */}
        <Reveal>
          <View style={styles.profileCard}>
            <Image source={{ uri: data.profile.cover }} style={StyleSheet.absoluteFill} contentFit="cover" />
            <LinearGradient
              colors={["rgba(10,8,6,0.55)", "rgba(10,8,6,0.85)", "rgba(28,28,26,0.98)"]}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.profileInner}>
              <View style={styles.profileRow}>
                {session.avatar !== "" ? (
                  <Image source={{ uri: session.avatar }} style={styles.avatar} contentFit="cover" />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Text style={styles.avatarInitial}>{session.firstName.charAt(0)}</Text>
                  </View>
                )}
                <View style={styles.profileText}>
                  <Eyebrow size={9}>{`${timeGreeting()}`}</Eyebrow>
                  <Text style={styles.profileName}>
                    {data.profile.firstName} {data.profile.lastName}
                  </Text>
                  <Text style={styles.profileMeta}>
                    {data.profile.city} · joined {new Date(data.profile.joinedAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                  </Text>
                </View>
              </View>

              <View style={styles.levelRow}>
                <View style={styles.levelText}>
                  <Text style={styles.levelTitle}>
                    LEVEL {journey.level} · {journey.levelTitle.toUpperCase()}
                  </Text>
                  <Text style={styles.levelXp}>
                    {journey.xp.toLocaleString("en-IN")} XP
                    {journey.nextAt
                      ? ` · ${(journey.nextAt - journey.xp).toLocaleString("en-IN")} to ${journey.nextTitle}`
                      : " · the path knows your name"}
                  </Text>
                </View>
              </View>
              <GoldProgress progress={journey.progress} style={styles.levelBar} />
            </View>
          </View>
        </Reveal>

        {/* Next trip */}
        {trip ? (
          <Reveal delay={60}>
            <PressableScale
              onPress={() => router.push(`/space/trip/${trip.id}`)}
              scaleTo={0.98}
              style={styles.tripCard}
              testID="space-next-trip"
            >
              <Image source={{ uri: trip.spell.image }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
              <LinearGradient
                colors={["rgba(10,8,6,0.25)", "rgba(10,8,6,0.7)", "rgba(10,8,6,0.95)"]}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.tripTop}>
                <Text style={styles.tripLabel}>NEXT JOURNEY</Text>
                {days !== null ? (
                  <View style={styles.countChip}>
                    <Text style={styles.countNum}>{days}</Text>
                    <Text style={styles.countUnit}>{days === 1 ? "DAY" : "DAYS"}</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.tripBody}>
                <Text style={styles.tripName}>{trip.spell.name}</Text>
                <Text style={styles.tripMeta}>
                  {trip.spell.location} · {fmtRange(trip.start, trip.end)}
                </Text>
              </View>
            </PressableScale>
          </Reveal>
        ) : null}

        {/* Stats */}
        <Reveal delay={100}>
          <View style={styles.statsRow}>
            {[
              { num: stats.tripsCompleted, label: "TRIPS" },
              { num: stats.placesExplored, label: "PLACES" },
              { num: stats.daysLoggedOut, label: "DAYS OUT" },
              { num: stats.friendsMade, label: "FRIENDS" },
            ].map((s) => (
              <View key={s.label} style={styles.statCell}>
                <Text style={styles.statNum}>{s.num}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </Reveal>

        {/* Doors */}
        <View style={styles.links}>
          {links.map((link, i) => {
            const Icon = link.icon;
            return (
              <Reveal key={link.label} delay={Math.min(i * 40, 240)}>
                <PressableScale
                  onPress={() => {
                    if (link.onPress) link.onPress();
                    else if (link.to) router.push(link.to as never);
                  }}
                  scaleTo={0.98}
                  style={styles.link}
                  testID={`space-link-${link.label}`}
                >
                  <View style={styles.linkIcon}>
                    <Icon size={17} color={Colors.goldLight} />
                    {link.badge !== undefined && link.badge > 0 ? (
                      <View style={styles.linkBadge}>
                        <Text style={styles.linkBadgeText}>{link.badge > 9 ? "9+" : link.badge}</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.linkText}>
                    <Text style={styles.linkLabel}>{link.label}</Text>
                    <Text style={styles.linkSub}>{link.sub}</Text>
                  </View>
                  <ChevronRight size={16} color="rgba(245,240,232,0.3)" />
                </PressableScale>
              </Reveal>
            );
          })}
        </View>

        <PressableScale onPress={signOut} scaleTo={0.97} style={styles.signOut} testID="space-signout">
          <LogOut size={15} color="rgba(201,111,90,0.9)" />
          <Text style={styles.signOutText}>Sign out</Text>
        </PressableScale>

        <Text style={styles.footerLine}>Belonging &gt; Bookings ✦</Text>
      </RevealScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingBottom: 100,
  },
  loadingText: {
    fontFamily: Fonts.serifItalic,
    fontSize: 16,
    color: "rgba(245,240,232,0.5)",
  },
  signedOut: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    paddingBottom: 120,
  },
  signedOutSymbol: {
    fontFamily: Fonts.serif,
    fontSize: 44,
    color: "rgba(184,150,62,0.65)",
  },
  signedOutTitleRow: {
    marginTop: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  signedOutTitle: {
    fontFamily: Fonts.serif,
    fontSize: 36,
    lineHeight: 42,
    color: Colors.cream,
  },
  signedOutTitleItalic: {
    fontFamily: Fonts.serifItalic,
    fontSize: 36,
    lineHeight: 42,
  },
  signedOutSub: {
    marginTop: 16,
    maxWidth: 320,
    textAlign: "center",
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 22,
    color: "rgba(245,240,232,0.55)",
  },
  signedOutBtn: {
    marginTop: 32,
    alignSelf: "stretch",
  },
  signedOutHint: {
    marginTop: 16,
    fontFamily: Fonts.serifItalic,
    fontSize: 13,
    color: "rgba(245,240,232,0.4)",
    textAlign: "center",
  },
  profileCard: {
    marginHorizontal: 20,
    marginTop: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.3)",
    overflow: "hidden",
  },
  profileInner: {
    padding: 20,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: "rgba(184,150,62,0.55)",
  },
  avatarFallback: {
    backgroundColor: Colors.goldDeep,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontFamily: Fonts.serif,
    fontSize: 28,
    color: Colors.goldLight,
  },
  profileText: {
    flex: 1,
    gap: 3,
  },
  profileName: {
    fontFamily: Fonts.serif,
    fontSize: 26,
    color: Colors.cream,
  },
  profileMeta: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: "rgba(245,240,232,0.55)",
  },
  levelRow: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  levelText: {
    gap: 3,
  },
  levelTitle: {
    fontFamily: Fonts.sansSemi,
    fontSize: 10,
    letterSpacing: 2,
    color: Colors.goldLight,
  },
  levelXp: {
    fontFamily: Fonts.sans,
    fontSize: 11.5,
    color: "rgba(245,240,232,0.5)",
  },
  levelBar: {
    marginTop: 10,
  },
  tripCard: {
    marginHorizontal: 20,
    marginTop: 14,
    height: 170,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.1)",
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
  countChip: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.45)",
    backgroundColor: "rgba(10,8,6,0.75)",
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  countNum: {
    fontFamily: Fonts.serif,
    fontSize: 22,
    lineHeight: 24,
    color: Colors.goldHi,
  },
  countUnit: {
    fontFamily: Fonts.sansSemi,
    fontSize: 8,
    letterSpacing: 1.6,
    color: "rgba(245,240,232,0.6)",
  },
  tripBody: {
    padding: 16,
    gap: 3,
  },
  tripName: {
    fontFamily: Fonts.serif,
    fontSize: 24,
    color: Colors.cream,
  },
  tripMeta: {
    fontFamily: Fonts.sans,
    fontSize: 12.5,
    color: "rgba(245,240,232,0.65)",
  },
  statsRow: {
    marginHorizontal: 20,
    marginTop: 14,
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.08)",
    backgroundColor: "rgba(245,240,232,0.03)",
    paddingVertical: 16,
  },
  statCell: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  statNum: {
    fontFamily: Fonts.serif,
    fontSize: 24,
    color: Colors.goldLight,
  },
  statLabel: {
    fontFamily: Fonts.sansSemi,
    fontSize: 8.5,
    letterSpacing: 1.4,
    color: "rgba(245,240,232,0.45)",
  },
  links: {
    marginTop: 24,
    paddingHorizontal: 20,
    gap: 10,
  },
  link: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.07)",
    backgroundColor: "rgba(245,240,232,0.025)",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  linkIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  linkBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.gold,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  linkBadgeText: {
    fontFamily: Fonts.sansBold,
    fontSize: 9,
    color: Colors.charcoalDeep,
  },
  linkText: {
    flex: 1,
    gap: 2,
  },
  linkLabel: {
    fontFamily: Fonts.sansMedium,
    fontSize: 14.5,
    color: Colors.cream,
  },
  linkSub: {
    fontFamily: Fonts.sans,
    fontSize: 11.5,
    color: "rgba(245,240,232,0.45)",
  },
  signOut: {
    marginTop: 26,
    marginHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(201,111,90,0.3)",
    paddingVertical: 14,
  },
  signOutText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 13,
    color: "rgba(201,111,90,0.9)",
  },
  footerLine: {
    marginTop: 30,
    textAlign: "center",
    fontFamily: Fonts.serifItalic,
    fontSize: 14,
    color: "rgba(245,240,232,0.3)",
  },
});

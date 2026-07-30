import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { CalendarDays } from "lucide-react-native";
import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { StatusChip } from "@/components/AccountBits";
import { PressableScale } from "@/components/Buttons";
import SpaceShell from "@/components/SpaceShell";
import { Colors, Fonts } from "@/constants/theme";
import { buildCalendarEvents, fmtRange, tripsByStatus } from "@/data/account/derive";
import type { TripBooking, TripStatus } from "@/data/account/models";
import { formatINR } from "@/data/spells";
import { useSpellStore } from "@/data/spellStore";
import { useAccount } from "@/providers/AccountProvider";

const SECTION_ORDER: { status: TripStatus; title: string; line: string }[] = [
  { status: "ongoing", title: "Happening now", line: "You're inside the spell — put this down." },
  { status: "upcoming", title: "Upcoming", line: "Circles with your name on a seat." },
  { status: "draft", title: "Unfinished applications", line: "Saved mid-thought — pick them back up." },
  { status: "completed", title: "Completed", line: "The journeys that already changed you." },
  { status: "cancelled", title: "Cancelled", line: "Plans that moved — refunds handled." },
];

function TripCard({ booking }: { booking: TripBooking }) {
  const router = useRouter();
  return (
    <PressableScale
      onPress={() => router.push(`/space/trip/${booking.id}`)}
      scaleTo={0.98}
      style={styles.card}
      testID={`trip-${booking.id}`}
    >
      <Image source={{ uri: booking.spell.image }} style={styles.cardImage} contentFit="cover" transition={300} />
      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <Text style={styles.cardName} numberOfLines={1}>
            {booking.spell.name}
          </Text>
          <StatusChip status={booking.status === "upcoming" ? "upcoming" : booking.status} />
        </View>
        <Text style={styles.cardMeta}>
          {booking.spell.location} · {fmtRange(booking.start, booking.end)}
        </Text>
        <Text style={styles.cardSub}>
          {booking.seats} seat{booking.seats > 1 ? "s" : ""} · {booking.ref} ·{" "}
          {booking.payment === "deposit"
            ? `${formatINR(booking.amountTotal - booking.amountPaid)} due before departure`
            : booking.payment === "refunded"
              ? "Refunded"
              : "Paid in full"}
        </Text>
      </View>
    </PressableScale>
  );
}

/** My Trips — every booking, plus the season calendar of circles. */
export default function TripsScreen() {
  const { data } = useAccount();
  const { publicSpells } = useSpellStore();
  const router = useRouter();

  const buckets = useMemo(() => (data ? tripsByStatus(data.bookings) : null), [data]);
  const calendar = useMemo(
    () => (data ? buildCalendarEvents(data, publicSpells).filter((e) => Date.parse(e.end) >= Date.now()).slice(0, 8) : []),
    [data, publicSpells],
  );

  return (
    <SpaceShell title="My Trips">
      {/* Season calendar strip */}
      {calendar.length > 0 ? (
        <View style={styles.calendarSection}>
          <View style={styles.calendarHeader}>
            <CalendarDays size={15} color={Colors.goldLight} />
            <Text style={styles.calendarTitle}>The season ahead</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.calendarRow}
          >
            {calendar.map((event) => {
              const start = new Date(event.start);
              const booked = event.kind === "booked" || event.kind === "ongoing";
              return (
                <PressableScale
                  key={event.id}
                  onPress={() =>
                    booked && event.bookingId
                      ? router.push(`/space/trip/${event.bookingId}`)
                      : router.push(`/live/${event.slug}`)
                  }
                  scaleTo={0.96}
                  style={[styles.calCard, booked ? styles.calCardBooked : null]}
                  testID={`cal-${event.id}`}
                >
                  <Text style={[styles.calMonth, booked ? styles.calMonthBooked : null]}>
                    {start.toLocaleDateString("en-IN", { month: "short" }).toUpperCase()}
                  </Text>
                  <Text style={styles.calDay}>{start.getDate()}</Text>
                  <Text style={styles.calName} numberOfLines={1}>
                    {event.name}
                  </Text>
                  <Text style={styles.calKind}>
                    {booked
                      ? event.kind === "ongoing"
                        ? "HAPPENING NOW"
                        : "YOUR SEAT"
                      : event.seatsLeft !== undefined && event.seatsLeft > 0
                        ? `${event.seatsLeft} SEATS OPEN`
                        : "OPEN"}
                  </Text>
                </PressableScale>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {buckets
        ? SECTION_ORDER.map(({ status, title, line }) => {
            const list = buckets[status];
            if (list.length === 0) return null;
            return (
              <View key={status} style={styles.section}>
                <Text style={styles.sectionTitle}>{title}</Text>
                <Text style={styles.sectionLine}>{line}</Text>
                <View style={styles.cards}>
                  {list.map((b) => (
                    <TripCard key={b.id} booking={b} />
                  ))}
                </View>
              </View>
            );
          })
        : null}
    </SpaceShell>
  );
}

const styles = StyleSheet.create({
  calendarSection: {
    paddingTop: 8,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 20,
  },
  calendarTitle: {
    fontFamily: Fonts.serif,
    fontSize: 21,
    color: Colors.cream,
  },
  calendarRow: {
    paddingHorizontal: 20,
    gap: 10,
    paddingTop: 14,
  },
  calCard: {
    width: 128,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.09)",
    backgroundColor: "rgba(245,240,232,0.03)",
    padding: 13,
    gap: 2,
  },
  calCardBooked: {
    borderColor: "rgba(184,150,62,0.45)",
    backgroundColor: "rgba(184,150,62,0.08)",
  },
  calMonth: {
    fontFamily: Fonts.sansSemi,
    fontSize: 9,
    letterSpacing: 1.8,
    color: "rgba(245,240,232,0.45)",
  },
  calMonthBooked: {
    color: Colors.goldLight,
  },
  calDay: {
    fontFamily: Fonts.serif,
    fontSize: 27,
    color: Colors.cream,
  },
  calName: {
    marginTop: 2,
    fontFamily: Fonts.sansMedium,
    fontSize: 11.5,
    color: "rgba(245,240,232,0.75)",
  },
  calKind: {
    marginTop: 2,
    fontFamily: Fonts.sansSemi,
    fontSize: 7.5,
    letterSpacing: 1.2,
    color: "rgba(184,150,62,0.85)",
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
  sectionLine: {
    marginTop: 3,
    fontFamily: Fonts.serifItalic,
    fontSize: 13.5,
    color: "rgba(245,240,232,0.5)",
  },
  cards: {
    marginTop: 14,
    gap: 12,
  },
  card: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.08)",
    backgroundColor: "rgba(245,240,232,0.03)",
    overflow: "hidden",
  },
  cardImage: {
    width: 92,
  },
  cardBody: {
    flex: 1,
    padding: 14,
    gap: 5,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  cardName: {
    flex: 1,
    fontFamily: Fonts.serif,
    fontSize: 19,
    color: Colors.cream,
  },
  cardMeta: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: "rgba(245,240,232,0.65)",
  },
  cardSub: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: "rgba(245,240,232,0.45)",
  },
});

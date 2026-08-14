import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Check, MapPin, PenLine } from "lucide-react-native";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { GoldProgress, StatusChip } from "@/components/AccountBits";
import { PressableScale } from "@/components/Buttons";
import SpaceShell from "@/components/SpaceShell";
import { Colors, Fonts } from "@/constants/theme";
import {
  daysUntil,
  effectiveStatus,
  fmtDayYear,
  fmtRange,
} from "@/data/account/derive";
import { TIMELINE_ORDER } from "@/data/account/models";
import type { TimelineStepId } from "@/data/account/models";
import { usePreviousSpells } from "@/data/previousSpells";
import { formatINR } from "@/data/spells";
import { useAccount } from "@/providers/AccountProvider";

const STEP_LABELS: Record<TimelineStepId, string> = {
  booked: "Seat booked",
  payment: "Payment received",
  host: "Host confirmed",
  documents: "Travel documents",
  begins: "The spell begins",
  completed: "Circle completed",
};

/** One trip, in full — countdown, timeline, packing list, payments, host note. */
export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, toggleChecklistItem } = useAccount();
  const archive = usePreviousSpells();

  const booking = useMemo(
    () => data?.bookings.find((b) => b.id === id) ?? null,
    [data, id],
  );

  const status = booking ? effectiveStatus(booking) : null;
  const days = booking && status === "upcoming" ? Math.max(0, daysUntil(booking.start)) : null;
  const reviewTarget = useMemo(() => {
    if (!booking || status !== "completed") return null;
    return (
      archive.find((p) => p.spellSlug !== null && p.spellSlug === booking.spell.slug) ?? null
    );
  }, [booking, status, archive]);

  const stepIndex = booking ? TIMELINE_ORDER.indexOf(booking.timelineStep) : 0;
  const packedCount = booking ? booking.checklist.filter((c) => c.done).length : 0;

  return (
    <SpaceShell title="Trip">
      {!booking || !status ? (
        <View style={styles.missing}>
          <Text style={styles.missingText}>This trip isn't in your space.</Text>
        </View>
      ) : (
        <>
          {/* Hero */}
          <View style={styles.hero}>
            <Image source={{ uri: booking.spell.image }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
            <LinearGradient
              colors={["rgba(10,8,6,0.25)", "rgba(10,8,6,0.6)", "rgba(28,28,26,1)"]}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.heroBody}>
              <View style={styles.heroTopRow}>
                <StatusChip status={status} />
                <Text style={styles.ref}>{booking.ref}</Text>
              </View>
              <Text style={styles.heroName}>{booking.spell.name}</Text>
              <View style={styles.heroMetaRow}>
                <MapPin size={13} color="rgba(184,150,62,0.8)" />
                <Text style={styles.heroMeta}>
                  {booking.spell.location} · {fmtRange(booking.start, booking.end)}
                </Text>
              </View>
            </View>
          </View>

          {/* Countdown */}
          {days !== null ? (
            <View style={styles.countCard}>
              <Text style={styles.countNum}>{days}</Text>
              <View style={styles.countText}>
                <Text style={styles.countLabel}>{days === 1 ? "DAY TO GO" : "DAYS TO GO"}</Text>
                <Text style={styles.countSub}>
                  Departs {fmtDayYear(booking.start)} · {booking.seats} seat
                  {booking.seats > 1 ? "s" : ""}
                  {booking.guests.length > 0 ? ` · with ${booking.guests.join(", ")}` : ""}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Timeline */}
          {status !== "cancelled" ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>The journey so far</Text>
              <View style={styles.timeline}>
                {TIMELINE_ORDER.map((step, i) => {
                  const done = i <= stepIndex || status === "completed";
                  const isLast = i === TIMELINE_ORDER.length - 1;
                  return (
                    <View key={step} style={styles.timelineRow}>
                      <View style={styles.timelineRail}>
                        <View style={[styles.node, done ? styles.nodeDone : null]}>
                          {done ? <Check size={11} color={Colors.charcoalDeep} /> : null}
                        </View>
                        {!isLast ? (
                          <View style={[styles.rail, done && i < stepIndex ? styles.railDone : null]} />
                        ) : null}
                      </View>
                      <View style={styles.timelineText}>
                        <Text style={[styles.stepLabel, done ? styles.stepLabelDone : null]}>
                          {STEP_LABELS[step]}
                        </Text>
                        {step === "documents" && !done ? (
                          <Text style={styles.stepHint}>Arrives 10 days before departure</Text>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}

          {/* Cancelled details */}
          {status === "cancelled" ? (
            <View style={[styles.section, styles.cancelCard]}>
              <Text style={styles.cancelTitle}>Cancelled {booking.cancelledAt ? fmtDayYear(booking.cancelledAt) : ""}</Text>
              {booking.cancellationReason ? (
                <Text style={styles.cancelReason}>{booking.cancellationReason}</Text>
              ) : null}
              {booking.refundAmount ? (
                <Text style={styles.cancelRefund}>
                  {formatINR(booking.refundAmount)} refunded
                  {booking.refundedAt ? ` on ${fmtDayYear(booking.refundedAt)}` : ""} · {booking.paymentMethod}
                </Text>
              ) : null}
            </View>
          ) : null}

          {/* Packing checklist */}
          {booking.checklist.length > 0 && (status === "upcoming" || status === "ongoing") ? (
            <View style={styles.section}>
              <View style={styles.packHeader}>
                <Text style={styles.sectionTitle}>Packing list</Text>
                <Text style={styles.packCount}>
                  {packedCount} / {booking.checklist.length}
                </Text>
              </View>
              <GoldProgress
                progress={booking.checklist.length === 0 ? 0 : packedCount / booking.checklist.length}
                style={styles.packBar}
              />
              <View style={styles.checklist}>
                {booking.checklist.map((item) => (
                  <PressableScale
                    key={item.id}
                    onPress={() => void toggleChecklistItem(booking.id, item.id)}
                    scaleTo={0.98}
                    style={styles.checkRow}
                    testID={`check-${item.id}`}
                  >
                    <View style={[styles.checkbox, item.done ? styles.checkboxDone : null]}>
                      {item.done ? <Check size={12} color={Colors.charcoalDeep} /> : null}
                    </View>
                    <Text
                      style={[
                        styles.checkLabel,
                        item.done ? styles.checkLabelDone : null,
                      ]}
                    >
                      {item.label}
                    </Text>
                    {item.essential ? <Text style={styles.essential}>ESSENTIAL</Text> : null}
                  </PressableScale>
                ))}
              </View>
            </View>
          ) : null}

          {/* Stay & meeting point */}
          {booking.stay !== "" || booking.meetingPoint !== "" ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>On the ground</Text>
              <View style={styles.infoRows}>
                {booking.stay !== "" ? (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>STAY</Text>
                    <Text style={styles.infoValue}>{booking.stay}</Text>
                  </View>
                ) : null}
                {booking.meetingPoint !== "" ? (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>MEETING POINT</Text>
                    <Text style={styles.infoValue}>{booking.meetingPoint}</Text>
                  </View>
                ) : null}
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>HOST</Text>
                  <Text style={styles.infoValue}>
                    {booking.spell.host.name} · {booking.spell.host.role}
                  </Text>
                </View>
              </View>
            </View>
          ) : null}

          {/* Payment summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment</Text>
            <View style={styles.payCard}>
              <View style={styles.payLine}>
                <Text style={styles.payLabel}>
                  {formatINR(booking.pricePerSeat)} × {booking.seats} seat{booking.seats > 1 ? "s" : ""}
                </Text>
                <Text style={styles.payValue}>{formatINR(booking.amountTotal)}</Text>
              </View>
              <View style={styles.payLine}>
                <Text style={styles.payLabel}>Paid · {booking.paymentMethod}</Text>
                <Text style={[styles.payValue, styles.payPaid]}>{formatINR(booking.amountPaid)}</Text>
              </View>
              {booking.amountTotal - booking.amountPaid > 0 && booking.payment === "deposit" ? (
                <View style={[styles.payLine, styles.payDueLine]}>
                  <Text style={styles.payDueLabel}>BALANCE BEFORE DEPARTURE</Text>
                  <Text style={styles.payDueValue}>
                    {formatINR(booking.amountTotal - booking.amountPaid)}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Host note */}
          {booking.hostNote !== "" ? (
            <View style={[styles.section, styles.noteCard]}>
              <Text style={styles.noteLabel}>A NOTE FROM YOUR HOST</Text>
              <Text style={styles.noteText}>“{booking.hostNote}”</Text>
            </View>
          ) : null}

          {/* Review door for completed trips */}
          {reviewTarget ? (
            <PressableScale
              onPress={() => router.push(`/previous/${reviewTarget.slug}`)}
              scaleTo={0.98}
              style={styles.reviewCta}
              testID="trip-review"
            >
              <PenLine size={16} color={Colors.goldLight} />
              <View style={styles.reviewText}>
                <Text style={styles.reviewTitle}>Write about this circle</Text>
                <Text style={styles.reviewSub}>
                  You travelled this spell — leave a review on its memory page.
                </Text>
              </View>
            </PressableScale>
          ) : null}
        </>
      )}
    </SpaceShell>
  );
}

const styles = StyleSheet.create({
  missing: {
    padding: 40,
    alignItems: "center",
  },
  missingText: {
    fontFamily: Fonts.serifItalic,
    fontSize: 16,
    color: "rgba(245,240,232,0.5)",
  },
  hero: {
    marginHorizontal: 20,
    height: 230,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.1)",
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  heroBody: {
    padding: 18,
    gap: 7,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ref: {
    fontFamily: Fonts.sansMedium,
    fontSize: 11,
    letterSpacing: 1.4,
    color: "rgba(245,240,232,0.55)",
  },
  heroName: {
    fontFamily: Fonts.serif,
    fontSize: 30,
    color: Colors.cream,
  },
  heroMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  heroMeta: {
    fontFamily: Fonts.sans,
    fontSize: 12.5,
    color: "rgba(245,240,232,0.7)",
  },
  countCard: {
    marginHorizontal: 20,
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.35)",
    backgroundColor: "rgba(184,150,62,0.07)",
    padding: 18,
  },
  countNum: {
    fontFamily: Fonts.serif,
    fontSize: 52,
    lineHeight: 56,
    color: Colors.goldHi,
  },
  countText: {
    flex: 1,
    gap: 4,
  },
  countLabel: {
    fontFamily: Fonts.sansSemi,
    fontSize: 10,
    letterSpacing: 2.2,
    color: Colors.goldLight,
  },
  countSub: {
    fontFamily: Fonts.sans,
    fontSize: 12.5,
    lineHeight: 18,
    color: "rgba(245,240,232,0.6)",
  },
  section: {
    marginTop: 28,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontFamily: Fonts.serif,
    fontSize: 24,
    color: Colors.cream,
  },
  timeline: {
    marginTop: 16,
  },
  timelineRow: {
    flexDirection: "row",
    gap: 14,
  },
  timelineRail: {
    alignItems: "center",
    width: 24,
  },
  node: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.2)",
    backgroundColor: Colors.charcoal,
    alignItems: "center",
    justifyContent: "center",
  },
  nodeDone: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  rail: {
    width: 1,
    flex: 1,
    minHeight: 22,
    backgroundColor: "rgba(245,240,232,0.12)",
  },
  railDone: {
    backgroundColor: "rgba(184,150,62,0.5)",
  },
  timelineText: {
    flex: 1,
    paddingBottom: 20,
  },
  stepLabel: {
    fontFamily: Fonts.sansMedium,
    fontSize: 14,
    color: "rgba(245,240,232,0.45)",
  },
  stepLabelDone: {
    color: Colors.cream,
  },
  stepHint: {
    marginTop: 2,
    fontFamily: Fonts.sans,
    fontSize: 11.5,
    color: "rgba(245,240,232,0.35)",
  },
  cancelCard: {
    marginHorizontal: 20,
    paddingHorizontal: 0,
  },
  cancelTitle: {
    fontFamily: Fonts.serif,
    fontSize: 22,
    color: "#FCA5A5",
  },
  cancelReason: {
    marginTop: 8,
    fontFamily: Fonts.sans,
    fontSize: 13.5,
    lineHeight: 20,
    color: "rgba(245,240,232,0.6)",
  },
  cancelRefund: {
    marginTop: 8,
    fontFamily: Fonts.sansMedium,
    fontSize: 13,
    color: Colors.goldLight,
  },
  packHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  packCount: {
    fontFamily: Fonts.sansSemi,
    fontSize: 13,
    color: Colors.goldLight,
  },
  packBar: {
    marginTop: 12,
  },
  checklist: {
    marginTop: 14,
    gap: 9,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.07)",
    backgroundColor: "rgba(245,240,232,0.025)",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxDone: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  checkLabel: {
    flex: 1,
    fontFamily: Fonts.sans,
    fontSize: 13.5,
    color: "rgba(245,240,232,0.8)",
  },
  checkLabelDone: {
    color: "rgba(245,240,232,0.4)",
    textDecorationLine: "line-through",
  },
  essential: {
    fontFamily: Fonts.sansSemi,
    fontSize: 8,
    letterSpacing: 1.4,
    color: Colors.goldLight,
  },
  infoRows: {
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.08)",
    overflow: "hidden",
  },
  infoRow: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(245,240,232,0.06)",
    gap: 4,
  },
  infoLabel: {
    fontFamily: Fonts.sansSemi,
    fontSize: 9,
    letterSpacing: 1.8,
    color: "rgba(245,240,232,0.4)",
  },
  infoValue: {
    fontFamily: Fonts.sansMedium,
    fontSize: 14,
    color: "rgba(245,240,232,0.85)",
  },
  payCard: {
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.08)",
    overflow: "hidden",
  },
  payLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },
  payLabel: {
    flex: 1,
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: "rgba(245,240,232,0.6)",
  },
  payValue: {
    fontFamily: Fonts.sansMedium,
    fontSize: 14,
    color: "rgba(245,240,232,0.85)",
  },
  payPaid: {
    color: Colors.goldLight,
  },
  payDueLine: {
    backgroundColor: "rgba(184,150,62,0.1)",
    borderTopWidth: 1,
    borderTopColor: "rgba(184,150,62,0.3)",
  },
  payDueLabel: {
    fontFamily: Fonts.sansSemi,
    fontSize: 9.5,
    letterSpacing: 1.6,
    color: Colors.goldLight,
  },
  payDueValue: {
    fontFamily: Fonts.serif,
    fontSize: 20,
    color: Colors.goldHi,
  },
  noteCard: {
    marginHorizontal: 20,
    paddingHorizontal: 0,
  },
  noteLabel: {
    fontFamily: Fonts.sansSemi,
    fontSize: 9.5,
    letterSpacing: 2,
    color: Colors.gold,
  },
  noteText: {
    marginTop: 10,
    fontFamily: Fonts.serifItalic,
    fontSize: 18,
    lineHeight: 26,
    color: "rgba(245,240,232,0.85)",
  },
  reviewCta: {
    marginTop: 28,
    marginHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.4)",
    backgroundColor: "rgba(184,150,62,0.08)",
    padding: 16,
  },
  reviewText: {
    flex: 1,
    gap: 2,
  },
  reviewTitle: {
    fontFamily: Fonts.serif,
    fontSize: 18,
    color: Colors.cream,
  },
  reviewSub: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    lineHeight: 17,
    color: "rgba(245,240,232,0.55)",
  },
});

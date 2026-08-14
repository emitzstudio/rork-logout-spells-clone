import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Hourglass,
  MessageCircle,
  Minus,
  Plus,
  ShieldCheck,
  Ticket,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PressableScale } from "@/components/Buttons";
import MagicDust from "@/components/MagicDust";
import { Colors, Fonts } from "@/constants/theme";
import {
  fetchActiveDeparture,
  fetchMyWaitlist,
  joinWaitlist,
  leaveWaitlist,
} from "@/data/account/selfService";
import type { DepartureInfo, MyWaitlistEntry } from "@/data/account/selfService";
import { bookingService } from "@/data/booking";
import type { PriceInfo, TravellerDetails, TripDates } from "@/data/booking";
import { formatINR } from "@/data/spells";
import type { ManagedSpell } from "@/data/spells";
import { isUuid } from "@/src/integrations/supabase/client";
import { hapticMedium, hapticSuccess } from "@/lib/haptics";
import { useAccount } from "@/providers/AccountProvider";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The steps of the two-door flow. "choice" branches into the light Inquire
 * path, the Book Now journey, or — when the circle is full — the waitlist.
 * ⛔ The old fake payment step is RETIRED (decision W): the journey ends with
 * an honest reserve REQUEST filed through the live pipeline. Trip dates stay
 * fixed by the host.
 */
type Step =
  | "choice"
  | "inquire"
  | "inquire-sent"
  | "waitlist"
  | "travellers"
  | "summary"
  | "details"
  | "review"
  | "sending"
  | "requested";

const BOOK_STEPS: Step[] = ["travellers", "summary", "details", "review"];

const STEP_TITLES: Record<Step, string> = {
  choice: "Join this Spell",
  inquire: "Ask us anything",
  "inquire-sent": "Inquiry received",
  waitlist: "The waitlist",
  travellers: "Travellers",
  summary: "Price summary",
  details: "Your details",
  review: "Booking review",
  sending: "Sending",
  requested: "Request received",
};

/* --------------------------------- Field ---------------------------------- */

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize = "sentences",
  multiline = false,
  error,
  testID,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  keyboardType?: "default" | "email-address" | "phone-pad" | "number-pad";
  autoCapitalize?: "none" | "sentences" | "words";
  multiline?: boolean;
  error?: boolean;
  testID?: string;
}) {
  return (
    <View style={fieldStyles.wrap}>
      <Text style={fieldStyles.label}>{label.toUpperCase()}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(245,240,232,0.25)"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        style={[
          fieldStyles.input,
          multiline ? fieldStyles.multiline : null,
          error ? fieldStyles.errorBorder : null,
        ]}
        testID={testID}
      />
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrap: {
    gap: 7,
  },
  label: {
    fontFamily: Fonts.sansSemi,
    fontSize: 9.5,
    letterSpacing: 2,
    color: "rgba(245,240,232,0.45)",
  },
  input: {
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.12)",
    backgroundColor: "rgba(245,240,232,0.03)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontFamily: Fonts.sans,
    fontSize: 14.5,
    color: Colors.cream,
  },
  multiline: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  errorBorder: {
    borderColor: "rgba(201,111,90,0.6)",
  },
});

/**
 * The honest arithmetic of the manual era, shown as WORDS: the 30% advance
 * policy is stated, never computed — advances, taxes and every payable rupee
 * are confirmed personally by the team until online payment opens.
 */
function PaymentPolicyNote() {
  return (
    <View style={styles.policyCard}>
      <Text style={styles.policyTitle}>HOW PAYMENT WORKS</Text>
      <Text style={styles.policyLine}>· Nothing is paid online today — online payment opens soon.</Text>
      <Text style={styles.policyLine}>· A 30% advance confirms your seats; the balance is settled before departure.</Text>
      <Text style={styles.policyLine}>· Departures under 30 days away are confirmed with full payment.</Text>
      <Text style={styles.policyLine}>· Our team confirms the exact payable amount with you personally.</Text>
    </View>
  );
}

/** The gold dot rail showing progress through the Book Now journey. */
function ProgressRail({ step }: { step: Step }) {
  const index = BOOK_STEPS.indexOf(step);
  if (index < 0) return null;
  return (
    <View style={styles.rail}>
      {BOOK_STEPS.map((s, i) => (
        <View
          key={s}
          style={[
            styles.railDot,
            i < index ? styles.railDone : null,
            i === index ? styles.railActive : null,
          ]}
        />
      ))}
    </View>
  );
}

/* ------------------------------ The component ----------------------------- */

interface BookingFlowProps {
  open: boolean;
  spell: ManagedSpell;
  onClose: () => void;
  /**
   * When the spell has an attached published form, the Inquire door opens
   * THAT form (responses land in the founder's inbox) instead of the
   * built-in enquiry.
   */
  onInquireViaForm?: (() => void) | null;
}

/**
 * "Join this Spell" opens two doors: a light Inquiry, or the Book Now journey
 * — travellers, price summary, details, and an honest booking review that
 * RESERVES seats through the live request pipeline (online payment opens with
 * the payments milestone; nothing fake happens meanwhile). Full circles offer
 * the real waitlist instead.
 */
export default function BookingFlow({ open, spell, onClose, onInquireViaForm = null }: BookingFlowProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session, data } = useAccount();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>("choice");
  const [error, setError] = useState<string | null>(null);

  /* Inquire */
  const [inqName, setInqName] = useState<string>("");
  const [inqEmail, setInqEmail] = useState<string>("");
  const [inqNote, setInqNote] = useState<string>("");
  const [inqRef, setInqRef] = useState<string>("");
  const [inqSending, setInqSending] = useState<boolean>(false);

  /* Book Now — dates are fixed by the host; travellers only pick seats. */
  const fallbackDates = useMemo<TripDates>(() => bookingService.tripDates(spell), [spell]);
  const [seats, setSeats] = useState<number>(1);
  const [companions, setCompanions] = useState<string[]>([]);
  const [lead, setLead] = useState<TravellerDetails>({ fullName: "", email: "", phone: "" });
  const [requestNote, setRequestNote] = useState<string>("");
  const [requestRef, setRequestRef] = useState<string>("");

  /* Waitlist */
  const [waitSeats, setWaitSeats] = useState<number>(1);
  const [waitNote, setWaitNote] = useState<string>("");
  const [waitBusy, setWaitBusy] = useState<boolean>(false);

  const [dust, setDust] = useState<number>(0);
  const slide = useRef(new Animated.Value(0)).current;
  const stepFade = useRef(new Animated.Value(1)).current;

  const liveSpell = isUuid(spell.id);

  /** The real departure row — hold-aware availability for live spells. */
  const departureQuery = useQuery({
    queryKey: ["active-departure", spell.id],
    queryFn: () => fetchActiveDeparture(spell.id),
    enabled: open && liveSpell,
    staleTime: 30_000,
  });
  const departure: DepartureInfo | null = departureQuery.data ?? null;

  const waitlistQuery = useQuery({
    queryKey: ["my-waitlist", session?.userId ?? "anon"],
    queryFn: () => fetchMyWaitlist(session?.userId ?? ""),
    enabled: open && session !== null,
    staleTime: 30_000,
  });
  const myEntry: MyWaitlistEntry | null = useMemo(() => {
    if (!departure) return null;
    return (
      (waitlistQuery.data ?? []).find(
        (e) => e.departureId === departure.id && (e.status === "waiting" || e.status === "offered"),
      ) ?? null
    );
  }, [waitlistQuery.data, departure]);

  const dates = useMemo<TripDates>(() => {
    if (!departure) return fallbackDates;
    return {
      label: departure.label !== "" ? departure.label : fallbackDates.label,
      start: departure.start ?? fallbackDates.start,
      end: departure.end ?? fallbackDates.end,
      seatsLeft: departure.seatsLeft,
    };
  }, [departure, fallbackDates]);

  const seatsLeft = dates.seatsLeft;
  const soldOut = seatsLeft === 0;
  const maxSeats = Math.max(1, Math.min(seatsLeft, 6));
  const price = useMemo<PriceInfo>(() => bookingService.price(spell, seats), [spell, seats]);

  /* Reset the journey every time the doors open. */
  useEffect(() => {
    if (!open) return;
    setStep("choice");
    setError(null);
    setInqRef("");
    setInqNote("");
    setSeats(1);
    setCompanions([]);
    setRequestNote("");
    setRequestRef("");
    setWaitSeats(1);
    setWaitNote("");
    /* Signed-in travellers arrive pre-filled. */
    if (data) {
      const fullName = `${data.profile.firstName} ${data.profile.lastName}`.trim();
      setInqName(fullName);
      setInqEmail(data.profile.email);
      setLead({ fullName, email: data.profile.email, phone: data.profile.phone });
    } else {
      setInqName("");
      setInqEmail("");
      setLead({ fullName: "", email: "", phone: "" });
    }
    slide.setValue(0);
    Animated.timing(slide, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();
  }, [open, data, slide]);

  /* Keep the seat pick honest if live availability tightens. */
  useEffect(() => {
    setSeats((s) => Math.max(1, Math.min(s, maxSeats)));
  }, [maxSeats]);

  const goTo = useCallback(
    (next: Step) => {
      setError(null);
      Animated.sequence([
        Animated.timing(stepFade, { toValue: 0, duration: 130, useNativeDriver: true }),
        Animated.timing(stepFade, { toValue: 1, duration: 240, useNativeDriver: true }),
      ]).start();
      setStep(next);
    },
    [stepFade],
  );

  const adjustSeats = (base: number, delta: number, max: number, set: (n: number) => void): void => {
    set(Math.max(1, Math.min(max, base + delta)));
  };

  /* ------------------------------ Door 1 send ------------------------------ */

  const submitInquiry = async (): Promise<void> => {
    if (inqName.trim().length < 2) {
      setError("Please tell us your name.");
      return;
    }
    if (!EMAIL_RE.test(inqEmail.trim())) {
      setError("That email doesn't look right.");
      return;
    }
    setInqSending(true);
    setError(null);
    try {
      const ref = await bookingService.submitInquiry({
        spell,
        name: inqName,
        email: inqEmail,
        note: inqNote,
      });
      setInqRef(ref);
      hapticSuccess();
      goTo("inquire-sent");
    } catch {
      setError("The message couldn't be sent just now — please try again.");
    } finally {
      setInqSending(false);
    }
  };

  /* ------------------------------ Door 2 steps ----------------------------- */

  const continueFromDetails = (): void => {
    if (lead.fullName.trim().length < 2) {
      setError("We need the lead traveller's name.");
      return;
    }
    if (!EMAIL_RE.test(lead.email.trim())) {
      setError("That email doesn't look right.");
      return;
    }
    if (lead.phone.replace(/\D/g, "").length < 8) {
      setError("A reachable phone number, please.");
      return;
    }
    goTo("review");
  };

  const submitReserve = async (): Promise<void> => {
    goTo("sending");
    try {
      const ref = await bookingService.submitReserveRequest({
        spell,
        departure,
        dates,
        seats,
        lead,
        companions,
        note: requestNote,
      });
      setRequestRef(ref);
      hapticSuccess();
      setDust((d) => d + 1);
      goTo("requested");
    } catch {
      setError("Your request couldn't be sent just now — please try again.");
      goTo("review");
    }
  };

  /* ------------------------------- Waitlist -------------------------------- */

  const joinQueue = async (): Promise<void> => {
    if (!departure || !data) return;
    setWaitBusy(true);
    setError(null);
    try {
      await joinWaitlist({
        departureId: departure.id,
        seats: waitSeats,
        name: `${data.profile.firstName} ${data.profile.lastName}`.trim(),
        email: data.profile.email,
        phone: data.profile.phone,
        note: waitNote,
      });
      hapticSuccess();
      await queryClient.invalidateQueries({ queryKey: ["my-waitlist"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "The queue couldn't take you just now.");
    } finally {
      setWaitBusy(false);
    }
  };

  const leaveQueue = async (): Promise<void> => {
    if (!myEntry) return;
    setWaitBusy(true);
    setError(null);
    try {
      await leaveWaitlist(myEntry.id);
      await queryClient.invalidateQueries({ queryKey: ["my-waitlist"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "That couldn't be done.");
    } finally {
      setWaitBusy(false);
    }
  };

  /* --------------------------------- Header -------------------------------- */

  const back = (): void => {
    if (step === "inquire" || step === "waitlist") {
      goTo("choice");
      return;
    }
    const i = BOOK_STEPS.indexOf(step);
    if (i > 0) goTo(BOOK_STEPS[i - 1]);
    else if (i === 0) goTo("choice");
  };

  const showBack = step === "inquire" || step === "waitlist" || BOOK_STEPS.includes(step);
  const dismissable = step !== "sending";

  const companionNames = companions.map((c) => c.trim()).filter((c) => c !== "");

  /* --------------------------------- Render -------------------------------- */

  const seatStepper = (
    value: number,
    max: number,
    set: (n: number) => void,
    hint: string,
    idPrefix: string,
  ) => (
    <View style={styles.seatsBlock}>
      <View style={styles.seatsRow}>
        <PressableScale
          onPress={() => adjustSeats(value, -1, max, set)}
          scaleTo={0.88}
          style={[styles.seatBtn, value <= 1 ? styles.seatBtnDisabled : null]}
          testID={`${idPrefix}-minus`}
        >
          <Minus size={18} color={value <= 1 ? "rgba(245,240,232,0.25)" : Colors.goldLight} />
        </PressableScale>
        <View style={styles.seatCount}>
          <Text style={styles.seatNumber}>{value}</Text>
          <Text style={styles.seatLabel}>{value === 1 ? "SEAT" : "SEATS"}</Text>
        </View>
        <PressableScale
          onPress={() => adjustSeats(value, 1, max, set)}
          scaleTo={0.88}
          style={[styles.seatBtn, value >= max ? styles.seatBtnDisabled : null]}
          testID={`${idPrefix}-plus`}
        >
          <Plus size={18} color={value >= max ? "rgba(245,240,232,0.25)" : Colors.goldLight} />
        </PressableScale>
      </View>
      <Text style={styles.seatsHint}>{hint}</Text>
    </View>
  );

  const renderChoice = () => (
    <View style={styles.stepBody}>
      <View style={styles.spellRow}>
        <Text style={styles.spellSymbol}>{spell.symbol}</Text>
        <View style={styles.spellRowText}>
          <Text style={styles.spellRowName}>{spell.name}</Text>
          <Text style={styles.spellRowMeta}>
            {spell.location} · {spell.region}
          </Text>
        </View>
      </View>

      <View style={styles.fixedRow}>
        <CalendarDays size={15} color="rgba(184,150,62,0.75)" />
        <View style={styles.fixedRowText}>
          <Text style={styles.fixedRowLabel}>FIXED DATES · SET BY YOUR HOST</Text>
          <Text style={styles.fixedRowValue}>{dates.label}</Text>
        </View>
      </View>
      <View style={styles.fixedRow}>
        <Ticket size={15} color="rgba(184,150,62,0.75)" />
        <View style={styles.fixedRowText}>
          <Text style={styles.fixedRowLabel}>SEATS</Text>
          <Text style={styles.fixedRowValue}>
            {soldOut
              ? `Sold out · ${formatINR(spell.price)} per seat`
              : `${seatsLeft} open · ${formatINR(spell.price)} per seat`}
          </Text>
        </View>
      </View>

      <PressableScale
        onPress={() => {
          if (onInquireViaForm) {
            onInquireViaForm();
            return;
          }
          goTo("inquire");
        }}
        scaleTo={0.975}
        style={styles.doorCard}
        testID="door-inquire"
      >
        <View style={styles.doorIcon}>
          <MessageCircle size={19} color={Colors.goldLight} />
        </View>
        <View style={styles.doorText}>
          <Text style={styles.doorTitle}>Inquire</Text>
          <Text style={styles.doorSub}>
            Not ready to commit? Ask us anything — we reply personally within 24 hours.
          </Text>
        </View>
        <ArrowRight size={16} color="rgba(245,240,232,0.4)" />
      </PressableScale>

      {soldOut ? (
        <PressableScale
          onPress={() => goTo("waitlist")}
          scaleTo={0.975}
          style={[styles.doorCard, styles.doorCardGold]}
          testID="door-waitlist"
        >
          <View style={[styles.doorIcon, styles.doorIconGold]}>
            <Hourglass size={19} color={Colors.charcoalDeep} />
          </View>
          <View style={styles.doorText}>
            <Text style={styles.doorTitle}>Join the Waitlist</Text>
            <Text style={styles.doorSub}>
              This circle is full. Hold a real place in the queue — we reach out the moment seats
              open.
            </Text>
          </View>
          <ArrowRight size={16} color={Colors.goldLight} />
        </PressableScale>
      ) : (
        <PressableScale
          onPress={() => goTo("travellers")}
          scaleTo={0.975}
          style={[styles.doorCard, styles.doorCardGold]}
          testID="door-book"
        >
          <View style={[styles.doorIcon, styles.doorIconGold]}>
            <Ticket size={19} color={Colors.charcoalDeep} />
          </View>
          <View style={styles.doorText}>
            <Text style={styles.doorTitle}>Book Now</Text>
            <Text style={styles.doorSub}>
              Reserve your seats — our team confirms them personally while online payment opens
              soon.
            </Text>
          </View>
          <ArrowRight size={16} color={Colors.goldLight} />
        </PressableScale>
      )}

      <Text style={styles.choiceFoot}>
        {dates.label} · {formatINR(spell.price)} per seat · circles of {spell.seatsTotal} ✦
      </Text>
    </View>
  );

  const renderInquire = () => (
    <View style={styles.stepBody}>
      <Text style={styles.stepLead}>
        Dates, fitness levels, dietary needs, cold feet — all fair questions.
      </Text>
      <Field label="Your name" value={inqName} onChangeText={setInqName} placeholder="Full name" autoCapitalize="words" testID="inquire-name" />
      <Field
        label="Email"
        value={inqEmail}
        onChangeText={setInqEmail}
        placeholder="you@somewhere.com"
        keyboardType="email-address"
        autoCapitalize="none"
        testID="inquire-email"
      />
      <Field
        label="Your question (optional)"
        value={inqNote}
        onChangeText={setInqNote}
        placeholder={`e.g. Is the ${spell.name} beginner-friendly?`}
        multiline
        testID="inquire-note"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PressableScale onPress={() => void submitInquiry()} haptic="medium" style={styles.primaryBtn} testID="inquire-send">
        {inqSending ? (
          <ActivityIndicator color={Colors.charcoalDeep} />
        ) : (
          <Text style={styles.primaryBtnText}>SEND INQUIRY</Text>
        )}
      </PressableScale>
      <Text style={styles.quietNote}>We never share your details. No spam, ever.</Text>
    </View>
  );

  const renderInquireSent = () => (
    <View style={[styles.stepBody, styles.centered]}>
      <View style={styles.successRing}>
        <Check size={30} color={Colors.goldLight} />
      </View>
      <Text style={styles.doneTitle}>Inquiry received ✦</Text>
      <Text style={styles.doneSub}>
        Reference {inqRef} — a real human reads every inquiry and replies within 24 hours at{" "}
        {inqEmail.trim()}.
      </Text>
      <PressableScale onPress={onClose} style={styles.primaryBtn} testID="inquire-close">
        <Text style={styles.primaryBtnText}>DONE ✦</Text>
      </PressableScale>
    </View>
  );

  const renderWaitlist = () => (
    <View style={styles.stepBody}>
      <Text style={styles.stepLead}>Full — but circles shift.</Text>

      {!session ? (
        <>
          <Text style={styles.waitCopy}>
            The queue is tied to your account, so we always know how to reach you — and you can
            leave it any time.
          </Text>
          <PressableScale
            onPress={() => {
              onClose();
              router.push("/auth");
            }}
            haptic="medium"
            style={styles.primaryBtn}
            testID="waitlist-signin"
          >
            <Text style={styles.primaryBtnText}>SIGN IN TO JOIN THE WAITLIST</Text>
          </PressableScale>
          <Text style={styles.quietNote}>New here? The same door creates your space.</Text>
        </>
      ) : !departure ? (
        <Text style={styles.waitCopy}>
          This circle's departure isn't taking a queue right now — send an inquiry instead and
          we'll find you a way in.
        </Text>
      ) : myEntry ? (
        <>
          <View style={styles.queueCard}>
            <View style={styles.doorIcon}>
              <Hourglass size={19} color={Colors.goldLight} />
            </View>
            <Text style={styles.queueTitle}>You're in the queue.</Text>
            <Text style={styles.queueSub}>
              {myEntry.status === "offered"
                ? "Seats are being HELD for you — the team has reached out with next steps. Nothing is paid online."
                : `${myEntry.seats} seat${myEntry.seats > 1 ? "s" : ""} requested · we reach out personally the moment seats open.`}
            </Text>
          </View>
          {myEntry.status === "waiting" ? (
            <PressableScale onPress={() => void leaveQueue()} style={styles.ghostBtn} testID="waitlist-leave">
              {waitBusy ? (
                <ActivityIndicator color={Colors.goldLight} />
              ) : (
                <Text style={styles.ghostBtnText}>LEAVE THE WAITLIST</Text>
              )}
            </PressableScale>
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </>
      ) : (
        <>
          {seatStepper(
            waitSeats,
            Math.min(6, Math.max(1, spell.seatsTotal)),
            setWaitSeats,
            "Seats you'd take if they open",
            "wait-seats",
          )}
          <Field
            label="Anything we should know (optional)"
            value={waitNote}
            onChangeText={setWaitNote}
            placeholder="Flexible on dates, travelling with a friend…"
            multiline
            testID="waitlist-note"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PressableScale onPress={() => void joinQueue()} haptic="medium" style={styles.primaryBtn} testID="waitlist-join">
            {waitBusy ? (
              <ActivityIndicator color={Colors.charcoalDeep} />
            ) : (
              <Text style={styles.primaryBtnText}>JOIN THE WAITLIST</Text>
            )}
          </PressableScale>
          <Text style={styles.quietNote}>
            Joining costs nothing and holds no payment — seats are offered in person, never
            auto-charged.
          </Text>
        </>
      )}
    </View>
  );

  const renderTravellers = () => (
    <View style={styles.stepBody}>
      <View style={styles.datesCard}>
        <Text style={styles.datesCardLabel}>TRIP DATES · FIXED DEPARTURE</Text>
        <Text style={styles.datesCardValue}>{dates.label}</Text>
        <Text style={styles.datesCardMeta}>
          {spell.durationDays} days · the whole circle travels together
        </Text>
      </View>

      {seatStepper(
        seats,
        maxSeats,
        (n) => {
          setSeats(n);
          setCompanions((prev) => {
            const wanted = n - 1;
            const copy = prev.slice(0, wanted);
            while (copy.length < wanted) copy.push("");
            return copy;
          });
        },
        `${seatsLeft} seat${seatsLeft === 1 ? "" : "s"} left · up to ${maxSeats} for this trip`,
        "seats",
      )}

      {companions.map((name, i) => (
        <Field
          key={`companion-${i}`}
          label={`Traveller ${i + 2} name (optional)`}
          value={name}
          onChangeText={(v) => setCompanions((prev) => prev.map((p, idx) => (idx === i ? v : p)))}
          placeholder="They can confirm later"
          autoCapitalize="words"
          testID={`companion-${i}`}
        />
      ))}

      <PressableScale onPress={() => goTo("summary")} haptic="medium" style={styles.primaryBtn} testID="travellers-continue">
        <Text style={styles.primaryBtnText}>CONTINUE</Text>
      </PressableScale>
    </View>
  );

  const renderSummary = () => (
    <View style={styles.stepBody}>
      <Text style={styles.stepLead}>The honest arithmetic.</Text>
      <View style={styles.priceTable}>
        <View style={styles.priceLine}>
          <Text style={styles.priceLabel}>
            {formatINR(price.pricePerSeat)} × {seats} seat{seats > 1 ? "s" : ""}
          </Text>
          <Text style={styles.priceValue}>{formatINR(price.total)}</Text>
        </View>
        <View style={[styles.priceLine, styles.priceTotalLine]}>
          <Text style={styles.priceTotalLabel}>Trip total (published)</Text>
          <Text style={styles.priceTotalValue}>{formatINR(price.total)}</Text>
        </View>
      </View>

      <PaymentPolicyNote />

      <Text style={styles.quietNote}>
        All-inclusive: stay, meals, sessions and everything the spell lists. Flights not included.
      </Text>

      <PressableScale onPress={() => goTo("details")} haptic="medium" style={styles.primaryBtn} testID="summary-continue">
        <Text style={styles.primaryBtnText}>LOOKS RIGHT</Text>
      </PressableScale>
    </View>
  );

  const renderDetails = () => (
    <View style={styles.stepBody}>
      {session ? (
        <View style={styles.signedCard}>
          <Check size={13} color={Colors.goldLight} />
          <Text style={styles.signedCardText}>
            Requesting as {session.firstName} — once the team confirms your seats, the trip appears
            in your Logout Space.
          </Text>
        </View>
      ) : (
        <Text style={styles.waitCopy}>
          Travelling often? Sign in from My Space and confirmed trips will live there — countdown,
          checklist and all.
        </Text>
      )}
      <Field
        label="Full name"
        value={lead.fullName}
        onChangeText={(v) => setLead((l) => ({ ...l, fullName: v }))}
        placeholder="As on your ID"
        autoCapitalize="words"
        testID="details-name"
      />
      <Field
        label="Email"
        value={lead.email}
        onChangeText={(v) => setLead((l) => ({ ...l, email: v }))}
        placeholder="you@somewhere.com"
        keyboardType="email-address"
        autoCapitalize="none"
        testID="details-email"
      />
      <Field
        label="Phone / WhatsApp"
        value={lead.phone}
        onChangeText={(v) => setLead((l) => ({ ...l, phone: v }))}
        placeholder="+91 98765 43210"
        keyboardType="phone-pad"
        testID="details-phone"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PressableScale onPress={continueFromDetails} haptic="medium" style={styles.primaryBtn} testID="details-continue">
        <Text style={styles.primaryBtnText}>REVIEW MY REQUEST</Text>
      </PressableScale>
    </View>
  );

  const renderReview = () => (
    <View style={styles.stepBody}>
      <Text style={styles.stepLead}>Reserve my seats — online payment opens soon.</Text>

      <View style={styles.reviewTable}>
        <View style={styles.reviewLine}>
          <Text style={styles.reviewKey}>Departure</Text>
          <Text style={styles.reviewVal}>{dates.label}</Text>
        </View>
        <View style={styles.reviewLine}>
          <Text style={styles.reviewKey}>Seats</Text>
          <Text style={styles.reviewVal}>{seats}</Text>
        </View>
        <View style={styles.reviewLine}>
          <Text style={styles.reviewKey}>Lead traveller</Text>
          <Text style={styles.reviewVal}>{lead.fullName.trim()}</Text>
        </View>
        {companionNames.length > 0 ? (
          <View style={styles.reviewLine}>
            <Text style={styles.reviewKey}>Companions</Text>
            <Text style={styles.reviewVal}>{companionNames.join(", ")}</Text>
          </View>
        ) : null}
        <View style={[styles.reviewLine, styles.reviewTotalLine]}>
          <Text style={styles.reviewKey}>Trip total (published)</Text>
          <Text style={styles.reviewTotal}>{formatINR(price.total)}</Text>
        </View>
      </View>

      <View style={styles.shieldCard}>
        <ShieldCheck size={13} color={Colors.goldLight} />
        <Text style={styles.shieldCardText}>
          Nothing is paid today. Your request lands with the Logout Spells team, who confirm your
          seats and the 30% advance personally — usually within 24 hours.
        </Text>
      </View>

      <Field
        label="Anything we should know (optional)"
        value={requestNote}
        onChangeText={setRequestNote}
        placeholder="Dietary needs, arrival plans, a question…"
        multiline
        testID="review-note"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PressableScale onPress={() => void submitReserve()} haptic="medium" style={styles.primaryBtn} testID="review-reserve">
        <Text style={styles.primaryBtnText}>RESERVE MY SEATS</Text>
      </PressableScale>
      <Text style={styles.quietNote}>
        No payment is collected online yet — no card, no UPI, no charges.
      </Text>
    </View>
  );

  const renderSending = () => (
    <View style={[styles.stepBody, styles.centered, styles.sendingBody]}>
      <ActivityIndicator size="large" color={Colors.goldLight} />
      <Text style={styles.sendingLine}>Sending your request…</Text>
      <Text style={styles.sendingSub}>Don't close this — it only takes a moment.</Text>
    </View>
  );

  const renderRequested = () => (
    <View style={[styles.stepBody, styles.centered]}>
      <View style={styles.successRing}>
        <Check size={30} color={Colors.goldLight} />
      </View>
      <Text style={styles.doneTitle}>Request received ✦</Text>
      <Text style={styles.doneSub}>
        Reference {requestRef} · {seats} seat{seats > 1 ? "s" : ""} · {dates.label}
      </Text>
      <View style={styles.receivedCard}>
        <Text style={styles.receivedCardText}>
          A real human confirms your seats within 24 hours at {lead.email.trim()} — payment
          instructions come with that confirmation. Nothing has been charged.
        </Text>
        {session ? (
          <Text style={styles.receivedCardFoot}>
            Once confirmed, the trip appears in My Trips with its countdown, checklist and payment
            record.
          </Text>
        ) : null}
      </View>
      {!session ? (
        <PressableScale
          onPress={() => {
            onClose();
            router.push("/auth");
          }}
          style={styles.primaryBtn}
          testID="requested-signin"
        >
          <Text style={styles.primaryBtnText}>SIGN IN TO TRACK THIS REQUEST</Text>
        </PressableScale>
      ) : null}
      <PressableScale onPress={onClose} style={session ? styles.primaryBtn : styles.ghostBtn} testID="requested-done">
        <Text style={session ? styles.primaryBtnText : styles.ghostBtnText}>DONE ✦</Text>
      </PressableScale>
    </View>
  );

  const stepContent: Record<Step, () => React.ReactNode> = {
    choice: renderChoice,
    inquire: renderInquire,
    "inquire-sent": renderInquireSent,
    waitlist: renderWaitlist,
    travellers: renderTravellers,
    summary: renderSummary,
    details: renderDetails,
    review: renderReview,
    sending: renderSending,
    requested: renderRequested,
  };

  return (
    <Modal visible={open} transparent animationType="none" onRequestClose={dismissable ? onClose : () => undefined}>
      <Animated.View style={[styles.backdrop, { opacity: slide }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismissable ? onClose : undefined} />
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.avoiding}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[
            styles.sheet,
            {
              paddingBottom: insets.bottom + 18,
              transform: [
                { translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [90, 0] }) },
              ],
              opacity: slide,
            },
          ]}
        >
          <View style={styles.handle} />
          <View style={styles.sheetHeader}>
            {showBack ? (
              <PressableScale onPress={back} scaleTo={0.9} style={styles.headerBtn} testID="flow-back">
                <ArrowLeft size={16} color="rgba(245,240,232,0.6)" />
              </PressableScale>
            ) : (
              <View style={styles.headerBtn} />
            )}
            <View style={styles.headerCenter}>
              <Text style={styles.sheetTitle}>{STEP_TITLES[step]}</Text>
              <ProgressRail step={step} />
            </View>
            {dismissable ? (
              <PressableScale onPress={onClose} scaleTo={0.9} style={styles.headerBtn} testID="flow-close">
                <X size={16} color="rgba(245,240,232,0.6)" />
              </PressableScale>
            ) : (
              <View style={styles.headerBtn} />
            )}
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollBody}
          >
            <Animated.View style={{ opacity: stepFade }}>{stepContent[step]()}</Animated.View>
          </ScrollView>

          <MagicDust trigger={dust} />
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10,8,6,0.88)",
  },
  avoiding: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "92%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.25)",
    backgroundColor: "#14130F",
    overflow: "hidden",
  },
  handle: {
    alignSelf: "center",
    marginTop: 10,
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(245,240,232,0.15)",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(245,240,232,0.06)",
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  sheetTitle: {
    textAlign: "center",
    fontFamily: Fonts.serif,
    fontSize: 21,
    color: Colors.cream,
  },
  rail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  railDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(245,240,232,0.15)",
  },
  railDone: {
    backgroundColor: "rgba(184,150,62,0.6)",
    width: 14,
  },
  railActive: {
    backgroundColor: Colors.gold,
    width: 22,
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  stepBody: {
    gap: 14,
  },
  centered: {
    alignItems: "center",
  },
  stepLead: {
    fontFamily: Fonts.serifItalic,
    fontSize: 16.5,
    lineHeight: 23,
    color: "rgba(245,240,232,0.65)",
  },
  spellRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  spellSymbol: {
    fontFamily: Fonts.serif,
    fontSize: 30,
    color: "rgba(184,150,62,0.75)",
  },
  spellRowText: {
    flex: 1,
  },
  spellRowName: {
    fontFamily: Fonts.serif,
    fontSize: 24,
    color: Colors.cream,
  },
  spellRowMeta: {
    marginTop: 2,
    fontFamily: Fonts.sans,
    fontSize: 12.5,
    color: "rgba(245,240,232,0.5)",
  },
  fixedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.07)",
    backgroundColor: "rgba(245,240,232,0.02)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  fixedRowText: {
    flex: 1,
  },
  fixedRowLabel: {
    fontFamily: Fonts.sansSemi,
    fontSize: 8.5,
    letterSpacing: 1.8,
    color: "rgba(245,240,232,0.4)",
  },
  fixedRowValue: {
    marginTop: 3,
    fontFamily: Fonts.sansMedium,
    fontSize: 14,
    color: "rgba(245,240,232,0.9)",
  },
  doorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.1)",
    backgroundColor: "rgba(245,240,232,0.03)",
    borderRadius: 16,
    padding: 16,
  },
  doorCardGold: {
    borderColor: "rgba(184,150,62,0.45)",
    backgroundColor: "rgba(184,150,62,0.08)",
  },
  doorIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  doorIconGold: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  doorText: {
    flex: 1,
  },
  doorTitle: {
    fontFamily: Fonts.serif,
    fontSize: 20,
    color: Colors.cream,
  },
  doorSub: {
    marginTop: 3,
    fontFamily: Fonts.sans,
    fontSize: 12,
    lineHeight: 17,
    color: "rgba(245,240,232,0.55)",
  },
  choiceFoot: {
    textAlign: "center",
    fontFamily: Fonts.serifItalic,
    fontSize: 13,
    color: "rgba(245,240,232,0.4)",
  },
  error: {
    fontFamily: Fonts.sansMedium,
    fontSize: 12.5,
    color: Colors.error,
  },
  primaryBtn: {
    marginTop: 6,
    backgroundColor: Colors.gold,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    alignSelf: "stretch",
  },
  primaryBtnText: {
    fontFamily: Fonts.sansSemi,
    fontSize: 12.5,
    letterSpacing: 1.8,
    color: Colors.charcoalDeep,
  },
  ghostBtn: {
    marginTop: 2,
    borderWidth: 1,
    borderColor: Colors.goldBorder,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    alignSelf: "stretch",
  },
  ghostBtnText: {
    fontFamily: Fonts.sansSemi,
    fontSize: 12,
    letterSpacing: 1.8,
    color: Colors.goldLight,
  },
  quietNote: {
    textAlign: "center",
    fontFamily: Fonts.sans,
    fontSize: 11,
    lineHeight: 16,
    color: "rgba(245,240,232,0.35)",
  },
  successRing: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 1.5,
    borderColor: "rgba(184,150,62,0.5)",
    backgroundColor: "rgba(184,150,62,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  doneTitle: {
    marginTop: 4,
    fontFamily: Fonts.serif,
    fontSize: 26,
    color: Colors.cream,
    textAlign: "center",
  },
  doneSub: {
    fontFamily: Fonts.sans,
    fontSize: 13.5,
    lineHeight: 20,
    color: "rgba(245,240,232,0.6)",
    textAlign: "center",
    maxWidth: 300,
  },
  datesCard: {
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.3)",
    backgroundColor: "rgba(184,150,62,0.06)",
    borderRadius: 14,
    padding: 16,
  },
  datesCardLabel: {
    fontFamily: Fonts.sansSemi,
    fontSize: 9,
    letterSpacing: 2,
    color: Colors.gold,
  },
  datesCardValue: {
    marginTop: 6,
    fontFamily: Fonts.serif,
    fontSize: 23,
    color: Colors.cream,
  },
  datesCardMeta: {
    marginTop: 3,
    fontFamily: Fonts.sans,
    fontSize: 12.5,
    color: "rgba(245,240,232,0.55)",
  },
  seatsBlock: {
    gap: 10,
  },
  seatsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 26,
    marginTop: 6,
  },
  seatBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  seatBtnDisabled: {
    borderColor: "rgba(245,240,232,0.1)",
  },
  seatCount: {
    alignItems: "center",
    minWidth: 78,
  },
  seatNumber: {
    fontFamily: Fonts.serif,
    fontSize: 52,
    lineHeight: 56,
    color: Colors.goldHi,
  },
  seatLabel: {
    fontFamily: Fonts.sansSemi,
    fontSize: 9,
    letterSpacing: 2.4,
    color: "rgba(245,240,232,0.5)",
  },
  seatsHint: {
    textAlign: "center",
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: "rgba(245,240,232,0.45)",
  },
  policyCard: {
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.3)",
    backgroundColor: "rgba(184,150,62,0.05)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 6,
  },
  policyTitle: {
    fontFamily: Fonts.sansSemi,
    fontSize: 9.5,
    letterSpacing: 2,
    color: Colors.gold,
    marginBottom: 2,
  },
  policyLine: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    lineHeight: 18,
    color: "rgba(245,240,232,0.6)",
  },
  priceTable: {
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.08)",
    borderRadius: 14,
    overflow: "hidden",
  },
  priceLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  priceLabel: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: "rgba(245,240,232,0.6)",
  },
  priceValue: {
    fontFamily: Fonts.sansMedium,
    fontSize: 13.5,
    color: "rgba(245,240,232,0.85)",
  },
  priceTotalLine: {
    borderTopWidth: 1,
    borderTopColor: "rgba(245,240,232,0.07)",
  },
  priceTotalLabel: {
    fontFamily: Fonts.sansSemi,
    fontSize: 13.5,
    color: Colors.cream,
  },
  priceTotalValue: {
    fontFamily: Fonts.serif,
    fontSize: 22,
    color: Colors.goldHi,
  },
  signedCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.3)",
    backgroundColor: "rgba(184,150,62,0.05)",
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  signedCardText: {
    flex: 1,
    fontFamily: Fonts.sans,
    fontSize: 12,
    lineHeight: 17,
    color: "rgba(245,240,232,0.7)",
  },
  waitCopy: {
    fontFamily: Fonts.sans,
    fontSize: 13.5,
    lineHeight: 20,
    color: "rgba(245,240,232,0.55)",
  },
  queueCard: {
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.3)",
    backgroundColor: "rgba(184,150,62,0.05)",
    paddingHorizontal: 18,
    paddingVertical: 22,
  },
  queueTitle: {
    fontFamily: Fonts.serif,
    fontSize: 23,
    color: Colors.cream,
  },
  queueSub: {
    textAlign: "center",
    fontFamily: Fonts.sans,
    fontSize: 12.5,
    lineHeight: 19,
    color: "rgba(245,240,232,0.55)",
  },
  reviewTable: {
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.08)",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  reviewLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  reviewKey: {
    fontFamily: Fonts.sans,
    fontSize: 12.5,
    color: "rgba(245,240,232,0.55)",
  },
  reviewVal: {
    flex: 1,
    textAlign: "right",
    fontFamily: Fonts.sansMedium,
    fontSize: 13,
    color: "rgba(245,240,232,0.85)",
  },
  reviewTotalLine: {
    borderTopWidth: 1,
    borderTopColor: "rgba(245,240,232,0.08)",
    marginTop: 2,
    paddingTop: 10,
  },
  reviewTotal: {
    fontFamily: Fonts.serif,
    fontSize: 20,
    color: Colors.cream,
  },
  shieldCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.25)",
    backgroundColor: "rgba(184,150,62,0.05)",
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  shieldCardText: {
    flex: 1,
    fontFamily: Fonts.sans,
    fontSize: 11.5,
    lineHeight: 17,
    color: "rgba(245,240,232,0.65)",
  },
  receivedCard: {
    alignSelf: "stretch",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.08)",
    backgroundColor: "rgba(245,240,232,0.02)",
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 8,
  },
  receivedCardText: {
    fontFamily: Fonts.sans,
    fontSize: 12.5,
    lineHeight: 19,
    color: "rgba(245,240,232,0.6)",
  },
  receivedCardFoot: {
    borderTopWidth: 1,
    borderTopColor: "rgba(245,240,232,0.06)",
    paddingTop: 8,
    fontFamily: Fonts.sans,
    fontSize: 11.5,
    lineHeight: 17,
    color: "rgba(245,240,232,0.45)",
  },
  sendingBody: {
    paddingVertical: 40,
    gap: 18,
  },
  sendingLine: {
    fontFamily: Fonts.serif,
    fontSize: 21,
    color: Colors.cream,
  },
  sendingSub: {
    fontFamily: Fonts.sans,
    fontSize: 12.5,
    color: "rgba(245,240,232,0.45)",
  },
});

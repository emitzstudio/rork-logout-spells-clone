import { useRouter } from "expo-router";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CreditCard,
  Lock,
  MessageCircle,
  Minus,
  Plus,
  Smartphone,
  Sparkles,
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
import { bookingService } from "@/data/booking";
import type { PaymentMethodId, PaymentResult, TripDates } from "@/data/booking";
import { formatINR } from "@/data/spells";
import type { ManagedSpell } from "@/data/spells";
import { hapticMedium, hapticSuccess } from "@/lib/haptics";
import { useAccount } from "@/providers/AccountProvider";

type Step =
  | "choice"
  | "inquire"
  | "inquire-done"
  | "seats"
  | "details"
  | "summary"
  | "pay"
  | "processing"
  | "success";

interface BookingFlowProps {
  open: boolean;
  spell: ManagedSpell;
  onClose: () => void;
}

const STEP_TITLES: Record<Step, string> = {
  choice: "Join this Spell",
  inquire: "Ask us anything",
  "inquire-done": "Enquiry sent",
  seats: "Travellers",
  details: "Your details",
  summary: "Booking summary",
  pay: "Payment",
  processing: "Payment",
  success: "Seat confirmed",
};

const MAX_SEATS_PER_BOOKING = 4;

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

/* ------------------------------ The component ----------------------------- */

/**
 * The two-door booking flow behind "Join this Spell" — mirrors the website:
 * Door 1 (Inquire) sends a light enquiry; Door 2 (Book Now) runs travellers →
 * details → summary → payment. Dates are fixed by the host and only the
 * booking advance is collected today; the balance settles before departure.
 */
export default function BookingFlow({ open, spell, onClose }: BookingFlowProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session, signedIn, addBooking } = useAccount();

  const [step, setStep] = useState<Step>("choice");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<boolean>(false);

  /* Door 1 state */
  const [inqName, setInqName] = useState<string>("");
  const [inqEmail, setInqEmail] = useState<string>("");
  const [inqNote, setInqNote] = useState<string>("");
  const [inquiryRef, setInquiryRef] = useState<string>("");

  /* Door 2 state */
  const [seats, setSeats] = useState<number>(1);
  const [fullName, setFullName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [companions, setCompanions] = useState<string[]>([]);
  const [method, setMethod] = useState<PaymentMethodId>("upi");
  const [upiId, setUpiId] = useState<string>("");
  const [cardNumber, setCardNumber] = useState<string>("");
  const [cardExpiry, setCardExpiry] = useState<string>("");
  const [bookingRef, setBookingRef] = useState<string>("");
  const [processingLine, setProcessingLine] = useState<string>("Contacting the gateway…");
  const [dust, setDust] = useState<number>(0);

  const slide = useRef(new Animated.Value(0)).current;
  const stepFade = useRef(new Animated.Value(1)).current;

  const dates: TripDates = useMemo(() => bookingService.tripDates(spell), [spell]);
  const maxSeats = Math.max(1, Math.min(MAX_SEATS_PER_BOOKING, dates.seatsLeft));
  const breakdown = useMemo(() => bookingService.price(spell, seats), [spell, seats]);
  const soldOut = dates.seatsLeft === 0;

  /* Reset + slide in when opened. */
  useEffect(() => {
    if (open) {
      setStep("choice");
      setError(null);
      setBusy(false);
      setSeats(1);
      setInquiryRef("");
      setBookingRef("");
      if (session) {
        setInqName(session.firstName);
        setInqEmail(session.email);
        setFullName(session.firstName);
        setEmail(session.email);
      }
      slide.setValue(0);
      Animated.timing(slide, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }).start();
    }
  }, [open, session, slide]);

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

  const adjustSeats = (delta: number): void => {
    setSeats((s) => {
      const next = Math.max(1, Math.min(maxSeats, s + delta));
      setCompanions((prev) => {
        const wanted = next - 1;
        const copy = prev.slice(0, wanted);
        while (copy.length < wanted) copy.push("");
        return copy;
      });
      return next;
    });
  };

  /* ------------------------------ Door 1 send ------------------------------ */

  const submitInquiry = async (): Promise<void> => {
    if (inqName.trim().length < 2) {
      setError("Tell us your name.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inqEmail.trim())) {
      setError("That doesn't look like an email address.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const record = await bookingService.submitInquiry({
        spell,
        name: inqName,
        email: inqEmail,
        note: inqNote,
      });
      setInquiryRef(record.ref);
      hapticSuccess();
      goTo("inquire-done");
    } catch {
      setError("The enquiry couldn't be sent — try again.");
    } finally {
      setBusy(false);
    }
  };

  /* ------------------------------ Door 2 steps ----------------------------- */

  const continueFromDetails = (): void => {
    if (fullName.trim().length < 2) {
      setError("Your full name confirms the seat.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("That doesn't look like an email address.");
      return;
    }
    if (phone.trim().length < 8) {
      setError("A phone number helps your host reach you.");
      return;
    }
    goTo("summary");
  };

  const pay = async (): Promise<void> => {
    if (method === "upi" && !/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(upiId.trim())) {
      setError("Enter a UPI ID like name@bank.");
      return;
    }
    if (method === "card" && cardNumber.replace(/\s/g, "").length < 12) {
      setError("Enter the full card number.");
      return;
    }
    setError(null);
    hapticMedium();
    goTo("processing");
    setProcessingLine("Contacting the gateway…");
    const lines = ["Creating your order…", "Confirming with the bank…", "Sealing your seat…"];
    lines.forEach((line, i) => {
      setTimeout(() => setProcessingLine(line), 700 + i * 750);
    });

    const methodLabel =
      method === "upi"
        ? `UPI · ${upiId.trim()}`
        : `Card ·· ${cardNumber.replace(/\s/g, "").slice(-4)}`;

    try {
      const result: PaymentResult = await bookingService.gateway.pay({
        amountInr: breakdown.advance,
        method,
        methodLabel,
      });
      const booking = bookingService.buildBooking({
        spell,
        dates,
        seats,
        lead: { fullName: fullName.trim(), email: email.trim(), phone: phone.trim() },
        companions,
        breakdown,
        payment: result,
      });
      setBookingRef(booking.ref);
      if (signedIn) {
        await addBooking(booking);
      }
      hapticSuccess();
      setDust((d) => d + 1);
      goTo("success");
    } catch {
      setError("The payment didn't go through — nothing was charged.");
      goTo("pay");
    }
  };

  /* --------------------------------- Header -------------------------------- */

  const backTargets: Partial<Record<Step, Step>> = {
    inquire: "choice",
    seats: "choice",
    details: "seats",
    summary: "details",
    pay: "summary",
  };

  const headerBack = backTargets[step];

  /* --------------------------------- Render -------------------------------- */

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
              : `${dates.seatsLeft} of ${spell.seatsTotal} open · ${formatINR(spell.price)} per seat`}
          </Text>
        </View>
      </View>

      <PressableScale
        onPress={() => goTo("inquire")}
        scaleTo={0.975}
        style={styles.doorCard}
        testID="door-inquire"
      >
        <View style={styles.doorIcon}>
          <MessageCircle size={19} color={Colors.goldLight} />
        </View>
        <View style={styles.doorText}>
          <Text style={styles.doorTitle}>Inquire first</Text>
          <Text style={styles.doorSub}>
            Ask anything — dates, fitness, the phone thing. We reply within a day.
          </Text>
        </View>
        <ArrowRight size={16} color="rgba(245,240,232,0.4)" />
      </PressableScale>

      <PressableScale
        onPress={() => {
          if (!soldOut) goTo("seats");
        }}
        scaleTo={0.975}
        style={[styles.doorCard, styles.doorCardGold, soldOut ? styles.doorDisabled : null]}
        testID="door-book"
      >
        <View style={[styles.doorIcon, styles.doorIconGold]}>
          <Sparkles size={19} color={Colors.charcoalDeep} />
        </View>
        <View style={styles.doorText}>
          <Text style={styles.doorTitle}>{soldOut ? "Sold out" : "Book now"}</Text>
          <Text style={styles.doorSub}>
            {soldOut
              ? "This circle is full — enquire to join the waitlist."
              : `Reserve with a ${formatINR(breakdown.advance / seats)} advance per seat. Balance closer to departure.`}
          </Text>
        </View>
        {!soldOut ? <ArrowRight size={16} color={Colors.goldLight} /> : null}
      </PressableScale>

      {!signedIn ? (
        <Text style={styles.signedOutHint}>
          ✦ Sign in from My Space to keep this trip in your account
        </Text>
      ) : null}
    </View>
  );

  const renderInquire = () => (
    <View style={styles.stepBody}>
      <Text style={styles.stepLead}>
        A real person reads every enquiry — usually {spell.host.name.split(" ")[0]} or the team.
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
        label="Your question"
        value={inqNote}
        onChangeText={setInqNote}
        placeholder={`Anything about the ${spell.name}…`}
        multiline
        testID="inquire-note"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PressableScale onPress={() => void submitInquiry()} haptic="medium" style={styles.primaryBtn} testID="inquire-send">
        {busy ? (
          <ActivityIndicator color={Colors.charcoalDeep} />
        ) : (
          <Text style={styles.primaryBtnText}>SEND ENQUIRY</Text>
        )}
      </PressableScale>
    </View>
  );

  const renderInquireDone = () => (
    <View style={[styles.stepBody, styles.centered]}>
      <View style={styles.successRing}>
        <Check size={30} color={Colors.goldLight} />
      </View>
      <Text style={styles.doneTitle}>It's with the team ✦</Text>
      <Text style={styles.doneSub}>
        Reference {inquiryRef}. We reply to {inqEmail.trim()} within a day — usually much sooner.
      </Text>
      <PressableScale onPress={onClose} style={styles.primaryBtn} testID="inquire-close">
        <Text style={styles.primaryBtnText}>DONE</Text>
      </PressableScale>
    </View>
  );

  const renderSeats = () => (
    <View style={styles.stepBody}>
      <Text style={styles.stepLead}>
        The whole circle travels together on the host's dates — you only choose how many seats.
      </Text>
      <View style={styles.datesCard}>
        <Text style={styles.datesCardLabel}>TRAVELLING</Text>
        <Text style={styles.datesCardValue}>{dates.label}</Text>
        <Text style={styles.datesCardMeta}>
          {spell.durationDays} days · {spell.location}
        </Text>
      </View>

      <View style={styles.seatsRow}>
        <PressableScale
          onPress={() => adjustSeats(-1)}
          scaleTo={0.88}
          style={[styles.seatBtn, seats <= 1 ? styles.seatBtnDisabled : null]}
          testID="seats-minus"
        >
          <Minus size={18} color={seats <= 1 ? "rgba(245,240,232,0.25)" : Colors.goldLight} />
        </PressableScale>
        <View style={styles.seatCount}>
          <Text style={styles.seatNumber}>{seats}</Text>
          <Text style={styles.seatLabel}>{seats === 1 ? "SEAT" : "SEATS"}</Text>
        </View>
        <PressableScale
          onPress={() => adjustSeats(1)}
          scaleTo={0.88}
          style={[styles.seatBtn, seats >= maxSeats ? styles.seatBtnDisabled : null]}
          testID="seats-plus"
        >
          <Plus size={18} color={seats >= maxSeats ? "rgba(245,240,232,0.25)" : Colors.goldLight} />
        </PressableScale>
      </View>
      <Text style={styles.seatsHint}>
        {dates.seatsLeft} seat{dates.seatsLeft === 1 ? "" : "s"} left in this circle
        {maxSeats < dates.seatsLeft ? ` · up to ${maxSeats} per booking` : ""}
      </Text>

      <View style={styles.advanceStrip}>
        <Lock size={13} color={Colors.goldLight} />
        <Text style={styles.advanceStripText}>
          Due today: <Text style={styles.advanceStripStrong}>{formatINR(breakdown.advance)}</Text> · the
          rest ({formatINR(breakdown.balance)}) before departure
        </Text>
      </View>

      <PressableScale onPress={() => goTo("details")} haptic="medium" style={styles.primaryBtn} testID="seats-continue">
        <Text style={styles.primaryBtnText}>CONTINUE</Text>
      </PressableScale>
    </View>
  );

  const renderDetails = () => (
    <View style={styles.stepBody}>
      <Field label="Lead traveller" value={fullName} onChangeText={setFullName} placeholder="Full name" autoCapitalize="words" testID="details-name" />
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@somewhere.com"
        keyboardType="email-address"
        autoCapitalize="none"
        testID="details-email"
      />
      <Field label="Phone" value={phone} onChangeText={setPhone} placeholder="+91 …" keyboardType="phone-pad" testID="details-phone" />
      {companions.map((name, i) => (
        <Field
          key={`companion-${i}`}
          label={`Companion ${i + 1}`}
          value={name}
          onChangeText={(v) =>
            setCompanions((prev) => prev.map((p, idx) => (idx === i ? v : p)))
          }
          placeholder="Their full name"
          autoCapitalize="words"
          testID={`details-companion-${i}`}
        />
      ))}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PressableScale onPress={continueFromDetails} haptic="medium" style={styles.primaryBtn} testID="details-continue">
        <Text style={styles.primaryBtnText}>REVIEW BOOKING</Text>
      </PressableScale>
    </View>
  );

  const renderSummary = () => (
    <View style={styles.stepBody}>
      <View style={styles.datesCard}>
        <Text style={styles.datesCardLabel}>{spell.name.toUpperCase()}</Text>
        <Text style={styles.datesCardValue}>{dates.label}</Text>
        <Text style={styles.datesCardMeta}>
          {seats} seat{seats > 1 ? "s" : ""} · {spell.location} · hosted by {spell.host.name}
        </Text>
      </View>

      <View style={styles.priceTable}>
        <View style={styles.priceLine}>
          <Text style={styles.priceLabel}>
            {formatINR(breakdown.pricePerSeat)} × {seats} seat{seats > 1 ? "s" : ""}
          </Text>
          <Text style={styles.priceValue}>{formatINR(breakdown.subtotal)}</Text>
        </View>
        <View style={styles.priceLine}>
          <Text style={styles.priceLabel}>Platform fee</Text>
          <Text style={[styles.priceValue, styles.priceWaived]}>Waived ✦</Text>
        </View>
        <View style={styles.priceLine}>
          <Text style={styles.priceLabel}>Taxes & levies (5%)</Text>
          <Text style={styles.priceValue}>{formatINR(breakdown.taxes)}</Text>
        </View>
        <View style={[styles.priceLine, styles.priceTotalLine]}>
          <Text style={styles.priceTotalLabel}>Trip total</Text>
          <Text style={styles.priceTotalValue}>{formatINR(breakdown.total)}</Text>
        </View>
        <View style={[styles.priceLine, styles.advanceLine]}>
          <View>
            <Text style={styles.advanceLabel}>DUE TODAY — BOOKING ADVANCE</Text>
            <Text style={styles.advanceNote}>
              Balance of {formatINR(breakdown.balance)} before departure
            </Text>
          </View>
          <Text style={styles.advanceValue}>{formatINR(breakdown.advance)}</Text>
        </View>
      </View>

      <PressableScale onPress={() => goTo("pay")} haptic="medium" style={styles.primaryBtn} testID="summary-continue">
        <Text style={styles.primaryBtnText}>PAY {formatINR(breakdown.advance)}</Text>
      </PressableScale>
    </View>
  );

  const renderPay = () => (
    <View style={styles.stepBody}>
      <View style={styles.methodRow}>
        <PressableScale
          onPress={() => setMethod("upi")}
          scaleTo={0.96}
          style={[styles.methodCard, method === "upi" ? styles.methodActive : null]}
          testID="method-upi"
        >
          <Smartphone size={18} color={method === "upi" ? Colors.goldLight : "rgba(245,240,232,0.5)"} />
          <Text style={[styles.methodLabel, method === "upi" ? styles.methodLabelActive : null]}>UPI</Text>
        </PressableScale>
        <PressableScale
          onPress={() => setMethod("card")}
          scaleTo={0.96}
          style={[styles.methodCard, method === "card" ? styles.methodActive : null]}
          testID="method-card"
        >
          <CreditCard size={18} color={method === "card" ? Colors.goldLight : "rgba(245,240,232,0.5)"} />
          <Text style={[styles.methodLabel, method === "card" ? styles.methodLabelActive : null]}>Card</Text>
        </PressableScale>
      </View>

      {method === "upi" ? (
        <Field label="UPI ID" value={upiId} onChangeText={setUpiId} placeholder="name@bank" autoCapitalize="none" testID="pay-upi" />
      ) : (
        <>
          <Field
            label="Card number"
            value={cardNumber}
            onChangeText={setCardNumber}
            placeholder="4242 4242 4242 4242"
            keyboardType="number-pad"
            testID="pay-card"
          />
          <Field label="Expiry" value={cardExpiry} onChangeText={setCardExpiry} placeholder="MM / YY" keyboardType="number-pad" testID="pay-expiry" />
        </>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <PressableScale onPress={() => void pay()} haptic="medium" style={styles.primaryBtn} testID="pay-now">
        <View style={styles.payBtnRow}>
          <Lock size={14} color={Colors.charcoalDeep} />
          <Text style={styles.primaryBtnText}>PAY {formatINR(breakdown.advance)} SECURELY</Text>
        </View>
      </PressableScale>
      <Text style={styles.payNote}>
        Demo checkout — no money moves. Razorpay arrives with the backend phase.
      </Text>
    </View>
  );

  const renderProcessing = () => (
    <View style={[styles.stepBody, styles.centered, styles.processingBody]}>
      <ActivityIndicator size="large" color={Colors.goldLight} />
      <Text style={styles.processingLine}>{processingLine}</Text>
      <Text style={styles.processingSub}>Keep the app open — this takes a few seconds.</Text>
    </View>
  );

  const renderSuccess = () => (
    <View style={[styles.stepBody, styles.centered]}>
      <View style={styles.successRing}>
        <Check size={30} color={Colors.goldLight} />
      </View>
      <Text style={styles.doneTitle}>You're in the circle ✦</Text>
      <Text style={styles.doneSub}>
        {seats} seat{seats > 1 ? "s" : ""} on the {spell.name} · {dates.label}. Reference{" "}
        {bookingRef}. {formatINR(breakdown.advance)} received — the balance follows before
        departure.
      </Text>
      {signedIn ? (
        <PressableScale
          onPress={() => {
            onClose();
            router.push("/space/trips");
          }}
          style={styles.primaryBtn}
          testID="success-trips"
        >
          <Text style={styles.primaryBtnText}>VIEW IN MY TRIPS</Text>
        </PressableScale>
      ) : (
        <PressableScale
          onPress={() => {
            onClose();
            router.push("/auth");
          }}
          style={styles.primaryBtn}
          testID="success-signin"
        >
          <Text style={styles.primaryBtnText}>SIGN IN TO TRACK IT</Text>
        </PressableScale>
      )}
      <PressableScale onPress={onClose} style={styles.ghostBtn} testID="success-done">
        <Text style={styles.ghostBtnText}>DONE</Text>
      </PressableScale>
    </View>
  );

  const stepContent: Record<Step, () => React.ReactNode> = {
    choice: renderChoice,
    inquire: renderInquire,
    "inquire-done": renderInquireDone,
    seats: renderSeats,
    details: renderDetails,
    summary: renderSummary,
    pay: renderPay,
    processing: renderProcessing,
    success: renderSuccess,
  };

  return (
    <Modal visible={open} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: slide }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={step === "processing" ? undefined : onClose} />
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
            {headerBack ? (
              <PressableScale onPress={() => goTo(headerBack)} scaleTo={0.9} style={styles.headerBtn} testID="flow-back">
                <ArrowLeft size={16} color="rgba(245,240,232,0.6)" />
              </PressableScale>
            ) : (
              <View style={styles.headerBtn} />
            )}
            <Text style={styles.sheetTitle}>{STEP_TITLES[step]}</Text>
            {step !== "processing" ? (
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
  sheetTitle: {
    flex: 1,
    textAlign: "center",
    fontFamily: Fonts.serif,
    fontSize: 21,
    color: Colors.cream,
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
    fontSize: 15.5,
    lineHeight: 22,
    color: "rgba(245,240,232,0.6)",
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
  doorDisabled: {
    opacity: 0.55,
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
  signedOutHint: {
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
  advanceStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.3)",
    backgroundColor: "rgba(184,150,62,0.07)",
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  advanceStripText: {
    flex: 1,
    fontFamily: Fonts.sans,
    fontSize: 12.5,
    lineHeight: 18,
    color: "rgba(245,240,232,0.7)",
  },
  advanceStripStrong: {
    fontFamily: Fonts.sansSemi,
    color: Colors.goldLight,
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
  priceWaived: {
    color: Colors.goldLight,
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
    fontFamily: Fonts.sansSemi,
    fontSize: 15,
    color: Colors.cream,
  },
  advanceLine: {
    backgroundColor: "rgba(184,150,62,0.1)",
    borderTopWidth: 1,
    borderTopColor: "rgba(184,150,62,0.3)",
  },
  advanceLabel: {
    fontFamily: Fonts.sansSemi,
    fontSize: 9.5,
    letterSpacing: 1.6,
    color: Colors.goldLight,
  },
  advanceNote: {
    marginTop: 3,
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: "rgba(245,240,232,0.5)",
  },
  advanceValue: {
    fontFamily: Fonts.serif,
    fontSize: 24,
    color: Colors.goldHi,
  },
  methodRow: {
    flexDirection: "row",
    gap: 12,
  },
  methodCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.12)",
    borderRadius: 12,
    paddingVertical: 15,
  },
  methodActive: {
    borderColor: "rgba(184,150,62,0.55)",
    backgroundColor: "rgba(184,150,62,0.08)",
  },
  methodLabel: {
    fontFamily: Fonts.sansMedium,
    fontSize: 13.5,
    color: "rgba(245,240,232,0.6)",
  },
  methodLabelActive: {
    color: Colors.goldLight,
  },
  payBtnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  payNote: {
    textAlign: "center",
    fontFamily: Fonts.serifItalic,
    fontSize: 12.5,
    color: "rgba(245,240,232,0.4)",
  },
  processingBody: {
    paddingVertical: 40,
    gap: 18,
  },
  processingLine: {
    fontFamily: Fonts.serif,
    fontSize: 21,
    color: Colors.cream,
  },
  processingSub: {
    fontFamily: Fonts.sans,
    fontSize: 12.5,
    color: "rgba(245,240,232,0.45)",
  },
});

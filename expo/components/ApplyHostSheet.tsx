import { X } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
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
import Svg from "react-native-svg";

import { AnimatedPath } from "@/components/AnimatedSvgPath";
import { GoldButton, GhostButton, PressableScale } from "@/components/Buttons";
import GradientText from "@/components/GradientText";
import { Colors, Fonts } from "@/constants/theme";
import { CONTACT_EMAIL } from "@/data/site";
import { hapticSuccess } from "@/lib/haptics";
import { composeEmail } from "@/lib/mail";
import { useApp } from "@/providers/AppProvider";

/* ------------------------------- Form model ------------------------------- */

interface FormState {
  name: string;
  instagram: string;
  email: string;
  whatsapp: string;
}

type FormErrors = Partial<Record<keyof FormState, string>>;

const EMPTY_FORM: FormState = { name: "", instagram: "", email: "", whatsapp: "" };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const buildBody = (f: FormState): string =>
  [
    `Full name: ${f.name.trim()}`,
    `Instagram: ${f.instagram.trim() || "—"}`,
    `Email: ${f.email.trim()}`,
    `WhatsApp: ${f.whatsapp.trim() || "—"}`,
    "",
    "A little about me:",
    "",
  ].join("\n");

/* ----------------------------- Success sparkles ---------------------------- */

interface Spark {
  id: number;
  dx: number;
  dy: number;
  size: number;
  delay: number;
  dur: number;
  gold: boolean;
}

const SparkDot = React.memo(function SparkDot({ spark }: { spark: Spark }) {
  const p = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(p, {
      toValue: 1,
      duration: spark.dur,
      delay: spark.delay,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [p, spark]);

  return (
    <Animated.View
      style={{
        position: "absolute",
        width: spark.size,
        height: spark.size,
        borderRadius: spark.size / 2,
        backgroundColor: spark.gold ? "#CFA85A" : "#F0DFAE",
        opacity: p.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 0] }),
        transform: [
          { translateX: p.interpolate({ inputRange: [0, 1], outputRange: [0, spark.dx] }) },
          { translateY: p.interpolate({ inputRange: [0, 1], outputRange: [0, spark.dy] }) },
          { scale: p.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
        ],
      }}
    />
  );
});

function SuccessBurst() {
  const sparks = useMemo<Spark[]>(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2 + Math.random() * 0.5;
        const d = 46 + Math.random() * 60;
        return {
          id: i,
          dx: Math.cos(a) * d,
          dy: Math.sin(a) * d,
          size: 2.5 + Math.random() * 3.5,
          delay: 350 + Math.random() * 150,
          dur: 600 + Math.random() * 400,
          gold: Math.random() > 0.3,
        };
      }),
    [],
  );

  return (
    <View pointerEvents="none" style={styles.burstCenter}>
      {sparks.map((s) => (
        <SparkDot key={s.id} spark={s} />
      ))}
    </View>
  );
}

/* --------------------------------- Fields --------------------------------- */

interface FieldProps {
  label: string;
  placeholder: string;
  value: string;
  error?: string;
  keyboardType?: "default" | "email-address" | "phone-pad";
  autoCapitalize?: "none" | "words";
  onChange: (value: string) => void;
}

function Field({ label, placeholder, value, error, keyboardType = "default", autoCapitalize = "none", onChange }: FieldProps) {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="rgba(245,240,232,0.3)"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        style={[styles.input, error ? styles.inputError : null]}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

/* ---------------------------------- Modal ---------------------------------- */

const CIRCLE_LEN = 151;
const CHECK_LEN = 32;

type Phase = "form" | "sent";

/** The global "Apply to Host" modal — mirrors the web ApplyModal. */
export default function ApplyHostSheet() {
  const { applyOpen, closeApply } = useApp();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [phase, setPhase] = useState<Phase>("form");

  const backdrop = useRef(new Animated.Value(0)).current;
  const cardIn = useRef(new Animated.Value(0)).current;
  const circleDraw = useRef(new Animated.Value(0)).current;
  const checkDraw = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (applyOpen) {
      setPhase("form");
      setErrors({});
      backdrop.setValue(0);
      cardIn.setValue(0);
      circleDraw.setValue(0);
      checkDraw.setValue(0);
      Animated.parallel([
        Animated.timing(backdrop, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(cardIn, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.exp),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [applyOpen, backdrop, cardIn, circleDraw, checkDraw]);

  const setField = useCallback((id: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [id]: value }));
    setErrors((prev) => (prev[id] ? { ...prev, [id]: undefined } : prev));
  }, []);

  const handleSubmit = useCallback(() => {
    const errs: FormErrors = {};
    if (!form.name.trim()) errs.name = "Please tell us your name.";
    if (!form.email.trim()) errs.email = "We need your email to get back to you.";
    else if (!EMAIL_RE.test(form.email.trim())) errs.email = "That email doesn't look quite right.";
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) return;
    composeEmail(`Apply to Host — ${form.name.trim()}`, buildBody(form));
    setPhase("sent");
    hapticSuccess();
    Animated.sequence([
      Animated.timing(circleDraw, {
        toValue: 1,
        duration: 700,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(checkDraw, {
        toValue: 1,
        duration: 450,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
    ]).start();
  }, [form, circleDraw, checkDraw]);

  return (
    <Modal visible={applyOpen} transparent animationType="none" onRequestClose={closeApply}>
      <Animated.View style={[styles.backdrop, { opacity: backdrop }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeApply} />
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.wrapper}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[
            styles.card,
            {
              opacity: cardIn,
              transform: [
                { translateY: cardIn.interpolate({ inputRange: [0, 1], outputRange: [56, 0] }) },
                { scale: cardIn.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) },
              ],
            },
          ]}
        >
          <PressableScale onPress={closeApply} scaleTo={0.88} style={styles.close} testID="apply-close">
            <X size={19} color="rgba(245,240,232,0.5)" />
          </PressableScale>

          {phase === "form" ? (
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.eyebrowRow}>
                <View style={styles.eyebrowLine} />
                <Text style={styles.eyebrow}>APPLY TO HOST</Text>
              </View>
              <Text style={styles.title}>Host a Spell</Text>
              <Text style={styles.subtitle}>
                Tell us a little about yourself and we&apos;ll be in touch within 48 hours.
              </Text>

              <View style={styles.form}>
                <Field
                  label="FULL NAME"
                  placeholder="Your name"
                  value={form.name}
                  error={errors.name}
                  autoCapitalize="words"
                  onChange={(v) => setField("name", v)}
                />
                <Field
                  label="INSTAGRAM"
                  placeholder="@handle"
                  value={form.instagram}
                  onChange={(v) => setField("instagram", v)}
                />
                <Field
                  label="EMAIL ADDRESS"
                  placeholder="you@example.com"
                  value={form.email}
                  error={errors.email}
                  keyboardType="email-address"
                  onChange={(v) => setField("email", v)}
                />
                <Field
                  label="WHATSAPP NUMBER"
                  placeholder="+91 98765 43210"
                  value={form.whatsapp}
                  keyboardType="phone-pad"
                  onChange={(v) => setField("whatsapp", v)}
                />

                <GoldButton label="Send Application" onPress={handleSubmit} testID="apply-submit" />
                <Text style={styles.privacy}>We never share your details. No spam, ever.</Text>
              </View>
            </ScrollView>
          ) : (
            <View style={styles.sent}>
              <View>
                <SuccessBurst />
                <Svg width={76} height={76} viewBox="0 0 52 52">
                  <AnimatedPath
                    d="M26 2a24 24 0 1 1-.01 0"
                    stroke="#B8963E"
                    strokeWidth={1.4}
                    fill="none"
                    strokeDasharray={`${CIRCLE_LEN} ${CIRCLE_LEN}`}
                    strokeDashoffset={
                      circleDraw.interpolate({
                        inputRange: [0, 1],
                        outputRange: [CIRCLE_LEN, 0],
                      }) as unknown as number
                    }
                  />
                  <AnimatedPath
                    d="M15.5 27l7.5 7.5L37 19.5"
                    stroke="#CFA85A"
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    strokeDasharray={`${CHECK_LEN} ${CHECK_LEN}`}
                    strokeDashoffset={
                      checkDraw.interpolate({
                        inputRange: [0, 1],
                        outputRange: [CHECK_LEN, 0],
                      }) as unknown as number
                    }
                  />
                </Svg>
              </View>

              <View style={styles.sentTitleRow}>
                <Text style={styles.sentTitle}>Application </Text>
                <GradientText style={styles.sentTitle}>received</GradientText>
              </View>
              <Text style={styles.sentBody}>
                Your email app just opened with your details — hit send and we&apos;ll be in touch
                within 48 hours.
              </Text>
              <Text style={styles.sentFallback}>
                Nothing opened? Write to <Text style={styles.sentEmail}>{CONTACT_EMAIL}</Text>
              </Text>
              <GhostButton label="Done ✦" onPress={closeApply} style={styles.doneButton} />
            </View>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10,8,6,0.85)",
  },
  wrapper: {
    flex: 1,
    justifyContent: "flex-end",
  },
  card: {
    maxHeight: "92%",
    backgroundColor: Colors.charcoalSoft,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.08)",
    paddingHorizontal: 28,
    paddingTop: 30,
    paddingBottom: 40,
  },
  close: {
    position: "absolute",
    right: 14,
    top: 14,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  eyebrowLine: {
    width: 32,
    height: 1,
    backgroundColor: "rgba(184,150,62,0.7)",
  },
  eyebrow: {
    fontFamily: Fonts.sansSemi,
    fontSize: 11,
    letterSpacing: 3.5,
    color: Colors.gold,
  },
  title: {
    marginTop: 16,
    fontFamily: Fonts.serifItalic,
    fontSize: 38,
    color: Colors.cream,
  },
  subtitle: {
    marginTop: 10,
    fontFamily: Fonts.sans,
    fontSize: 15,
    lineHeight: 23,
    color: "rgba(245,240,232,0.55)",
    maxWidth: 340,
  },
  form: {
    marginTop: 30,
    gap: 22,
  },
  fieldLabel: {
    fontFamily: Fonts.sansSemi,
    fontSize: 10,
    letterSpacing: 2.8,
    color: Colors.gold,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.12)",
    backgroundColor: "rgba(10,8,6,0.5)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: Fonts.sans,
    fontSize: 15,
    color: Colors.cream,
  },
  inputError: {
    borderColor: "rgba(198,95,82,0.7)",
  },
  errorText: {
    marginTop: 8,
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: "#D98A7F",
  },
  privacy: {
    textAlign: "center",
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: "rgba(245,240,232,0.35)",
  },
  sent: {
    minHeight: 420,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  burstCenter: {
    position: "absolute",
    left: "50%",
    top: "50%",
  },
  sentTitleRow: {
    flexDirection: "row",
    marginTop: 32,
  },
  sentTitle: {
    fontFamily: Fonts.serifItalic,
    fontSize: 34,
    color: Colors.cream,
  },
  sentBody: {
    marginTop: 16,
    maxWidth: 320,
    textAlign: "center",
    fontFamily: Fonts.sans,
    fontSize: 15,
    lineHeight: 23,
    color: "rgba(245,240,232,0.55)",
  },
  sentFallback: {
    marginTop: 12,
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: "rgba(245,240,232,0.4)",
  },
  sentEmail: {
    color: Colors.gold,
  },
  doneButton: {
    marginTop: 34,
    paddingHorizontal: 40,
  },
});

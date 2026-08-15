import { useRouter } from "expo-router";
import { KeyRound, Mail, UserRound } from "lucide-react-native";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GoldButton, PressableScale } from "@/components/Buttons";
import GradientText from "@/components/GradientText";
import StackHeader from "@/components/StackHeader";
import { ErrorBanner } from "@/components/States";
import SuccessBurst from "@/components/SuccessBurst";
import { Colors, Fonts } from "@/constants/theme";
import { accountService } from "@/data/account/service";
import { AccountError } from "@/data/account/models";
import { hapticSuccess } from "@/lib/haptics";
import { useAccount } from "@/providers/AccountProvider";

type Mode = "signin" | "join" | "forgot";
type Phase = "form" | "sent";

const MODE_COPY: Record<Mode, { title: string; italic: string; sub: string; cta: string }> = {
  signin: {
    title: "Welcome",
    italic: "back.",
    sub: "Your trips, memories and journey are waiting where you left them.",
    cta: "SIGN IN",
  },
  join: {
    title: "Join the",
    italic: "circle.",
    sub: "One account for every spell — bookings, wallet, badges and the road ahead.",
    cta: "CREATE ACCOUNT",
  },
  forgot: {
    title: "Find your",
    italic: "way back.",
    sub: "We'll email you a reset link — it opens our website, where you choose a fresh password.",
    cta: "SEND RESET LINK",
  },
};

function AuthField({
  icon,
  value,
  onChangeText,
  placeholder,
  secure = false,
  keyboardType,
  autoCapitalize = "none",
  testID,
}: {
  icon: React.ReactNode;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  secure?: boolean;
  keyboardType?: "default" | "email-address";
  autoCapitalize?: "none" | "words";
  testID?: string;
}) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldIcon}>{icon}</View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(245,240,232,0.28)"
        secureTextEntry={secure}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        style={styles.fieldInput}
        testID={testID}
      />
    </View>
  );
}

/**
 * The traveller doorway — sign in, join, or recover access. LIVE (M6b):
 * real Supabase auth, the same account the website opens. Recovery rides
 * the emailed link to the website's proven reset page (decision U, adapted —
 * the emailed 6-digit code arrives once custom SMTP is configured).
 */
export default function AuthScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn, signUp } = useAccount();

  const [mode, setMode] = useState<Mode>("signin");
  const [phase, setPhase] = useState<Phase>("form");
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  const copy = MODE_COPY[mode];

  const finish = (): void => {
    hapticSuccess();
    if (router.canGoBack()) router.back();
    else router.replace("/space");
  };

  const fail = (err: unknown): void => {
    setError(err instanceof AccountError ? err.message : "Something drifted — try again.");
  };

  const run = async (op: () => Promise<void>): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      await op();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const submitForm = (): void => {
    if (mode === "signin") {
      void run(async () => {
        await signIn(email.trim(), password);
        finish();
      });
    } else if (mode === "join") {
      void run(async () => {
        await signUp({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          password,
        });
        finish();
      });
    } else {
      void run(async () => {
        await accountService.requestPasswordReset(email.trim());
        setPhase("sent");
      });
    }
  };

  const switchMode = (next: Mode): void => {
    setMode(next);
    setPhase("form");
    setError(null);
  };

  return (
    <View style={styles.flex}>
      <StackHeader title="My Logout Space" fallback="/space" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        >
          <Text style={styles.symbol}>✦</Text>

          {phase === "form" ? (
            <>
              <View style={styles.titleRow}>
                <Text style={styles.title}>{copy.title} </Text>
                <GradientText style={styles.titleItalic}>{copy.italic}</GradientText>
              </View>
              <Text style={styles.sub}>{copy.sub}</Text>

              <View style={styles.form}>
                {mode === "join" ? (
                  <>
                    <AuthField
                      icon={<UserRound size={16} color="rgba(184,150,62,0.7)" />}
                      value={firstName}
                      onChangeText={setFirstName}
                      placeholder="First name"
                      autoCapitalize="words"
                      testID="auth-first"
                    />
                    <AuthField
                      icon={<UserRound size={16} color="rgba(184,150,62,0.7)" />}
                      value={lastName}
                      onChangeText={setLastName}
                      placeholder="Last name"
                      autoCapitalize="words"
                      testID="auth-last"
                    />
                  </>
                ) : null}
                <AuthField
                  icon={<Mail size={16} color="rgba(184,150,62,0.7)" />}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@somewhere.com"
                  keyboardType="email-address"
                  testID="auth-email"
                />
                {mode !== "forgot" ? (
                  <AuthField
                    icon={<KeyRound size={16} color="rgba(184,150,62,0.7)" />}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Password (8+ characters)"
                    secure
                    testID="auth-password"
                  />
                ) : null}
              </View>

              {error ? <ErrorBanner message={error} style={styles.error} /> : null}

              <GoldButton
                label={copy.cta}
                onPress={submitForm}
                busy={busy}
                style={styles.primary}
                testID="auth-submit"
              />

              {mode === "signin" ? (
                <PressableScale onPress={() => switchMode("forgot")} scaleTo={0.97} testID="auth-forgot">
                  <Text style={styles.link}>Forgot your password?</Text>
                </PressableScale>
              ) : null}

              <View style={styles.switchRow}>
                {mode === "join" ? (
                  <PressableScale onPress={() => switchMode("signin")} scaleTo={0.97} testID="auth-to-signin">
                    <Text style={styles.switchText}>
                      Already in the circle? <Text style={styles.switchGold}>Sign in</Text>
                    </Text>
                  </PressableScale>
                ) : (
                  <PressableScale onPress={() => switchMode("join")} scaleTo={0.97} testID="auth-to-join">
                    <Text style={styles.switchText}>
                      New here? <Text style={styles.switchGold}>Join the circle</Text>
                    </Text>
                  </PressableScale>
                )}
              </View>
            </>
          ) : null}

          {phase === "sent" ? (
            <>
              <SuccessBurst size={72} />
              <View style={styles.titleRow}>
                <Text style={styles.title}>Check your </Text>
                <GradientText style={styles.titleItalic}>email.</GradientText>
              </View>
              <Text style={styles.sub}>
                We sent a reset link to {email.trim() || "your inbox"}. It opens our website,
                where you choose a fresh password — then come back here and sign in with it.
              </Text>
              <GoldButton
                label="I've reset it — Sign In"
                onPress={() => switchMode("signin")}
                style={styles.primary}
                testID="auth-back-to-signin"
              />
              <PressableScale onPress={() => setPhase("form")} scaleTo={0.97}>
                <Text style={styles.link}>Use a different email</Text>
              </PressableScale>
            </>
          ) : null}

          <Text style={styles.footNote}>
            One account for the app and the website — the same door, the same circle.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 26,
    paddingTop: 30,
    alignItems: "center",
  },
  symbol: {
    fontFamily: Fonts.serif,
    fontSize: 38,
    color: "rgba(184,150,62,0.65)",
  },
  titleRow: {
    marginTop: 18,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  title: {
    fontFamily: Fonts.serif,
    fontSize: 38,
    lineHeight: 44,
    color: Colors.cream,
  },
  titleItalic: {
    fontFamily: Fonts.serifItalic,
    fontSize: 38,
    lineHeight: 44,
  },
  sub: {
    marginTop: 14,
    maxWidth: 320,
    textAlign: "center",
    fontFamily: Fonts.sans,
    fontSize: 13.5,
    lineHeight: 20,
    color: "rgba(245,240,232,0.55)",
  },
  form: {
    alignSelf: "stretch",
    marginTop: 30,
    gap: 12,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.08)",
    backgroundColor: "rgba(10,8,6,0.5)",
    borderRadius: 10,
  },
  fieldIcon: {
    paddingLeft: 16,
    paddingRight: 10,
  },
  fieldInput: {
    flex: 1,
    paddingVertical: 15,
    paddingRight: 16,
    fontFamily: Fonts.sans,
    fontSize: 14.5,
    color: Colors.cream,
  },
  error: {
    marginTop: 14,
    alignSelf: "stretch",
  },
  primary: {
    alignSelf: "stretch",
    marginTop: 20,
  },
  link: {
    marginTop: 18,
    fontFamily: Fonts.sansMedium,
    fontSize: 13,
    color: Colors.goldLight,
    textAlign: "center",
  },
  switchRow: {
    marginTop: 26,
    borderTopWidth: 1,
    borderTopColor: "rgba(245,240,232,0.07)",
    paddingTop: 20,
    alignSelf: "stretch",
    alignItems: "center",
  },
  switchText: {
    fontFamily: Fonts.sans,
    fontSize: 13.5,
    color: "rgba(245,240,232,0.55)",
  },
  switchGold: {
    fontFamily: Fonts.sansMedium,
    color: Colors.goldLight,
  },

  footNote: {
    marginTop: 34,
    textAlign: "center",
    fontFamily: Fonts.serifItalic,
    fontSize: 12.5,
    color: "rgba(245,240,232,0.35)",
  },
});

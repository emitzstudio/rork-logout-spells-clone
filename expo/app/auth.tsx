import { useRouter } from "expo-router";
import { KeyRound, Mail, ShieldCheck, UserRound } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PressableScale } from "@/components/Buttons";
import GradientText from "@/components/GradientText";
import StackHeader from "@/components/StackHeader";
import { Colors, Fonts } from "@/constants/theme";
import { accountService } from "@/data/account/service";
import { AccountError } from "@/data/account/models";
import { hapticSuccess } from "@/lib/haptics";
import { useAccount } from "@/providers/AccountProvider";

type Mode = "signin" | "join" | "forgot";
type Phase = "form" | "otp" | "reset";

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
    sub: "We'll send a one-time code to your email and set a fresh password.",
    cta: "SEND CODE",
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
 * The traveller doorway — sign in, join, or recover access. Mock auth today
 * (any 6-digit code verifies; 000000 fails), the Supabase phase swaps the
 * service internals only.
 */
export default function AuthScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn, signUp, openSession } = useAccount();

  const [mode, setMode] = useState<Mode>("signin");
  const [phase, setPhase] = useState<Phase>("form");
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [otp, setOtp] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");

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
        await signUp({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), password });
        await accountService.requestOtp(email.trim());
        setPhase("otp");
      });
    } else {
      void run(async () => {
        await accountService.requestOtp(email.trim());
        setPhase("otp");
      });
    }
  };

  const submitOtp = (): void => {
    void run(async () => {
      await accountService.verifyOtp(otp.trim());
      if (mode === "forgot") {
        setPhase("reset");
      } else {
        await openSession();
        finish();
      }
    });
  };

  const submitReset = (): void => {
    void run(async () => {
      await accountService.resetPassword(newPassword);
      await openSession();
      finish();
    });
  };

  const switchMode = (next: Mode): void => {
    setMode(next);
    setPhase("form");
    setError(null);
    setOtp("");
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

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <PressableScale onPress={submitForm} haptic="medium" style={styles.primary} testID="auth-submit">
                {busy ? (
                  <ActivityIndicator color={Colors.charcoalDeep} />
                ) : (
                  <Text style={styles.primaryText}>{copy.cta}</Text>
                )}
              </PressableScale>

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

          {phase === "otp" ? (
            <>
              <View style={styles.otpBadge}>
                <ShieldCheck size={22} color={Colors.goldLight} />
              </View>
              <View style={styles.titleRow}>
                <Text style={styles.title}>Check your </Text>
                <GradientText style={styles.titleItalic}>email.</GradientText>
              </View>
              <Text style={styles.sub}>
                We sent a 6-digit code to {email.trim() || "your inbox"}. Enter it below — any code
                works in this demo, except 000000.
              </Text>
              <TextInput
                value={otp}
                onChangeText={(v) => setOtp(v.replace(/[^0-9]/g, "").slice(0, 6))}
                placeholder="••••••"
                placeholderTextColor="rgba(245,240,232,0.25)"
                keyboardType="number-pad"
                style={styles.otpInput}
                testID="auth-otp"
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <PressableScale onPress={submitOtp} haptic="medium" style={styles.primary} testID="auth-verify">
                {busy ? (
                  <ActivityIndicator color={Colors.charcoalDeep} />
                ) : (
                  <Text style={styles.primaryText}>VERIFY CODE</Text>
                )}
              </PressableScale>
              <PressableScale onPress={() => setPhase("form")} scaleTo={0.97}>
                <Text style={styles.link}>Use a different email</Text>
              </PressableScale>
            </>
          ) : null}

          {phase === "reset" ? (
            <>
              <View style={styles.titleRow}>
                <Text style={styles.title}>A fresh </Text>
                <GradientText style={styles.titleItalic}>key.</GradientText>
              </View>
              <Text style={styles.sub}>Choose a new password — 8 characters or more.</Text>
              <View style={styles.form}>
                <AuthField
                  icon={<KeyRound size={16} color="rgba(184,150,62,0.7)" />}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="New password"
                  secure
                  testID="auth-new-password"
                />
              </View>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <PressableScale onPress={submitReset} haptic="medium" style={styles.primary} testID="auth-reset">
                {busy ? (
                  <ActivityIndicator color={Colors.charcoalDeep} />
                ) : (
                  <Text style={styles.primaryText}>SET PASSWORD & SIGN IN</Text>
                )}
              </PressableScale>
            </>
          ) : null}

          <Text style={styles.demoNote}>
            Demo account — everything you see is seeded and stored on this device only.
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
    borderColor: "rgba(245,240,232,0.12)",
    backgroundColor: "rgba(245,240,232,0.03)",
    borderRadius: 14,
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
    fontFamily: Fonts.sansMedium,
    fontSize: 12.5,
    color: Colors.error,
    textAlign: "center",
  },
  primary: {
    alignSelf: "stretch",
    marginTop: 20,
    backgroundColor: Colors.gold,
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: "center",
    shadowColor: Colors.gold,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  primaryText: {
    fontFamily: Fonts.sansSemi,
    fontSize: 12.5,
    letterSpacing: 2,
    color: Colors.charcoalDeep,
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
  otpBadge: {
    marginTop: 8,
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.4)",
    backgroundColor: "rgba(184,150,62,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  otpInput: {
    alignSelf: "stretch",
    marginTop: 28,
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.35)",
    backgroundColor: "rgba(245,240,232,0.03)",
    borderRadius: 14,
    paddingVertical: 18,
    textAlign: "center",
    fontFamily: Fonts.serif,
    fontSize: 30,
    letterSpacing: 14,
    color: Colors.goldHi,
  },
  demoNote: {
    marginTop: 34,
    textAlign: "center",
    fontFamily: Fonts.serifItalic,
    fontSize: 12.5,
    color: "rgba(245,240,232,0.35)",
  },
});

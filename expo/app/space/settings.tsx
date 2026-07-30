import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { PressableScale } from "@/components/Buttons";
import SpaceShell from "@/components/SpaceShell";
import { Colors, Fonts } from "@/constants/theme";
import type { TravellerPrefs } from "@/data/account/models";
import { hapticSuccess } from "@/lib/haptics";
import { composeEmail } from "@/lib/mail";
import { useAccount } from "@/providers/AccountProvider";

const PREF_ROWS: { key: keyof TravellerPrefs; label: string; sub: string }[] = [
  { key: "notifyTrips", label: "Trip updates", sub: "Host confirmations, documents, countdowns" },
  { key: "notifyOffers", label: "New spells & offers", sub: "Early-bird windows and fresh circles" },
  { key: "notifyReminders", label: "Gentle reminders", sub: "Packing lists and balance due notes" },
  { key: "channelEmail", label: "Email", sub: "The long-form channel" },
  { key: "channelWhatsapp", label: "WhatsApp", sub: "Quick notes from your host" },
  { key: "profileVisible", label: "Visible to your circles", sub: "Travellers from your trips can find you" },
  { key: "showMemories", label: "Share memories with the circle", sub: "Your albums appear in circle recaps" },
];

function EditField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label.toUpperCase()}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(245,240,232,0.25)"
        multiline={multiline}
        style={[styles.fieldInput, multiline ? styles.fieldMultiline : null]}
      />
    </View>
  );
}

/** Settings — profile, preferences, support and the quiet exit. */
export default function SettingsScreen() {
  const { data, updateProfile, updatePrefs, deleteAccount } = useAccount();

  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [instagram, setInstagram] = useState<string>("");
  const [bio, setBio] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);

  useEffect(() => {
    if (!data) return;
    setFirstName(data.profile.firstName);
    setLastName(data.profile.lastName);
    setCity(data.profile.city);
    setPhone(data.profile.phone);
    setInstagram(data.profile.instagram);
    setBio(data.profile.bio);
  }, [data]);

  const save = async (): Promise<void> => {
    setSaving(true);
    setSaved(false);
    try {
      await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        city: city.trim(),
        phone: phone.trim(),
        instagram: instagram.trim(),
        bio: bio.trim(),
      });
      hapticSuccess();
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } catch {
      Alert.alert("Couldn't save", "Try once more in a moment.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (): void => {
    Alert.alert(
      "Delete your account?",
      "Trips, memories, wallet and journey — everything goes. This can't be undone.",
      [
        { text: "Keep my space", style: "cancel" },
        {
          text: "Delete everything",
          style: "destructive",
          onPress: () => void deleteAccount(),
        },
      ],
    );
  };

  return (
    <SpaceShell title="Settings">
      {data ? (
        <>
          {/* Profile */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profile</Text>
            <Text style={styles.sectionSub}>How the circle knows you.</Text>
            <View style={styles.fields}>
              <View style={styles.fieldRow}>
                <View style={styles.fieldHalf}>
                  <EditField label="First name" value={firstName} onChangeText={setFirstName} placeholder="First name" />
                </View>
                <View style={styles.fieldHalf}>
                  <EditField label="Last name" value={lastName} onChangeText={setLastName} placeholder="Last name" />
                </View>
              </View>
              <EditField label="City" value={city} onChangeText={setCity} placeholder="Where you live" />
              <EditField label="Phone" value={phone} onChangeText={setPhone} placeholder="+91 …" />
              <EditField label="Instagram" value={instagram} onChangeText={setInstagram} placeholder="@you" />
              <EditField label="Bio" value={bio} onChangeText={setBio} placeholder="A line about you" multiline />
            </View>
            <PressableScale onPress={() => void save()} haptic="medium" style={styles.saveBtn} testID="settings-save">
              {saving ? (
                <ActivityIndicator color={Colors.charcoalDeep} />
              ) : (
                <Text style={styles.saveBtnText}>{saved ? "SAVED ✦" : "SAVE PROFILE"}</Text>
              )}
            </PressableScale>
          </View>

          {/* Emergency contact */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Emergency contact</Text>
            <View style={styles.emergencyCard}>
              <Text style={styles.emergencyName}>
                {data.profile.emergency.name} · {data.profile.emergency.relation}
              </Text>
              <Text style={styles.emergencyPhone}>{data.profile.emergency.phone}</Text>
              <Text style={styles.emergencyNote}>
                Your host carries this on every trip. Update it over support if it changes.
              </Text>
            </View>
          </View>

          {/* Preferences */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferences</Text>
            <Text style={styles.sectionSub}>What reaches you, and where.</Text>
            <View style={styles.prefs}>
              {PREF_ROWS.map((row) => (
                <View key={row.key} style={styles.prefRow}>
                  <View style={styles.prefText}>
                    <Text style={styles.prefLabel}>{row.label}</Text>
                    <Text style={styles.prefSub}>{row.sub}</Text>
                  </View>
                  <Switch
                    value={data.prefs[row.key]}
                    onValueChange={(value) => void updatePrefs({ [row.key]: value })}
                    trackColor={{ false: "rgba(245,240,232,0.12)", true: "rgba(184,150,62,0.6)" }}
                    thumbColor={data.prefs[row.key] ? Colors.goldHi : "rgba(245,240,232,0.6)"}
                    testID={`pref-${row.key}`}
                  />
                </View>
              ))}
            </View>
          </View>

          {/* Support */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Support</Text>
            <PressableScale
              onPress={() => void composeEmail("Help with my Logout Space")}
              scaleTo={0.98}
              style={styles.supportRow}
              testID="settings-support"
            >
              <Text style={styles.supportLabel}>Write to the team</Text>
              <Text style={styles.supportSub}>
                A real person replies — usually the same day.
              </Text>
            </PressableScale>
          </View>

          {/* Danger zone */}
          <View style={styles.section}>
            <PressableScale onPress={confirmDelete} scaleTo={0.98} style={styles.deleteBtn} testID="settings-delete">
              <Text style={styles.deleteText}>Delete my account</Text>
            </PressableScale>
            <Text style={styles.deleteNote}>
              Everything is erased from this device. There's no undo.
            </Text>
          </View>
        </>
      ) : null}
    </SpaceShell>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 26,
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
  fields: {
    marginTop: 16,
    gap: 13,
  },
  fieldRow: {
    flexDirection: "row",
    gap: 12,
  },
  fieldHalf: {
    flex: 1,
  },
  field: {
    gap: 7,
  },
  fieldLabel: {
    fontFamily: Fonts.sansSemi,
    fontSize: 9,
    letterSpacing: 1.8,
    color: "rgba(245,240,232,0.45)",
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.12)",
    backgroundColor: "rgba(245,240,232,0.03)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Colors.cream,
  },
  fieldMultiline: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  saveBtn: {
    marginTop: 18,
    backgroundColor: Colors.gold,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
  },
  saveBtnText: {
    fontFamily: Fonts.sansSemi,
    fontSize: 12,
    letterSpacing: 1.8,
    color: Colors.charcoalDeep,
  },
  emergencyCard: {
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.08)",
    backgroundColor: "rgba(245,240,232,0.03)",
    padding: 16,
    gap: 4,
  },
  emergencyName: {
    fontFamily: Fonts.sansMedium,
    fontSize: 14.5,
    color: Colors.cream,
  },
  emergencyPhone: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: Colors.goldLight,
  },
  emergencyNote: {
    marginTop: 6,
    fontFamily: Fonts.sans,
    fontSize: 11.5,
    lineHeight: 16,
    color: "rgba(245,240,232,0.45)",
  },
  prefs: {
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(245,240,232,0.08)",
    overflow: "hidden",
  },
  prefRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(245,240,232,0.05)",
  },
  prefText: {
    flex: 1,
    gap: 2,
  },
  prefLabel: {
    fontFamily: Fonts.sansMedium,
    fontSize: 14,
    color: Colors.cream,
  },
  prefSub: {
    fontFamily: Fonts.sans,
    fontSize: 11.5,
    color: "rgba(245,240,232,0.45)",
  },
  supportRow: {
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(184,150,62,0.35)",
    backgroundColor: "rgba(184,150,62,0.06)",
    padding: 16,
    gap: 3,
  },
  supportLabel: {
    fontFamily: Fonts.serif,
    fontSize: 18,
    color: Colors.cream,
  },
  supportSub: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: "rgba(245,240,232,0.55)",
  },
  deleteBtn: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(201,111,90,0.4)",
    paddingVertical: 15,
    alignItems: "center",
  },
  deleteText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 13.5,
    color: "rgba(201,111,90,0.95)",
  },
  deleteNote: {
    marginTop: 10,
    textAlign: "center",
    fontFamily: Fonts.serifItalic,
    fontSize: 12,
    color: "rgba(245,240,232,0.35)",
  },
});

import { Alert, Linking, Platform } from "react-native";

import { EMAIL } from "@/constants/theme";

/** Opens the device mail composer addressed to the Logout Spells inbox. */
export async function composeEmail(subject: string, body?: string): Promise<void> {
  const params = [`subject=${encodeURIComponent(subject)}`];
  if (body) params.push(`body=${encodeURIComponent(body)}`);
  const url = `mailto:${EMAIL}?${params.join("&")}`;
  try {
    await Linking.openURL(url);
  } catch (error) {
    console.log("[mail] could not open composer", error);
    if (Platform.OS !== "web") {
      Alert.alert("Reach us directly", `Write to ${EMAIL} — we read everything.`);
    }
  }
}

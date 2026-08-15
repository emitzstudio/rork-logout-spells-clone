import React, { useState } from "react";
import {
  KeyboardTypeOptions,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from "react-native";

import { Colors, Fonts, Radius } from "@/constants/theme";

interface FieldProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  autoComplete?: "email" | "password" | "name" | "tel" | "off" | "new-password";
  multiline?: boolean;
  numberOfLines?: number;
  error?: string;
  hint?: string;
  editable?: boolean;
  maxLength?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Website field recipe: gold micro-label, dark input on hairline border,
 * gold border + soft glow on focus, coral treatment on error.
 */
export default function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType,
  autoCapitalize = "sentences",
  autoComplete,
  multiline = false,
  numberOfLines,
  error,
  hint,
  editable = true,
  maxLength,
  style,
  testID,
}: FieldProps) {
  const [focused, setFocused] = useState<boolean>(false);

  return (
    <View style={style}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.box,
          multiline ? styles.boxMultiline : null,
          focused ? styles.boxFocused : null,
          error ? styles.boxError : null,
          !editable ? styles.boxDisabled : null,
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="rgba(245,240,232,0.35)"
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          multiline={multiline}
          numberOfLines={numberOfLines}
          editable={editable}
          maxLength={maxLength}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.input, multiline ? styles.inputMultiline : null]}
          selectionColor="rgba(184,150,62,0.6)"
          testID={testID}
        />
      </View>
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: Fonts.sansSemi,
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: "uppercase",
    color: Colors.goldLight,
    marginBottom: 8,
  },
  box: {
    backgroundColor: "rgba(10,8,6,0.5)",
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: Radius.sm,
  },
  boxMultiline: {
    minHeight: 110,
  },
  boxFocused: {
    borderColor: Colors.focus,
    shadowColor: Colors.gold,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  boxError: {
    borderColor: Colors.coralBorder,
  },
  boxDisabled: {
    opacity: 0.55,
  },
  input: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    color: Colors.cream,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inputMultiline: {
    minHeight: 110,
    textAlignVertical: "top",
  },
  error: {
    marginTop: 7,
    fontFamily: Fonts.sansMedium,
    fontSize: 12,
    color: Colors.coralText,
  },
  hint: {
    marginTop: 7,
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: "rgba(245,240,232,0.45)",
  },
});

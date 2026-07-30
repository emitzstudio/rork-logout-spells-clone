import React from "react";
import { StyleSheet, Text } from "react-native";

import { PressableScale } from "@/components/Buttons";
import { Colors, Fonts } from "@/constants/theme";
import { hapticSelection } from "@/lib/haptics";

interface Props {
  label: string;
  active: boolean;
  onPress: () => void;
}

/** Filter chip — active state is solid gold with dark text. */
export default function FilterChip({ label, active, onPress }: Props) {
  return (
    <PressableScale
      onPress={() => {
        hapticSelection();
        onPress();
      }}
      haptic="none"
      scaleTo={0.93}
      style={[styles.chip, active ? styles.active : null]}
    >
      <Text style={[styles.label, active ? styles.activeLabel : null]}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  active: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  label: {
    fontFamily: Fonts.sansMedium,
    fontSize: 13,
    color: Colors.creamMuted,
  },
  activeLabel: {
    color: Colors.charcoalDeep,
    fontFamily: Fonts.sansSemi,
  },
});

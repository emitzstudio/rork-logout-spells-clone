import React, { useRef } from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

interface Props {
  size?: number;
  opacity?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

/** Soft radial gold glow used behind heroes and section headers. */
export default function GoldGlow({
  size = 320,
  opacity = 0.14,
  color = "#B8963E",
  style,
}: Props) {
  const idRef = useRef<string>(`glow${Math.round(Math.random() * 1e9)}`);
  const id = idRef.current;

  return (
    <View
      pointerEvents="none"
      style={[{ position: "absolute", width: size, height: size }, style]}
    >
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={color} stopOpacity={opacity} />
            <Stop offset="60%" stopColor={color} stopOpacity={opacity * 0.45} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

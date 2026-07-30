import React, { useEffect, useRef, useState } from "react";
import { StyleProp, Text, TextStyle, View, ViewStyle } from "react-native";

import { useInView } from "@/components/RevealScroll";

interface Props {
  to: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  format?: (value: number) => string;
}

/** Number that counts up with an expo-out ease once scrolled into view. */
export default function CountUp({
  to,
  duration = 1500,
  prefix = "",
  suffix = "",
  style,
  containerStyle,
  format,
}: Props) {
  const { ref, onLayout, inView } = useInView();
  const [value, setValue] = useState<number>(0);
  const startedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!inView || startedRef.current) return;
    startedRef.current = true;
    const startTime = Date.now();
    let raf = 0;
    const tick = () => {
      const t = Math.min(1, (Date.now() - startTime) / duration);
      const eased = t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setValue(Math.round(to * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);

  return (
    <View ref={ref} onLayout={onLayout} style={containerStyle}>
      <Text style={style}>
        {prefix}
        {format ? format(value) : String(value)}
        {suffix}
      </Text>
    </View>
  );
}

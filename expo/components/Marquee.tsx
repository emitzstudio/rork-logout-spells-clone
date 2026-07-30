import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleProp, StyleSheet, View, ViewStyle } from "react-native";

interface Props {
  children: React.ReactNode;
  /** Pixels per second. */
  speed?: number;
  style?: StyleProp<ViewStyle>;
}

/** Infinitely scrolling horizontal strip. Children are duplicated for a seamless loop. */
export default function Marquee({ children, speed = 46, style }: Props) {
  const [contentWidth, setContentWidth] = useState<number>(0);
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (contentWidth <= 0) return;
    translateX.setValue(0);
    const animation = Animated.loop(
      Animated.timing(translateX, {
        toValue: -contentWidth,
        duration: (contentWidth / speed) * 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [contentWidth, speed, translateX]);

  return (
    <View style={[styles.clip, style]}>
      <Animated.View style={[styles.row, { transform: [{ translateX }] }]}>
        <View
          style={styles.row}
          onLayout={(e) => setContentWidth(e.nativeEvent.layout.width)}
        >
          {children}
        </View>
        <View style={styles.row}>{children}</View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: "hidden",
    width: "100%",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
});

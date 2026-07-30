import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Easing,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleProp,
  View,
  ViewStyle,
  useWindowDimensions,
} from "react-native";

interface RevealContextValue {
  scrollY: Animated.Value;
  getOffset: () => number;
}

const RevealContext = createContext<RevealContextValue | null>(null);

interface RevealScrollViewProps {
  children: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollRef?: React.Ref<ScrollView>;
  style?: StyleProp<ViewStyle>;
}

/** ScrollView that powers scroll-into-view reveals for its descendants. */
export function RevealScrollView({
  children,
  contentContainerStyle,
  scrollRef,
  style,
}: RevealScrollViewProps) {
  const scrollY = useRef(new Animated.Value(0)).current;
  const offsetRef = useRef<number>(0);

  const onScroll = useMemo(
    () =>
      Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        {
          useNativeDriver: false,
          listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
            offsetRef.current = event.nativeEvent.contentOffset.y;
          },
        },
      ),
    [scrollY],
  );

  const value = useMemo<RevealContextValue>(
    () => ({ scrollY, getOffset: () => offsetRef.current }),
    [scrollY],
  );

  return (
    <RevealContext.Provider value={value}>
      <Animated.ScrollView
        ref={scrollRef as never}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={contentContainerStyle}
        style={style}
      >
        {children}
      </Animated.ScrollView>
    </RevealContext.Provider>
  );
}

interface InViewResult {
  ref: React.RefObject<View | null>;
  onLayout: () => void;
  inView: boolean;
}

/** Tracks when the attached view scrolls into the visible window. */
export function useInView(threshold = 0.92): InViewResult {
  const ctx = useContext(RevealContext);
  const { height: windowHeight } = useWindowDimensions();
  const [inView, setInView] = useState<boolean>(!ctx);
  const ref = useRef<View | null>(null);
  const triggerYRef = useRef<number | null>(null);
  const measuredRef = useRef<boolean>(false);

  const onLayout = useCallback(() => {
    if (!ctx || inView || measuredRef.current) return;
    measuredRef.current = true;
    requestAnimationFrame(() => {
      const node = ref.current;
      if (!node) {
        setInView(true);
        return;
      }
      node.measureInWindow((_x, y) => {
        const contentY = y + ctx.getOffset();
        triggerYRef.current = contentY - windowHeight * threshold;
        if (ctx.getOffset() >= (triggerYRef.current ?? 0)) {
          setInView(true);
        }
      });
    });
    // Safety: never leave content invisible if measurement fails.
    setTimeout(() => {
      if (triggerYRef.current === null) setInView(true);
    }, 2600);
  }, [ctx, inView, threshold, windowHeight]);

  useEffect(() => {
    if (!ctx || inView) return;
    const id = ctx.scrollY.addListener(({ value }) => {
      if (triggerYRef.current !== null && value >= triggerYRef.current) {
        setInView(true);
      }
    });
    return () => ctx.scrollY.removeListener(id);
  }, [ctx, inView]);

  return { ref, onLayout, inView };
}

interface RevealProps {
  children: React.ReactNode;
  delay?: number;
  offsetY?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}

/** Fade + slide-up reveal that triggers as the content scrolls into view. */
export function Reveal({
  children,
  delay = 0,
  offsetY = 26,
  duration = 700,
  style,
}: RevealProps) {
  const { ref, onLayout, inView } = useInView();
  const progress = useRef(new Animated.Value(0)).current;
  const startedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!inView || startedRef.current) return;
    startedRef.current = true;
    Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();
  }, [inView, delay, duration, progress]);

  return (
    <Animated.View
      ref={ref}
      onLayout={onLayout}
      style={[
        style,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [offsetY, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

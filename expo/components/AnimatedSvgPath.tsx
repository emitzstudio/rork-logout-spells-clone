import React from "react";
import { Animated } from "react-native";
import { Path, PathProps } from "react-native-svg";

type WebSafePathProps = PathProps & { collapsable?: boolean };

/**
 * Animated.createAnimatedComponent injects `collapsable={false}` into the
 * wrapped component's props. On web, react-native-svg spreads unknown props
 * directly onto the DOM element, which makes React warn:
 * "Received `false` for a non-boolean attribute `collapsable`."
 * This wrapper strips the RN-only prop before it reaches the SVG element.
 * (Safe on native too: these paths animate via the JS driver, which
 * re-renders — `collapsable` is irrelevant for SVG nodes.)
 */
const WebSafePath = React.forwardRef<Path, WebSafePathProps>(
  function WebSafePath(props, ref) {
    const { collapsable, ...pathProps } = props;
    void collapsable;
    return <Path ref={ref} {...pathProps} />;
  },
);

/** SVG Path usable with RN Animated values, safe on web and native. */
export const AnimatedPath = Animated.createAnimatedComponent(WebSafePath);

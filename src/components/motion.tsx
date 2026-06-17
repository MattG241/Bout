import React, { useEffect, useRef, useState } from 'react';
import { ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeInDown, LinearTransition, Easing } from 'react-native-reanimated';
import { Text, TextProps } from './Text';
import { motion } from '@/design/tokens';

/**
 * Motion toolkit — deliberately restrained. Smooth timing curves, short durations, no bounce
 * or decoration. Just clean entrances, gliding list reorders, and a tasteful number count-up.
 */

/** Standard easing for the whole app: a calm ease-out, never springy. */
const EASE = Easing.out(Easing.cubic);

/** Fade + a small rise on mount. Use `delay` to stagger a sequence. */
export function Appear({
  children,
  delay = 0,
  duration = motion.base,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  style?: ViewStyle;
}) {
  return (
    <Animated.View entering={FadeInDown.duration(duration).delay(delay).easing(EASE)} style={style}>
      {children}
    </Animated.View>
  );
}

/** A simple fade-in (no movement) — for rows and cards that shouldn't shift. */
export function FadeView({
  children,
  delay = 0,
  duration = motion.base,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  style?: ViewStyle;
}) {
  return (
    <Animated.View entering={FadeIn.duration(duration).delay(delay)} style={style}>
      {children}
    </Animated.View>
  );
}

/** Re-export the layout transition used for live list reorders (e.g. the ladder). */
export const Reorder = LinearTransition.duration(motion.slow).easing(EASE);
export const AnimatedView = Animated.View;

/** Count a number up to its target with an ease-out curve. Pure JS rAF — smooth for one value. */
export function useCountUp(target: number, duration = 600): number {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);
  useEffect(() => {
    const from = fromRef.current;
    const start = Date.now();
    let raf = 0;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      const v = Math.round(from + (target - from) * eased);
      setValue(v);
      if (t < 1) raf = requestAnimationFrame(tick);
      else {
        setValue(target);
        fromRef.current = target;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

/** A number that animates up to its value. Tabular mono so the width doesn't jitter. */
export function AnimatedNumber({
  value,
  duration = 600,
  prefix = '',
  ...textProps
}: { value: number; duration?: number; prefix?: string } & Omit<TextProps, 'children'>) {
  const display = useCountUp(value, duration);
  return (
    <Text mono {...textProps}>
      {prefix}
      {display}
    </Text>
  );
}

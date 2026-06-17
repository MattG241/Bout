import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle, ActivityIndicator } from 'react-native';
import { Text } from './Text';
import { colors, radius, spacing } from '@/design/tokens';
import type { WeightClass } from '@core/config';

/** A thin hairline divider. */
export function Divider({ style }: { style?: ViewStyle }) {
  return <View style={[styles.divider, style]} />;
}

/** Vertical space. */
export function Spacer({ size = spacing.lg }: { size?: number }) {
  return <View style={{ height: size }} />;
}

/** Uppercase tracked-out eyebrow label. */
export function Eyebrow({ children, color }: { children: string; color?: string }) {
  return (
    <Text variant="label" color={color ?? colors.textTertiary}>
      {children.toUpperCase()}
    </Text>
  );
}

/** The single accent live-state indicator — a quietly pulsing dot. */
export function LiveDot({ size = 8 }: { size?: number }) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.3, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <Animated.View
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.accent, opacity: pulse }}
    />
  );
}

/** Weight-class badge — minimal, monochrome, just an outlined token. */
export function WeightClassBadge({ weightClass }: { weightClass: WeightClass }) {
  return (
    <View style={styles.badge}>
      <Text variant="label" color={colors.textSecondary}>
        {weightClass.toUpperCase()}
      </Text>
    </View>
  );
}

/** Centered loading state. */
export function Loading({ label }: { label?: string }) {
  return (
    <View style={styles.centered}>
      <ActivityIndicator color={colors.textSecondary} />
      {label ? (
        <Text variant="caption" color={colors.textTertiary} style={{ marginTop: spacing.md }}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}

/** Empty / error state — restrained, type-led. */
export function StateMessage({
  title,
  subtitle,
  tone = 'neutral',
}: {
  title: string;
  subtitle?: string;
  tone?: 'neutral' | 'error';
}) {
  return (
    <View style={styles.centered}>
      <Text variant="heading" center color={tone === 'error' ? colors.danger : colors.text}>
        {title}
      </Text>
      {subtitle ? (
        <Text variant="body" center color={colors.textSecondary} style={{ marginTop: spacing.sm }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  divider: { height: 1, backgroundColor: colors.border, width: '100%' },
  badge: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
});

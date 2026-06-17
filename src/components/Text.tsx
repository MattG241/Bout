import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { colors, type as typeScale } from '@/design/tokens';

type Variant = keyof typeof typeScale;

export interface TextProps extends RNTextProps {
  variant?: Variant;
  color?: string;
  /** Force monospace tabular figures regardless of variant. */
  mono?: boolean;
  center?: boolean;
}

/**
 * The single typography primitive. Everything flows through here so the type scale,
 * tabular figures, and color rules stay consistent across the app.
 */
export function Text({ variant = 'body', color, mono, center, style, ...rest }: TextProps) {
  const base = typeScale[variant];
  return (
    <RNText
      {...rest}
      style={[
        { color: color ?? colors.text },
        base,
        mono ? styles.mono : null,
        center ? styles.center : null,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  mono: { fontFamily: 'monospace', fontVariant: ['tabular-nums'] },
  center: { textAlign: 'center' },
});

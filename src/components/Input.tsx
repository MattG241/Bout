import React from 'react';
import { TextInput, View, StyleSheet, TextInputProps } from 'react-native';
import { Text } from './Text';
import { colors, radius, spacing, type as typeScale } from '@/design/tokens';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  mono?: boolean;
}

export function Input({ label, error, mono, style, ...rest }: InputProps) {
  return (
    <View style={styles.wrap}>
      {label ? (
        <Text variant="label" color={colors.textSecondary} style={styles.label}>
          {label.toUpperCase()}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={colors.textTertiary}
        selectionColor={colors.accent}
        style={[
          styles.input,
          { ...typeScale.body, color: colors.text },
          mono ? styles.mono : null,
          error ? styles.errorBorder : null,
          style,
        ]}
        {...rest}
      />
      {error ? (
        <Text variant="caption" color={colors.danger} style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  label: { marginLeft: spacing.xs },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    height: 54,
  },
  mono: { fontFamily: 'monospace', fontVariant: ['tabular-nums'], letterSpacing: 2 },
  errorBorder: { borderColor: colors.danger },
  error: { marginLeft: spacing.xs },
});

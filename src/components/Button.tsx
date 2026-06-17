import React from 'react';
import { Pressable, StyleSheet, ActivityIndicator, View, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Text } from './Text';
import { colors, radius, spacing } from '@/design/tokens';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  /** The single accent is reserved for the primary action — use primary sparingly. */
  full?: boolean;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
  full = true,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const handlePress = () => {
    if (isDisabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        full && styles.full,
        variantStyles[variant].container,
        pressed && !isDisabled ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled }}
    >
      <View style={styles.inner}>
        {loading ? (
          <ActivityIndicator color={variantStyles[variant].textColor} />
        ) : (
          <Text variant="bodyStrong" color={variantStyles[variant].textColor}>
            {label}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 54,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  full: { alignSelf: 'stretch' },
  inner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.35 },
});

const variantStyles: Record<ButtonVariant, { container: ViewStyle; textColor: string }> = {
  primary: { container: { backgroundColor: colors.accent }, textColor: colors.textInverse },
  secondary: {
    container: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.borderStrong },
    textColor: colors.text,
  },
  ghost: { container: { backgroundColor: 'transparent' }, textColor: colors.textSecondary },
  danger: { container: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.danger }, textColor: colors.danger },
};

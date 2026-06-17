import React from 'react';
import { Pressable, StyleSheet, ActivityIndicator, View, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Text } from './Text';
import { colors, radius, spacing, motion } from '@/design/tokens';
import { usePrefs } from '@/lib/prefs';
import { playCue, type Cue } from '@/lib/sound';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  full?: boolean;
  /** Sound cue on press (default 'tap'); pass 'none' to stay silent. */
  cue?: Cue | 'none';
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
  full = true,
  cue = 'tap',
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const press = (to: number) => {
    scale.value = withTiming(to, { duration: motion.fast, easing: Easing.out(Easing.quad) });
  };

  const handlePress = () => {
    if (isDisabled) return;
    if (usePrefs.getState().hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    if (cue !== 'none') playCue(cue);
    onPress();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={() => !isDisabled && press(0.97)}
      onPressOut={() => press(1)}
      disabled={isDisabled}
      style={[
        styles.base,
        full && styles.full,
        variantStyles[variant].container,
        isDisabled ? styles.disabled : null,
        animStyle,
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
    </AnimatedPressable>
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

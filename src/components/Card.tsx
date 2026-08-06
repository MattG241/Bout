import React from 'react';
import { View, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { colors, radius, spacing } from '@/design/tokens';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  /** A subtle raised surface vs the flat base. No drop shadows (design rule). */
  raised?: boolean;
  padded?: boolean;
}

export function Card({ children, style, onPress, raised = false, padded = true }: CardProps) {
  const cardStyle = [
    styles.card,
    { backgroundColor: raised ? colors.surfaceRaised : colors.surface },
    padded && styles.padded,
    style,
  ];
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [cardStyle, pressed && styles.pressed]}>
        {children}
      </Pressable>
    );
  }
  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  padded: { padding: spacing.lg },
  pressed: { opacity: 0.8 },
});

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from '@/components/Text';
import { Eyebrow, Spacer } from '@/components/atoms';
import type { RendererProps } from './types';
import type { LogicPayload } from '@core/puzzles/logic';
import { playCue } from '@/lib/sound';
import { colors, radius, spacing } from '@/design/tokens';

/** Tap items in order to build the ranking. Tapping a placed item removes it. */
export function LogicPlay({ payload, onSubmissionChange }: RendererProps<LogicPayload>) {
  const [order, setOrder] = useState<string[]>([]);

  useEffect(() => {
    onSubmissionChange({ order }, order.length === payload.items.length);
  }, [order, payload.items.length, onSubmissionChange]);

  const toggle = (item: string) => {
    playCue('tap');
    setOrder((o) => (o.includes(item) ? o.filter((x) => x !== item) : [...o, item]));
  };

  return (
    <View>
      <Eyebrow>DEDUCE</Eyebrow>
      <Spacer size={spacing.sm} />
      <Text variant="heading">{payload.prompt}</Text>
      <Spacer size={spacing.lg} />

      {payload.clues.map((c, i) => (
        <Text key={i} variant="body" color={colors.textSecondary} style={styles.clue}>
          {`${c.before} ranks before ${c.after}`}
        </Text>
      ))}
      <Spacer size={spacing.xl} />

      <Eyebrow>YOUR ORDER</Eyebrow>
      <Spacer size={spacing.sm} />
      <View style={styles.row}>
        {payload.items.map((item) => {
          const pos = order.indexOf(item);
          const placed = pos >= 0;
          return (
            <Pressable key={item} onPress={() => toggle(item)} style={[styles.chip, placed && styles.chipActive]}>
              {placed ? (
                <Text variant="caption" mono color={colors.accent}>
                  {pos + 1}
                </Text>
              ) : null}
              <Text variant="bodyStrong" color={placed ? colors.text : colors.textSecondary}>
                {item}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  clue: { marginBottom: spacing.xs },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { borderColor: colors.borderStrong, backgroundColor: colors.surfaceRaised },
});

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from '@/components/Text';
import { Eyebrow, Spacer } from '@/components/atoms';
import type { RendererProps } from './types';
import type { TriviaPayload } from '@core/puzzles/trivia';
import { colors, radius, spacing } from '@/design/tokens';

export function TriviaPlay({ payload, onSubmissionChange }: RendererProps<TriviaPayload>) {
  const [choice, setChoice] = useState<string | null>(null);
  useEffect(() => {
    onSubmissionChange({ answer: choice }, choice !== null);
  }, [choice, onSubmissionChange]);

  return (
    <View>
      <Eyebrow>{payload.prompt.toUpperCase()}</Eyebrow>
      <Spacer size={spacing.lg} />
      <View style={styles.seq}>
        {payload.sequence.map((s, i) => (
          <View key={i} style={styles.seqTile}>
            <Text variant="heading" mono>
              {s}
            </Text>
          </View>
        ))}
        <View style={[styles.seqTile, styles.seqBlank]}>
          <Text variant="heading" mono color={colors.accent}>
            ?
          </Text>
        </View>
      </View>
      <Spacer size={spacing.xxl} />
      <View style={styles.options}>
        {payload.options.map((opt) => (
          <Pressable key={opt} onPress={() => setChoice(opt)} style={[styles.option, choice === opt && styles.optionActive]}>
            <Text variant="bodyStrong" mono color={choice === opt ? colors.text : colors.textSecondary}>
              {opt}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  seq: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  seqTile: {
    minWidth: 56,
    height: 56,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seqBlank: { borderColor: colors.accent, borderStyle: 'dashed' },
  options: { gap: spacing.md },
  option: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  optionActive: { borderColor: colors.accent, borderWidth: 2, backgroundColor: colors.surfaceRaised },
});

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from '@/components/Text';
import { Eyebrow, Spacer } from '@/components/atoms';
import type { RendererProps } from './types';
import type { WordPayload } from '@core/puzzles/word';
import { playCue } from '@/lib/sound';
import { colors, radius, spacing } from '@/design/tokens';

export function WordPlay({ payload, onSubmissionChange }: RendererProps<WordPayload>) {
  const tiles = payload.scrambled.toUpperCase().split('');
  const [used, setUsed] = useState<number[]>([]); // indices of tapped tiles, in order

  const answer = used.map((i) => tiles[i]).join('');
  useEffect(() => {
    onSubmissionChange({ answer: answer.toLowerCase(), wastedGuesses: 0 }, answer.length === payload.length);
  }, [answer, payload.length, onSubmissionChange]);

  const tap = (i: number) => {
    playCue('tap');
    if (used.includes(i)) setUsed(used.filter((u) => u !== i));
    else if (used.length < payload.length) setUsed([...used, i]);
  };
  const clear = () => setUsed([]);

  return (
    <View>
      <Eyebrow>HINT</Eyebrow>
      <Spacer size={spacing.sm} />
      <Text variant="heading">{payload.hint}</Text>
      <Spacer size={spacing.xl} />

      {/* Answer slots */}
      <View style={styles.slots}>
        {Array.from({ length: payload.length }).map((_, i) => (
          <View key={i} style={styles.slot}>
            <Text variant="dataLarge" mono>
              {used[i] !== undefined ? tiles[used[i]!] : ''}
            </Text>
          </View>
        ))}
      </View>
      <Spacer size={spacing.xl} />

      {/* Letter bank */}
      <View style={styles.bank}>
        {tiles.map((t, i) => {
          const active = used.includes(i);
          return (
            <Pressable key={i} onPress={() => tap(i)} style={[styles.tile, active && styles.tileActive]}>
              <Text variant="heading" mono color={active ? colors.textTertiary : colors.text}>
                {t}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Spacer size={spacing.lg} />
      <Pressable onPress={clear} hitSlop={12}>
        <Text variant="caption" color={colors.textSecondary}>
          Clear
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  slot: {
    width: 44,
    height: 52,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bank: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  tile: {
    width: 52,
    height: 56,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileActive: { backgroundColor: colors.surface, borderColor: colors.border },
});

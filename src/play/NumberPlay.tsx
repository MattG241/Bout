import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from '@/components/Text';
import { Eyebrow, Spacer } from '@/components/atoms';
import type { RendererProps } from './types';
import type { NumberPayload } from '@core/puzzles/number';
import { colors, radius, spacing } from '@/design/tokens';

/** Numeric keypad to fill the blank in the equation. */
export function NumberPlay({ payload, onSubmissionChange }: RendererProps<NumberPayload>) {
  const [entry, setEntry] = useState('');

  useEffect(() => {
    const value = entry === '' || entry === '-' ? NaN : Number(entry);
    onSubmissionChange({ value }, Number.isFinite(value));
  }, [entry, onSubmissionChange]);

  const press = (k: string) => {
    if (k === '⌫') setEntry((e) => e.slice(0, -1));
    else if (k === '±') setEntry((e) => (e.startsWith('-') ? e.slice(1) : '-' + e));
    else if (entry.replace('-', '').length < 4) setEntry((e) => e + k);
  };

  return (
    <View>
      <Eyebrow>SOLVE</Eyebrow>
      <Spacer size={spacing.lg} />
      <View style={styles.equation}>
        {payload.terms.map((t, i) => (
          <View key={i} style={styles.termRow}>
            {t.op ? (
              <Text variant="dataLarge" mono color={colors.textSecondary}>
                {` ${t.op} `}
              </Text>
            ) : null}
            {i === payload.blankIndex ? (
              <View style={styles.blank}>
                <Text variant="dataLarge" mono color={entry ? colors.accent : colors.textTertiary}>
                  {entry || '?'}
                </Text>
              </View>
            ) : (
              <Text variant="dataLarge" mono>
                {t.value}
              </Text>
            )}
          </View>
        ))}
        <Text variant="dataLarge" mono color={colors.textSecondary}>
          {' = '}
        </Text>
        <Text variant="dataLarge" mono>
          {payload.result}
        </Text>
      </View>

      <Spacer size={spacing.xxl} />
      <View style={styles.pad}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '±', '0', '⌫'].map((k) => (
          <Pressable key={k} onPress={() => press(k)} style={styles.key}>
            <Text variant="heading" mono>
              {k}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  equation: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' },
  termRow: { flexDirection: 'row', alignItems: 'center' },
  blank: {
    minWidth: 52,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: colors.accent,
    alignItems: 'center',
  },
  pad: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'center' },
  key: {
    width: '28%',
    height: 60,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

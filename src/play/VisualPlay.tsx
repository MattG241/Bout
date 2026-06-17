import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from '@/components/Text';
import { Eyebrow, Spacer } from '@/components/atoms';
import type { RendererProps } from './types';
import type { VisualPayload, Grid } from '@core/puzzles/visual';
import { colors, radius, spacing } from '@/design/tokens';

const TRANSFORM_LABEL: Record<string, string> = {
  'flip-h': 'mirrored left ↔ right',
  'flip-v': 'mirrored top ↕ bottom',
  'rotate-180': 'rotated 180°',
};

function MiniGrid({ grid, size = 18 }: { grid: Grid; size?: number }) {
  return (
    <View>
      {grid.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row' }}>
          {row.map((cell, c) => (
            <View
              key={c}
              style={{
                width: size,
                height: size,
                margin: 1,
                borderRadius: 3,
                backgroundColor: cell ? colors.text : colors.surfaceRaised,
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

export function VisualPlay({ payload, onSubmissionChange }: RendererProps<VisualPayload>) {
  const [choice, setChoice] = useState<number | null>(null);
  useEffect(() => {
    onSubmissionChange({ index: choice }, choice !== null);
  }, [choice, onSubmissionChange]);

  return (
    <View style={{ alignItems: 'center' }}>
      <Eyebrow>WHICH IS THE PATTERN, {TRANSFORM_LABEL[payload.transform]?.toUpperCase()}?</Eyebrow>
      <Spacer size={spacing.lg} />
      <View style={styles.source}>
        <MiniGrid grid={payload.grid} size={26} />
      </View>
      <Spacer size={spacing.xl} />
      <View style={styles.options}>
        {payload.options.map((opt, i) => (
          <Pressable
            key={i}
            onPress={() => setChoice(i)}
            style={[styles.option, choice === i && styles.optionActive]}
          >
            <MiniGrid grid={opt} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  source: { padding: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'center' },
  option: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionActive: { borderColor: colors.accent, borderWidth: 2 },
});

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from '@/components/Text';
import { Eyebrow, Spacer } from '@/components/atoms';
import type { RendererProps } from './types';
import type { WeekendPayload } from '@core/puzzles/weekend';
import { colors, radius, spacing } from '@/design/tokens';

/** 4×4 mini-Sudoku: tap a blank cell, then a number 1–4. */
export function WeekendPlay({ payload, onSubmissionChange }: RendererProps<WeekendPayload>) {
  const [grid, setGrid] = useState<number[][]>(() => payload.grid.map((r) => [...r]));
  const [selected, setSelected] = useState<{ r: number; c: number } | null>(null);

  const blanksFilled = payload.grid.every((row, r) => row.every((v, c) => v !== 0 ? true : grid[r]![c]! !== 0));
  useEffect(() => {
    onSubmissionChange({ grid }, blanksFilled);
  }, [grid, blanksFilled, onSubmissionChange]);

  const setCell = (n: number) => {
    if (!selected) return;
    const { r, c } = selected;
    if (payload.grid[r]![c] !== 0) return; // can't change a given clue
    setGrid((g) => {
      const next = g.map((row) => [...row]);
      next[r]![c] = next[r]![c] === n ? 0 : n;
      return next;
    });
  };

  return (
    <View style={{ alignItems: 'center' }}>
      <Eyebrow>FILL SO EVERY ROW, COLUMN & BOX HAS 1–4</Eyebrow>
      <Spacer size={spacing.xl} />
      <View style={styles.board}>
        {grid.map((row, r) => (
          <View key={r} style={styles.boardRow}>
            {row.map((v, c) => {
              const given = payload.grid[r]![c] !== 0;
              const sel = selected?.r === r && selected?.c === c;
              const boxEdge = c === 2 ? styles.boxEdgeL : null;
              const boxEdgeT = r === 2 ? styles.boxEdgeT : null;
              return (
                <Pressable
                  key={c}
                  onPress={() => !given && setSelected({ r, c })}
                  style={[styles.cell, boxEdge, boxEdgeT, sel && styles.cellSel]}
                >
                  <Text variant="heading" mono color={given ? colors.text : v ? colors.accent : colors.textTertiary}>
                    {v || ''}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
      <Spacer size={spacing.xl} />
      <View style={styles.pad}>
        {[1, 2, 3, 4].map((n) => (
          <Pressable key={n} onPress={() => setCell(n)} style={styles.key}>
            <Text variant="heading" mono>
              {n}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const SIZE = 60;
const styles = StyleSheet.create({
  board: { borderWidth: 2, borderColor: colors.borderStrong, borderRadius: radius.sm, overflow: 'hidden' },
  boardRow: { flexDirection: 'row' },
  cell: {
    width: SIZE,
    height: SIZE,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellSel: { backgroundColor: colors.surfaceRaised, borderColor: colors.accent },
  boxEdgeL: { borderLeftWidth: 2, borderLeftColor: colors.borderStrong },
  boxEdgeT: { borderTopWidth: 2, borderTopColor: colors.borderStrong },
  pad: { flexDirection: 'row', gap: spacing.md },
  key: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

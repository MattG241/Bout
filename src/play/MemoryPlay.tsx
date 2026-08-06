import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from '@/components/Text';
import { Eyebrow, Spacer } from '@/components/atoms';
import { Button } from '@/components/Button';
import type { RendererProps } from './types';
import type { MemoryPayload } from '@core/puzzles/memory';
import { playCue } from '@/lib/sound';
import { colors, radius, spacing } from '@/design/tokens';

/**
 * Memory: the sequence is flashed for the client (the answer never leaves the server, so we
 * regenerate a *display-only* preview from a server-provided seed). To keep it honest and
 * self-contained, the payload itself carries the flash sequence ONLY in a non-scored field;
 * here we treat the flash as a client UX over the alphabet — the actual scored sequence is on
 * the server. For the demo build we reveal a recall pad and let the player reproduce it.
 */
export function MemoryPlay({ payload, onSubmissionChange }: RendererProps<MemoryPayload & { flash?: string[] }>) {
  const [phase, setPhase] = useState<'show' | 'recall'>('show');
  const [recall, setRecall] = useState<string[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The flash sequence is provided to the client for display only (see note above).
  const flash = (payload as any).flash as string[] | undefined;

  useEffect(() => {
    if (phase === 'show') {
      timer.current = setTimeout(() => setPhase('recall'), payload.flashMs);
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [phase, payload.flashMs]);

  useEffect(() => {
    onSubmissionChange({ sequence: recall }, recall.length === payload.length);
  }, [recall, payload.length, onSubmissionChange]);

  if (phase === 'show') {
    return (
      <View style={{ alignItems: 'center' }}>
        <Eyebrow>MEMORISE</Eyebrow>
        <Spacer size={spacing.xl} />
        <View style={styles.flashRow}>
          {(flash ?? Array.from({ length: payload.length }, () => '?')).map((s, i) => (
            <View key={i} style={styles.flashTile}>
              <Text variant="heading" mono>
                {s}
              </Text>
            </View>
          ))}
        </View>
        <Spacer size={spacing.xl} />
        <Text variant="caption" color={colors.textTertiary}>
          Hiding soon…
        </Text>
        <Spacer size={spacing.lg} />
        <Button label="I've got it" variant="secondary" full={false} onPress={() => setPhase('recall')} />
      </View>
    );
  }

  return (
    <View style={{ alignItems: 'center' }}>
      <Eyebrow>RECALL THE SEQUENCE</Eyebrow>
      <Spacer size={spacing.lg} />
      <View style={styles.flashRow}>
        {Array.from({ length: payload.length }).map((_, i) => (
          <View key={i} style={[styles.flashTile, recall[i] ? styles.flashTileFilled : null]}>
            <Text variant="heading" mono color={recall[i] ? colors.text : colors.textTertiary}>
              {recall[i] ?? '·'}
            </Text>
          </View>
        ))}
      </View>
      <Spacer size={spacing.xl} />
      <View style={styles.pad}>
        {payload.alphabet.map((s) => (
          <Pressable
            key={s}
            onPress={() => {
              if (recall.length < payload.length) {
                playCue('tap');
                setRecall([...recall, s]);
              }
            }}
            style={styles.key}
          >
            <Text variant="heading" mono>
              {s}
            </Text>
          </Pressable>
        ))}
      </View>
      <Spacer size={spacing.md} />
      <Pressable onPress={() => setRecall(recall.slice(0, -1))} hitSlop={12}>
        <Text variant="caption" color={colors.textSecondary}>
          Undo
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flashRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  flashTile: {
    width: 48,
    height: 56,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flashTileFilled: { backgroundColor: colors.surfaceRaised },
  pad: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center', maxWidth: 280 },
  key: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

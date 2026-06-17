import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { Loading, StateMessage, Spacer } from '@/components/atoms';
import { PuzzleRenderer, TYPE_LABELS } from '@/play/PuzzleRenderer';
import { getTodayPuzzle, startAttempt, submitAttempt } from '@/lib/api';
import type { PuzzleRow } from '@/lib/database.types';
import { colors, spacing } from '@/design/tokens';

export default function Play() {
  const { puzzleId } = useLocalSearchParams<{ puzzleId: string }>();
  const router = useRouter();

  const [puzzle, setPuzzle] = useState<PuzzleRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submission, setSubmission] = useState<unknown>(null);
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const p = await getTodayPuzzle();
        if (!p || p.id !== puzzleId) throw new Error('This bout is no longer available.');
        // Stamp the server-side serve time (timing authority); start the quiet local clock.
        await startAttempt(p.id);
        startRef.current = Date.now();
        if (active) {
          setPuzzle(p);
          setLoading(false);
        }
      } catch (e) {
        if (active) {
          setError((e as Error).message);
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [puzzleId]);

  // Quiet background timer.
  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const onSubmit = async () => {
    if (!puzzle || !ready) return;
    setSubmitting(true);
    try {
      const result = await submitAttempt(puzzle.id, submission);
      router.replace({
        pathname: '/result',
        params: { puzzleId: puzzle.id, fresh: '1', payload: JSON.stringify(result) },
      });
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes('already_attempted')) {
        router.replace({ pathname: '/result', params: { puzzleId: puzzle.id } });
      } else {
        Alert.alert('Could not submit', msg);
        setSubmitting(false);
      }
    }
  };

  const confirmQuit = () => {
    Alert.alert('Leave the bout?', 'Your timer is running. You can come back, but the clock keeps ticking.', [
      { text: 'Stay', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  if (loading) return <Screen><Loading label="Setting up the bout" /></Screen>;
  if (error || !puzzle)
    return (
      <Screen>
        <StateMessage tone="error" title="Bout unavailable" subtitle={error ?? undefined} />
        <Button label="Back" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  return (
    <Screen
      scroll
      footer={<Button label={ready ? 'Submit' : 'Finish the puzzle'} disabled={!ready} loading={submitting} onPress={onSubmit} />}
    >
      <View style={styles.topBar}>
        <Pressable onPress={confirmQuit} hitSlop={12}>
          <Text variant="body" color={colors.textTertiary}>
            Close
          </Text>
        </Pressable>
        <Text variant="data" mono color={colors.textTertiary}>
          {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </Text>
      </View>
      <Spacer size={spacing.sm} />
      <Text variant="label" color={colors.textTertiary}>
        {TYPE_LABELS[puzzle.type].toUpperCase()}
      </Text>
      <Spacer size={spacing.xl} />
      <PuzzleRenderer
        type={puzzle.type}
        payload={puzzle.payload}
        onSubmissionChange={(s, r) => {
          setSubmission(s);
          setReady(r);
        }}
      />
      <Spacer size={spacing.xxl} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { Spacer, Eyebrow, Divider, LiveDot, Loading } from '@/components/atoms';
import { PuzzleRenderer } from '@/play/PuzzleRenderer';
import { supabase } from '@/lib/supabase';
import { subscribeRace, startRace, finishRaceParticipant, finalizeRace, getTodayPuzzle } from '@/lib/api';
import { useStore } from '@/store/useStore';
import type { LiveRaceRow, LiveRaceParticipantRow, PuzzleRow } from '@/lib/database.types';
import { colors, spacing } from '@/design/tokens';

/**
 * Live race screen. Lobby → racing → finished, synced over Realtime. The solve is scored
 * server-side (score-race) purely to rank the race for fun; it never writes to the season ladder.
 */
export default function RaceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { userId } = useStore();

  const [race, setRace] = useState<LiveRaceRow | null>(null);
  const [participants, setParticipants] = useState<LiveRaceParticipantRow[]>([]);
  const [puzzle, setPuzzle] = useState<PuzzleRow | null>(null);
  const [submission, setSubmission] = useState<unknown>(null);
  const [ready, setReady] = useState(false);
  const [finishedLocally, setFinishedLocally] = useState(false);
  const startRef = useRef<number>(0);

  const refresh = async () => {
    const { data: r } = await supabase.from('live_races').select('*').eq('id', id).maybeSingle();
    const { data: p } = await supabase.from('live_race_participants').select('*').eq('race_id', id);
    setRace(r as LiveRaceRow);
    setParticipants((p ?? []) as LiveRaceParticipantRow[]);
    if (r && (r as LiveRaceRow).status === 'racing' && startRef.current === 0) startRef.current = Date.now();
  };

  useEffect(() => {
    getTodayPuzzle().then(setPuzzle);
    refresh();
    const unsub = subscribeRace(id, refresh);
    return unsub;
  }, [id]);

  if (!race) return <Screen><Loading label="Joining the race" /></Screen>;

  const isHost = race.host_user_id === userId;
  const finished = [...participants].filter((p) => p.place != null).sort((a, b) => (a.place ?? 0) - (b.place ?? 0));

  const handleSubmissionChange = useCallback((s: unknown, r: boolean) => {
    setSubmission(s);
    setReady(r);
  }, []);

  const submitRace = async () => {
    if (!puzzle || !ready) return;
    // Scoring + timing happen server-side (the client doesn't hold the solution).
    await finishRaceParticipant(id, submission);
    setFinishedLocally(true);
  };

  return (
    <Screen scroll footer={
      race.status === 'lobby' && isHost ? (
        <Button label="Start race" onPress={() => startRace(id)} disabled={participants.length < 1} />
      ) : race.status === 'racing' && !finishedLocally ? (
        <Button label={ready ? 'Finish' : 'Solve to finish'} disabled={!ready} onPress={submitRace} />
      ) : undefined
    }>
      <View style={styles.head}>
        <LiveDot />
        <Eyebrow color={colors.accent}>{race.status.toUpperCase()}</Eyebrow>
      </View>
      <Spacer size={spacing.lg} />

      {race.status === 'lobby' ? (
        <>
          <Text variant="title">Lobby</Text>
          <Spacer size={spacing.sm} />
          <Text variant="body" color={colors.textSecondary}>
            {participants.length} {participants.length === 1 ? 'fighter' : 'fighters'} ready.{' '}
            {isHost ? 'Start when your crew is in.' : 'Waiting for the host to start…'}
          </Text>
        </>
      ) : null}

      {race.status === 'racing' && puzzle && !finishedLocally ? (
        <PuzzleRenderer type={puzzle.type} payload={puzzle.payload} onSubmissionChange={handleSubmissionChange} />
      ) : null}

      {(race.status === 'racing' && finishedLocally) || race.status === 'finished' ? (
        <>
          <Text variant="title">{race.status === 'finished' ? 'Final result' : 'Done — waiting on the rest'}</Text>
          <Spacer size={spacing.lg} />
          <Divider />
          {finished.map((p) => (
            <View key={p.user_id} style={styles.row}>
              <Text variant="data" mono style={{ width: 36 }}>
                {p.place}
              </Text>
              <Text variant="bodyStrong" style={{ flex: 1 }}>
                {p.user_id === userId ? 'You' : p.user_id.slice(0, 6)}
              </Text>
              <Text variant="data" mono color={colors.textTertiary}>
                {Math.round((p.accuracy ?? 0) * 100)}% · {Math.round((p.time_ms ?? 0) / 1000)}s
              </Text>
            </View>
          ))}
          {isHost && race.status !== 'finished' ? (
            <>
              <Spacer size={spacing.lg} />
              <Button label="End & rank race" variant="secondary" onPress={() => finalizeRace(id)} />
            </>
          ) : null}
          <Spacer size={spacing.lg} />
          <Button label="Back" variant="ghost" onPress={() => router.replace('/(tabs)')} />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
});

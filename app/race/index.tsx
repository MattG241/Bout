import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Spacer, Eyebrow, Divider, LiveDot, Loading, StateMessage } from '@/components/atoms';
import { createRace, joinRace, listOpenRaces, getTodayPuzzle } from '@/lib/api';
import { useActiveLeague } from '@/store/useStore';
import type { LiveRaceRow } from '@/lib/database.types';
import { colors, spacing } from '@/design/tokens';

/**
 * Live race lobby — the opt-in, synchronous head-to-head on today's puzzle. Always optional,
 * never tied to the season ladder. For the adrenaline crowd only.
 */
export default function RaceLobby() {
  const router = useRouter();
  const league = useActiveLeague();
  const [races, setRaces] = useState<LiveRaceRow[]>([]);
  const [puzzleId, setPuzzleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [open, puzzle] = await Promise.all([listOpenRaces(league?.id ?? null), getTodayPuzzle()]);
    setRaces(open);
    setPuzzleId(puzzle?.id ?? null);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, [league?.id]);

  const host = async () => {
    if (!puzzleId) return;
    setBusy(true);
    try {
      const race = await createRace(puzzleId, league?.id ?? null);
      router.push({ pathname: '/race/[id]', params: { id: race.id } });
    } finally {
      setBusy(false);
    }
  };
  const join = async (id: string) => {
    await joinRace(id);
    router.push({ pathname: '/race/[id]', params: { id } });
  };

  if (loading) return <Screen><Loading /></Screen>;

  return (
    <Screen scroll onRefresh={load} refreshing={loading}>
      <View style={styles.head}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text variant="body" color={colors.textTertiary}>
            Close
          </Text>
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <LiveDot />
          <Eyebrow color={colors.accent}>LIVE RACE</Eyebrow>
        </View>
      </View>

      <Spacer size={spacing.lg} />
      <Text variant="title">Head-to-head</Text>
      <Spacer size={spacing.sm} />
      <Text variant="body" color={colors.textSecondary}>
        Same puzzle, same moment, fastest accurate solve wins. Optional and just for fun — it
        never touches the ladder.
      </Text>

      <Spacer size={spacing.xl} />
      <Button label="Start a race" loading={busy} disabled={!puzzleId} onPress={host} />
      {!puzzleId ? (
        <Text variant="caption" color={colors.textTertiary} style={{ marginTop: spacing.sm }}>
          No bout available to race right now.
        </Text>
      ) : null}

      <Spacer size={spacing.xl} />
      <Eyebrow>OPEN RACES</Eyebrow>
      <Spacer size={spacing.sm} />
      <Divider />
      {races.length === 0 ? (
        <>
          <Spacer size={spacing.lg} />
          <StateMessage title="No open races" subtitle="Start one and call your crew in." />
        </>
      ) : (
        races.map((r) => (
          <Card key={r.id} style={{ marginTop: spacing.md }} onPress={() => join(r.id)}>
            <View style={styles.raceRow}>
              <View>
                <Text variant="bodyStrong">Race · {r.status}</Text>
                <Text variant="caption" color={colors.textTertiary}>
                  {new Date(r.created_at).toLocaleTimeString()}
                </Text>
              </View>
              <Text variant="body" color={colors.accent}>
                Join ›
              </Text>
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  raceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});

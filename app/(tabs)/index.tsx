import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Spacer, Eyebrow, Divider, LiveDot, Loading, StateMessage } from '@/components/atoms';
import { useToday } from '@/hooks/useToday';
import { useActiveLeague, useStore } from '@/store/useStore';
import { TYPE_LABELS } from '@/play/PuzzleRenderer';
import { submitPrediction } from '@/lib/api';
import { colors, spacing, radius } from '@/design/tokens';

const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function Today() {
  const router = useRouter();
  const league = useActiveLeague();
  const { profile } = useStore();
  const data = useToday();

  if (data.loading) return <Screen><Loading label="Loading today's bout" /></Screen>;

  const played = !!data.attempt;
  const today = new Date();
  const isFinals = data.season?.status === 'finals';

  return (
    <Screen scroll onRefresh={data.refresh} refreshing={data.loading}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Eyebrow>{WEEKDAY[today.getDay()]!.toUpperCase()}</Eyebrow>
          <Spacer size={4} />
          <Text variant="title">Today's bout</Text>
        </View>
        <StreakPill streak={data.streak} />
      </View>

      {isFinals ? (
        <>
          <Spacer size={spacing.md} />
          <View style={styles.finalsBanner}>
            <LiveDot />
            <Text variant="bodyStrong" color={colors.accent}>
              Finals week — scores double
            </Text>
          </View>
        </>
      ) : null}

      <Spacer size={spacing.xl} />

      {/* The bout card */}
      {!data.puzzle ? (
        <Card>
          <StateMessage title="No bout yet" subtitle="Today's puzzle hasn't dropped. Check back shortly." />
        </Card>
      ) : (
        <Card raised>
          <View style={styles.boutHeader}>
            <Eyebrow color={colors.textSecondary}>{TYPE_LABELS[data.puzzle.type].toUpperCase()} · {data.puzzle.difficulty.toUpperCase()}</Eyebrow>
            {played ? null : <LiveDot />}
          </View>
          <Spacer size={spacing.md} />
          {played ? (
            <>
              <Text variant="display" mono>
                {data.attempt!.final_score}
              </Text>
              <Text variant="body" color={colors.textSecondary}>
                You've fought today's bout. See how it landed.
              </Text>
              <Spacer size={spacing.lg} />
              <Button
                label="View result"
                variant="secondary"
                onPress={() => router.push({ pathname: '/result', params: { puzzleId: data.puzzle!.id } })}
              />
            </>
          ) : (
            <>
              <Text variant="heading">One puzzle. One to three minutes.</Text>
              <Text variant="body" color={colors.textSecondary} style={{ marginTop: spacing.sm }}>
                Solve it on your own schedule. Your result feeds the {league?.name ?? 'crew'} ladder.
              </Text>
              <Spacer size={spacing.lg} />
              <Button
                label="Enter the ring"
                onPress={() => router.push({ pathname: '/play', params: { puzzleId: data.puzzle!.id } })}
              />
            </>
          )}
        </Card>
      )}

      <Spacer size={spacing.xl} />

      {/* Pick'em */}
      {league && data.members.length > 1 ? (
        <Pickem
          members={data.members.filter((m) => m.user_id !== profile?.id)}
          existing={data.prediction?.predicted_top_user_id ?? null}
          onPick={async (uid) => {
            await submitPrediction(league.id, data.season?.id ?? null, uid);
            data.refresh();
          }}
        />
      ) : null}

      <Spacer size={spacing.xl} />

      {/* Quick links */}
      <Card onPress={() => router.push('/(tabs)/ladder')}>
        <View style={styles.linkRow}>
          <Text variant="bodyStrong">See the live ladder</Text>
          <Text variant="body" color={colors.textTertiary}>›</Text>
        </View>
      </Card>
      <Spacer size={spacing.md} />
      <Card onPress={() => router.push('/race')}>
        <View style={styles.linkRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <LiveDot />
            <Text variant="bodyStrong">Live race (optional)</Text>
          </View>
          <Text variant="body" color={colors.textTertiary}>›</Text>
        </View>
      </Card>
    </Screen>
  );
}

function StreakPill({ streak }: { streak: number }) {
  return (
    <View style={styles.streakPill}>
      <Text variant="data" mono color={streak > 0 ? colors.accent : colors.textTertiary}>
        {streak}
      </Text>
      <Text variant="label" color={colors.textTertiary}>
        {streak === 1 ? 'DAY' : 'DAYS'}
      </Text>
    </View>
  );
}

function Pickem({
  members,
  existing,
  onPick,
}: {
  members: Array<{ user_id: string; handle: string }>;
  existing: string | null;
  onPick: (uid: string) => void;
}) {
  const [picked, setPicked] = useState<string | null>(existing);
  return (
    <Card>
      <Eyebrow>PICK'EM · +15 IF YOU CALL IT</Eyebrow>
      <Spacer size={spacing.sm} />
      <Text variant="heading">Who tops the crew today?</Text>
      <Spacer size={spacing.md} />
      <Divider />
      <Spacer size={spacing.md} />
      <View style={styles.pickRow}>
        {members.map((m) => {
          const on = picked === m.user_id;
          return (
            <Pressable
              key={m.user_id}
              onPress={() => {
                setPicked(m.user_id);
                onPick(m.user_id);
              }}
              style={[styles.pickChip, on && styles.pickChipOn]}
            >
              <Text variant="bodyStrong" color={on ? colors.textInverse : colors.text}>
                {m.handle}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {existing ? (
        <>
          <Spacer size={spacing.sm} />
          <Text variant="caption" color={colors.textTertiary}>
            Locked in. Resolves when the day closes.
          </Text>
        </>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  finalsBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  boutHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  linkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pickChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pickChipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
});

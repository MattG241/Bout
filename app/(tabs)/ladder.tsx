import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Divider, Spacer, Eyebrow, LiveDot, Loading, StateMessage } from '@/components/atoms';
import { useStandings } from '@/hooks/useStandings';
import { useActiveLeague, useStore } from '@/store/useStore';
import { rankStandings, type StandingRow as CoreStanding } from '@core/season';
import { WEIGHT_CLASSES, type WeightClass } from '@core/config';
import { colors, spacing, radius } from '@/design/tokens';

/**
 * Ladder — the emotional centre. Reads like a clean results sheet: aligned tabular numbers,
 * clear hierarchy, minimal chrome. The user's row is quietly highlighted.
 */
export default function Ladder() {
  const league = useActiveLeague();
  const { profile } = useStore();
  const { season, rows, loading, refresh } = useStandings(league?.id ?? null);
  const [activeClass, setActiveClass] = useState<WeightClass | null>(null);

  // Rank rows within weight class using the shared core logic, so the client mirrors the server.
  const ranked = useMemo(() => {
    const core: CoreStanding[] = rows.map((r) => ({
      userId: r.user_id,
      weightClass: r.weight_class,
      totalPoints: r.total_points,
      playedCount: r.played_count,
      currentStreak: r.current_streak,
      bestStreak: r.best_streak,
    }));
    const withRank = rankStandings(core);
    return rows
      .map((r) => ({ ...r, rank: withRank.find((x) => x.userId === r.user_id)?.rank ?? 0 }))
      .sort((a, b) => a.rank - b.rank);
  }, [rows]);

  const classesPresent = useMemo(
    () => WEIGHT_CLASSES.filter((wc) => ranked.some((r) => r.weight_class === wc)),
    [ranked],
  );
  const myClass = ranked.find((r) => r.user_id === profile?.id)?.weight_class ?? null;
  const shownClass = activeClass ?? myClass ?? classesPresent[0] ?? null;
  const shown = ranked.filter((r) => r.weight_class === shownClass);

  if (loading) return <Screen><Loading label="Loading the ladder" /></Screen>;
  if (!league || !season)
    return (
      <Screen>
        <StateMessage title="No active season" subtitle="Join or start a crew to see the ladder." />
      </Screen>
    );

  return (
    <Screen scroll onRefresh={refresh} refreshing={loading}>
      <View style={styles.header}>
        <View>
          <Eyebrow>{league.name}</Eyebrow>
          <Spacer size={4} />
          <Text variant="title">Ladder</Text>
        </View>
        <View style={styles.seasonTag}>
          {season.status === 'finals' ? <LiveDot /> : null}
          <Text variant="label" color={season.status === 'finals' ? colors.accent : colors.textTertiary}>
            {season.name.toUpperCase()} · {season.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <Spacer size={spacing.lg} />

      {/* Weight-class selector (divisions) */}
      {classesPresent.length > 1 ? (
        <>
          <View style={styles.classRow}>
            {classesPresent.map((wc) => (
              <Pressable key={wc} onPress={() => setActiveClass(wc)} style={[styles.classChip, shownClass === wc && styles.classChipOn]}>
                <Text variant="label" color={shownClass === wc ? colors.text : colors.textTertiary}>
                  {wc.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>
          <Spacer size={spacing.lg} />
        </>
      ) : null}

      {/* Results sheet */}
      <View style={styles.sheetHeader}>
        <Text variant="label" color={colors.textTertiary} style={{ width: 36 }}>
          #
        </Text>
        <Text variant="label" color={colors.textTertiary} style={{ flex: 1 }}>
          FIGHTER
        </Text>
        <Text variant="label" color={colors.textTertiary} style={{ width: 56, textAlign: 'right' }}>
          PLAYED
        </Text>
        <Text variant="label" color={colors.textTertiary} style={{ width: 72, textAlign: 'right' }}>
          POINTS
        </Text>
      </View>
      <Spacer size={spacing.sm} />
      <Divider />

      {shown.length === 0 ? (
        <>
          <Spacer size={spacing.xl} />
          <StateMessage title="No scores yet" subtitle="Be the first to fight today's bout." />
        </>
      ) : (
        shown.map((r) => {
          const me = r.user_id === profile?.id;
          return (
            <View key={r.id} style={[styles.row, me && styles.rowMe]}>
              <Text variant="data" mono color={r.rank <= 3 ? colors.text : colors.textSecondary} style={{ width: 36 }}>
                {r.rank}
              </Text>
              <Text variant="bodyStrong" color={me ? colors.accent : colors.text} style={{ flex: 1 }} numberOfLines={1}>
                {r.handle}
                {me ? '  (you)' : ''}
              </Text>
              <Text variant="data" mono color={colors.textTertiary} style={{ width: 56, textAlign: 'right' }}>
                {r.played_count}
              </Text>
              <Text variant="data" mono style={{ width: 72, textAlign: 'right' }}>
                {r.total_points}
              </Text>
            </View>
          );
        })
      )}

      <Spacer size={spacing.xl} />
      <Text variant="caption" color={colors.textTertiary} center>
        {season.status === 'finals'
          ? 'Finals week — every score doubles.'
          : `Finals begin ${season.finals_starts_on}. Top of each class promotes next season.`}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  seasonTag: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  classRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  classChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  classChipOn: { borderColor: colors.borderStrong, backgroundColor: colors.surfaceRaised },
  sheetHeader: { flexDirection: 'row', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowMe: { backgroundColor: colors.surface, borderRadius: radius.sm, paddingHorizontal: spacing.sm, marginHorizontal: -spacing.sm },
});

import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Divider, Spacer, Eyebrow, Loading, StateMessage, LiveDot } from '@/components/atoms';
import { ShareCard, type ShareCardData } from '@/components/ShareCard';
import { shareCardImage } from '@/lib/share';
import { useActiveLeague, useStore } from '@/store/useStore';
import { getActiveSeason, getPastSeasons, getStandings } from '@/lib/api';
import { SEASON } from '@core/config';
import type { SeasonRow } from '@/lib/database.types';
import { colors, spacing } from '@/design/tokens';

export default function Season() {
  const league = useActiveLeague();
  const { profile } = useStore();
  const [active, setActive] = useState<SeasonRow | null>(null);
  const [past, setPast] = useState<SeasonRow[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [leaderHandle, setLeaderHandle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const recapRef = useRef<View>(null);

  useEffect(() => {
    (async () => {
      if (!league) {
        setLoading(false);
        return;
      }
      const [a, p] = await Promise.all([getActiveSeason(league.id), getPastSeasons(league.id)]);
      setActive(a);
      setPast(p);
      if (a) {
        const rows = await getStandings(a.id);
        const mine = rows.findIndex((r) => r.user_id === profile?.id);
        setMyRank(mine >= 0 ? mine + 1 : null);
        setLeaderHandle(rows[0]?.handle ?? null);
      }
      setLoading(false);
    })();
  }, [league, profile?.id]);

  if (loading) return <Screen><Loading /></Screen>;
  if (!league || !active)
    return (
      <Screen>
        <StateMessage title="No season running" subtitle="Join a crew to start a season." />
      </Screen>
    );

  const phase =
    active.status === 'finals' ? 'Finals week' : active.status === 'active' ? 'Regular season' : active.status;

  const recapData: ShareCardData = {
    handle: profile?.handle ?? 'you',
    dateLabel: active.name,
    typeLabel: '',
    score: 0,
    streak: profile?.stats?.current_streak ?? 0,
    leagueName: league.name,
    variant: 'recap',
    recapTitle: myRank ? `You finished #${myRank}` : 'Season in progress',
    recapSubtitle: leaderHandle ? `${leaderHandle} leads the gym` : 'The bell is still ringing.',
  };

  return (
    <Screen scroll>
      <Eyebrow>{league.name}</Eyebrow>
      <Spacer size={4} />
      <Text variant="title">{active.name}</Text>
      <Spacer size={spacing.lg} />

      <Card raised>
        <View style={styles.phaseRow}>
          <Eyebrow color={active.status === 'finals' ? colors.accent : colors.textSecondary}>{phase}</Eyebrow>
          {active.status === 'finals' ? <LiveDot /> : null}
        </View>
        <Spacer size={spacing.md} />
        <PhaseTimeline season={active} />
      </Card>

      <Spacer size={spacing.xl} />

      {/* Promotion / relegation picture */}
      <Card>
        <Eyebrow>DIVISIONS</Eyebrow>
        <Spacer size={spacing.sm} />
        <Text variant="body" color={colors.textSecondary}>
          At season's end the top {SEASON.promoteTopN} of each weight class promote and the
          bottom {SEASON.relegateBottomN} relegate. Your streak carries into the next season —
          loyalty is never punished.
        </Text>
        {myRank ? (
          <>
            <Spacer size={spacing.md} />
            <Divider />
            <Spacer size={spacing.md} />
            <View style={styles.statRow}>
              <Text variant="body" color={colors.textSecondary}>
                Your current standing
              </Text>
              <Text variant="data" mono color={colors.accent}>
                #{myRank}
              </Text>
            </View>
          </>
        ) : null}
      </Card>

      <Spacer size={spacing.xl} />

      {/* Recap card (becomes the off-season share) */}
      <Eyebrow>RECAP CARD</Eyebrow>
      <Spacer size={spacing.md} />
      <View style={{ alignItems: 'center' }}>
        <ShareCard ref={recapRef} data={recapData} />
      </View>
      <Spacer size={spacing.md} />
      <Button label="Share recap" variant="secondary" onPress={() => shareCardImage(recapRef)} />

      <Spacer size={spacing.xl} />

      {/* Past seasons */}
      <Eyebrow>PAST SEASONS</Eyebrow>
      <Spacer size={spacing.md} />
      {past.length === 0 ? (
        <Text variant="body" color={colors.textTertiary}>
          No completed seasons yet. This is where the history lives.
        </Text>
      ) : (
        past.map((s) => (
          <View key={s.id} style={styles.pastRow}>
            <Text variant="bodyStrong">{s.name}</Text>
            <Text variant="caption" color={colors.textTertiary}>
              {s.starts_on} → {s.ends_on}
            </Text>
          </View>
        ))
      )}
    </Screen>
  );
}

function PhaseTimeline({ season }: { season: SeasonRow }) {
  const today = new Date().toISOString().slice(0, 10);
  const steps = [
    { label: 'Opens', date: season.starts_on },
    { label: 'Finals', date: season.finals_starts_on },
    { label: 'Closes', date: season.ends_on },
  ];
  return (
    <View>
      {steps.map((s, i) => {
        const reached = today >= s.date;
        return (
          <View key={i} style={styles.timelineRow}>
            <View style={[styles.dot, reached && styles.dotOn]} />
            <Text variant="body" color={reached ? colors.text : colors.textTertiary}>
              {s.label}
            </Text>
            <Text variant="data" mono color={colors.textTertiary} style={{ marginLeft: 'auto' }}>
              {s.date}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  phaseRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 6 },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  dotOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  pastRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
});

import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Divider, Spacer, Eyebrow, Loading } from '@/components/atoms';
import { Appear, AnimatedNumber } from '@/components/motion';
import { ShareCard, type ShareCardData } from '@/components/ShareCard';
import { shareCardImage } from '@/lib/share';
import { playCue } from '@/lib/sound';
import { getMyAttempt, getTodayPuzzle } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { useActiveLeague } from '@/store/useStore';
import { TYPE_LABELS } from '@/play/PuzzleRenderer';
import type { SubmitResult } from '@/lib/api';
import type { PuzzleTypeId } from '@core/puzzles/types';
import { colors, spacing } from '@/design/tokens';

interface Breakdown {
  completion: number;
  accuracy: number;
  speed: number;
  improvement: number;
  preMultiplier: number;
  streakMultiplier: number;
  finalsApplied: boolean;
  finalScore: number;
  streak: number;
}

export default function Result() {
  const { puzzleId, payload } = useLocalSearchParams<{ puzzleId: string; payload?: string; fresh?: string }>();
  const router = useRouter();
  const { profile } = useStore();
  const league = useActiveLeague();
  const cardRef = useRef<View>(null);

  const [data, setData] = useState<Breakdown | null>(null);
  const [type, setType] = useState<PuzzleTypeId>('word');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const puzzle = await getTodayPuzzle();
      if (puzzle) setType(puzzle.type);
      if (payload) {
        const r = JSON.parse(payload) as SubmitResult;
        setData({ ...r.breakdown, streak: r.streak.current });
      } else if (puzzleId) {
        const a = await getMyAttempt(puzzleId);
        if (a) {
          setData({
            completion: a.completed ? 100 : 0,
            accuracy: Math.round(a.accuracy * 100),
            speed: Math.max(0, a.raw_score - 100 - Math.round(a.accuracy * 100)),
            improvement: 0,
            preMultiplier: a.raw_score,
            streakMultiplier: 1 + Math.min(0.3, Math.max(0, a.streak_at_attempt - 1) * 0.02),
            finalsApplied: false,
            finalScore: a.final_score,
            streak: a.streak_at_attempt,
          });
        }
      }
      setLoading(false);
    })();
  }, [puzzleId, payload]);

  // The reveal moment: ring the bell on a fresh result, with a streak chime if you're on a run.
  useEffect(() => {
    if (!data || !payload) return;
    playCue('bell');
    if (data.streak >= 2) {
      const t = setTimeout(() => playCue('streak'), 480);
      return () => clearTimeout(t);
    }
  }, [data, payload]);

  if (loading) return <Screen><Loading /></Screen>;
  if (!data)
    return (
      <Screen>
        <Text variant="heading">No result yet.</Text>
        <Spacer />
        <Button label="Back to today" onPress={() => router.replace('/(tabs)')} />
      </Screen>
    );

  const cardData: ShareCardData = {
    handle: profile?.handle ?? 'you',
    dateLabel: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    typeLabel: TYPE_LABELS[type],
    score: data.finalScore,
    streak: data.streak,
    leagueName: league?.name ?? 'Bout',
  };

  return (
    <Screen scroll footer={<Button label="Back to today" variant="secondary" onPress={() => router.replace('/(tabs)')} />}>
      <Eyebrow color={colors.accent}>RESULT</Eyebrow>
      <Spacer size={spacing.md} />
      <AnimatedNumber value={data.finalScore} duration={700} variant="display" />
      <Text variant="body" color={colors.textSecondary}>
        {data.finalsApplied ? 'Finals week — score doubled.' : "Today's score on the ladder."}
      </Text>

      <Spacer size={spacing.xl} />
      <Appear delay={120}>
      <Card>
        <Eyebrow>BREAKDOWN</Eyebrow>
        <Spacer size={spacing.md} />
        <Row label="Completion" value={`+${data.completion}`} />
        <Row label="Accuracy" value={`+${data.accuracy}`} />
        <Row label="Speed" value={`+${data.speed}`} />
        {data.improvement > 0 ? <Row label="Improvement bonus" value={`+${data.improvement}`} accent /> : null}
        <Spacer size={spacing.sm} />
        <Divider />
        <Spacer size={spacing.sm} />
        <Row label="Pre-multiplier" value={`${data.preMultiplier}`} muted />
        <Row label={`Streak ×${data.streakMultiplier.toFixed(2)}`} value={`${data.streak} day${data.streak === 1 ? '' : 's'}`} muted />
        {data.finalsApplied ? <Row label="Finals" value="×2" accent /> : null}
        <Spacer size={spacing.sm} />
        <Divider />
        <Spacer size={spacing.sm} />
        <Row label="Final score" value={`${data.finalScore}`} big />
      </Card>
      </Appear>

      <Spacer size={spacing.xl} />

      {/* Capture surface for the share card */}
      <Appear delay={260}>
        <View style={styles.cardWrap}>
          <ShareCard ref={cardRef} data={cardData} />
        </View>
        <Spacer size={spacing.lg} />
        <Button label="Share result" onPress={() => shareCardImage(cardRef)} />
      </Appear>
    </Screen>
  );
}

function Row({
  label,
  value,
  big,
  muted,
  accent,
}: {
  label: string;
  value: string;
  big?: boolean;
  muted?: boolean;
  accent?: boolean;
}) {
  const color = accent ? colors.accent : muted ? colors.textTertiary : colors.text;
  return (
    <View style={styles.row}>
      <Text variant={big ? 'bodyStrong' : 'body'} color={muted ? colors.textTertiary : colors.textSecondary}>
        {label}
      </Text>
      <Text variant={big ? 'data' : 'body'} mono color={color}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  cardWrap: { alignItems: 'center' },
});

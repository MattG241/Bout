import React, { forwardRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { colors, radius, spacing } from '@/design/tokens';

export interface ShareCardData {
  handle: string;
  dateLabel: string;
  typeLabel: string;
  score: number;
  rank?: number | null;
  weightClass?: string;
  streak: number;
  leagueName: string;
  /** Optional recap mode for end-of-season cards. */
  variant?: 'result' | 'recap';
  recapTitle?: string;
  recapSubtitle?: string;
}

/**
 * The shareable card. Pure black-and-white, type-led, no decoration — captured to an image
 * by react-native-view-shot and sent through the native share sheet.
 * Forwarded ref points at the capture surface.
 */
export const ShareCard = forwardRef<View, { data: ShareCardData }>(function ShareCard({ data }, ref) {
  const recap = data.variant === 'recap';
  return (
    <View ref={ref} collapsable={false} style={styles.card}>
      <View style={styles.header}>
        <Text variant="label" color={colors.accent}>
          BOUT
        </Text>
        <Text variant="label" color={colors.textTertiary}>
          {data.dateLabel.toUpperCase()}
        </Text>
      </View>

      {recap ? (
        <View style={styles.body}>
          <Text variant="label" color={colors.textTertiary}>
            {data.leagueName.toUpperCase()}
          </Text>
          <Spacer />
          <Text variant="title">{data.recapTitle}</Text>
          <Spacer />
          <Text variant="body" color={colors.textSecondary}>
            {data.recapSubtitle}
          </Text>
        </View>
      ) : (
        <View style={styles.body}>
          <Text variant="label" color={colors.textTertiary}>
            {data.typeLabel.toUpperCase()} · @{data.handle}
          </Text>
          <Spacer />
          <Text style={styles.bigScore} mono>
            {data.score}
          </Text>
          <Text variant="label" color={colors.textTertiary}>
            TODAY'S SCORE
          </Text>
        </View>
      )}

      <View style={styles.footer}>
        <Stat label="STREAK" value={`${data.streak}`} />
        {data.rank != null ? <Stat label="RANK" value={`#${data.rank}`} /> : null}
        {data.weightClass ? <Stat label="CLASS" value={data.weightClass.slice(0, 3).toUpperCase()} /> : null}
      </View>
    </View>
  );
});

function Spacer() {
  return <View style={{ height: spacing.sm }} />;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text variant="data" mono>
        {value}
      </Text>
      <Text variant="label" color={colors.textTertiary}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 340,
    backgroundColor: colors.bg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: spacing.xl,
    gap: spacing.xl,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between' },
  body: { paddingVertical: spacing.lg },
  bigScore: { color: colors.text, fontSize: 88, lineHeight: 92, fontWeight: '800', letterSpacing: -3 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.lg,
  },
});

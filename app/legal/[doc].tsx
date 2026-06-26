import React from 'react';
import { View, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Spacer, Divider } from '@/components/atoms';
import { colors, spacing } from '@/design/tokens';

/**
 * In-app legal screens (Privacy Policy + Terms). Rendered natively so the Settings links work
 * without any external hosting. (A public hosted copy is still needed for the store listing's
 * privacy-policy URL — see docs.)
 */
type Section = { h: string; b: string };

const PRIVACY: Section[] = [
  { h: 'What we collect', b: 'A handle you choose, an account identifier, and (if you sign up with email) your email. Your gameplay — attempts, scores, streaks, predictions, standings. A push token and your device timezone, to send the daily notification in your local morning. Subscription status via RevenueCat and the app stores.' },
  { h: 'What we do NOT collect', b: 'No location, contacts, or photos. No third-party advertising or cross-app tracking. We never receive your payment card details — Apple and Google handle payments.' },
  { h: 'How we use it', b: 'To run the daily game and your crew league: deliver puzzles, score attempts server-side, maintain streaks and standings, send the daily nudge, and provide premium features to subscribers.' },
  { h: 'Sharing', b: 'Your handle, scores, and standings are visible to members of leagues you belong to. We do not sell your data. Processors: Supabase (backend), Expo (push), RevenueCat (subscriptions).' },
  { h: 'Your choices', b: 'Delete your account anytime in Settings — it permanently erases your data. Turn notifications on/off in Settings or your OS. Depending on your region you may have rights to access or export your data — reach us via https://mattg241.github.io/Bout/.' },
  { h: 'Children', b: 'Bout is for general audiences and not directed at children under 13.' },
  { h: 'Contact', b: 'Reach us via https://mattg241.github.io/Bout/' },
];

const TERMS: Section[] = [
  { h: 'The service', b: 'Bout is a daily brain game played within private crews and matched house leagues. One puzzle is released per day. Scores feed a season-long ladder with weight-class divisions and a finals week.' },
  { h: 'Fair play', b: 'Puzzles, answer validation, timing, and scoring are server-authoritative. Attempting to cheat, automate, reverse-engineer, or extract solutions is prohibited. One attempt per puzzle per day; duplicates are rejected.' },
  { h: 'No wagering', b: 'Bout contains no real-money stakes, wagering, or gambling of any kind. Stakes are pride, streaks, and bragging rights only.' },
  { h: 'Accounts & conduct', b: "You're responsible for activity under your account and for choosing an appropriate handle. We may remove abusive, infringing, or unlawful handles or content. There is no public feed — visibility is limited to your leagues." },
  { h: 'Subscriptions', b: 'The daily bout and the ladder are free. The optional Season Pass and cosmetics are sold via the app stores and managed by RevenueCat; subscriptions auto-renew until cancelled in your store account. Premium never confers a competitive scoring advantage.' },
  { h: 'Disclaimer', b: 'The service is provided "as is" without warranties. To the extent permitted by law, we are not liable for indirect or incidental damages arising from your use of the app.' },
  { h: 'Contact', b: 'Reach us via https://mattg241.github.io/Bout/' },
];

export default function Legal() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const router = useRouter();
  const isPrivacy = doc === 'privacy';
  const sections = isPrivacy ? PRIVACY : TERMS;

  return (
    <Screen scroll>
      <Pressable onPress={() => router.back()} hitSlop={12}>
        <Text variant="body" color={colors.textTertiary}>
          ‹ Back
        </Text>
      </Pressable>
      <Spacer size={spacing.lg} />
      <Text variant="title">{isPrivacy ? 'Privacy Policy' : 'Terms of Service'}</Text>
      <Text variant="caption" color={colors.textTertiary}>
        Last updated 2026-06-25
      </Text>
      <Spacer size={spacing.lg} />
      {sections.map((s, i) => (
        <View key={i}>
          {i > 0 ? <Divider /> : null}
          <Spacer size={spacing.md} />
          <Text variant="bodyStrong">{s.h}</Text>
          <Spacer size={spacing.xs} />
          <Text variant="body" color={colors.textSecondary} style={{ lineHeight: 22 }}>
            {s.b}
          </Text>
          <Spacer size={spacing.md} />
        </View>
      ))}
    </Screen>
  );
}

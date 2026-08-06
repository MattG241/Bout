import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Divider, Spacer, Eyebrow, WeightClassBadge, Loading, StateMessage } from '@/components/atoms';
import { getLeagueMembers, leaveLeague } from '@/lib/api';
import { inviteLink } from '@core/leagues';
import { useActiveLeague, useStore } from '@/store/useStore';
import { useBootstrapState } from '@/providers/Bootstrap';
import { useRouter } from 'expo-router';
import { colors, spacing, radius } from '@/design/tokens';
import type { WeightClass } from '@core/config';

export default function Crew() {
  const router = useRouter();
  const league = useActiveLeague();
  const { profile, leagues, setActiveLeague } = useStore();
  const { refresh } = useBootstrapState();
  const [members, setMembers] = useState<Array<{ user_id: string; handle: string; weight_class: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      if (!league) {
        setLoading(false);
        return;
      }
      setMembers(await getLeagueMembers(league.id));
      setLoading(false);
    })();
  }, [league]);

  if (loading) return <Screen><Loading /></Screen>;
  if (!league)
    return (
      <Screen>
        <StateMessage title="No crew" subtitle="Create or join a gym to compete with mates." />
      </Screen>
    );

  const isHouse = league.type === 'house';
  const code = league.invite_code ?? '';

  const copyCode = async () => {
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const shareInvite = async () => {
    const link = inviteLink(code);
    if (await Sharing.isAvailableAsync()) {
      // Sharing.shareAsync only takes file URLs; for a text invite we fall back to clipboard + alert.
      await Clipboard.setStringAsync(link);
      Alert.alert('Invite copied', `Send this to your crew:\n${link}`);
    } else {
      await Clipboard.setStringAsync(link);
      Alert.alert('Invite copied', link);
    }
  };
  const confirmLeave = () => {
    Alert.alert('Leave this gym?', 'You can rejoin later with the code.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          await leaveLeague(league.id);
          await refresh();
          router.replace('/');
        },
      },
    ]);
  };

  return (
    <Screen scroll>
      <Eyebrow>{isHouse ? 'HOUSE LEAGUE' : 'YOUR GYM'}</Eyebrow>
      <Spacer size={4} />
      <Text variant="title">{league.name}</Text>

      {leagues.length > 1 ? (
        <>
          <Spacer size={spacing.md} />
          <View style={styles.switchRow}>
            {leagues.map((l) => (
              <Pressable key={l.id} onPress={() => setActiveLeague(l.id)} style={[styles.switchChip, l.id === league.id && styles.switchChipOn]}>
                <Text variant="label" color={l.id === league.id ? colors.text : colors.textTertiary}>
                  {l.name.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      <Spacer size={spacing.xl} />

      {/* Invite controls (crew only) */}
      {!isHouse && code ? (
        <Card raised>
          <Eyebrow>INVITE CODE</Eyebrow>
          <Spacer size={spacing.sm} />
          <Pressable onPress={copyCode}>
            <Text variant="display" mono>
              {code}
            </Text>
          </Pressable>
          <Text variant="caption" color={copied ? colors.accent : colors.textTertiary}>
            {copied ? 'Copied to clipboard' : 'Tap the code to copy'}
          </Text>
          <Spacer size={spacing.lg} />
          <Button label="Share invite link" onPress={shareInvite} />
        </Card>
      ) : (
        <Card>
          <Text variant="body" color={colors.textSecondary}>
            You're matched with similar-skill players. Bring your own crew anytime to start a private gym.
          </Text>
          <Spacer size={spacing.md} />
          <Button label="Start your own gym" variant="secondary" onPress={() => router.push('/(auth)/league')} />
        </Card>
      )}

      <Spacer size={spacing.xl} />

      {/* Members */}
      <Eyebrow>MEMBERS · {members.length}</Eyebrow>
      <Spacer size={spacing.sm} />
      <Divider />
      {members.map((m) => (
        <View key={m.user_id} style={styles.memberRow}>
          <Text variant="bodyStrong" color={m.user_id === profile?.id ? colors.accent : colors.text}>
            {m.handle}
            {m.user_id === profile?.id ? '  (you)' : ''}
          </Text>
          <WeightClassBadge weightClass={m.weight_class as WeightClass} />
        </View>
      ))}

      <Spacer size={spacing.xl} />

      {/* Light banter surface — closed to the crew, no public feed */}
      <Card>
        <Eyebrow>GYM TALK</Eyebrow>
        <Spacer size={spacing.sm} />
        <Text variant="body" color={colors.textSecondary}>
          Trash talk lives with your results. Top the ladder and let the numbers do the talking —
          there's no public feed here, just your crew.
        </Text>
      </Card>

      <Spacer size={spacing.xl} />
      <Button label="Leave gym" variant="danger" onPress={confirmLeave} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  switchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  switchChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  switchChipOn: { borderColor: colors.borderStrong, backgroundColor: colors.surfaceRaised },
  memberRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
});

import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Card } from '@/components/Card';
import { Spacer, Eyebrow, Divider } from '@/components/atoms';
import { createCrew, joinByCode, matchHouseLeague } from '@/lib/api';
import { isValidInviteCode } from '@core/leagues';
import { useBootstrapState } from '@/providers/Bootstrap';
import { useStore } from '@/store/useStore';
import { colors, spacing } from '@/design/tokens';

/**
 * Onboarding league step. First-run CTA is "bring your crew" — create a gym and share the
 * invite, or join with a code. Solo users get matched into a house league (cold-start soft landing).
 */
export default function LeagueScreen() {
  const router = useRouter();
  const { refresh } = useBootstrapState();
  const { pendingInviteCode, setPendingInviteCode } = useStore();
  const [tab, setTab] = useState<'create' | 'join'>(pendingInviteCode ? 'join' : 'create');
  const [name, setName] = useState('');
  const [code, setCode] = useState(pendingInviteCode ?? '');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Arriving from an invite deep link: pre-fill the code, then clear the pending value.
  useEffect(() => {
    if (pendingInviteCode) {
      setCode(pendingInviteCode);
      setTab('join');
      setPendingInviteCode(null);
    }
  }, [pendingInviteCode, setPendingInviteCode]);

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    setError(null);
    try {
      await fn();
      await refresh();
      router.replace('/');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen scroll>
      <Eyebrow color={colors.accent}>STEP 2 OF 2</Eyebrow>
      <Spacer size={spacing.md} />
      <Text variant="title">Bring your crew</Text>
      <Spacer size={spacing.sm} />
      <Text variant="body" color={colors.textSecondary}>
        Bout is best with your mates. Start a gym and send the invite, or drop a code to join one.
      </Text>
      <Spacer size={spacing.xl} />

      <View style={styles.tabs}>
        <TabButton label="Start a gym" active={tab === 'create'} onPress={() => setTab('create')} />
        <TabButton label="Join with code" active={tab === 'join'} onPress={() => setTab('join')} />
      </View>
      <Spacer size={spacing.lg} />

      {tab === 'create' ? (
        <Card>
          <Input label="Gym name" value={name} onChangeText={setName} placeholder="The Sunday Sloggers" maxLength={30} />
          <Spacer size={spacing.lg} />
          <Button
            label="Create gym"
            loading={busy === 'create'}
            disabled={name.trim().length < 2}
            onPress={() => run('create', () => createCrew(name.trim()))}
          />
        </Card>
      ) : (
        <Card>
          <Input
            label="Invite code"
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            placeholder="AB3K9P"
            maxLength={6}
            mono
            autoCapitalize="characters"
          />
          <Spacer size={spacing.lg} />
          <Button
            label="Join gym"
            loading={busy === 'join'}
            disabled={!isValidInviteCode(code)}
            onPress={() => run('join', () => joinByCode(code))}
          />
        </Card>
      )}

      {error ? (
        <>
          <Spacer size={spacing.md} />
          <Text variant="caption" color={colors.danger}>
            {error === 'invalid_code' ? "That code didn't match a gym." : error}
          </Text>
        </>
      ) : null}

      <Spacer size={spacing.xl} />
      <Divider />
      <Spacer size={spacing.xl} />
      <Text variant="label" color={colors.textTertiary}>
        NO CREW YET?
      </Text>
      <Spacer size={spacing.sm} />
      <Text variant="body" color={colors.textSecondary}>
        We'll match you into a house league of similar players so you can start today.
      </Text>
      <Spacer size={spacing.md} />
      <Button label="Match me into a house league" variant="secondary" loading={busy === 'house'} onPress={() => run('house', matchHouseLeague)} />
    </Screen>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <View style={[styles.tab, active && styles.tabActive]} onTouchEnd={onPress}>
      <Text variant="bodyStrong" color={active ? colors.text : colors.textTertiary} center>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: spacing.sm },
  tab: { flex: 1, paddingVertical: spacing.md, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  tabActive: { borderColor: colors.borderStrong, backgroundColor: colors.surfaceRaised },
});

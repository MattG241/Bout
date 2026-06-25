import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Switch, Alert, Linking, Pressable, Platform } from 'react-native';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Divider, Spacer, Eyebrow } from '@/components/atoms';
import { useStore } from '@/store/useStore';
import { usePrefs } from '@/lib/prefs';
import { playCue } from '@/lib/sound';
import { useBootstrapState } from '@/providers/Bootstrap';
import { signOut, deleteAccount, setProfileEntitlements, getDeepStats, type DeepStats } from '@/lib/api';
import { registerForPushNotifications } from '@/lib/notifications';
import {
  getEntitlements,
  restorePurchases,
  isMonetizationConfigured,
  hasPremium,
  ENTITLEMENT_PREMIUM,
} from '@/lib/monetization';
import { useRouter } from 'expo-router';
import { colors, spacing } from '@/design/tokens';

export default function Settings() {
  const router = useRouter();
  const { profile, reset } = useStore();
  const { soundEnabled, setSoundEnabled, hapticsEnabled, setHapticsEnabled } = usePrefs();
  const { refresh } = useBootstrapState();
  const [pushOn, setPushOn] = useState(!!profile?.push_token);
  const [entitlements, setEntitlements] = useState<string[]>([]);
  const [deepStats, setDeepStats] = useState<DeepStats | null>(null);
  const [busy, setBusy] = useState(false);

  // Server-authoritative entitlement (set by the RevenueCat webhook) OR the live client check.
  const premium = profile?.entitlements?.[ENTITLEMENT_PREMIUM] === true || hasPremium(entitlements);

  useEffect(() => {
    getEntitlements().then(setEntitlements);
  }, []);
  useEffect(() => {
    if (premium) getDeepStats().then(setDeepStats);
  }, [premium]);

  const togglePush = async (next: boolean) => {
    setPushOn(next);
    if (next) {
      const token = await registerForPushNotifications();
      if (!token) {
        setPushOn(false);
        Alert.alert('Notifications off', 'Enable notifications in system settings to get the daily drop.');
      }
    }
  };

  const restore = async () => {
    setBusy(true);
    const ents = await restorePurchases();
    setEntitlements(ents);
    if (ents.length) {
      await setProfileEntitlements(ents);
      await refresh();
    }
    setBusy(false);
  };

  const doSignOut = async () => {
    await signOut();
    reset();
    await refresh();
    router.replace('/');
  };

  const confirmDelete = () => {
    // Two-step confirm for a destructive, irreversible action.
    Alert.alert(
      'Delete account?',
      'This permanently erases your profile, attempts, streaks, and standings. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Are you absolutely sure?', 'There is no way to recover your account.', [
              { text: 'Keep my account', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await deleteAccount();
                    reset();
                    await refresh();
                    router.replace('/');
                  } catch (e) {
                    Alert.alert('Could not delete', (e as Error).message);
                  }
                },
              },
            ]),
        },
      ],
    );
  };

  return (
    <Screen scroll>
      <Text variant="title">Settings</Text>
      <Spacer size={spacing.xl} />

      {/* Profile */}
      <Card>
        <Eyebrow>PROFILE</Eyebrow>
        <Spacer size={spacing.sm} />
        <Row label="Handle" value={profile?.handle ?? '—'} />
        <Divider />
        <Row label="Current streak" value={`${profile?.stats?.current_streak ?? 0} days`} />
        <Divider />
        <Row label="Best streak" value={`${profile?.stats?.best_streak ?? 0} days`} />
      </Card>

      <Spacer size={spacing.lg} />

      {/* Notifications */}
      <Card>
        <Eyebrow>NOTIFICATIONS</Eyebrow>
        <Spacer size={spacing.sm} />
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text variant="body">Daily drop</Text>
            <Text variant="caption" color={colors.textTertiary}>
              A morning nudge when today's bout is live. Windowed, never a fixed alarm.
            </Text>
          </View>
          <Switch
            value={pushOn}
            onValueChange={togglePush}
            trackColor={{ true: colors.accent, false: colors.borderStrong }}
            thumbColor={colors.text}
          />
        </View>
      </Card>

      <Spacer size={spacing.lg} />

      {/* Feedback: sound + haptics */}
      <Card>
        <Eyebrow>FEEDBACK</Eyebrow>
        <Spacer size={spacing.sm} />
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text variant="body">Sound effects</Text>
            <Text variant="caption" color={colors.textTertiary}>
              Subtle cues for taps, submits, and the result bell. Respects your silent switch.
            </Text>
          </View>
          <Switch
            value={soundEnabled}
            onValueChange={(v) => {
              setSoundEnabled(v);
              if (v) playCue('bell'); // a little preview when turning it on
            }}
            trackColor={{ true: colors.accent, false: colors.borderStrong }}
            thumbColor={colors.text}
          />
        </View>
        <Divider />
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text variant="body">Haptics</Text>
            <Text variant="caption" color={colors.textTertiary}>
              Light vibration feedback on key actions.
            </Text>
          </View>
          <Switch
            value={hapticsEnabled}
            onValueChange={setHapticsEnabled}
            trackColor={{ true: colors.accent, false: colors.borderStrong }}
            thumbColor={colors.text}
          />
        </View>
      </Card>

      <Spacer size={spacing.lg} />

      {/* Season pass (monetization — cleanly separable) */}
      <Card raised>
        <Eyebrow color={premium ? colors.accent : colors.textSecondary}>SEASON PASS</Eyebrow>
        <Spacer size={spacing.sm} />
        {premium ? (
          <Text variant="heading" color={colors.accent}>
            Active
          </Text>
        ) : (
          <Text variant="heading">Go deeper</Text>
        )}
        <Spacer size={spacing.sm} />
        <Text variant="body" color={colors.textSecondary}>
          Deeper stats, advanced puzzles, larger custom leagues, and the ability to create your
          crew's own bouts. Never pay-to-win — the daily fight is always free and fair.
        </Text>
        <Spacer size={spacing.lg} />
        {premium ? (
          <Button
            label="Manage subscription"
            variant="secondary"
            onPress={() =>
              Linking.openURL(
                Platform.OS === 'ios'
                  ? 'https://apps.apple.com/account/subscriptions'
                  : 'https://play.google.com/store/account/subscriptions',
              )
            }
          />
        ) : (
          <>
            <Button label="Get the season pass" onPress={() => router.push('/paywall')} />
            <Spacer size={spacing.sm} />
            <Button label="Restore purchases" variant="ghost" loading={busy} onPress={restore} />
          </>
        )}
        {!isMonetizationConfigured() ? (
          <Text variant="caption" color={colors.textTertiary} style={{ marginTop: spacing.sm }}>
            Store keys not set in this build (monetization layer is fully optional).
          </Text>
        ) : null}
      </Card>

      <Spacer size={spacing.lg} />

      {/* Deeper stats — a real entitlement-gated unlock */}
      <Card>
        <View style={styles.switchRow}>
          <Eyebrow color={premium ? colors.accent : colors.textTertiary}>DEEPER STATS</Eyebrow>
          {!premium ? (
            <Text variant="label" color={colors.textTertiary}>
              LOCKED
            </Text>
          ) : null}
        </View>
        <Spacer size={spacing.sm} />
        {premium ? (
          <>
            <Row label="Bouts played" value={`${deepStats?.played ?? 0}`} />
            <Divider />
            <Row label="Average accuracy" value={`${Math.round((deepStats?.avgAccuracy ?? 0) * 100)}%`} />
            <Divider />
            <Row label="Completion rate" value={`${Math.round((deepStats?.completionRate ?? 0) * 100)}%`} />
            <Divider />
            <Row label="Best score" value={`${deepStats?.bestScore ?? 0}`} />
          </>
        ) : (
          <Text variant="body" color={colors.textSecondary}>
            See your average accuracy, completion rate, and best-ever score. Unlocked with the
            Season Pass.
          </Text>
        )}
      </Card>

      <Spacer size={spacing.xl} />

      {/* Legal */}
      <Card>
        <Eyebrow>ABOUT</Eyebrow>
        <Spacer size={spacing.sm} />
        <Pressable style={styles.row} onPress={() => router.push('/(auth)/tour?replay=1')}>
          <Text variant="body">How to play</Text>
          <Text variant="body" color={colors.textTertiary}>›</Text>
        </Pressable>
        <Divider />
        <Pressable style={styles.row} onPress={() => router.push('/legal/privacy')}>
          <Text variant="body">Privacy policy</Text>
          <Text variant="body" color={colors.textTertiary}>›</Text>
        </Pressable>
        <Divider />
        <Pressable style={styles.row} onPress={() => router.push('/legal/terms')}>
          <Text variant="body">Terms of service</Text>
          <Text variant="body" color={colors.textTertiary}>›</Text>
        </Pressable>
      </Card>

      <Spacer size={spacing.xl} />
      <Button label="Sign out" variant="ghost" onPress={doSignOut} />
      <Spacer size={spacing.md} />
      <Button label="Delete account" variant="danger" onPress={confirmDelete} />
      <Spacer size={spacing.lg} />
      <Text variant="caption" color={colors.textTertiary} center>
        Bout v1.0.0 · {ENTITLEMENT_PREMIUM}
      </Text>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text variant="body" color={colors.textSecondary}>
        {label}
      </Text>
      <Text variant="data" mono>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});

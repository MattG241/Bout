import React, { useState } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Spacer, Divider, Eyebrow } from '@/components/atoms';
import { signInGuest, signInWithEmail, signUpWithEmail } from '@/lib/api';
import { useBootstrapState } from '@/providers/Bootstrap';
import { colors, spacing } from '@/design/tokens';

// The brand logo (assets/icon.png) — swap that file via `node scripts/apply-logo.mjs`.
// eslint-disable-next-line @typescript-eslint/no-require-imports -- require() is the RN way to reference a bundled asset
const logo = require('../../assets/icon.png');

/**
 * Welcome — the brand statement and the frictionless way in. Guest sign-in is the default
 * (the soft landing for the cold-start problem); email is available for those who want it.
 */
export default function Welcome() {
  const router = useRouter();
  const { refresh } = useBootstrapState();
  const [mode, setMode] = useState<'choose' | 'email-in' | 'email-up'>('choose');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const go = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await refresh();
      router.replace('/');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen contentStyle={styles.container}>
      <View style={styles.hero}>
        <Image source={logo} style={styles.logo} resizeMode="contain" />
        <Spacer size={spacing.xl} />
        <Eyebrow color={colors.accent}>DAILY BRAIN GAME · YOUR CREW</Eyebrow>
        <Spacer size={spacing.md} />
        <Text variant="display">BOUT</Text>
        <Spacer size={spacing.sm} />
        <Text variant="body" color={colors.textSecondary}>
          One puzzle a day. Same bout for everyone. Your result feeds a season-long crew ladder.
          Step into the ring.
        </Text>
      </View>

      <View>
        {mode === 'choose' && (
          <>
            <Button label="Get started" onPress={() => go(signInGuest)} loading={busy} />
            <Spacer size={spacing.md} />
            <Button label="I have an account" variant="secondary" onPress={() => setMode('email-in')} />
          </>
        )}

        {(mode === 'email-in' || mode === 'email-up') && (
          <>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@example.com"
            />
            <Spacer size={spacing.md} />
            <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" />
            {error ? (
              <>
                <Spacer size={spacing.sm} />
                <Text variant="caption" color={colors.danger}>
                  {error}
                </Text>
              </>
            ) : null}
            <Spacer size={spacing.lg} />
            <Button
              label={mode === 'email-in' ? 'Sign in' : 'Create account'}
              loading={busy}
              onPress={() =>
                go(() => (mode === 'email-in' ? signInWithEmail(email, password) : signUpWithEmail(email, password)))
              }
            />
            <Spacer size={spacing.md} />
            <Button
              label={mode === 'email-in' ? 'Create an account instead' : 'I already have one'}
              variant="ghost"
              onPress={() => setMode(mode === 'email-in' ? 'email-up' : 'email-in')}
            />
            <Spacer size={spacing.sm} />
            <Divider />
            <Spacer size={spacing.md} />
            <Button label="Continue as guest" variant="ghost" onPress={() => go(signInGuest)} />
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { justifyContent: 'space-between', paddingVertical: spacing.xxxl },
  hero: { flex: 1, justifyContent: 'center' },
  // Full app-icon tile; its own rounded corners + black edges blend into the black screen,
  // so no extra borderRadius (that was clipping the artwork and looking off).
  logo: { width: 104, height: 104 },
});

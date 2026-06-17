import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Spacer, Eyebrow } from '@/components/atoms';
import { ensureProfile, handleAvailable } from '@/lib/api';
import { useStore } from '@/store/useStore';
import { useBootstrapState } from '@/providers/Bootstrap';
import { colors, spacing } from '@/design/tokens';

const HANDLE_RE = /^[a-zA-Z0-9_]{3,20}$/;

export default function HandleScreen() {
  const router = useRouter();
  const { userId } = useStore();
  const { refresh } = useBootstrapState();
  const [handle, setHandle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!userId) return;
    if (!HANDLE_RE.test(handle)) {
      setError('3–20 letters, numbers or underscores.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const free = await handleAvailable(handle);
      if (!free) {
        setError('That handle is taken.');
        return;
      }
      await ensureProfile(userId, handle);
      await refresh();
      router.replace('/');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      footer={<Button label="Continue" loading={busy} onPress={submit} disabled={handle.length < 3} />}
    >
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Eyebrow color={colors.accent}>STEP 1 OF 2</Eyebrow>
        <Spacer size={spacing.md} />
        <Text variant="title">Pick your handle</Text>
        <Spacer size={spacing.sm} />
        <Text variant="body" color={colors.textSecondary}>
          This is how your crew sees you on the ladder. Choose well.
        </Text>
        <Spacer size={spacing.xl} />
        <Input
          value={handle}
          onChangeText={(t) => setHandle(t.replace(/\s/g, ''))}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="southpaw"
          maxLength={20}
          error={error ?? undefined}
          onSubmitEditing={submit}
        />
      </View>
    </Screen>
  );
}

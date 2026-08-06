import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { Loading, Spacer, StateMessage } from '@/components/atoms';
import { joinByCode } from '@/lib/api';
import { isValidInviteCode } from '@core/leagues';
import { useStore } from '@/store/useStore';
import { useBootstrapState } from '@/providers/Bootstrap';
import { colors } from '@/design/tokens';

/**
 * Deep-link target for invite links (bout://join/CODE and https://bout.app/join/CODE).
 * If the user is fully onboarded, join immediately. Otherwise stash the code and route them
 * through onboarding — the league step picks it up and pre-fills the join field.
 */
export default function JoinByLink() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const { state, refresh } = useBootstrapState();
  const { setPendingInviteCode } = useStore();
  const [error, setError] = useState<string | null>(null);
  const handled = useRef(false);

  useEffect(() => {
    const normalized = (code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!isValidInviteCode(normalized)) {
      setError("That invite link doesn't look right.");
      return;
    }

    if (state === 'loading' || handled.current) return;
    handled.current = true;

    (async () => {
      if (state === 'ready' || state === 'needs-league') {
        // Signed in with a handle — join now.
        try {
          await joinByCode(normalized);
          await refresh();
          router.replace('/(tabs)');
        } catch (e) {
          setError((e as Error).message === 'invalid_code' ? "That code didn't match a gym." : (e as Error).message);
        }
      } else {
        // Not onboarded yet — remember the code and send them to sign in / set a handle.
        setPendingInviteCode(normalized);
        router.replace('/');
      }
    })();
  }, [code, state, refresh, router, setPendingInviteCode]);

  if (error) {
    return (
      <Screen footer={<Button label="Continue" variant="secondary" onPress={() => router.replace('/')} />}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <StateMessage tone="error" title="Invite problem" subtitle={error} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Loading label="Joining the gym…" />
        <Spacer />
        <Text variant="caption" color={colors.textTertiary} center>
          {(code ?? '').toUpperCase()}
        </Text>
      </View>
    </Screen>
  );
}

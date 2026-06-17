import React from 'react';
import { View } from 'react-native';
import { Redirect } from 'expo-router';
import { useBootstrapState } from '@/providers/Bootstrap';
import { Loading } from '@/components/atoms';
import { colors } from '@/design/tokens';

/**
 * Routing hub. Sends the user to the right place based on bootstrap state:
 * signed-out → welcome, no profile → set handle, no league → onboarding, otherwise → app.
 */
export default function Index() {
  const { state } = useBootstrapState();

  if (state === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Loading label="Bout" />
      </View>
    );
  }
  if (state === 'signed-out') return <Redirect href="/(auth)/welcome" />;
  if (state === 'needs-handle') return <Redirect href="/(auth)/handle" />;
  if (state === 'needs-league') return <Redirect href="/(auth)/league" />;
  return <Redirect href="/(tabs)" />;
}

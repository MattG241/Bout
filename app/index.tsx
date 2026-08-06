import React from 'react';
import { View } from 'react-native';
import { Redirect } from 'expo-router';
import { useBootstrapState } from '@/providers/Bootstrap';
import { usePrefs } from '@/lib/prefs';
import { Loading } from '@/components/atoms';
import { colors } from '@/design/tokens';

/**
 * Routing hub. Sends the user to the right place based on bootstrap state:
 * signed-out → welcome, first-run → tour, no profile → handle, no league → onboarding, else → app.
 */
export default function Index() {
  const { state } = useBootstrapState();
  const hasSeenTour = usePrefs((s) => s.hasSeenTour);

  if (state === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Loading label="Bout" />
      </View>
    );
  }
  if (state === 'signed-out') return <Redirect href="/(auth)/welcome" />;
  // Just signed in and hasn't seen the explainer → run the tour first.
  if (!hasSeenTour) return <Redirect href="/(auth)/tour" />;
  if (state === 'needs-handle') return <Redirect href="/(auth)/handle" />;
  if (state === 'needs-league') return <Redirect href="/(auth)/league" />;
  return <Redirect href="/(tabs)" />;
}

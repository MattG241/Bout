import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { BootstrapProvider } from '@/providers/Bootstrap';
import { registerForPushNotifications, setupNotificationChannels } from '@/lib/notifications';
import { initSound } from '@/lib/sound';
import { colors } from '@/design/tokens';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  useEffect(() => {
    setupNotificationChannels();
    initSound(); // preload the subtle sound cues (no-op if audio is unavailable)
    // Hide splash shortly after mount; the bootstrap hub shows its own loading state.
    const t = setTimeout(() => SplashScreen.hideAsync().catch(() => {}), 350);
    return () => clearTimeout(t);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <BootstrapProvider>
          <PushRegistration />
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.bg },
              animation: 'fade',
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="play" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="result" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="race" />
            <Stack.Screen name="join/[code]" />
          </Stack>
        </BootstrapProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/** Registers for push once we have a session (best-effort, never blocks the UI). */
function PushRegistration() {
  useEffect(() => {
    registerForPushNotifications().catch(() => {});
  }, []);
  return null;
}

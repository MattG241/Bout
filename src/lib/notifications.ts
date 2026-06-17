/* eslint-disable @typescript-eslint/no-require-imports -- lazy-require keeps expo-notifications out of the Expo Go bundle path */
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { supabase } from './supabase';
import { updatePushToken } from './api';

/**
 * Push notifications across both platforms (APNs + FCM via Expo). Remote push was removed from
 * Expo Go in SDK 53, so we lazy-load expo-notifications and skip entirely in Expo Go — push is
 * exercised in a development/production build. This keeps the Expo Go experience clean and never
 * throws. The daily drop itself is windowed and sent server-side.
 */

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

type NotificationsModule = typeof import('expo-notifications');

function loadNotifications(): NotificationsModule | null {
  if (isExpoGo) return null;
  try {
    return require('expo-notifications') as NotificationsModule;
  } catch {
    return null;
  }
}

/** Android requires explicit notification channels; also sets the foreground handler. */
export async function setupNotificationChannels(): Promise<void> {
  const Notifications = loadNotifications();
  if (!Notifications) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('daily-drop', {
    name: "Today's bout",
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
    vibrationPattern: [0, 120],
    lightColor: '#00E676',
  });
}

/**
 * Ask permission, fetch the Expo push token, and persist it to the profile. No-ops safely in
 * Expo Go, when permission is denied, or before an EAS project id exists.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  const Notifications = loadNotifications();
  if (!Notifications) return null;

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== 'granted') return null;

  const projectId = (Constants.expoConfig?.extra as any)?.eas?.projectId;
  if (!projectId) return null; // no EAS project configured yet — can't mint a token

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  const { data: auth } = await supabase.auth.getUser();
  if (auth.user && token) {
    await updatePushToken(token, Platform.OS === 'ios' ? 'ios' : 'android');
  }
  return token;
}

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { supabase } from './supabase';
import { updatePushToken } from './api';

/**
 * Push notifications across both platforms. Expo push tokens bridge to APNs (iOS) and
 * FCM (Android). The daily drop is windowed and sent server-side; the client just registers
 * its token and routes taps. We never schedule a fixed-second local alarm.
 */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Android requires explicit notification channels; set them up once. */
export async function setupNotificationChannels(): Promise<void> {
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
 * Ask permission (handles the Android 13+ POST_NOTIFICATIONS runtime grant via Expo),
 * fetch the Expo push token, and persist it to the profile. Safe to call when signed out
 * (it just no-ops the upload).
 */
export async function registerForPushNotifications(): Promise<string | null> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== 'granted') return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  const tokenResp = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  const token = tokenResp.data;

  const { data: auth } = await supabase.auth.getUser();
  if (auth.user && token) {
    await updatePushToken(token, Platform.OS === 'ios' ? 'ios' : 'android');
  }
  return token;
}

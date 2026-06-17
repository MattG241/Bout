import { RefObject } from 'react';
import { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

/**
 * Capture a card view to a PNG and hand it to the native share sheet (iOS & Android).
 * Returns false if sharing isn't available so the caller can fall back gracefully.
 */
export async function shareCardImage(ref: RefObject<View | null>): Promise<boolean> {
  if (!ref.current) return false;
  const uri = await captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile' });
  const available = await Sharing.isAvailableAsync();
  if (!available) return false;
  await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your bout' });
  return true;
}

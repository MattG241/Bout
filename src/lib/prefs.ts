import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Device-level preferences, persisted to native storage (survives sign-out, no browser APIs).
 * Sound and haptics are on by default but fully optional.
 */
interface Prefs {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  setHapticsEnabled: (v: boolean) => void;
}

export const usePrefs = create<Prefs>()(
  persist(
    (set) => ({
      soundEnabled: true,
      hapticsEnabled: true,
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),
    }),
    { name: 'bout-prefs', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

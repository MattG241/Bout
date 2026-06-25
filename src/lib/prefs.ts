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
  /** First-run "how it works" tour — shown once, then never again on this install. */
  hasSeenTour: boolean;
  setSoundEnabled: (v: boolean) => void;
  setHapticsEnabled: (v: boolean) => void;
  setHasSeenTour: (v: boolean) => void;
}

export const usePrefs = create<Prefs>()(
  persist(
    (set) => ({
      soundEnabled: true,
      hapticsEnabled: true,
      hasSeenTour: false,
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),
      setHasSeenTour: (hasSeenTour) => set({ hasSeenTour }),
    }),
    { name: 'bout-prefs', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

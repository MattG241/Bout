/* eslint-disable @typescript-eslint/no-require-imports -- require() is the idiomatic way to reference bundled RN assets */
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { usePrefs } from './prefs';

/**
 * Subtle, optional sound layer. Respects the user's toggle and the iOS silent switch
 * (playsInSilentMode: false). Fully defensive — if audio is unavailable it simply no-ops, so
 * it can never break the app. Swap the WAVs in assets/sounds for pro audio without code changes.
 */
export type Cue = 'tap' | 'submit' | 'bell' | 'streak';

const SOURCES: Record<Cue, number> = {
  tap: require('../../assets/sounds/tap.wav'),
  submit: require('../../assets/sounds/submit.wav'),
  bell: require('../../assets/sounds/bell.wav'),
  streak: require('../../assets/sounds/streak.wav'),
};

const players: Partial<Record<Cue, AudioPlayer>> = {};
let ready = false;

/** Preload the cues once (call at app start). Safe to call repeatedly. */
export function initSound(): void {
  if (ready) return;
  try {
    // Subtle SFX should stay silent when the phone is on silent.
    setAudioModeAsync({ playsInSilentMode: false }).catch(() => {});
    (Object.keys(SOURCES) as Cue[]).forEach((cue) => {
      players[cue] = createAudioPlayer(SOURCES[cue]);
      players[cue]!.volume = 0.7;
    });
    ready = true;
  } catch {
    // Audio module unavailable (e.g. unsupported environment) — silently disable.
  }
}

/** Play a cue if sound is enabled. Never throws. */
export function playCue(cue: Cue): void {
  try {
    if (!usePrefs.getState().soundEnabled) return;
    if (!ready) initSound();
    const player = players[cue];
    if (!player) return;
    player.seekTo(0);
    player.play();
  } catch {
    // ignore
  }
}

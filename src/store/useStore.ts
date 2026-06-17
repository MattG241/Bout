import { create } from 'zustand';
import type { ProfileRow, LeagueRow } from '@/lib/database.types';

/**
 * Light global store (Zustand). Holds session-adjacent state the whole app reads:
 * the signed-in profile, the user's leagues, and the currently-selected league.
 * Everything else is fetched per-screen. No browser storage — Zustand keeps it in memory,
 * Supabase persists the session to AsyncStorage.
 */
interface AppState {
  userId: string | null;
  profile: ProfileRow | null;
  leagues: LeagueRow[];
  activeLeagueId: string | null;
  /** An invite code captured from a deep link before the user finished onboarding. */
  pendingInviteCode: string | null;

  setUserId: (id: string | null) => void;
  setProfile: (p: ProfileRow | null) => void;
  setLeagues: (l: LeagueRow[]) => void;
  setActiveLeague: (id: string | null) => void;
  setPendingInviteCode: (code: string | null) => void;
  reset: () => void;
}

export const useStore = create<AppState>((set) => ({
  userId: null,
  profile: null,
  leagues: [],
  activeLeagueId: null,
  pendingInviteCode: null,

  setUserId: (userId) => set({ userId }),
  setProfile: (profile) => set({ profile }),
  setLeagues: (leagues) =>
    set((s) => ({
      leagues,
      activeLeagueId: s.activeLeagueId && leagues.some((l) => l.id === s.activeLeagueId)
        ? s.activeLeagueId
        : (leagues[0]?.id ?? null),
    })),
  setActiveLeague: (activeLeagueId) => set({ activeLeagueId }),
  setPendingInviteCode: (pendingInviteCode) => set({ pendingInviteCode }),
  reset: () => set({ userId: null, profile: null, leagues: [], activeLeagueId: null }),
}));

/** Convenience selector for the active league object. */
export function useActiveLeague(): LeagueRow | null {
  const { leagues, activeLeagueId } = useStore();
  return leagues.find((l) => l.id === activeLeagueId) ?? null;
}

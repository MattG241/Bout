import { useCallback, useEffect, useState } from 'react';
import {
  getTodayPuzzle,
  getMyAttempt,
  getActiveSeason,
  getMyPrediction,
  getLeagueMembers,
} from '@/lib/api';
import { useActiveLeague, useStore } from '@/store/useStore';
import type { PuzzleRow, AttemptRow, SeasonRow, PredictionRow } from '@/lib/database.types';

export interface TodayData {
  loading: boolean;
  error: string | null;
  puzzle: PuzzleRow | null;
  attempt: AttemptRow | null;
  season: SeasonRow | null;
  prediction: PredictionRow | null;
  members: Array<{ user_id: string; handle: string; weight_class: string }>;
  streak: number;
  refresh: () => Promise<void>;
}

/** Loads everything the Today screen needs, in parallel, with progressive error handling. */
export function useToday(): TodayData {
  const league = useActiveLeague();
  const { profile } = useStore();
  const [state, setState] = useState<Omit<TodayData, 'refresh'>>({
    loading: true,
    error: null,
    puzzle: null,
    attempt: null,
    season: null,
    prediction: null,
    members: [],
    streak: profile?.stats?.current_streak ?? 0,
  });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const puzzle = await getTodayPuzzle();
      const [attempt, season, prediction, members] = await Promise.all([
        puzzle ? getMyAttempt(puzzle.id) : Promise.resolve(null),
        league ? getActiveSeason(league.id) : Promise.resolve(null),
        league ? getMyPrediction(league.id) : Promise.resolve(null),
        league ? getLeagueMembers(league.id) : Promise.resolve([]),
      ]);
      setState({
        loading: false,
        error: null,
        puzzle,
        attempt,
        season,
        prediction,
        members,
        streak: profile?.stats?.current_streak ?? 0,
      });
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: (e as Error).message }));
    }
  }, [league, profile?.stats?.current_streak]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, refresh: load };
}

import { useCallback, useEffect, useState } from 'react';
import { getActiveSeason, getStandings, subscribeStandings, type StandingWithHandle } from '@/lib/api';
import type { SeasonRow } from '@/lib/database.types';

/** Live season standings for a league, kept fresh over Realtime. */
export function useStandings(leagueId: string | null) {
  const [season, setSeason] = useState<SeasonRow | null>(null);
  const [rows, setRows] = useState<StandingWithHandle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRows = useCallback(async (seasonId: string) => {
    try {
      setRows(await getStandings(seasonId));
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!leagueId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const s = await getActiveSeason(leagueId);
      setSeason(s);
      if (s) await loadRows(s.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [leagueId, loadRows]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Subscribe to live changes for the active season.
  useEffect(() => {
    if (!season) return;
    const unsub = subscribeStandings(season.id, () => loadRows(season.id));
    return unsub;
  }, [season, loadRows]);

  return { season, rows, loading, error, refresh };
}

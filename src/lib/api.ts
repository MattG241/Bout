import { supabase } from './supabase';
import type {
  ProfileRow,
  LeagueRow,
  PuzzleRow,
  SeasonRow,
  StandingRow,
  AttemptRow,
  PredictionRow,
  LiveRaceRow,
} from './database.types';
import { generateInviteCode } from '@core/leagues';
import { localDate, deviceTimezone } from '@core/time';
import type { ScoreBreakdown } from '@core/scoring';

/** The user's LOCAL calendar date — the day whose bout they should see (Wordle-style). */
export function today(): string {
  return localDate(deviceTimezone());
}

// ---- Auth ----
export async function signInGuest(): Promise<void> {
  const { error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
}
export async function signUpWithEmail(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
}
export async function signInWithEmail(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

// ---- Profile ----
export async function getProfile(userId: string): Promise<ProfileRow | null> {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  return data ?? null;
}
export async function ensureProfile(userId: string, handle: string): Promise<ProfileRow> {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, handle, timezone: deviceTimezone() }, { onConflict: 'id' })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}
/** Keep the stored timezone current (call on launch so the morning push stays accurate). */
export async function syncTimezone(): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  await supabase.from('profiles').update({ timezone: deviceTimezone() }).eq('id', auth.user.id);
}
/** Permanently delete the account and all owned data (App Store requirement). */
export async function deleteAccount(): Promise<void> {
  const { error } = await supabase.functions.invoke('delete-account', { body: {} });
  if (error) throw error;
  await supabase.auth.signOut();
}

/**
 * Mirror active entitlements onto the profile immediately after a client-side purchase, so
 * premium reflects instantly (the RevenueCat webhook also re-confirms this server-side).
 */
export async function setProfileEntitlements(entitlements: string[]): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  const map: Record<string, boolean> = {};
  for (const e of entitlements) map[e] = true;
  await supabase.from('profiles').update({ entitlements: map }).eq('id', auth.user.id);
}

export interface DeepStats {
  played: number;
  avgAccuracy: number;
  bestScore: number;
  completionRate: number;
}
/** Premium "deeper stats" computed from the user's attempt history. */
export async function getDeepStats(): Promise<DeepStats> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { played: 0, avgAccuracy: 0, bestScore: 0, completionRate: 0 };
  const { data } = await supabase
    .from('attempts')
    .select('final_score, accuracy, completed')
    .eq('user_id', auth.user.id);
  const rows = data ?? [];
  if (rows.length === 0) return { played: 0, avgAccuracy: 0, bestScore: 0, completionRate: 0 };
  const played = rows.length;
  return {
    played,
    avgAccuracy: rows.reduce((a: number, r: any) => a + Number(r.accuracy), 0) / played,
    bestScore: Math.max(...rows.map((r: any) => r.final_score)),
    completionRate: rows.filter((r: any) => r.completed).length / played,
  };
}
export async function handleAvailable(handle: string): Promise<boolean> {
  const { data } = await supabase.from('profiles').select('id').eq('handle', handle).maybeSingle();
  return !data;
}
export async function updatePushToken(token: string, platform: 'ios' | 'android'): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  await supabase.from('profiles').update({ push_token: token, push_platform: platform }).eq('id', auth.user.id);
}

// ---- Leagues ----
export async function createCrew(name: string): Promise<LeagueRow> {
  const code = generateInviteCode();
  const { data, error } = await supabase.rpc('create_crew', { p_name: name, p_invite_code: code } as never);
  if (error) throw error;
  return data as unknown as LeagueRow;
}
export async function joinByCode(code: string): Promise<LeagueRow> {
  const { data, error } = await supabase.rpc('join_by_code', { p_code: code.toUpperCase() } as never);
  if (error) throw error;
  return data as unknown as LeagueRow;
}
export async function leaveLeague(leagueId: string): Promise<void> {
  const { error } = await supabase.rpc('leave_league', { p_league: leagueId } as never);
  if (error) throw error;
}
export async function matchHouseLeague(): Promise<{ leagueId: string }> {
  const { data, error } = await supabase.functions.invoke('match-house-league', { body: {} });
  if (error) throw error;
  return data as { leagueId: string };
}
export async function getMyLeagues(): Promise<LeagueRow[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data } = await supabase
    .from('memberships')
    .select('league:leagues(*)')
    .eq('user_id', auth.user.id);
  return (data ?? []).map((m: any) => m.league).filter(Boolean) as LeagueRow[];
}
export async function getLeagueMembers(
  leagueId: string,
): Promise<Array<{ user_id: string; handle: string; weight_class: string }>> {
  const { data } = await supabase
    .from('memberships')
    .select('user_id, weight_class, profile:profiles(handle)')
    .eq('league_id', leagueId);
  return (data ?? []).map((m: any) => ({ user_id: m.user_id, handle: m.profile?.handle ?? '—', weight_class: m.weight_class }));
}

// ---- Seasons & standings ----
export async function getActiveSeason(leagueId: string): Promise<SeasonRow | null> {
  const { data } = await supabase
    .from('seasons')
    .select('*')
    .eq('league_id', leagueId)
    .in('status', ['active', 'finals'])
    .order('starts_on', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}
export async function getPastSeasons(leagueId: string): Promise<SeasonRow[]> {
  const { data } = await supabase
    .from('seasons')
    .select('*')
    .eq('league_id', leagueId)
    .eq('status', 'complete')
    .order('starts_on', { ascending: false });
  return data ?? [];
}
export interface StandingWithHandle extends StandingRow {
  handle: string;
}
export async function getStandings(seasonId: string): Promise<StandingWithHandle[]> {
  const { data } = await supabase
    .from('standings')
    .select('*, profile:profiles(handle)')
    .eq('season_id', seasonId)
    .order('total_points', { ascending: false });
  return (data ?? []).map((s: any) => ({ ...s, handle: s.profile?.handle ?? '—' }));
}
export function subscribeStandings(seasonId: string, onChange: () => void) {
  const channel = supabase
    .channel(`standings:${seasonId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'standings', filter: `season_id=eq.${seasonId}` }, onChange)
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

// ---- Puzzle / attempt ----
export async function getTodayPuzzle(): Promise<PuzzleRow | null> {
  const { data } = await supabase
    .from('puzzles')
    .select('*')
    .eq('play_date', today())
    .eq('published', true)
    .maybeSingle();
  return data ?? null;
}
export async function getMyAttempt(puzzleId: string): Promise<AttemptRow | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase
    .from('attempts')
    .select('*')
    .eq('user_id', auth.user.id)
    .eq('puzzle_id', puzzleId)
    .maybeSingle();
  return data ?? null;
}
export async function startAttempt(puzzleId: string): Promise<string> {
  const { data, error } = await supabase.rpc('start_attempt', { p_puzzle: puzzleId } as never);
  if (error) throw error;
  return data as unknown as string; // server-stamped started_at
}
export interface SubmitResult {
  ok: boolean;
  attemptId?: string;
  breakdown: ScoreBreakdown;
  streak: { current: number; best: number };
  validation: { detail?: string };
  timeMs: number;
}
export async function submitAttempt(puzzleId: string, submission: unknown): Promise<SubmitResult> {
  const { data, error } = await supabase.functions.invoke('submit-attempt', {
    body: { puzzleId, submission },
  });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as SubmitResult;
}

// ---- Pick'em ----
export async function submitPrediction(
  leagueId: string,
  seasonId: string | null,
  predictedTopUserId: string,
): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('not signed in');
  const { error } = await supabase.from('predictions').upsert(
    {
      user_id: auth.user.id,
      league_id: leagueId,
      season_id: seasonId,
      play_date: today(),
      predicted_top_user_id: predictedTopUserId,
    },
    { onConflict: 'user_id,league_id,play_date' },
  );
  if (error) throw error;
}
export async function getMyPrediction(leagueId: string): Promise<PredictionRow | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase
    .from('predictions')
    .select('*')
    .eq('user_id', auth.user.id)
    .eq('league_id', leagueId)
    .eq('play_date', today())
    .maybeSingle();
  return data ?? null;
}

// ---- Live race (optional) ----
export async function createRace(puzzleId: string, leagueId: string | null): Promise<LiveRaceRow> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('not signed in');
  const { data, error } = await supabase
    .from('live_races')
    .insert({ puzzle_id: puzzleId, league_id: leagueId, host_user_id: auth.user.id, status: 'lobby' })
    .select('*')
    .single();
  if (error) throw error;
  await joinRace(data.id);
  return data;
}
export async function listOpenRaces(leagueId: string | null): Promise<LiveRaceRow[]> {
  let q = supabase.from('live_races').select('*').in('status', ['lobby', 'racing']);
  if (leagueId) q = q.eq('league_id', leagueId);
  const { data } = await q.order('created_at', { ascending: false });
  return data ?? [];
}
export async function joinRace(raceId: string): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('not signed in');
  await supabase
    .from('live_race_participants')
    .upsert({ race_id: raceId, user_id: auth.user.id }, { onConflict: 'race_id,user_id' });
}
export async function startRace(raceId: string): Promise<void> {
  await supabase.from('live_races').update({ status: 'racing', started_at: new Date().toISOString() }).eq('id', raceId);
}
/** Submit a race solve. Scoring + timing run server-side (the client lacks the solution). */
export async function finishRaceParticipant(raceId: string, submission: unknown): Promise<void> {
  const { error } = await supabase.functions.invoke('score-race', { body: { raceId, submission } });
  if (error) throw error;
}
export async function finalizeRace(raceId: string): Promise<void> {
  await supabase.functions.invoke('finalize-race', { body: { raceId } });
}
export function subscribeRace(raceId: string, onChange: () => void) {
  const channel = supabase
    .channel(`race:${raceId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'live_race_participants', filter: `race_id=eq.${raceId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'live_races', filter: `id=eq.${raceId}` }, onChange)
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

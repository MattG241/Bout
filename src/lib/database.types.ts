/**
 * Minimal hand-written database types mirroring the migrations. (In a real project these
 * would be generated via `supabase gen types typescript`, but we keep an explicit, readable
 * version so the app typechecks without a live project.)
 */
import type { WeightClass } from '@core/config';
import type { PuzzleTypeId, Difficulty } from '@core/puzzles/types';

export interface ProfileStats {
  current_streak?: number;
  best_streak?: number;
  last_played?: string;
}

export interface ProfileRow {
  id: string;
  handle: string;
  created_at: string;
  push_token: string | null;
  push_platform: 'ios' | 'android' | null;
  entitlements: Record<string, unknown>;
  stats: ProfileStats;
}

export interface LeagueRow {
  id: string;
  type: 'crew' | 'house';
  name: string;
  invite_code: string | null;
  owner_id: string | null;
  capacity: number;
  created_at: string;
}

export interface MembershipRow {
  id: string;
  user_id: string;
  league_id: string;
  weight_class: WeightClass;
  joined_at: string;
}

export interface SeasonRow {
  id: string;
  league_id: string;
  name: string;
  starts_on: string;
  ends_on: string;
  finals_starts_on: string;
  status: 'upcoming' | 'active' | 'finals' | 'complete';
  created_at: string;
}

export interface PuzzleRow {
  id: string;
  play_date: string;
  type: PuzzleTypeId;
  difficulty: Difficulty;
  payload: unknown;
  speed_window: { fastMs: number; slowMs: number } | null;
  fingerprint: string | null;
  published: boolean;
  created_at: string;
}

export interface AttemptRow {
  id: string;
  user_id: string;
  puzzle_id: string;
  season_id: string | null;
  league_id: string | null;
  completed: boolean;
  accuracy: number;
  time_ms: number;
  raw_score: number;
  streak_at_attempt: number;
  final_score: number;
  created_at: string;
}

export interface StandingRow {
  id: string;
  season_id: string;
  league_id: string;
  user_id: string;
  total_points: number;
  rank: number | null;
  weight_class: WeightClass;
  played_count: number;
  current_streak: number;
  best_streak: number;
  updated_at: string;
}

export interface PredictionRow {
  id: string;
  user_id: string;
  league_id: string;
  season_id: string | null;
  play_date: string;
  predicted_top_user_id: string;
  resolved: boolean;
  correct: boolean | null;
  points_awarded: number;
  created_at: string;
}

export interface LiveRaceRow {
  id: string;
  puzzle_id: string;
  league_id: string | null;
  host_user_id: string;
  status: 'lobby' | 'racing' | 'finished' | 'cancelled';
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface LiveRaceParticipantRow {
  race_id: string;
  user_id: string;
  joined_at: string;
  finished_at: string | null;
  time_ms: number | null;
  accuracy: number | null;
  place: number | null;
}

interface PurchaseRow {
  id: string;
  user_id: string;
  product: string;
  source: string;
  granted_at: string;
  expires_at: string | null;
}

/** Wraps a row type into the {Row,Insert,Update,Relationships} shape supabase-js expects. */
type Table<Row> = { Row: Row; Insert: Partial<Row>; Update: Partial<Row>; Relationships: [] };

/** Loose Database shape for the typed client — table rows are the source of truth above. */
export interface Database {
  public: {
    Tables: {
      profiles: { Row: ProfileRow; Insert: Partial<ProfileRow> & { id: string; handle: string }; Update: Partial<ProfileRow>; Relationships: [] };
      leagues: Table<LeagueRow>;
      memberships: Table<MembershipRow>;
      seasons: Table<SeasonRow>;
      puzzles: Table<PuzzleRow>;
      attempts: Table<AttemptRow>;
      standings: Table<StandingRow>;
      predictions: Table<PredictionRow>;
      live_races: Table<LiveRaceRow>;
      live_race_participants: Table<LiveRaceParticipantRow>;
      purchases: Table<PurchaseRow>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

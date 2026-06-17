/**
 * Pick'em side-bet — a daily one-tap "who tops your crew today" prediction.
 * Resolves after the day closes: correct picks earn a few points (luck + social layer
 * on top of skill). Pure resolution logic.
 */

import { PICKEM } from './config';

export interface PredictionInput {
  userId: string;
  predictedTopUserId: string;
}

export interface DayResultRow {
  userId: string;
  /** That user's final_score for the day (0 if they didn't play). */
  dayScore: number;
}

export interface ResolvedPrediction {
  userId: string;
  predictedTopUserId: string;
  actualTopUserId: string | null;
  correct: boolean;
  pointsAwarded: number;
}

/** Who actually topped the crew for the day? Highest dayScore; ties broken by id for determinism. */
export function actualDayWinner(results: DayResultRow[]): string | null {
  const played = results.filter((r) => r.dayScore > 0);
  if (played.length === 0) return null;
  return played.sort((a, b) => b.dayScore - a.dayScore || a.userId.localeCompare(b.userId))[0]!.userId;
}

export function resolvePredictions(
  predictions: PredictionInput[],
  results: DayResultRow[],
): ResolvedPrediction[] {
  const winner = actualDayWinner(results);
  return predictions.map((p) => {
    const correct = winner !== null && p.predictedTopUserId === winner;
    return {
      userId: p.userId,
      predictedTopUserId: p.predictedTopUserId,
      actualTopUserId: winner,
      correct,
      pointsAwarded: correct ? PICKEM.correctReward : 0,
    };
  });
}

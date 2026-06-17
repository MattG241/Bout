/**
 * BOUT scoring engine — pure, deterministic, server-authoritative.
 *
 * final_score = round((completion + accuracy + speed + improvement) * streak_multiplier)
 *
 * Implements the formula exactly as specified, reading every constant from `config.ts`.
 * No randomness, no I/O — so it is trivially unit-testable and identical on client and server.
 */

import { SCORING, SPEED } from './config';

export interface ScoreInputs {
  /** Did the user finish the bout? Incomplete attempts score 0 across the board. */
  completed: boolean;
  /** Accuracy in [0, 1]. 1 == flawless. Computed per-puzzle-type by the puzzle engine. */
  accuracy: number;
  /** Wall-clock solve time in milliseconds (server-measured between serve and submit). */
  timeMs: number;
  /** Consecutive days played *including today*. 1 == first day, no streak bonus yet. */
  streakDays: number;
  /** User's rolling N-day average pre-multiplier score (excluding today). null if no history. */
  rollingAverage: number | null;
  /** Optional per-type speed window; falls back to defaults. */
  speedWindow?: { fastMs: number; slowMs: number };
  /** Is the attempt happening during finals week? Doubles the final score. */
  isFinals?: boolean;
}

export interface ScoreBreakdown {
  completion: number;
  accuracy: number;
  speed: number;
  improvement: number;
  /** Sum of the four components before the streak multiplier. */
  preMultiplier: number;
  /** Streak multiplier in [base, max]. */
  streakMultiplier: number;
  /** Number of consecutive days reflected in the multiplier. */
  streakDays: number;
  /** Whether the finals doubling was applied. */
  finalsApplied: boolean;
  /** The committed score that goes on the ladder. */
  finalScore: number;
}

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));

/** Speed → [0, speedMax]. Faster is better, but the spread is deliberately small. */
export function speedPoints(timeMs: number, window?: { fastMs: number; slowMs: number }): number {
  const fastMs = window?.fastMs ?? SPEED.defaultFastMs;
  const slowMs = window?.slowMs ?? SPEED.defaultSlowMs;
  if (slowMs <= fastMs) return SCORING.speedMax;
  if (timeMs <= fastMs) return SCORING.speedMax;
  if (timeMs >= slowMs) return 0;
  const ratio = (slowMs - timeMs) / (slowMs - fastMs); // 1 at fast, 0 at slow
  return Math.round(clamp(ratio, 0, 1) * SCORING.speedMax);
}

/** Accuracy[0..1] → [0, accuracyMax]. */
export function accuracyPoints(accuracy: number): number {
  return Math.round(clamp(accuracy, 0, 1) * SCORING.accuracyMax);
}

/** Consecutive days → multiplier in [base, max]. Day 1 gives the base (no bonus). */
export function streakMultiplier(streakDays: number): number {
  const extraDays = Math.max(0, Math.floor(streakDays) - 1);
  const raw = SCORING.streak.base + extraDays * SCORING.streak.step;
  return clamp(raw, SCORING.streak.base, SCORING.streak.max);
}

/** +improvementBonus iff today's pre-multiplier beats the rolling average (strict). */
export function improvementPoints(preMultiplierToday: number, rollingAverage: number | null): number {
  if (rollingAverage === null) return 0; // No history yet → no bonus.
  return preMultiplierToday > rollingAverage ? SCORING.improvementBonus : 0;
}

export function scoreAttempt(inputs: ScoreInputs): ScoreBreakdown {
  if (!inputs.completed) {
    return {
      completion: 0,
      accuracy: 0,
      speed: 0,
      improvement: 0,
      preMultiplier: 0,
      streakMultiplier: streakMultiplier(inputs.streakDays),
      streakDays: inputs.streakDays,
      finalsApplied: false,
      finalScore: 0,
    };
  }

  const completion = SCORING.completionBase;
  const accuracy = accuracyPoints(inputs.accuracy);
  const speed = speedPoints(inputs.timeMs, inputs.speedWindow);

  // Improvement compares the *core* solve (completion+accuracy+speed) against history,
  // then the bonus itself is also part of the pre-multiplier sum.
  const coreBeforeImprovement = completion + accuracy + speed;
  const improvement = improvementPoints(coreBeforeImprovement, inputs.rollingAverage);

  const preMultiplier = coreBeforeImprovement + improvement;
  const mult = streakMultiplier(inputs.streakDays);

  let finalScore = Math.round(preMultiplier * mult);
  const finalsApplied = inputs.isFinals === true;
  if (finalsApplied) finalScore *= SCORING.finalsMultiplier;

  return {
    completion,
    accuracy,
    speed,
    improvement,
    preMultiplier,
    streakMultiplier: mult,
    streakDays: inputs.streakDays,
    finalsApplied,
    finalScore,
  };
}

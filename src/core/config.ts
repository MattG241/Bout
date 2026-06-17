/**
 * BOUT — central balance config.
 *
 * Every tunable game constant lives here so balancing the economy is trivial and
 * never requires hunting through logic. This object is the single source of truth
 * shared by the client and the server-authoritative Supabase Edge Functions.
 */

export const SCORING = {
  /** Flat points for finishing the bout at all. */
  completionBase: 100,
  /** Max accuracy points for a flawless solve. */
  accuracyMax: 100,
  /** Speed is a *minor* edge only — capped low on purpose (rule #3: no speed leaderboard). */
  speedMax: 25,
  /** Flat bonus when today's pre-multiplier score beats the rolling N-day average. */
  improvementBonus: 25,
  /** Rolling window (days) used for the improvement bonus comparison. */
  improvementWindowDays: 7,
  /** Streak multiplier: +`streakStep` per consecutive day, capped. */
  streak: {
    /** Multiplier added per consecutive day played. 0.02 == +2%. */
    step: 0.02,
    /** Base multiplier with no streak. */
    base: 1.0,
    /** Hard cap on the multiplier (1.30 == +30%). */
    max: 1.3,
  },
  /** Finals week doubles every final_score. */
  finalsMultiplier: 2,
} as const;

export const SPEED = {
  /**
   * Per-type "reasonable range" for solve time in milliseconds. Solving at/under
   * `fastMs` earns the full speed bonus; solving at/over `slowMs` earns zero.
   * Linear in between. Tuned so the spread is small (rule #3).
   */
  defaultFastMs: 20_000,
  defaultSlowMs: 120_000,
} as const;

export const SEASON = {
  regularSeasonWeeks: 4,
  finalsWeeks: 1,
  offSeasonDays: 2,
  /** Promotion/relegation counts between adjacent weight classes at season end. */
  promoteTopN: 3,
  relegateBottomN: 3,
} as const;

export const PICKEM = {
  /** Points awarded for a correct "who tops your crew today" prediction. */
  correctReward: 15,
} as const;

export const PUSH = {
  /** Daily-drop notification window (local hours, 24h). Not a fixed-second alarm. */
  dropWindowStartHour: 8,
  dropWindowEndHour: 10,
} as const;

/** Weight classes (skill divisions), lightest to heaviest. */
export const WEIGHT_CLASSES = [
  'flyweight',
  'lightweight',
  'welterweight',
  'middleweight',
  'heavyweight',
] as const;

export type WeightClass = (typeof WEIGHT_CLASSES)[number];

/** Season-one seeding tier (everyone starts here, then promotion/relegation sorts skill). */
export const SEED_WEIGHT_CLASS: WeightClass = 'welterweight';

export const Config = {
  SCORING,
  SPEED,
  SEASON,
  PICKEM,
  PUSH,
  WEIGHT_CLASSES,
  SEED_WEIGHT_CLASS,
} as const;

export type ScoringConfig = typeof SCORING;

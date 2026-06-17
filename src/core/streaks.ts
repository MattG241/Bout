/**
 * Streak tracking — consecutive calendar days with a completed attempt.
 *
 * Streaks carry across season resets (do not punish loyal players), so this is a
 * pure function of play dates, independent of seasons. All dates are ISO `YYYY-MM-DD`
 * strings in the league's reference timezone (resolved upstream).
 */

const MS_PER_DAY = 86_400_000;

/** Parse a `YYYY-MM-DD` date string to a UTC-midnight epoch (timezone handled upstream). */
function toDayNumber(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number);
  return Math.floor(Date.UTC(y!, (m! - 1), d!) / MS_PER_DAY);
}

/**
 * Given the previous streak and the last play date, compute the new streak after a
 * completed attempt on `today`.
 *
 * - Same day again → unchanged (one puzzle per day; duplicates can't inflate streaks).
 * - Consecutive day → +1.
 * - Gap of 2+ days → resets to 1.
 * - No prior history → 1.
 */
export function nextStreak(args: {
  previousStreak: number;
  lastPlayedDate: string | null;
  today: string;
}): number {
  const { previousStreak, lastPlayedDate, today } = args;
  if (!lastPlayedDate) return 1;

  const gap = toDayNumber(today) - toDayNumber(lastPlayedDate);
  if (gap <= 0) return Math.max(1, previousStreak); // same day or clock skew → no change
  if (gap === 1) return previousStreak + 1; // consecutive
  return 1; // missed at least one day → reset
}

/** Is `current`'s streak still alive given today's date (no completed attempt yet today)? */
export function streakIsAlive(lastPlayedDate: string | null, today: string): boolean {
  if (!lastPlayedDate) return false;
  const gap = toDayNumber(today) - toDayNumber(lastPlayedDate);
  return gap <= 1;
}

/** Rolling average of the last `windowDays` pre-multiplier scores, or null if empty. */
export function rollingAverage(recentPreMultiplierScores: number[], windowDays: number): number | null {
  if (recentPreMultiplierScores.length === 0) return null;
  const window = recentPreMultiplierScores.slice(-windowDays);
  const sum = window.reduce((a, b) => a + b, 0);
  return sum / window.length;
}

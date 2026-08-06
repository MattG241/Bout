/**
 * Daily rotation — one type per day so different brains win on different days.
 * The harder "feature" puzzle lands on the weekend.
 */

import type { Difficulty, PuzzleTypeId } from './types';

/** dayOfWeek: 0=Sunday … 6=Saturday (matches Date.getUTCDay / getDay). */
export function typeForDayOfWeek(dayOfWeek: number): PuzzleTypeId {
  switch (dayOfWeek) {
    case 1:
      return 'word'; // Monday — ease in
    case 2:
      return 'logic';
    case 3:
      return 'number';
    case 4:
      return 'visual';
    case 5:
      return 'memory';
    case 6:
      return 'weekend'; // Saturday — the harder feature bout
    case 0:
    default:
      return 'trivia'; // Sunday
  }
}

export function difficultyForDayOfWeek(dayOfWeek: number): Difficulty {
  if (dayOfWeek === 6) return 'hard'; // Saturday feature
  if (dayOfWeek === 1) return 'easy'; // Monday warm-up
  return 'medium';
}

/** Resolve type + difficulty for an ISO `YYYY-MM-DD` play date. */
export function scheduleForDate(playDate: string): { type: PuzzleTypeId; difficulty: Difficulty } {
  const [y, m, d] = playDate.split('-').map(Number);
  const dow = new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay();
  return { type: typeForDayOfWeek(dow), difficulty: difficultyForDayOfWeek(dow) };
}

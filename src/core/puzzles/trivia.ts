/**
 * TRIVIA-LITE — "complete the pattern". Everyday sequences (weekdays, months, letters,
 * counting) — skill and pattern recognition, never obscure knowledge. Multiple choice
 * with exactly one correct continuation.
 */

import type { GeneratedPuzzle, PuzzleType, Rng, Difficulty, SelfCheckResult } from './types';

export interface TriviaPayload {
  prompt: string;
  sequence: string[];
  options: string[];
}
export interface TriviaSolution {
  answer: string;
}
export interface TriviaSubmission {
  answer: string;
}

const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

type Series = { prompt: string; seq: string[] };

function buildSeries(rng: Rng, difficulty: Difficulty): Series {
  const kind = rng.pick(['weekday', 'month', 'letter', 'count', 'skip'] as const);
  const len = difficulty === 'hard' ? 5 : 4;
  switch (kind) {
    case 'weekday': {
      const start = rng.int(0, 6);
      const seq = Array.from({ length: len }, (_, i) => WEEKDAYS[(start + i) % 7]!);
      return { prompt: 'What comes next?', seq };
    }
    case 'month': {
      const start = rng.int(0, 11);
      const seq = Array.from({ length: len }, (_, i) => MONTHS[(start + i) % 12]!);
      return { prompt: 'What comes next?', seq };
    }
    case 'letter': {
      const start = rng.int(0, 26 - (len + 1));
      const seq = Array.from({ length: len }, (_, i) => LETTERS[start + i]!);
      return { prompt: 'Which letter is next?', seq };
    }
    case 'skip': {
      const start = rng.int(1, 9);
      const step = rng.pick([2, 3, 5]);
      const seq = Array.from({ length: len }, (_, i) => String(start + i * step));
      return { prompt: `Continue the pattern`, seq };
    }
    case 'count':
    default: {
      const start = rng.int(1, 20);
      const seq = Array.from({ length: len }, (_, i) => String(start + i));
      return { prompt: 'What number is next?', seq };
    }
  }
}

/** Deterministically compute the true next element of a series. */
function nextOf(seq: string[]): string {
  // Weekday / month: cyclic label series.
  if (WEEKDAYS.includes(seq[0]!)) {
    const idx = WEEKDAYS.indexOf(seq[seq.length - 1]!);
    return WEEKDAYS[(idx + 1) % 7]!;
  }
  if (MONTHS.includes(seq[0]!)) {
    const idx = MONTHS.indexOf(seq[seq.length - 1]!);
    return MONTHS[(idx + 1) % 12]!;
  }
  if (LETTERS.includes(seq[0]!) && seq[0]!.length === 1) {
    const idx = LETTERS.indexOf(seq[seq.length - 1]!);
    return LETTERS[(idx + 1) % 26]!;
  }
  // Numeric arithmetic series.
  const nums = seq.map(Number);
  const step = nums[1]! - nums[0]!;
  return String(nums[nums.length - 1]! + step);
}

function distractorsFor(rng: Rng, seq: string[], answer: string): string[] {
  const pool = new Set<string>();
  if (WEEKDAYS.includes(answer)) WEEKDAYS.forEach((d) => pool.add(d));
  else if (MONTHS.includes(answer)) MONTHS.forEach((m) => pool.add(m));
  else if (LETTERS.includes(answer) && answer.length === 1) {
    const idx = LETTERS.indexOf(answer);
    [-2, -1, 1, 2].forEach((d) => pool.add(LETTERS[(idx + d + 26) % 26]!));
  } else {
    const n = Number(answer);
    [-3, -2, -1, 1, 2, 3].forEach((d) => pool.add(String(n + d)));
  }
  pool.delete(answer);
  seq.forEach((s) => pool.delete(s)); // don't offer something already shown
  const choices = rng.shuffle([...pool]).slice(0, 3);
  return choices;
}

export const triviaType: PuzzleType<TriviaPayload, TriviaSolution> = {
  id: 'trivia',
  label: 'Trivia-lite',

  generate(rng: Rng, difficulty: Difficulty): GeneratedPuzzle<TriviaPayload, TriviaSolution> {
    const series = buildSeries(rng, difficulty);
    const answer = nextOf(series.seq);
    const options = rng.shuffle([answer, ...distractorsFor(rng, series.seq, answer)]);
    return {
      type: 'trivia',
      difficulty,
      payload: { prompt: series.prompt, sequence: series.seq, options },
      solution: { answer },
      speedWindow: { fastMs: 8_000, slowMs: 60_000 },
    };
  },

  validate(submission, solution) {
    const sub = (submission ?? {}) as TriviaSubmission;
    const answer = (sub.answer ?? '').toString();
    if (!answer) return { completed: false, accuracy: 0, detail: 'No choice' };
    const correct = answer === solution.answer;
    return { completed: true, accuracy: correct ? 1 : 0, detail: correct ? 'Correct' : 'Wrong' };
  },

  selfCheck(puzzle): SelfCheckResult {
    const { payload, solution } = puzzle;
    if (!payload.options.includes(solution.answer))
      return { ok: false, reason: 'answer not among the options' };
    if (new Set(payload.options).size !== payload.options.length)
      return { ok: false, reason: 'duplicate options' };
    // Re-derive the true next element and confirm it matches the stated solution.
    const recomputed = nextOf(payload.sequence);
    if (recomputed !== solution.answer)
      return { ok: false, reason: 'solution is not the true continuation' };
    const correctCount = payload.options.filter((o) => o === recomputed).length;
    if (correctCount !== 1) return { ok: false, reason: 'not exactly one correct option' };
    return { ok: true };
  },
};

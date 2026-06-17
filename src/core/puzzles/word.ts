/**
 * WORD — anagram unscramble. Rearrange the scrambled letters into the hidden word.
 * Uniquely verifiable: the answer is a single curated word; wasted guesses cut accuracy.
 */

import type { GeneratedPuzzle, PuzzleType, Rng, Difficulty, SelfCheckResult } from './types';

export interface WordPayload {
  scrambled: string;
  length: number;
  /** A short, fair hint (definition-style), never the word itself. */
  hint: string;
}
export interface WordSolution {
  answer: string;
}
export interface WordSubmission {
  answer: string;
  /** Wrong final guesses before the correct one; reduces accuracy. */
  wastedGuesses?: number;
}

interface Entry {
  word: string;
  hint: string;
}

// Common, fair words (skill not obscure). Grouped by length for difficulty scaling.
const WORDS: Record<Difficulty, Entry[]> = {
  easy: [
    { word: 'plant', hint: 'It grows in soil' },
    { word: 'river', hint: 'Water flows along it' },
    { word: 'stone', hint: 'A small rock' },
    { word: 'light', hint: 'Opposite of dark' },
    { word: 'cloud', hint: 'It drifts across the sky' },
    { word: 'bread', hint: 'You slice it for toast' },
    { word: 'chair', hint: 'You sit on it' },
    { word: 'green', hint: 'Colour of grass' },
  ],
  medium: [
    { word: 'planet', hint: 'Earth is one' },
    { word: 'garden', hint: 'Where flowers are grown' },
    { word: 'bridge', hint: 'It spans a river' },
    { word: 'silver', hint: 'A precious metal' },
    { word: 'window', hint: 'You look through it' },
    { word: 'forest', hint: 'Many trees together' },
    { word: 'rocket', hint: 'It launches into space' },
    { word: 'pencil', hint: 'You write with it' },
  ],
  hard: [
    { word: 'compass', hint: 'It points north' },
    { word: 'diamond', hint: 'A hard gemstone' },
    { word: 'gravity', hint: 'It pulls things down' },
    { word: 'journey', hint: 'A long trip' },
    { word: 'lantern', hint: 'A portable light' },
    { word: 'thunder', hint: 'It follows lightning' },
  ],
};

function scramble(rng: Rng, word: string): string {
  // Ensure the scramble differs from the original.
  let s = word;
  let attempts = 0;
  while (s === word && attempts < 20) {
    s = rng.shuffle(word.split('')).join('');
    attempts++;
  }
  if (s === word) {
    // Last resort: rotate by one so it never equals the original (len>1 guaranteed).
    s = word.slice(1) + word[0];
  }
  return s;
}

export const wordType: PuzzleType<WordPayload, WordSolution> = {
  id: 'word',
  label: 'Word',

  generate(rng: Rng, difficulty: Difficulty): GeneratedPuzzle<WordPayload, WordSolution> {
    const entry = rng.pick(WORDS[difficulty]);
    const scrambled = scramble(rng, entry.word);
    return {
      type: 'word',
      difficulty,
      payload: { scrambled, length: entry.word.length, hint: entry.hint },
      solution: { answer: entry.word },
      speedWindow: { fastMs: 8_000, slowMs: 90_000 },
    };
  },

  validate(submission, solution, payload) {
    const sub = (submission ?? {}) as WordSubmission;
    const answer = (sub.answer ?? '').trim().toLowerCase();
    const completed = answer.length === payload.length;
    if (answer !== solution.answer.toLowerCase()) {
      return { completed, accuracy: 0, detail: completed ? 'Not the word' : 'Incomplete' };
    }
    const wasted = Math.max(0, Math.floor(sub.wastedGuesses ?? 0));
    const accuracy = Math.max(0, 1 - wasted * 0.15);
    return { completed: true, accuracy, detail: wasted === 0 ? 'Flawless' : `${wasted} wasted guess(es)` };
  },

  selfCheck(puzzle): SelfCheckResult {
    const { payload, solution } = puzzle;
    if (solution.answer.length !== payload.length) return { ok: false, reason: 'length mismatch' };
    if (payload.scrambled.toLowerCase() === solution.answer.toLowerCase())
      return { ok: false, reason: 'scramble equals answer (no puzzle)' };
    const a = payload.scrambled.toLowerCase().split('').sort().join('');
    const b = solution.answer.toLowerCase().split('').sort().join('');
    if (a !== b) return { ok: false, reason: 'scramble is not an anagram of the answer' };
    if (!payload.hint || payload.hint.toLowerCase().includes(solution.answer.toLowerCase()))
      return { ok: false, reason: 'hint missing or leaks the answer' };
    return { ok: true };
  },
};

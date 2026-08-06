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
// A deep bank — combined with scramble-permutation entropy this yields effectively
// unlimited distinct word puzzles (see stream.ts + the uniqueness tests).
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
    { word: 'beach', hint: 'Sand meets the sea' },
    { word: 'clock', hint: 'It tells the time' },
    { word: 'mouse', hint: 'A small rodent' },
    { word: 'piano', hint: 'It has black and white keys' },
    { word: 'apple', hint: 'Keeps the doctor away' },
    { word: 'storm', hint: 'Wild weather' },
    { word: 'brush', hint: 'You paint with it' },
    { word: 'candle', hint: 'A wax light' },
    { word: 'grape', hint: 'Wine is made from it' },
    { word: 'house', hint: 'You live in it' },
    { word: 'sugar', hint: 'It makes things sweet' },
    { word: 'tiger', hint: 'A big striped cat' },
    { word: 'water', hint: 'You drink it' },
    { word: 'glass', hint: 'A window is made of it' },
    { word: 'snake', hint: 'A legless reptile' },
    { word: 'train', hint: 'It runs on rails' },
    { word: 'ocean', hint: 'A vast body of water' },
    { word: 'lemon', hint: 'A sour yellow fruit' },
    { word: 'horse', hint: 'You can ride it' },
    { word: 'bench', hint: 'A seat in the park' },
    { word: 'flame', hint: 'Part of a fire' },
    { word: 'crown', hint: 'A king wears it' },
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
    { word: 'candle', hint: 'A wax light source' },
    { word: 'orange', hint: 'A citrus fruit and a colour' },
    { word: 'castle', hint: 'A fortified home for royalty' },
    { word: 'guitar', hint: 'A six-string instrument' },
    { word: 'island', hint: 'Land surrounded by water' },
    { word: 'market', hint: 'Where goods are sold' },
    { word: 'tunnel', hint: 'A passage through a hill' },
    { word: 'jacket', hint: 'You wear it when cold' },
    { word: 'shadow', hint: 'Cast when light is blocked' },
    { word: 'frozen', hint: 'Turned to ice' },
    { word: 'butter', hint: 'You spread it on toast' },
    { word: 'desert', hint: 'A vast dry land' },
    { word: 'engine', hint: 'It powers a car' },
    { word: 'hammer', hint: 'It drives nails' },
    { word: 'ladder', hint: 'You climb its rungs' },
    { word: 'magnet', hint: 'It attracts iron' },
    { word: 'pillow', hint: 'You rest your head on it' },
    { word: 'ribbon', hint: 'It ties a bow' },
    { word: 'saddle', hint: 'A seat on a horse' },
    { word: 'temple', hint: 'A place of worship' },
    { word: 'violin', hint: 'A bowed string instrument' },
    { word: 'winter', hint: 'The coldest season' },
  ],
  hard: [
    { word: 'compass', hint: 'It points north' },
    { word: 'diamond', hint: 'A hard gemstone' },
    { word: 'gravity', hint: 'It pulls things down' },
    { word: 'journey', hint: 'A long trip' },
    { word: 'lantern', hint: 'A portable light' },
    { word: 'thunder', hint: 'It follows lightning' },
    { word: 'kitchen', hint: 'Where meals are cooked' },
    { word: 'harvest', hint: 'Gathering the crops' },
    { word: 'mineral', hint: 'A natural solid like quartz' },
    { word: 'orchard', hint: 'Where fruit trees grow' },
    { word: 'painter', hint: 'An artist with a brush' },
    { word: 'quarter', hint: 'One of four equal parts' },
    { word: 'soldier', hint: 'Serves in an army' },
    { word: 'teacher', hint: 'Leads a classroom' },
    { word: 'volcano', hint: 'It can erupt with lava' },
    { word: 'whisper', hint: 'To speak very softly' },
    { word: 'biscuit', hint: 'A crunchy baked treat' },
    { word: 'captain', hint: 'Leads a ship or team' },
    { word: 'crystal', hint: 'A clear, faceted solid' },
    { word: 'freedom', hint: 'The state of being free' },
    { word: 'gateway', hint: 'An entrance or portal' },
    { word: 'machine', hint: 'A mechanical device' },
    { word: 'pyramid', hint: 'A four-sided monument' },
    { word: 'rainbow', hint: 'Arc of colour after rain' },
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

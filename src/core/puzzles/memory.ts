/**
 * MEMORY — recall the sequence. The client flashes a sequence of symbols, hides it,
 * then the player reproduces it. The server validates the recalled order.
 * Accuracy is the fraction of positions recalled correctly.
 */

import type { GeneratedPuzzle, PuzzleType, Rng, Difficulty, SelfCheckResult } from './types';

export interface MemoryPayload {
  /** Symbols available to choose from when recalling (the "keypad"). */
  alphabet: string[];
  /** How long the sequence is (client shows it for ~`flashMs`). */
  length: number;
  /** How long to flash the sequence before hiding (client hint). */
  flashMs: number;
}
export interface MemorySolution {
  sequence: string[];
}
export interface MemorySubmission {
  sequence: string[];
}

// Neutral, non-emoji glyphs that render cleanly in the minimal UI.
const ALPHABET = ['A', 'B', 'C', 'D', 'E', 'F'];

export const memoryType: PuzzleType<MemoryPayload, MemorySolution> = {
  id: 'memory',
  label: 'Memory',

  generate(rng: Rng, difficulty: Difficulty): GeneratedPuzzle<MemoryPayload, MemorySolution> {
    const length = difficulty === 'easy' ? 5 : difficulty === 'medium' ? 7 : 9;
    const alphabetSize = difficulty === 'hard' ? 6 : 4;
    const alphabet = ALPHABET.slice(0, alphabetSize);
    const sequence: string[] = [];
    for (let i = 0; i < length; i++) sequence.push(rng.pick(alphabet));
    const flashMs = difficulty === 'easy' ? 4000 : difficulty === 'medium' ? 3500 : 3000;
    return {
      type: 'memory',
      difficulty,
      payload: { alphabet, length, flashMs },
      // The full sequence is the solution — held server-side only.
      solution: { sequence },
      speedWindow: { fastMs: 6_000, slowMs: 45_000 },
    };
  },

  validate(submission, solution, payload) {
    const sub = (submission ?? {}) as MemorySubmission;
    const seq = Array.isArray(sub.sequence) ? sub.sequence : [];
    const completed = seq.length === payload.length;
    if (!completed) return { completed: false, accuracy: 0, detail: 'Incomplete recall' };
    let correct = 0;
    for (let i = 0; i < solution.sequence.length; i++) if (seq[i] === solution.sequence[i]) correct++;
    return {
      completed: true,
      accuracy: correct / solution.sequence.length,
      detail: `${correct}/${solution.sequence.length} recalled`,
    };
  },

  selfCheck(puzzle): SelfCheckResult {
    const { payload, solution } = puzzle;
    if (solution.sequence.length !== payload.length)
      return { ok: false, reason: 'sequence length mismatch' };
    if (solution.sequence.some((s) => !payload.alphabet.includes(s)))
      return { ok: false, reason: 'sequence uses a symbol outside the alphabet' };
    return { ok: true };
  },
};

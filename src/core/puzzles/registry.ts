/**
 * Puzzle registry + daily generator + the mandatory pre-publish validator.
 *
 * Adding a new puzzle type = implement `PuzzleType` and add it here. Nothing else changes.
 */

import type { AnswerSubmission, GeneratedPuzzle, PuzzleType, PuzzleTypeId, ValidationResult } from './types';
import { makeRng, dailySeed } from './rng';
import { scheduleForDate } from './rotation';
import { wordType } from './word';
import { logicType } from './logic';
import { numberType } from './number';
import { visualType } from './visual';
import { memoryType } from './memory';
import { triviaType } from './trivia';
import { weekendType } from './weekend';

export const PUZZLE_TYPES: Record<PuzzleTypeId, PuzzleType<any, any>> = {
  word: wordType,
  logic: logicType,
  number: numberType,
  visual: visualType,
  memory: memoryType,
  trivia: triviaType,
  weekend: weekendType,
};

export function getPuzzleType(id: PuzzleTypeId): PuzzleType<any, any> {
  const t = PUZZLE_TYPES[id];
  if (!t) throw new Error(`Unknown puzzle type: ${id}`);
  return t;
}

export class PuzzleValidationError extends Error {
  constructor(
    public readonly typeId: PuzzleTypeId,
    public readonly reason: string,
  ) {
    super(`Puzzle [${typeId}] failed validation: ${reason}`);
    this.name = 'PuzzleValidationError';
  }
}

/**
 * Generate the canonical puzzle for a play date, server-side and deterministic.
 *
 * Runs the mandatory validator and retries with a salted seed if a generated instance is
 * ever ambiguous/unsolvable, so a publishable, single-solution puzzle is always returned.
 * If no valid instance is found within the retry budget, it throws rather than publish junk.
 */
export function generateDailyPuzzle(playDate: string, leagueSalt = 'bout-global'): GeneratedPuzzle {
  const { type, difficulty } = scheduleForDate(playDate);
  const def = getPuzzleType(type);

  const MAX_ATTEMPTS = 50;
  let lastReason = 'unknown';
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const seed = attempt === 0 ? dailySeed(playDate, leagueSalt) : `${dailySeed(playDate, leagueSalt)}#${attempt}`;
    const rng = makeRng(seed);
    const puzzle = def.generate(rng, difficulty);
    const check = def.selfCheck(puzzle);
    if (check.ok) return puzzle;
    lastReason = check.reason ?? 'failed selfCheck';
  }
  throw new PuzzleValidationError(type, `no valid instance after ${MAX_ATTEMPTS} attempts: ${lastReason}`);
}

/** The publish gate. Throws if the puzzle is not provably valid. Never publish junk. */
export function assertPublishable(puzzle: GeneratedPuzzle): void {
  const def = getPuzzleType(puzzle.type);
  const result = def.selfCheck(puzzle);
  if (!result.ok) throw new PuzzleValidationError(puzzle.type, result.reason ?? 'unknown');
}

/** Strip the solution so only the client-safe payload is ever shipped. */
export function toClientPayload(puzzle: GeneratedPuzzle): {
  type: PuzzleTypeId;
  difficulty: GeneratedPuzzle['difficulty'];
  payload: unknown;
  speedWindow?: { fastMs: number; slowMs: number };
} {
  return {
    type: puzzle.type,
    difficulty: puzzle.difficulty,
    payload: puzzle.payload,
    speedWindow: puzzle.speedWindow,
  };
}

/** Server-authoritative scoring of a submission against a stored puzzle. */
export function validateSubmission(
  puzzle: GeneratedPuzzle,
  submission: AnswerSubmission,
): ValidationResult {
  const def = getPuzzleType(puzzle.type);
  return def.validate(submission, puzzle.solution, puzzle.payload);
}

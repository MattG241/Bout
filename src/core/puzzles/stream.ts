/**
 * Unlimited, no-repeat puzzle generation.
 *
 * Every generator draws from a large parameter space and emits payload-level entropy
 * (scramble order, option order, clue order, grids, sequences…). This stream layers an
 * explicit fingerprint dedup on top, so it is *guaranteed* that no two emitted puzzles are
 * ever exactly the same — across a single run, or across history when seeded with the set of
 * already-seen fingerprints.
 */

import type { Difficulty, GeneratedPuzzle, PuzzleTypeId } from './types';
import { getPuzzleType, PUZZLE_TYPES } from './registry';
import { makeRng } from './rng';
import { fingerprint } from './fingerprint';
import { scheduleForDate } from './rotation';

const ALL_TYPES = Object.keys(PUZZLE_TYPES) as PuzzleTypeId[];

export interface UniqueStreamOptions {
  /** Restrict to one type, or cycle through all seven (default). */
  type?: PuzzleTypeId;
  /** Fixed difficulty, or vary by rotation when omitted. */
  difficulty?: Difficulty;
  /** Base salt so independent streams don't tread on each other. */
  salt?: string;
  /** Fingerprints already used (e.g. loaded from the DB) — never re-emit these. */
  seen?: Iterable<string>;
  /** Safety valve: give up trying to find a fresh puzzle after this many attempts. */
  maxAttemptsPerPuzzle?: number;
}

export interface PuzzleStream {
  /** Next validated, globally-unique puzzle. Throws only if the space is genuinely exhausted. */
  next(): GeneratedPuzzle;
  /** Convenience: pull `n` unique puzzles. */
  take(n: number): GeneratedPuzzle[];
  /** The fingerprint of the most recent puzzle. */
  lastFingerprint(): string | null;
  /** How many unique puzzles have been emitted (plus any pre-seeded). */
  size(): number;
}

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

/**
 * Create an infinite stream of unique, validated puzzles. Determinism: with the same salt and
 * no pre-seeded fingerprints, the sequence is reproducible. The dedup guarantees uniqueness
 * even when two different seeds happen to produce identical puzzles.
 */
export function createUniqueStream(opts: UniqueStreamOptions = {}): PuzzleStream {
  const seen = new Set<string>(opts.seen ?? []);
  const salt = opts.salt ?? 'bout-stream';
  const maxAttempts = opts.maxAttemptsPerPuzzle ?? 5000;
  let counter = 0;
  let last: string | null = null;

  const next = (): GeneratedPuzzle => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const typeId = opts.type ?? ALL_TYPES[counter % ALL_TYPES.length]!;
      const def = getPuzzleType(typeId);
      const difficulty = opts.difficulty ?? DIFFICULTIES[(counter >> 3) % DIFFICULTIES.length]!;
      const seed = `${salt}:${typeId}:${difficulty}:${counter}:${attempt}`;
      counter++;

      const puzzle = def.generate(makeRng(seed), difficulty);
      if (!def.selfCheck(puzzle).ok) continue; // never emit an invalid puzzle

      const fp = fingerprint(puzzle);
      if (seen.has(fp)) continue; // never emit a duplicate
      seen.add(fp);
      last = fp;
      return puzzle;
    }
    throw new Error(
      `puzzle space exhausted for type=${opts.type ?? 'all'} after ${maxAttempts} attempts`,
    );
  };

  return {
    next,
    take: (n: number) => Array.from({ length: n }, () => next()),
    lastFingerprint: () => last,
    size: () => seen.size,
  };
}

/** One-shot helper: `n` unique puzzles, optionally of a single type. */
export function generateUnique(count: number, opts: UniqueStreamOptions = {}): GeneratedPuzzle[] {
  return createUniqueStream(opts).take(count);
}

/**
 * Generate the canonical daily puzzle for a date, guaranteed not to repeat any historical
 * puzzle: it keeps the scheduled type/difficulty for the day but bumps a salt until the
 * fingerprint is one never seen before. Deterministic given the same `seen` set.
 */
export function generateUniqueDaily(
  playDate: string,
  seenFingerprints: Iterable<string> = [],
  leagueSalt = 'bout-global',
): { puzzle: GeneratedPuzzle; fingerprint: string } {
  const { type, difficulty } = scheduleForDate(playDate);
  const def = getPuzzleType(type);
  const seen = new Set(seenFingerprints);

  for (let attempt = 0; attempt < 10000; attempt++) {
    const seed = `${leagueSalt}:${playDate}:${attempt}`;
    const puzzle = def.generate(makeRng(seed), difficulty);
    if (!def.selfCheck(puzzle).ok) continue;
    const fp = fingerprint(puzzle);
    if (seen.has(fp)) continue;
    return { puzzle, fingerprint: fp };
  }
  throw new Error(`could not generate a non-repeating ${type} puzzle for ${playDate}`);
}

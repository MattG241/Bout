/**
 * Deterministic seeded RNG (mulberry32 + xmur3 string hashing).
 *
 * The daily puzzle must be identical for everyone, so generation is seeded by the
 * play date (plus an optional league salt). Same seed in → same puzzle out, forever.
 */

import type { Rng } from './types';

function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function mulberry32(a: number): () => number {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seed: string): Rng {
  const seedFn = xmur3(seed);
  const rand = mulberry32(seedFn());

  const next = () => rand();
  const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
  const pick = <T,>(arr: readonly T[]): T => {
    if (arr.length === 0) throw new Error('pick from empty array');
    return arr[int(0, arr.length - 1)]!;
  };
  const shuffle = <T,>(arr: readonly T[]): T[] => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = int(0, i);
      [a[i], a[j]] = [a[j]!, a[i]!];
    }
    return a;
  };

  return { next, int, pick, shuffle };
}

/** Canonical seed for a given play date + league. House leagues share the global daily puzzle. */
export function dailySeed(playDate: string, salt = 'bout-global'): string {
  return `${salt}:${playDate}`;
}

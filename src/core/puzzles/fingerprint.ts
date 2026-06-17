/**
 * Canonical puzzle fingerprint. Two puzzles are "the same" iff they fingerprint identically
 * (same type, difficulty, payload, and solution — independent of object key order). Used to
 * guarantee no two generated puzzles are ever exactly the same.
 */

import type { GeneratedPuzzle } from './types';

/** Deterministic JSON: object keys sorted recursively so equal content → equal string. */
export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`).join(',')}}`;
}

/** 64-bit FNV-1a over the canonical form, returned as a 16-char hex string. */
export function fingerprint(puzzle: GeneratedPuzzle): string {
  const input = canonicalize({
    type: puzzle.type,
    difficulty: puzzle.difficulty,
    payload: puzzle.payload,
    solution: puzzle.solution,
  });
  // FNV-1a 64-bit using BigInt for correctness.
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (let i = 0; i < input.length; i++) {
    hash ^= BigInt(input.charCodeAt(i));
    hash = (hash * prime) & mask;
  }
  return hash.toString(16).padStart(16, '0');
}

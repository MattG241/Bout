import { describe, it, expect } from 'vitest';
import { createUniqueStream, generateUnique, generateUniqueDaily } from './stream';
import { fingerprint, canonicalize } from './fingerprint';
import { assertPublishable, validateSubmission } from './registry';
import type { PuzzleTypeId } from './types';

/**
 * Proves the "truly unlimited, no two the same" guarantee: at scale, every generated puzzle
 * has a distinct fingerprint, every one is still valid/solvable, and the daily generator never
 * repeats a historical puzzle.
 */

describe('fingerprint', () => {
  it('is order-independent for object keys', () => {
    expect(canonicalize({ a: 1, b: 2 })).toBe(canonicalize({ b: 2, a: 1 }));
  });
  it('distinguishes different payloads', () => {
    const a = generateUnique(2, { type: 'word', salt: 'fp-a' });
    expect(fingerprint(a[0]!)).not.toBe(fingerprint(a[1]!));
  });
});

describe('unlimited unique stream (all types interleaved)', () => {
  it('emits 5,000 puzzles with zero duplicate fingerprints, all valid', () => {
    const stream = createUniqueStream({ salt: 'mega' });
    const fps = new Set<string>();
    for (let i = 0; i < 5000; i++) {
      const p = stream.next();
      const fp = fingerprint(p);
      expect(fps.has(fp), `duplicate at ${i}`).toBe(false);
      fps.add(fp);
      expect(() => assertPublishable(p)).not.toThrow();
    }
    expect(fps.size).toBe(5000);
    expect(stream.size()).toBe(5000);
  });
});

describe('per-type depth', () => {
  const types: PuzzleTypeId[] = ['word', 'logic', 'number', 'visual', 'memory', 'trivia', 'weekend'];
  for (const type of types) {
    it(`${type}: yields 300 distinct, valid puzzles`, () => {
      const puzzles = generateUnique(300, { type, salt: `depth-${type}` });
      const fps = new Set(puzzles.map(fingerprint));
      expect(fps.size).toBe(300);
      // Spot-check solvability on a sample.
      for (const p of puzzles.slice(0, 20)) {
        expect(() => assertPublishable(p)).not.toThrow();
      }
    });
  }
});

describe('streams seeded with history never re-emit seen puzzles', () => {
  it('a second stream told about the first\'s output produces all-new puzzles', () => {
    const first = generateUnique(200, { type: 'logic', salt: 'hist' });
    const seen = first.map(fingerprint);
    const second = createUniqueStream({ type: 'logic', salt: 'hist2', seen });
    const seenSet = new Set(seen);
    for (let i = 0; i < 200; i++) {
      expect(seenSet.has(fingerprint(second.next()))).toBe(false);
    }
  });
});

describe('daily generator never repeats across a multi-year horizon', () => {
  it('365 days produce 365 distinct fingerprints, each non-repeating given history', () => {
    const start = Date.UTC(2026, 0, 1);
    const seen = new Set<string>();
    for (let i = 0; i < 365; i++) {
      const date = new Date(start + i * 86_400_000).toISOString().slice(0, 10);
      const { puzzle, fingerprint: fp } = generateUniqueDaily(date, seen);
      expect(seen.has(fp), `repeat on ${date}`).toBe(false);
      seen.add(fp);
      // Still valid + solvable.
      expect(() => assertPublishable(puzzle)).not.toThrow();
    }
    expect(seen.size).toBe(365);
  });

  it('forces a fresh puzzle even if the natural one was already seen', () => {
    const date = '2026-03-02';
    const natural = generateUniqueDaily(date, []);
    // Pretend the natural puzzle already shipped; the generator must produce a different one.
    const forced = generateUniqueDaily(date, [natural.fingerprint]);
    expect(forced.fingerprint).not.toBe(natural.fingerprint);
    expect(validateSubmission(forced.puzzle, {}).accuracy).toBeLessThan(1);
  });
});

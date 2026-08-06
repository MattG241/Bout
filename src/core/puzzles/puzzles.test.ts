import { describe, it, expect } from 'vitest';
import {
  generateDailyPuzzle,
  assertPublishable,
  validateSubmission,
  toClientPayload,
  getPuzzleType,
  PUZZLE_TYPES,
} from './registry';
import { scheduleForDate, typeForDayOfWeek } from './rotation';
import { makeRng } from './rng';
import type { GeneratedPuzzle, PuzzleTypeId } from './types';

// Build the "correct" submission for any generated puzzle directly from its solution,
// so we can assert validate() rewards a perfect solve with accuracy 1.
function correctSubmission(p: GeneratedPuzzle): unknown {
  switch (p.type) {
    case 'word':
      return { answer: (p.solution as any).answer, wastedGuesses: 0 };
    case 'logic':
      return { order: (p.solution as any).order };
    case 'number':
      return { value: (p.solution as any).value };
    case 'visual':
      return { index: (p.solution as any).index };
    case 'memory':
      return { sequence: (p.solution as any).sequence };
    case 'trivia':
      return { answer: (p.solution as any).answer };
    case 'weekend':
      return { grid: (p.solution as any).grid };
  }
}

const ALL_TYPES = Object.keys(PUZZLE_TYPES) as PuzzleTypeId[];

describe('rotation', () => {
  it('maps each weekday to a distinct type and weekends to the feature', () => {
    const week = [1, 2, 3, 4, 5, 6, 0].map(typeForDayOfWeek);
    expect(week).toEqual(['word', 'logic', 'number', 'visual', 'memory', 'weekend', 'trivia']);
  });
  it('schedules a hard feature on Saturday', () => {
    // 2026-06-20 is a Saturday.
    expect(scheduleForDate('2026-06-20')).toEqual({ type: 'weekend', difficulty: 'hard' });
  });
});

describe('every puzzle type: generate → selfCheck → validate', () => {
  for (const id of ALL_TYPES) {
    it(`${id}: a freshly generated puzzle passes its own selfCheck`, () => {
      const def = getPuzzleType(id);
      for (const difficulty of ['easy', 'medium', 'hard'] as const) {
        for (let i = 0; i < 25; i++) {
          const rng = makeRng(`${id}-${difficulty}-${i}`);
          const puzzle = def.generate(rng, difficulty);
          const check = def.selfCheck(puzzle);
          expect(check.ok, `${id}/${difficulty}#${i}: ${check.reason}`).toBe(true);
        }
      }
    });

    it(`${id}: the correct submission scores accuracy 1`, () => {
      const def = getPuzzleType(id);
      for (let i = 0; i < 25; i++) {
        const rng = makeRng(`${id}-correct-${i}`);
        const puzzle = def.generate(rng, 'medium');
        const result = validateSubmission(puzzle, correctSubmission(puzzle));
        expect(result.completed).toBe(true);
        expect(result.accuracy).toBe(1);
      }
    });

    it(`${id}: an empty/garbage submission does not score a perfect`, () => {
      const def = getPuzzleType(id);
      const rng = makeRng(`${id}-garbage`);
      const puzzle = def.generate(rng, 'medium');
      const result = validateSubmission(puzzle, {});
      expect(result.accuracy).toBeLessThan(1);
    });
  }
});

describe('determinism', () => {
  it('the same date yields a byte-identical puzzle', () => {
    const a = generateDailyPuzzle('2026-06-17');
    const b = generateDailyPuzzle('2026-06-17');
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
  it('different dates generally differ', () => {
    const a = generateDailyPuzzle('2026-06-17');
    const b = generateDailyPuzzle('2026-06-18');
    // Different days are different types anyway, but assert the payloads differ too.
    expect(JSON.stringify(a.payload)).not.toBe(JSON.stringify(b.payload));
  });
});

describe('client payload never leaks the solution', () => {
  it('toClientPayload omits the solution for every type', () => {
    for (let d = 0; d < 7; d++) {
      const date = `2026-06-${String(15 + d).padStart(2, '0')}`;
      const puzzle = generateDailyPuzzle(date);
      const client = toClientPayload(puzzle);
      expect('solution' in (client as object)).toBe(false);
      expect(JSON.stringify(client)).not.toContain('"solution"');
    }
  });
});

describe('QA gate: a full year of daily puzzles is always publishable', () => {
  it('generates and validates 365 consecutive days with zero broken puzzles', () => {
    const start = new Date(Date.UTC(2026, 0, 1));
    const seenTypes = new Set<string>();
    for (let i = 0; i < 365; i++) {
      const date = new Date(start.getTime() + i * 86_400_000).toISOString().slice(0, 10);
      const puzzle = generateDailyPuzzle(date);
      // Must pass the publish gate...
      expect(() => assertPublishable(puzzle)).not.toThrow();
      // ...and must be solvable to a perfect score by someone who knows the answer.
      const result = validateSubmission(puzzle, correctSubmission(puzzle));
      expect(result.accuracy, `unsolvable puzzle on ${date} (${puzzle.type})`).toBe(1);
      seenTypes.add(puzzle.type);
    }
    // Over a year, every one of the seven types must have shipped at least once.
    expect(seenTypes.size).toBe(7);
  });
});

/**
 * VISUAL / spatial — "which is the mirror?". A small filled grid is transformed
 * (horizontal flip / vertical flip / 180° rotation); pick the option that matches.
 * Exactly one option equals the true transform; the others differ in at least one cell.
 */

import type { GeneratedPuzzle, PuzzleType, Rng, Difficulty, SelfCheckResult } from './types';

export type Cell = 0 | 1;
export type Grid = Cell[][];
export type Transform = 'flip-h' | 'flip-v' | 'rotate-180';

export interface VisualPayload {
  grid: Grid;
  transform: Transform;
  options: Grid[];
}
export interface VisualSolution {
  index: number;
}
export interface VisualSubmission {
  index: number;
}

function flipH(g: Grid): Grid {
  return g.map((row) => [...row].reverse());
}
function flipV(g: Grid): Grid {
  return [...g].reverse().map((r) => [...r]);
}
function rotate180(g: Grid): Grid {
  return flipV(flipH(g));
}
function applyTransform(g: Grid, t: Transform): Grid {
  return t === 'flip-h' ? flipH(g) : t === 'flip-v' ? flipV(g) : rotate180(g);
}
function eq(a: Grid, b: Grid): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function randomGrid(rng: Rng, size: number): Grid {
  const g: Grid = [];
  for (let r = 0; r < size; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < size; c++) row.push(rng.next() < 0.5 ? 1 : 0);
    g.push(row);
  }
  // Guarantee it's not symmetric under the chosen transform later by caller check.
  return g;
}

function mutate(rng: Rng, g: Grid): Grid {
  const copy = g.map((r) => [...r]);
  const r = rng.int(0, g.length - 1);
  const c = rng.int(0, g[0]!.length - 1);
  copy[r]![c] = (copy[r]![c] === 1 ? 0 : 1) as Cell;
  return copy;
}

export const visualType: PuzzleType<VisualPayload, VisualSolution> = {
  id: 'visual',
  label: 'Visual',

  generate(rng: Rng, difficulty: Difficulty): GeneratedPuzzle<VisualPayload, VisualSolution> {
    const size = difficulty === 'hard' ? 4 : 3;
    const transform = rng.pick<Transform>(['flip-h', 'flip-v', 'rotate-180']);

    let grid = randomGrid(rng, size);
    let answer = applyTransform(grid, transform);
    // Avoid degenerate puzzles where the transform changes nothing (symmetric grid).
    let guard = 0;
    while (eq(grid, answer) && guard++ < 20) {
      grid = randomGrid(rng, size);
      answer = applyTransform(grid, transform);
    }

    // Three distractors, each distinct from the answer and from each other.
    const distractors: Grid[] = [];
    let attempts = 0;
    while (distractors.length < 3 && attempts++ < 200) {
      const d = mutate(rng, answer);
      if (!eq(d, answer) && !distractors.some((x) => eq(x, d))) distractors.push(d);
    }

    const all = rng.shuffle([answer, ...distractors]);
    const index = all.findIndex((g) => eq(g, answer));

    return {
      type: 'visual',
      difficulty,
      payload: { grid, transform, options: all },
      solution: { index },
      speedWindow: { fastMs: 10_000, slowMs: 75_000 },
    };
  },

  validate(submission, solution, payload) {
    const sub = (submission ?? {}) as VisualSubmission;
    if (typeof sub.index !== 'number' || sub.index < 0 || sub.index >= payload.options.length)
      return { completed: false, accuracy: 0, detail: 'No choice' };
    const correct = sub.index === solution.index;
    return { completed: true, accuracy: correct ? 1 : 0, detail: correct ? 'Correct' : 'Wrong option' };
  },

  selfCheck(puzzle): SelfCheckResult {
    const { payload, solution } = puzzle;
    const truth = applyTransform(payload.grid, payload.transform);
    if (eq(payload.grid, truth)) return { ok: false, reason: 'transform is a no-op (symmetric grid)' };
    const matches = payload.options.filter((o) => eq(o, truth));
    if (matches.length !== 1) return { ok: false, reason: `expected 1 matching option, found ${matches.length}` };
    if (!eq(payload.options[solution.index]!, truth))
      return { ok: false, reason: 'solution index does not point at the correct option' };
    return { ok: true };
  },
};

/**
 * WEEKEND FEATURE — 4×4 mini-Sudoku. Fill the grid so every row, column, and 2×2 box
 * contains 1–4 exactly once. The meatier Saturday bout.
 *
 * Uniqueness is non-negotiable: generation removes clues only while a backtracking solver
 * still finds exactly one solution, and selfCheck re-verifies the unique-solution property.
 */

import type { GeneratedPuzzle, PuzzleType, Rng, Difficulty, SelfCheckResult } from './types';

export type SudokuGrid = number[][]; // 0 = blank
export interface WeekendPayload {
  /** 4×4 grid; 0 marks a cell the player must fill. */
  grid: SudokuGrid;
}
export interface WeekendSolution {
  grid: SudokuGrid; // fully solved
}
export interface WeekendSubmission {
  grid: SudokuGrid;
}

const N = 4;
const BOX = 2;

function clone(g: SudokuGrid): SudokuGrid {
  return g.map((r) => [...r]);
}

function canPlace(g: SudokuGrid, r: number, c: number, v: number): boolean {
  for (let i = 0; i < N; i++) {
    if (g[r]![i] === v) return false;
    if (g[i]![c] === v) return false;
  }
  const br = Math.floor(r / BOX) * BOX;
  const bc = Math.floor(c / BOX) * BOX;
  for (let i = 0; i < BOX; i++)
    for (let j = 0; j < BOX; j++) if (g[br + i]![bc + j] === v) return false;
  return true;
}

/** Count solutions up to `cap` (used to assert uniqueness). */
function countSolutions(grid: SudokuGrid, cap = 2): number {
  const g = clone(grid);
  let count = 0;
  const solve = (): void => {
    if (count >= cap) return;
    let r = -1;
    let c = -1;
    outer: for (let i = 0; i < N; i++)
      for (let j = 0; j < N; j++)
        if (g[i]![j] === 0) {
          r = i;
          c = j;
          break outer;
        }
    if (r === -1) {
      count++;
      return;
    }
    for (let v = 1; v <= N; v++) {
      if (canPlace(g, r, c, v)) {
        g[r]![c] = v;
        solve();
        g[r]![c] = 0;
        if (count >= cap) return;
      }
    }
  };
  solve();
  return count;
}

function fullGrid(rng: Rng): SudokuGrid {
  const g: SudokuGrid = Array.from({ length: N }, () => Array<number>(N).fill(0));
  const fill = (pos: number): boolean => {
    if (pos === N * N) return true;
    const r = Math.floor(pos / N);
    const c = pos % N;
    for (const v of rng.shuffle([1, 2, 3, 4])) {
      if (canPlace(g, r, c, v)) {
        g[r]![c] = v;
        if (fill(pos + 1)) return true;
        g[r]![c] = 0;
      }
    }
    return false;
  };
  fill(0);
  return g;
}

export const weekendType: PuzzleType<WeekendPayload, WeekendSolution> = {
  id: 'weekend',
  label: 'Weekend feature',

  generate(rng: Rng, difficulty: Difficulty): GeneratedPuzzle<WeekendPayload, WeekendSolution> {
    const solved = fullGrid(rng);
    const puzzle = clone(solved);

    // Target number of clues to keep. Fewer clues = harder. Always leave enough for uniqueness.
    const targetBlanks = difficulty === 'hard' ? 9 : difficulty === 'medium' ? 8 : 6;

    const cells = rng.shuffle(
      Array.from({ length: N * N }, (_, i) => ({ r: Math.floor(i / N), c: i % N })),
    );
    let blanks = 0;
    for (const { r, c } of cells) {
      if (blanks >= targetBlanks) break;
      const saved = puzzle[r]![c]!;
      puzzle[r]![c] = 0;
      if (countSolutions(puzzle, 2) === 1) {
        blanks++;
      } else {
        puzzle[r]![c] = saved; // removing it broke uniqueness — keep the clue
      }
    }

    return {
      type: 'weekend',
      difficulty,
      payload: { grid: puzzle },
      solution: { grid: solved },
      speedWindow: { fastMs: 45_000, slowMs: 300_000 },
    };
  },

  validate(submission, solution, payload) {
    const sub = (submission ?? {}) as WeekendSubmission;
    const grid = sub.grid;
    if (!Array.isArray(grid) || grid.length !== N || grid.some((row) => !Array.isArray(row) || row.length !== N))
      return { completed: false, accuracy: 0, detail: 'Malformed grid' };

    // Only the originally-blank cells count toward accuracy.
    let blanks = 0;
    let correct = 0;
    let allFilled = true;
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (payload.grid[r]![c] === 0) {
          blanks++;
          const v = grid[r]![c];
          if (typeof v !== 'number' || v < 1 || v > N) allFilled = false;
          if (v === solution.grid[r]![c]) correct++;
        }
      }
    }
    if (!allFilled) return { completed: false, accuracy: 0, detail: 'Grid not fully filled' };
    return { completed: true, accuracy: blanks === 0 ? 1 : correct / blanks, detail: `${correct}/${blanks} cells` };
  },

  selfCheck(puzzle): SelfCheckResult {
    const { payload, solution } = puzzle;
    // 1) The stated solution must be a valid, complete Latin/box square.
    for (let r = 0; r < N; r++) {
      const row = new Set(solution.grid[r]);
      if (row.size !== N || [...row].some((v) => v < 1 || v > N))
        return { ok: false, reason: 'solution row invalid' };
    }
    for (let c = 0; c < N; c++) {
      const col = new Set(solution.grid.map((row) => row[c]));
      if (col.size !== N) return { ok: false, reason: 'solution column invalid' };
    }
    for (let br = 0; br < N; br += BOX)
      for (let bc = 0; bc < N; bc += BOX) {
        const box = new Set<number>();
        for (let i = 0; i < BOX; i++) for (let j = 0; j < BOX; j++) box.add(solution.grid[br + i]![bc + j]!);
        if (box.size !== N) return { ok: false, reason: 'solution box invalid' };
      }
    // 2) Every given clue must match the solution.
    for (let r = 0; r < N; r++)
      for (let c = 0; c < N; c++)
        if (payload.grid[r]![c] !== 0 && payload.grid[r]![c] !== solution.grid[r]![c])
          return { ok: false, reason: 'clue contradicts solution' };
    // 3) The puzzle must have EXACTLY one solution.
    const solutions = countSolutions(payload.grid, 2);
    if (solutions !== 1) return { ok: false, reason: `expected unique solution, found ${solutions}` };
    return { ok: true };
  },
};

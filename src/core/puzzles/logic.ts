/**
 * LOGIC / deduction — "find the order". Given comparative clues, deduce the one true
 * ranking of the items. The clue set is minimised but always pins down a unique order,
 * verified by brute force in selfCheck.
 */

import type { GeneratedPuzzle, PuzzleType, Rng, Difficulty, SelfCheckResult } from './types';

export interface LogicClue {
  /** `a` ranks strictly before `b` (e.g. taller/older/finished-ahead). */
  before: string;
  after: string;
}
export interface LogicPayload {
  items: string[];
  clues: LogicClue[];
  /** Framing for the UI, e.g. "tallest to shortest". */
  prompt: string;
}
export interface LogicSolution {
  order: string[]; // index 0 = first/highest
}
export interface LogicSubmission {
  order: string[];
}

const CASTS = [
  { items: ['Ash', 'Bo', 'Cy', 'Di', 'Ed'], prompt: 'Order them tallest to shortest' },
  { items: ['Rex', 'Sky', 'Tay', 'Uma', 'Val'], prompt: 'Order them by finish, first to last' },
  { items: ['Mo', 'Nia', 'Ola', 'Pia', 'Quy'], prompt: 'Order them oldest to youngest' },
  { items: ['Fox', 'Gus', 'Hal', 'Ivy', 'Jin'], prompt: 'Order them by score, highest first' },
  { items: ['Kit', 'Lou', 'Mae', 'Ned', 'Oz'], prompt: 'Order them heaviest to lightest' },
  { items: ['Pax', 'Quin', 'Rae', 'Sol', 'Tex'], prompt: 'Order them fastest to slowest' },
  { items: ['Ada', 'Ben', 'Cleo', 'Dot', 'Eli'], prompt: 'Order them by rank, top first' },
  { items: ['Wren', 'Xan', 'Yu', 'Zed', 'Ada'], prompt: 'Order them by finish, first to last' },
];

function permutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const p of permutations(rest)) out.push([arr[i]!, ...p]);
  }
  return out;
}

function satisfies(order: string[], clues: LogicClue[]): boolean {
  const pos = new Map(order.map((x, i) => [x, i]));
  return clues.every((c) => (pos.get(c.before) ?? -1) < (pos.get(c.after) ?? -1));
}

function countSolutions(items: string[], clues: LogicClue[]): { count: number; first?: string[] } {
  let count = 0;
  let first: string[] | undefined;
  for (const p of permutations(items)) {
    if (satisfies(p, clues)) {
      count++;
      if (!first) first = p;
      if (count > 1) break;
    }
  }
  return { count, first };
}

export const logicType: PuzzleType<LogicPayload, LogicSolution> = {
  id: 'logic',

  label: 'Logic',
  generate(rng: Rng, difficulty: Difficulty): GeneratedPuzzle<LogicPayload, LogicSolution> {
    const n = difficulty === 'easy' ? 4 : difficulty === 'medium' ? 5 : 5;
    const cast = rng.pick(CASTS);
    const items = cast.items.slice(0, n);
    const truth = rng.shuffle(items);

    // Start from all adjacent relations (guarantees uniqueness), then greedily drop any
    // clue that isn't needed for uniqueness — leaving a minimal, still-unique set.
    const allAdjacent: LogicClue[] = [];
    for (let i = 0; i < truth.length - 1; i++) {
      allAdjacent.push({ before: truth[i]!, after: truth[i + 1]! });
    }
    // Add a couple of redundant long-range clues so it reads like real deduction, then prune.
    const extras: LogicClue[] = [];
    if (truth.length >= 4) extras.push({ before: truth[0]!, after: truth[truth.length - 1]! });

    let clues = rng.shuffle([...allAdjacent, ...extras]);
    for (const c of [...clues]) {
      const without = clues.filter((x) => x !== c);
      if (countSolutions(items, without).count === 1) clues = without;
    }

    return {
      type: 'logic',
      difficulty,
      payload: { items: rng.shuffle(items), clues, prompt: cast.prompt },
      solution: { order: truth },
      speedWindow: { fastMs: 15_000, slowMs: 120_000 },
    };
  },

  validate(submission, solution, payload) {
    const sub = (submission ?? {}) as LogicSubmission;
    const order = Array.isArray(sub.order) ? sub.order : [];
    const completed = order.length === payload.items.length && new Set(order).size === order.length;
    if (!completed) return { completed: false, accuracy: 0, detail: 'Incomplete ordering' };
    let correct = 0;
    for (let i = 0; i < solution.order.length; i++) if (order[i] === solution.order[i]) correct++;
    const accuracy = correct / solution.order.length;
    return { completed: true, accuracy, detail: `${correct}/${solution.order.length} in place` };
  },

  selfCheck(puzzle): SelfCheckResult {
    const { payload, solution } = puzzle;
    if (new Set(payload.items).size !== payload.items.length)
      return { ok: false, reason: 'duplicate items' };
    if (!satisfies(solution.order, payload.clues))
      return { ok: false, reason: 'stated solution violates its own clues' };
    const { count } = countSolutions(payload.items, payload.clues);
    if (count !== 1) return { ok: false, reason: `expected exactly 1 solution, found ${count}` };
    return { ok: true };
  },
};

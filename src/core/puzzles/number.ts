/**
 * NUMBER / math — "solve the equation". A left-to-right chain of operations with one
 * blank operand and a stated result. Linear in the blank, so the answer is always unique.
 */

import type { GeneratedPuzzle, PuzzleType, Rng, Difficulty, SelfCheckResult } from './types';

export type Op = '+' | '-' | '×';
export interface NumberTerm {
  op: Op | null; // null for the first term
  value: number | null; // null marks the single blank
}
export interface NumberPayload {
  /** Terms evaluated strictly left-to-right (no precedence) to reach `result`. */
  terms: NumberTerm[];
  result: number;
  blankIndex: number;
}
export interface NumberSolution {
  value: number;
}
export interface NumberSubmission {
  value: number;
}

function applyOp(acc: number, op: Op, v: number): number {
  switch (op) {
    case '+':
      return acc + v;
    case '-':
      return acc - v;
    case '×':
      return acc * v;
  }
}

/** Evaluate a fully-filled term list left-to-right. */
function evaluate(values: number[], ops: (Op | null)[]): number {
  let acc = values[0]!;
  for (let i = 1; i < values.length; i++) acc = applyOp(acc, ops[i] as Op, values[i]!);
  return acc;
}

/**
 * How many integer values for the blank satisfy the equation, scanning a wide window?
 * Exactly 1 means the puzzle is uniquely solvable. (A blank multiplied by a zero running
 * accumulator has coefficient 0 and would admit every value — we avoid those blanks.)
 */
function uniquenessCount(values: (number | null)[], ops: (Op | null)[], blankIndex: number, result: number): number {
  let matches = 0;
  for (let candidate = -200; candidate <= 200; candidate++) {
    const filled = values.map((v, i) => (i === blankIndex ? candidate : (v as number))) as number[];
    if (evaluate(filled, ops) === result) matches++;
  }
  return matches;
}

export const numberType: PuzzleType<NumberPayload, NumberSolution> = {
  id: 'number',
  label: 'Number',

  generate(rng: Rng, difficulty: Difficulty): GeneratedPuzzle<NumberPayload, NumberSolution> {
    const count = difficulty === 'easy' ? 3 : difficulty === 'medium' ? 4 : 5;
    const opsPool: Op[] = difficulty === 'easy' ? ['+', '-'] : ['+', '-', '×'];

    const values: number[] = [rng.int(2, 9)];
    const ops: (Op | null)[] = [null];
    for (let i = 1; i < count; i++) {
      ops.push(rng.pick(opsPool));
      values.push(rng.int(2, 9));
    }
    const result = evaluate(values, ops);
    // Pick a blank whose value is uniquely determined. The first term always qualifies
    // (its coefficient is a product of non-zero operands), so a valid choice always exists.
    const candidates = rng.shuffle(Array.from({ length: count }, (_, i) => i));
    let blankIndex = 0;
    for (const idx of candidates) {
      if (uniquenessCount(values, ops, idx, result) === 1) {
        blankIndex = idx;
        break;
      }
    }
    const answer = values[blankIndex]!;

    const terms: NumberTerm[] = values.map((v, i) => ({
      op: ops[i] ?? null,
      value: i === blankIndex ? null : v,
    }));

    return {
      type: 'number',
      difficulty,
      payload: { terms, result, blankIndex },
      solution: { value: answer },
      speedWindow: { fastMs: 12_000, slowMs: 90_000 },
    };
  },

  validate(submission, solution) {
    const sub = (submission ?? {}) as NumberSubmission;
    if (typeof sub.value !== 'number' || !Number.isFinite(sub.value))
      return { completed: false, accuracy: 0, detail: 'No answer' };
    const correct = sub.value === solution.value;
    return { completed: true, accuracy: correct ? 1 : 0, detail: correct ? 'Correct' : 'Wrong value' };
  },

  selfCheck(puzzle): SelfCheckResult {
    const { payload, solution } = puzzle;
    if (payload.blankIndex < 0 || payload.blankIndex >= payload.terms.length)
      return { ok: false, reason: 'blank index out of range' };
    // Reconstruct and confirm the stated solution yields the stated result, and that it
    // is the *only* integer in a wide window that does (uniqueness sanity check).
    const values = payload.terms.map((t) => t.value);
    const ops = payload.terms.map((t) => t.op);
    const matches = uniquenessCount(values, ops, payload.blankIndex, payload.result);
    if (matches !== 1) return { ok: false, reason: `expected unique answer, found ${matches}` };
    const filledTruth = values.map((v, i) => (i === payload.blankIndex ? solution.value : v!)) as number[];
    if (evaluate(filledTruth, ops) !== payload.result)
      return { ok: false, reason: 'solution does not satisfy the equation' };
    return { ok: true };
  },
};

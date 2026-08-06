/**
 * Pluggable puzzle-type interface.
 *
 * A puzzle type defines four pure operations. New types drop in by implementing this
 * interface and registering in `registry.ts` — nothing else in the app needs to change.
 *
 * Hard rule: the `solution` is NEVER sent to the client before submission. The server
 * stores `payload` + `solution` separately and only ships `payload` to the client.
 */

export type PuzzleTypeId =
  | 'word'
  | 'logic'
  | 'number'
  | 'visual'
  | 'memory'
  | 'trivia'
  | 'weekend';

export type Difficulty = 'easy' | 'medium' | 'hard';

/** A deterministic RNG so the same date always generates the same puzzle everywhere. */
export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number;
  /** Pick one element. */
  pick<T>(arr: readonly T[]): T;
  /** In-place-style shuffle returning a new array. */
  shuffle<T>(arr: readonly T[]): T[];
}

/** The result of generating a puzzle for a given day. */
export interface GeneratedPuzzle<Payload = unknown, Solution = unknown> {
  type: PuzzleTypeId;
  difficulty: Difficulty;
  /** Everything the client needs to render and play. Contains NO answer. */
  payload: Payload;
  /** The authoritative answer. Server-only. Never serialized to the client. */
  solution: Solution;
  /** Speed window override for this puzzle (ms). Optional. */
  speedWindow?: { fastMs: number; slowMs: number };
}

/** What the client submits. Shape is type-specific but always JSON. */
export type AnswerSubmission = unknown;

export interface ValidationResult {
  /** Did the submission complete the puzzle (regardless of accuracy)? */
  completed: boolean;
  /** Accuracy in [0, 1], scored by the type. */
  accuracy: number;
  /** Optional human-readable detail for the result screen. */
  detail?: string;
}

/** The contract every puzzle type implements. All four methods are pure. */
export interface PuzzleType<Payload = unknown, Solution = unknown> {
  id: PuzzleTypeId;
  /** Display name in fight-card language where relevant. */
  label: string;
  /** Generate a deterministic puzzle from a seeded RNG and difficulty. */
  generate(rng: Rng, difficulty: Difficulty): GeneratedPuzzle<Payload, Solution>;
  /** Score a submission against the solution. Pure; server-authoritative. */
  validate(submission: AnswerSubmission, solution: Solution, payload: Payload): ValidationResult;
  /**
   * Self-check used by the mandatory pre-publish validator: confirm the generated
   * puzzle has exactly one correct solution and is solvable. Throw or return false
   * to block publication. A broken ranked puzzle destroys trust instantly.
   */
  selfCheck(puzzle: GeneratedPuzzle<Payload, Solution>): SelfCheckResult;
}

export interface SelfCheckResult {
  ok: boolean;
  /** Why it failed, for logs/alerts. */
  reason?: string;
}

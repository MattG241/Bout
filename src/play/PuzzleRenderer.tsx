import React from 'react';
import type { PuzzleTypeId } from '@core/puzzles/types';
import type { RendererProps } from './types';
import { WordPlay } from './WordPlay';
import { LogicPlay } from './LogicPlay';
import { NumberPlay } from './NumberPlay';
import { VisualPlay } from './VisualPlay';
import { MemoryPlay } from './MemoryPlay';
import { TriviaPlay } from './TriviaPlay';
import { WeekendPlay } from './WeekendPlay';

/** Maps a puzzle type to its Play UI. Adding a type = add a renderer here. */
const RENDERERS: Record<PuzzleTypeId, React.ComponentType<RendererProps<any>>> = {
  word: WordPlay,
  logic: LogicPlay,
  number: NumberPlay,
  visual: VisualPlay,
  memory: MemoryPlay,
  trivia: TriviaPlay,
  weekend: WeekendPlay,
};

export function PuzzleRenderer({
  type,
  payload,
  onSubmissionChange,
}: {
  type: PuzzleTypeId;
  payload: unknown;
  onSubmissionChange: (submission: unknown, ready: boolean) => void;
}) {
  const Renderer = RENDERERS[type];
  if (!Renderer) return null;
  return <Renderer payload={payload} onSubmissionChange={onSubmissionChange} />;
}

/** Friendly fight-card label per type for headers. */
export const TYPE_LABELS: Record<PuzzleTypeId, string> = {
  word: 'Word',
  logic: 'Logic',
  number: 'Number',
  visual: 'Visual',
  memory: 'Memory',
  trivia: 'Trivia',
  weekend: 'Weekend feature',
};

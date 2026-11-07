import { DEFAULT_SET, DEFAULT_SET_COUNT, REPS_MAX, REPS_MIN, REST_MAX_SEC, REST_MIN_SEC } from './defaults';
import type { SetConfig } from './types';

/** The sets of an exercise newly added to a day; `restSec` is the default rest from Settings. */
export function defaultSets(restSec: number = DEFAULT_SET.restSec): SetConfig[] {
  return Array.from({ length: DEFAULT_SET_COUNT }, () => ({ ...DEFAULT_SET, restSec }));
}

/** Appends a copy of the last set, so a new set starts with familiar values. */
export function addSet(sets: readonly SetConfig[]): SetConfig[] {
  const template = sets.at(-1) ?? DEFAULT_SET;
  return [...sets, { ...template }];
}

/** Removes a set. An exercise always keeps at least one. */
export function removeSet(sets: readonly SetConfig[], index: number): SetConfig[] {
  if (sets.length <= 1) return [...sets];
  return sets.filter((_, i) => i !== index);
}

export function updateSet(sets: readonly SetConfig[], index: number, patch: Partial<SetConfig>): SetConfig[] {
  return sets.map((set, i) => (i === index ? clampSet({ ...set, ...patch }) : set));
}

function clampSet(set: SetConfig): SetConfig {
  return {
    reps: clamp(Math.round(set.reps), REPS_MIN, REPS_MAX),
    restSec: clamp(Math.round(set.restSec), REST_MIN_SEC, REST_MAX_SEC),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// Series rules (spec 4.9; docs/DECISIONS.md, 2026-11-05).
import { REPS_MAX, REPS_MIN, REST_MAX_SEC, REST_MIN_SEC } from './defaults';
import { moveItem } from './order';
import type { DayItem, Id, SeriesExercise, SeriesItem } from './types';

// PROVISIONAL defaults until the product fixes them (docs/DECISIONS.md).
export const DEFAULT_ROUNDS = 3;
export const DEFAULT_ROUND_REST_SEC = 120;
export const DEFAULT_SERIES_REPS = 10;
export const DEFAULT_SERIES_REST_SEC = 30;

export const ROUNDS_MIN = 1;
export const ROUNDS_MAX = 50;

export function newSeries(id: Id): SeriesItem {
  return { kind: 'series', id, rounds: DEFAULT_ROUNDS, roundRestSec: DEFAULT_ROUND_REST_SEC, exercises: [] };
}

export function newSeriesExercise(id: Id, exerciseId: Id): SeriesExercise {
  return { id, exerciseId, reps: DEFAULT_SERIES_REPS, restSec: DEFAULT_SERIES_REST_SEC };
}

/** «Серия N»: the series' place among the day's series, from 1; 0 when it is not in the list. */
export function seriesNumber(items: readonly DayItem[], itemId: Id): number {
  const series = items.filter((item) => item.kind === 'series');
  return series.findIndex((item) => item.id === itemId) + 1;
}

export function seriesTitle(number: number): string {
  return `Серия ${number}`;
}

/** Russian plural: 1 круг, 2 круга, 5 кругов, 21 круг, 11 кругов. */
export function pluralRu(n: number, one: string, few: string, many: string): string {
  const tens = n % 100;
  const units = n % 10;
  if (tens >= 11 && tens <= 14) return many;
  if (units === 1) return one;
  if (units >= 2 && units <= 4) return few;
  return many;
}

/** "× 5 кругов" */
export function roundsLabel(rounds: number): string {
  return `× ${rounds} ${pluralRu(rounds, 'круг', 'круга', 'кругов')}`;
}

export function clampRounds(rounds: number): number {
  return Math.min(ROUNDS_MAX, Math.max(ROUNDS_MIN, Math.round(rounds)));
}

/** Every library exercise a day item uses. */
export function exerciseIdsOf(item: DayItem): Id[] {
  return item.kind === 'exercise' ? [item.exerciseId] : item.exercises.map((e) => e.exerciseId);
}

// ---- Editing (pure: each returns a new series) ----

export function setRounds(series: SeriesItem, rounds: number): SeriesItem {
  return { ...series, rounds: clampRounds(rounds) };
}

export function setRoundRest(series: SeriesItem, restSec: number): SeriesItem {
  return { ...series, roundRestSec: clampRest(restSec) };
}

export function addSeriesExercise(series: SeriesItem, exercise: SeriesExercise): SeriesItem {
  return { ...series, exercises: [...series.exercises, exercise] };
}

export function updateSeriesExercise(
  series: SeriesItem,
  id: Id,
  patch: Partial<Pick<SeriesExercise, 'reps' | 'restSec'>>,
): SeriesItem {
  return {
    ...series,
    exercises: series.exercises.map((e) =>
      e.id === id
        ? { ...e, reps: clampReps(patch.reps ?? e.reps), restSec: clampRest(patch.restSec ?? e.restSec) }
        : e,
    ),
  };
}

export function removeSeriesExercise(series: SeriesItem, id: Id): SeriesItem {
  return { ...series, exercises: series.exercises.filter((e) => e.id !== id) };
}

export function moveSeriesExercise(series: SeriesItem, from: number, to: number): SeriesItem {
  return { ...series, exercises: moveItem(series.exercises, from, to) };
}

function clampReps(reps: number): number {
  return Math.min(REPS_MAX, Math.max(REPS_MIN, Math.round(reps)));
}

function clampRest(sec: number): number {
  return Math.min(REST_MAX_SEC, Math.max(REST_MIN_SEC, Math.round(sec)));
}

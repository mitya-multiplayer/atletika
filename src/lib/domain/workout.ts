// Active workout rules (docs/DECISIONS.md, 2026-11-05). Pure functions: each returns
// a new Workout and never mutates its input. Time is passed in as `now` (ms).
import { dayNumber, dayTitle } from './format';
import type { Id, TrainingDay, Workout, WorkoutPosition } from './types';

export const REST_ADJUST_SEC = 30;

/** Snapshot of a training day as a new workout; null when the day has no exercises. */
export function createWorkout(
  day: TrainingDay,
  exerciseNames: ReadonlyMap<Id, string>,
  id: Id,
  now: number,
): Workout | null {
  const exercises = day.items
    .filter((item) => item.sets.length > 0)
    .map((item) => ({
      exerciseId: item.exerciseId,
      name: exerciseNames.get(item.exerciseId) ?? '',
      sets: item.sets.map((set) => ({ reps: set.reps, restSec: set.restSec, done: false })),
      skipped: false,
    }));
  if (exercises.length === 0) return null;
  return {
    id,
    dayId: day.id,
    dayNumber: dayNumber(day),
    dayName: day.name,
    startedAt: now,
    finishedAt: null,
    exercises,
    position: { exercise: 0, set: 0 },
    rest: null,
  };
}

export function isFinished(workout: Workout): boolean {
  return workout.finishedAt !== null;
}

/** The set after `from`: the next set of the same exercise, else the first set of the next one. */
export function nextPosition(workout: Workout, from: WorkoutPosition): WorkoutPosition | null {
  const exercise = workout.exercises[from.exercise];
  if (from.set + 1 < exercise.sets.length) return { exercise: from.exercise, set: from.set + 1 };
  if (from.exercise + 1 < workout.exercises.length) return { exercise: from.exercise + 1, set: 0 };
  return null;
}

/** «ЗАВЕРШИТЬ ПОДХОД»: marks the set done and starts its rest. The last set of the workout finishes it. */
export function completeSet(workout: Workout, now: number): Workout {
  if (isFinished(workout) || workout.rest) return workout;
  const { exercise, set } = workout.position;
  const exercises = workout.exercises.map((ex, e) =>
    e === exercise ? { ...ex, sets: ex.sets.map((s, i) => (i === set ? { ...s, done: true } : s)) } : ex,
  );
  const updated = { ...workout, exercises };
  const next = nextPosition(updated, workout.position);
  if (!next) return finish(updated, now);
  const restSec = exercises[exercise].sets[set].restSec;
  if (restSec <= 0) return { ...updated, position: next };
  return { ...updated, rest: { next, endsAt: now + restSec * 1000, pausedRemainingMs: null } };
}

/** «ПРОПУСТИТЬ УПРАЖНЕНИЕ»: its remaining sets stay undone; goes straight to the next exercise. */
export function skipExercise(workout: Workout, now: number): Workout {
  if (isFinished(workout) || workout.rest) return workout;
  const index = workout.position.exercise;
  const exercises = workout.exercises.map((ex, e) => (e === index ? { ...ex, skipped: true } : ex));
  const updated = { ...workout, exercises };
  if (index + 1 >= exercises.length) return finish(updated, now);
  return { ...updated, position: { exercise: index + 1, set: 0 } };
}

/** «ЗАВЕРШИТЬ ОТДЫХ», or the timer reaching 0:00: the next set opens. */
export function endRest(workout: Workout): Workout {
  if (!workout.rest) return workout;
  return { ...workout, position: workout.rest.next, rest: null };
}

export function restRemainingMs(workout: Workout, now: number): number {
  const rest = workout.rest;
  if (!rest) return 0;
  if (rest.pausedRemainingMs !== null) return rest.pausedRemainingMs;
  return Math.max(0, rest.endsAt - now);
}

/** Applies elapsed time: a running rest that has run out opens the next set. */
export function settle(workout: Workout, now: number): Workout {
  const rest = workout.rest;
  if (rest && rest.pausedRemainingMs === null && now >= rest.endsAt) return endRest(workout);
  return workout;
}

/** −30 s / +30 s. Taking the time to zero ends the rest. */
export function adjustRest(workout: Workout, deltaSec: number, now: number): Workout {
  const rest = workout.rest;
  if (!rest) return workout;
  const remaining = restRemainingMs(workout, now) + deltaSec * 1000;
  if (remaining <= 0) return endRest(workout);
  if (rest.pausedRemainingMs !== null) return { ...workout, rest: { ...rest, pausedRemainingMs: remaining } };
  return { ...workout, rest: { ...rest, endsAt: now + remaining } };
}

export function pauseRest(workout: Workout, now: number): Workout {
  const rest = workout.rest;
  if (!rest || rest.pausedRemainingMs !== null) return workout;
  return { ...workout, rest: { ...rest, pausedRemainingMs: restRemainingMs(workout, now) } };
}

export function resumeRest(workout: Workout, now: number): Workout {
  const rest = workout.rest;
  if (!rest || rest.pausedRemainingMs === null) return workout;
  return { ...workout, rest: { ...rest, endsAt: now + rest.pausedRemainingMs, pausedRemainingMs: null } };
}

export function finish(workout: Workout, now: number): Workout {
  return { ...workout, finishedAt: now, rest: null };
}

/** How many exercises are behind the current one (done or skipped). */
export function exercisesDone(workout: Workout): number {
  return isFinished(workout) ? workout.exercises.length : workout.position.exercise;
}

/** Remaining time as the large timer shows it: 90 000 ms → "01:30". Rounds up. */
export function formatTimer(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function durationMinutes(workout: Workout): number {
  const end = workout.finishedAt ?? workout.startedAt;
  return Math.max(1, Math.round((end - workout.startedAt) / 60_000));
}

/** Each set's repetitions, «-» for sets not done: "8/8/-". */
export function exerciseResult(exercise: Workout['exercises'][number]): string {
  return exercise.sets.map((set) => (set.done ? String(set.reps) : '-')).join('/');
}

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

/** Plain text for sending in a message. */
export function summaryText(workout: Workout): string {
  const date = new Date(workout.startedAt);
  const day = [dayTitle(workout.dayNumber), workout.dayName].filter(Boolean).join(' · ');
  return [
    `Атлетика · ${day}`,
    `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()} · ${durationMinutes(workout)} мин`,
    '',
    ...workout.exercises.map((exercise) => `${exercise.name}: ${exerciseResult(exercise)}`),
  ].join('\n');
}

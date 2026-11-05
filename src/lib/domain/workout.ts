// Active workout rules (docs/DECISIONS.md, 2026-11-05). Pure functions: each returns
// a new Workout and never mutates its input. Time is passed in as `now` (ms).
//
// A workout is a flat list of steps (one set each). An exercise item contributes its
// sets in order; a series contributes its exercises round by round.
import { dayNumber, dayTitle } from './format';
import { seriesTitle } from './series';
import type { Id, TrainingDay, Workout, WorkoutExercise, WorkoutStep } from './types';

export const REST_ADJUST_SEC = 30;

/** Snapshot of a training day as a new workout; null when the day has nothing to do. */
export function createWorkout(
  day: TrainingDay,
  exerciseNames: ReadonlyMap<Id, string>,
  id: Id,
  now: number,
): Workout | null {
  const exercises: WorkoutExercise[] = [];
  const steps: WorkoutStep[] = [];
  let seriesCount = 0;

  day.items.forEach((item, block) => {
    if (item.kind === 'exercise') {
      if (item.sets.length === 0) return;
      const index = exercises.length;
      exercises.push({
        exerciseId: item.exerciseId,
        name: exerciseNames.get(item.exerciseId) ?? '',
        sets: item.sets.map((set) => ({ reps: set.reps, done: false })),
        skipped: false,
        block,
        series: null,
      });
      item.sets.forEach((set, s) => steps.push({ exercise: index, set: s, restSec: set.restSec }));
      return;
    }
    seriesCount += 1;
    if (item.exercises.length === 0 || item.rounds < 1) return;
    const first = exercises.length;
    for (const ex of item.exercises) {
      exercises.push({
        exerciseId: ex.exerciseId,
        name: exerciseNames.get(ex.exerciseId) ?? '',
        sets: Array.from({ length: item.rounds }, () => ({ reps: ex.reps, done: false })),
        skipped: false,
        block,
        series: { number: seriesCount, rounds: item.rounds },
      });
    }
    const last = item.exercises.length - 1;
    for (let round = 0; round < item.rounds; round++) {
      item.exercises.forEach((ex, i) =>
        // After the round's last exercise the rest after the round applies.
        steps.push({ exercise: first + i, set: round, restSec: i === last ? item.roundRestSec : ex.restSec }),
      );
    }
  });

  if (steps.length === 0) return null;
  // Renumber blocks densely so the progress scale counts only items that are in the workout.
  const blocks = [...new Set(exercises.map((e) => e.block))];
  for (const e of exercises) e.block = blocks.indexOf(e.block);

  return {
    id,
    dayId: day.id,
    dayNumber: dayNumber(day),
    dayName: day.name,
    startedAt: now,
    finishedAt: null,
    exercises,
    steps,
    step: 0,
    rest: null,
  };
}

export function isFinished(workout: Workout): boolean {
  return workout.finishedAt !== null;
}

export function currentStep(workout: Workout): WorkoutStep {
  return workout.steps[workout.step];
}

/** The step after the current one, if any. */
export function upcomingStep(workout: Workout): WorkoutStep | undefined {
  return workout.steps[workout.step + 1];
}

export const ACTUAL_REPS_MIN = 0;
export const ACTUAL_REPS_MAX = 999;

/** The repetitions the set screen shows for the current set: the actual count once adjusted, else the plan. */
export function currentReps(workout: Workout): number {
  const step = currentStep(workout);
  const set = workout.exercises[step.exercise].sets[step.set];
  return set.actual ?? set.reps;
}

/** − / + on the set screen: the repetitions actually done in the current set (0–999). */
export function setActualReps(workout: Workout, reps: number): Workout {
  if (isFinished(workout) || workout.rest) return workout;
  const step = currentStep(workout);
  const actual = Math.min(ACTUAL_REPS_MAX, Math.max(ACTUAL_REPS_MIN, Math.round(reps)));
  const exercises = workout.exercises.map((ex, e) =>
    e === step.exercise ? { ...ex, sets: ex.sets.map((s, i) => (i === step.set ? { ...s, actual } : s)) } : ex,
  );
  return { ...workout, exercises };
}

/** «ЗАВЕРШИТЬ ПОДХОД»: marks the set done and starts its rest. The last step of the workout finishes it. */
export function completeSet(workout: Workout, now: number): Workout {
  if (isFinished(workout) || workout.rest) return workout;
  const step = currentStep(workout);
  const exercises = workout.exercises.map((ex, e) =>
    e === step.exercise ? { ...ex, sets: ex.sets.map((s, i) => (i === step.set ? { ...s, done: true } : s)) } : ex,
  );
  const updated = { ...workout, exercises };
  if (workout.step + 1 >= workout.steps.length) return finish(updated, now);
  if (step.restSec <= 0) return { ...updated, step: workout.step + 1 };
  return { ...updated, rest: { endsAt: now + step.restSec * 1000, pausedRemainingMs: null } };
}

/**
 * «ПРОПУСТИТЬ УПРАЖНЕНИЕ» / «ПРОПУСТИТЬ СЕРИЮ»: the current item's remaining sets stay undone;
 * goes straight to the next item, without rest.
 */
export function skipExercise(workout: Workout, now: number): Workout {
  if (isFinished(workout) || workout.rest) return workout;
  const block = workout.exercises[currentStep(workout).exercise].block;
  const exercises = workout.exercises.map((ex) => (ex.block === block ? { ...ex, skipped: true } : ex));
  const updated = { ...workout, exercises };
  const next = workout.steps.findIndex((s, i) => i > workout.step && exercises[s.exercise].block !== block);
  if (next === -1) return finish(updated, now);
  return { ...updated, step: next };
}

/** «ЗАВЕРШИТЬ ОТДЫХ», or the timer reaching 0:00: the next step opens. */
export function endRest(workout: Workout): Workout {
  if (!workout.rest) return workout;
  return { ...workout, step: workout.step + 1, rest: null };
}

export function restRemainingMs(workout: Workout, now: number): number {
  const rest = workout.rest;
  if (!rest) return 0;
  if (rest.pausedRemainingMs !== null) return rest.pausedRemainingMs;
  return Math.max(0, rest.endsAt - now);
}

/** Applies elapsed time: a running rest that has run out opens the next step. */
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
  return { ...workout, rest: { endsAt: now + rest.pausedRemainingMs, pausedRemainingMs: null } };
}

export function finish(workout: Workout, now: number): Workout {
  return { ...workout, finishedAt: now, rest: null };
}

/** Items (exercises or series) in the workout: the progress scale's segments. */
export function blockCount(workout: Workout): number {
  return new Set(workout.exercises.map((e) => e.block)).size;
}

/** How many items are behind the current one (done or skipped). */
export function blocksDone(workout: Workout): number {
  if (isFinished(workout)) return blockCount(workout);
  return workout.exercises[currentStep(workout).exercise].block;
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

/** Each set's (or round's) repetitions actually done, «-» for those not done: "8/7/-". */
export function exerciseResult(exercise: WorkoutExercise): string {
  return exercise.sets.map((set) => (set.done ? String(set.actual ?? set.reps) : '-')).join('/');
}

/** "Подтягивания (серия 1)" for exercises from a series. */
export function exerciseLabel(exercise: WorkoutExercise): string {
  return exercise.series ? `${exercise.name} (${seriesTitle(exercise.series.number).toLowerCase()})` : exercise.name;
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
    ...workout.exercises.map((exercise) => `${exerciseLabel(exercise)}: ${exerciseResult(exercise)}`),
  ].join('\n');
}

/**
 * Converts a workout stored by schema v2 (position/rest.next) into this shape.
 * Used by the Dexie v3 upgrade in src/lib/db/db.ts.
 */
export function migrateWorkoutV2(old: {
  exercises: { exerciseId: Id; name: string; sets: { reps: number; restSec: number; done: boolean }[]; skipped: boolean }[];
  position: { exercise: number; set: number };
  rest: { endsAt: number; pausedRemainingMs: number | null } | null;
}): Pick<Workout, 'exercises' | 'steps' | 'step' | 'rest'> {
  const steps: WorkoutStep[] = [];
  let step = 0;
  old.exercises.forEach((ex, e) =>
    ex.sets.forEach((set, s) => {
      if (e === old.position.exercise && s === old.position.set) step = steps.length;
      steps.push({ exercise: e, set: s, restSec: set.restSec });
    }),
  );
  return {
    exercises: old.exercises.map((ex, e) => ({
      exerciseId: ex.exerciseId,
      name: ex.name,
      sets: ex.sets.map((set) => ({ reps: set.reps, done: set.done })),
      skipped: ex.skipped,
      block: e,
      series: null,
    })),
    steps,
    step,
    rest: old.rest ? { endsAt: old.rest.endsAt, pausedRemainingMs: old.rest.pausedRemainingMs } : null,
  };
}

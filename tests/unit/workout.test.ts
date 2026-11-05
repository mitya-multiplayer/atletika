import { describe, expect, it } from 'vitest';
import type { DayItem, TrainingDay, Workout, WorkoutExercise } from '../../src/lib/domain/types';
import {
  adjustRest,
  blockCount,
  blocksDone,
  completeSet,
  createWorkout,
  currentReps,
  currentStep,
  durationMinutes,
  endRest,
  exerciseLabel,
  exerciseResult,
  formatTimer,
  isFinished,
  migrateWorkoutV2,
  pauseRest,
  restRemainingMs,
  resumeRest,
  setActualReps,
  settle,
  skipExercise,
  summaryText,
  upcomingStep,
} from '../../src/lib/domain/workout';

const T0 = new Date(2026, 10, 5, 18, 40).getTime();
const SEC = 1000;

const exercise = (exerciseId: string, sets: [number, number][], id = exerciseId): DayItem => ({
  kind: 'exercise',
  id,
  exerciseId,
  sets: sets.map(([reps, restSec]) => ({ reps, restSec })),
});

const series = (rounds: number, roundRestSec: number, exercises: [string, number, number][], id = 'series'): DayItem => ({
  kind: 'series',
  id,
  rounds,
  roundRestSec,
  exercises: exercises.map(([exerciseId, reps, restSec]) => ({ id: `${id}-${exerciseId}`, exerciseId, reps, restSec })),
});

const day = (items: DayItem[], name = 'Верх тела', position = 0): TrainingDay => ({
  id: 'day-1',
  position,
  name,
  createdAt: 0,
  items,
});

const NAMES = new Map([
  ['bench', 'Жим лёжа'],
  ['pull', 'Подтягивания'],
  ['dips', 'Отжимания на брусьях'],
  ['push', 'Отжимания'],
]);

/** Bench 2 sets (rest 90, 60), pull-ups 1 set (rest 120). */
function sample(): Workout {
  return createWorkout(day([exercise('bench', [[8, 90], [6, 60]]), exercise('pull', [[10, 120]])]), NAMES, 'w1', T0)!;
}

/** Bench 1 set (rest 90); series of pull-ups 5 (rest 30) and dips 6 (rest 45), 3 rounds, 120 after a round; push-ups 1 set. */
function withSeries(): Workout {
  return createWorkout(
    day([
      exercise('bench', [[8, 90]]),
      series(3, 120, [['pull', 5, 30], ['dips', 6, 45]]),
      exercise('push', [[10, 60]]),
    ]),
    NAMES,
    'w2',
    T0,
  )!;
}

const at = (w: Workout) => {
  const step = currentStep(w);
  return { exercise: w.exercises[step.exercise].name, set: step.set };
};

describe('createWorkout', () => {
  it('snapshots the day: names, sets, day number and name', () => {
    const w = sample();
    expect(w).toMatchObject({ id: 'w1', dayId: 'day-1', dayNumber: 1, dayName: 'Верх тела', startedAt: T0 });
    expect(w.finishedAt).toBeNull();
    expect(w.exercises.map((e) => e.name)).toEqual(['Жим лёжа', 'Подтягивания']);
    expect(w.exercises[0].sets).toEqual([
      { reps: 8, done: false },
      { reps: 6, done: false },
    ]);
    expect(w.exercises[0].series).toBeNull();
    expect(w.steps).toEqual([
      { exercise: 0, set: 0, restSec: 90 },
      { exercise: 0, set: 1, restSec: 60 },
      { exercise: 1, set: 0, restSec: 120 },
    ]);
    expect(w.step).toBe(0);
    expect(w.rest).toBeNull();
  });

  it('copies sets, so later program edits do not change the workout', () => {
    const d = day([exercise('bench', [[8, 90]])]);
    const w = createWorkout(d, NAMES, 'w', T0)!;
    (d.items[0] as Extract<DayItem, { kind: 'exercise' }>).sets[0].reps = 99;
    expect(w.exercises[0].sets[0].reps).toBe(8);
  });

  it('numbers the day from its position', () => {
    expect(createWorkout(day([exercise('bench', [[8, 90]])], '', 2), NAMES, 'w', T0)!.dayNumber).toBe(3);
  });

  it('returns null for a day without exercises', () => {
    expect(createWorkout(day([]), NAMES, 'w', T0)).toBeNull();
    expect(createWorkout(day([series(3, 60, [])]), NAMES, 'w', T0)).toBeNull();
  });
});

describe('series in a workout', () => {
  it('interleaves the series exercises round by round', () => {
    const w = withSeries();
    expect(w.steps.map((s) => `${w.exercises[s.exercise].name}#${s.set + 1}`)).toEqual([
      'Жим лёжа#1',
      'Подтягивания#1',
      'Отжимания на брусьях#1',
      'Подтягивания#2',
      'Отжимания на брусьях#2',
      'Подтягивания#3',
      'Отжимания на брусьях#3',
      'Отжимания#1',
    ]);
  });

  it('rests after each exercise, and after each round instead after the last one', () => {
    expect(withSeries().steps.map((s) => s.restSec)).toEqual([90, 30, 120, 30, 120, 30, 120, 60]);
  });

  it('gives each series exercise one set per round and marks its series', () => {
    const pull = withSeries().exercises[1];
    expect(pull.sets).toEqual([
      { reps: 5, done: false },
      { reps: 5, done: false },
      { reps: 5, done: false },
    ]);
    expect(pull.series).toEqual({ number: 1, rounds: 3 });
  });

  it('numbers series in day order and counts a series as one block', () => {
    const w = createWorkout(
      day([series(2, 60, [['pull', 5, 30]], 's1'), exercise('bench', [[8, 90]]), series(2, 60, [['dips', 6, 30]], 's2')]),
      NAMES,
      'w',
      T0,
    )!;
    expect(w.exercises.map((e) => e.series?.number ?? null)).toEqual([1, null, 2]);
    expect(blockCount(w)).toBe(3);
    expect(blockCount(withSeries())).toBe(3);
  });

  it('keeps series numbers when an empty series is left out', () => {
    const w = createWorkout(day([series(2, 60, [], 's1'), series(2, 60, [['dips', 6, 30]], 's2')]), NAMES, 'w', T0)!;
    expect(w.exercises[0].series?.number).toBe(2);
    expect(blockCount(w)).toBe(1);
    expect(blocksDone(w)).toBe(0);
  });

  it('walks through the rounds and records each round per exercise', () => {
    let w = endRest(completeSet(withSeries(), T0)); // bench
    for (let i = 0; i < 6; i++) w = endRest(completeSet(w, T0));
    expect(at(w)).toEqual({ exercise: 'Отжимания', set: 0 });
    expect(exerciseResult(w.exercises[1])).toBe('5/5/5');
    expect(exerciseResult(w.exercises[2])).toBe('6/6/6');
    expect(blocksDone(w)).toBe(2);
  });

  it('«Пропустить серию» skips the rest of the series, leaving its rounds undone', () => {
    let w = endRest(completeSet(withSeries(), T0)); // bench
    w = endRest(completeSet(w, T0)); // pull-ups round 1
    w = skipExercise(w, T0);
    expect(at(w)).toEqual({ exercise: 'Отжимания', set: 0 });
    expect(w.exercises[1]).toMatchObject({ skipped: true });
    expect(w.exercises[2]).toMatchObject({ skipped: true });
    expect(exerciseResult(w.exercises[1])).toBe('5/-/-');
    expect(exerciseResult(w.exercises[2])).toBe('-/-/-');
  });

  it('labels series exercises in the summary', () => {
    let w = withSeries();
    for (let i = 0; i < 3; i++) w = skipExercise(w, T0 + 60 * SEC);
    expect(summaryText(w).split('\n').slice(3)).toEqual([
      'Жим лёжа: -',
      'Подтягивания (серия 1): -/-/-',
      'Отжимания на брусьях (серия 1): -/-/-',
      'Отжимания: -',
    ]);
    expect(exerciseLabel(w.exercises[1])).toBe('Подтягивания (серия 1)');
  });
});

describe('finishing sets and rest', () => {
  it('starts the set’s own rest after finishing it', () => {
    const w = completeSet(sample(), T0);
    expect(w.exercises[0].sets[0].done).toBe(true);
    expect(w.rest).toEqual({ endsAt: T0 + 90 * SEC, pausedRemainingMs: null });
    expect(upcomingStep(w)).toEqual({ exercise: 0, set: 1, restSec: 60 });
    expect(restRemainingMs(w, T0 + 30 * SEC)).toBe(60 * SEC);
  });

  it('opens the next set automatically when the rest runs out', () => {
    let w = completeSet(sample(), T0);
    expect(settle(w, T0 + 89 * SEC).rest).not.toBeNull();
    w = settle(w, T0 + 90 * SEC);
    expect(w.rest).toBeNull();
    expect(at(w)).toEqual({ exercise: 'Жим лёжа', set: 1 });
  });

  it('rests after the last set of an exercise too, before the next exercise', () => {
    let w = endRest(completeSet(sample(), T0));
    w = completeSet(w, T0 + 100 * SEC);
    expect(upcomingStep(w)).toMatchObject({ exercise: 1, set: 0 });
    expect(w.rest?.endsAt).toBe(T0 + 160 * SEC);
  });

  it('finishes without rest after the last set of the workout', () => {
    let w = sample();
    w = endRest(completeSet(w, T0));
    w = endRest(completeSet(w, T0));
    w = completeSet(w, T0 + 600 * SEC);
    expect(isFinished(w)).toBe(true);
    expect(w.finishedAt).toBe(T0 + 600 * SEC);
    expect(w.rest).toBeNull();
    expect(w.exercises.every((e) => e.sets.every((s) => s.done))).toBe(true);
  });

  it('goes straight to the next set when rest is 0:00', () => {
    const w = completeSet(createWorkout(day([exercise('bench', [[8, 0], [8, 60]])]), NAMES, 'w', T0)!, T0);
    expect(w.rest).toBeNull();
    expect(at(w)).toEqual({ exercise: 'Жим лёжа', set: 1 });
  });

  it('ignores finishing a set while resting or after the end', () => {
    const resting = completeSet(sample(), T0);
    expect(completeSet(resting, T0 + SEC)).toBe(resting);
    const done = { ...sample(), finishedAt: T0 };
    expect(completeSet(done, T0)).toBe(done);
  });

  it('keeps counting while the app is closed: the timer is a timestamp', () => {
    const w = completeSet(sample(), T0);
    expect(at(settle(w, T0 + 600 * SEC))).toEqual({ exercise: 'Жим лёжа', set: 1 });
  });

  it('never mutates its input', () => {
    const w = withSeries();
    const before = JSON.stringify(w);
    completeSet(w, T0);
    skipExercise(w, T0);
    expect(JSON.stringify(w)).toBe(before);
  });
});

describe('rest controls', () => {
  const resting = () => completeSet(sample(), T0);

  it('+30 s and −30 s change the remaining time', () => {
    expect(restRemainingMs(adjustRest(resting(), 30, T0), T0)).toBe(120 * SEC);
    expect(restRemainingMs(adjustRest(resting(), -30, T0), T0)).toBe(60 * SEC);
  });

  it('−30 s past zero ends the rest', () => {
    const w = adjustRest(resting(), -30, T0 + 70 * SEC);
    expect(w.rest).toBeNull();
    expect(at(w)).toEqual({ exercise: 'Жим лёжа', set: 1 });
  });

  it('pause freezes the time left; resume continues from it', () => {
    const paused = pauseRest(resting(), T0 + 30 * SEC);
    expect(restRemainingMs(paused, T0 + 500 * SEC)).toBe(60 * SEC);
    expect(settle(paused, T0 + 500 * SEC).rest).not.toBeNull();
    const resumed = resumeRest(paused, T0 + 500 * SEC);
    expect(restRemainingMs(resumed, T0 + 510 * SEC)).toBe(50 * SEC);
  });

  it('adjusts a paused rest without starting it', () => {
    const w = adjustRest(pauseRest(resting(), T0), 30, T0);
    expect(w.rest?.pausedRemainingMs).toBe(120 * SEC);
  });

  it('«Завершить отдых» opens the next set at once', () => {
    expect(at(endRest(resting()))).toEqual({ exercise: 'Жим лёжа', set: 1 });
  });
});

describe('actual repetitions', () => {
  it('start at the plan and change with − / +', () => {
    let w = sample();
    expect(currentReps(w)).toBe(8);
    w = setActualReps(w, 7);
    expect(currentReps(w)).toBe(7);
    expect(w.exercises[0].sets[0]).toEqual({ reps: 8, actual: 7, done: false });
  });

  it('are recorded when the set is finished and shown in results and the summary', () => {
    let w = endRest(completeSet(setActualReps(sample(), 6), T0));
    w = endRest(completeSet(setActualReps(w, 9), T0)); // above the plan of 6
    expect(exerciseResult(w.exercises[0])).toBe('6/9');
    w = completeSet(w, T0 + 60 * SEC); // pull-ups at plan, finishes
    expect(summaryText(w).split('\n').slice(3)).toEqual(['Жим лёжа: 6/9', 'Подтягивания: 10']);
  });

  it('apply to the current set only', () => {
    const w = endRest(completeSet(setActualReps(sample(), 5), T0));
    expect(currentReps(w)).toBe(6); // the second set's plan
    expect(w.exercises[0].sets[1].actual).toBeUndefined();
  });

  it('stay between 0 and 999', () => {
    expect(currentReps(setActualReps(sample(), -3))).toBe(0);
    expect(currentReps(setActualReps(sample(), 5000))).toBe(999);
    expect(exerciseResult(completeSet(setActualReps(sample(), 0), T0).exercises[0])).toBe('0/-');
  });

  it('cannot change while resting or after the end', () => {
    const resting = completeSet(sample(), T0);
    expect(setActualReps(resting, 3)).toBe(resting);
    const done = { ...sample(), finishedAt: T0 };
    expect(setActualReps(done, 3)).toBe(done);
  });

  it('work for series rounds too', () => {
    let w = endRest(completeSet(withSeries(), T0)); // bench
    w = endRest(completeSet(setActualReps(w, 4), T0)); // pull-ups round 1: 4 of 5
    expect(exerciseResult(w.exercises[1])).toBe('4/-/-');
  });
});

describe('skipping an exercise', () => {
  it('leaves its remaining sets undone and moves to the next exercise without rest', () => {
    let w = endRest(completeSet(sample(), T0));
    w = skipExercise(w, T0 + 100 * SEC);
    expect(w.exercises[0].skipped).toBe(true);
    expect(w.exercises[0].sets.map((s) => s.done)).toEqual([true, false]);
    expect(at(w)).toEqual({ exercise: 'Подтягивания', set: 0 });
    expect(w.rest).toBeNull();
  });

  it('skipping the last exercise finishes the workout', () => {
    const w = skipExercise(skipExercise(sample(), T0), T0 + 5 * SEC);
    expect(isFinished(w)).toBe(true);
    expect(w.exercises.every((e) => e.skipped)).toBe(true);
  });

  it('counts done and skipped items for the progress scale', () => {
    let w = sample();
    expect(blocksDone(w)).toBe(0);
    w = skipExercise(w, T0);
    expect(blocksDone(w)).toBe(1);
    w = skipExercise(w, T0);
    expect(blocksDone(w)).toBe(2);
  });
});

describe('results and summary text', () => {
  it('shows each set’s repetitions and «-» for sets not done', () => {
    const ex: WorkoutExercise = {
      exerciseId: 'b',
      name: 'Жим',
      skipped: true,
      block: 0,
      series: null,
      sets: [
        { reps: 8, done: true },
        { reps: 8, done: false },
        { reps: 6, done: false },
      ],
    };
    expect(exerciseResult(ex)).toBe('8/-/-');
    expect(exerciseResult({ ...ex, sets: ex.sets.map((s) => ({ ...s, done: false })) })).toBe('-/-/-');
  });

  it('formats the timer as mm:ss, rounding up', () => {
    expect(formatTimer(90 * SEC)).toBe('01:30');
    expect(formatTimer(89_001)).toBe('01:30');
    expect(formatTimer(1)).toBe('00:01');
    expect(formatTimer(0)).toBe('00:00');
    expect(formatTimer(-5)).toBe('00:00');
    expect(formatTimer(600 * SEC)).toBe('10:00');
  });

  it('measures the duration in whole minutes, at least 1', () => {
    expect(durationMinutes({ ...sample(), finishedAt: T0 + 52 * 60 * SEC + 20 * SEC })).toBe(52);
    expect(durationMinutes({ ...sample(), finishedAt: T0 + 10 * SEC })).toBe(1);
  });

  it('builds plain text for sending in a message', () => {
    let w = completeSet(sample(), T0); // bench set 1 done
    w = endRest(w);
    w = skipExercise(w, T0); // bench set 2 skipped
    w = skipExercise(w, T0 + 52 * 60 * SEC); // pull-ups skipped, finishes
    expect(summaryText(w)).toBe(
      ['Атлетика · День 1 · Верх тела', '5 ноя 2026 · 52 мин', '', 'Жим лёжа: 8/-', 'Подтягивания: -'].join('\n'),
    );
  });

  it('leaves out an empty day name', () => {
    const w = { ...sample(), dayName: '', finishedAt: T0 + 60 * SEC };
    expect(summaryText(w).split('\n')[0]).toBe('Атлетика · День 1');
  });
});

describe('migrating a v2 workout', () => {
  const v2 = {
    exercises: [
      { exerciseId: 'bench', name: 'Жим лёжа', skipped: false, sets: [
        { reps: 8, restSec: 90, done: true },
        { reps: 6, restSec: 60, done: false },
      ] },
      { exerciseId: 'pull', name: 'Подтягивания', skipped: false, sets: [{ reps: 10, restSec: 120, done: false }] },
    ],
    position: { exercise: 0, set: 0 },
    rest: { endsAt: T0 + 90 * SEC, pausedRemainingMs: null },
  };

  it('turns sets into steps and keeps progress and a running rest', () => {
    const m = migrateWorkoutV2(v2);
    expect(m.steps).toEqual([
      { exercise: 0, set: 0, restSec: 90 },
      { exercise: 0, set: 1, restSec: 60 },
      { exercise: 1, set: 0, restSec: 120 },
    ]);
    expect(m.step).toBe(0);
    expect(m.rest).toEqual({ endsAt: T0 + 90 * SEC, pausedRemainingMs: null });
    expect(m.exercises[0]).toEqual({
      exerciseId: 'bench',
      name: 'Жим лёжа',
      skipped: false,
      block: 0,
      series: null,
      sets: [
        { reps: 8, done: true },
        { reps: 6, done: false },
      ],
    });
    expect(m.exercises[1].block).toBe(1);
  });

  it('finds the step of a later position', () => {
    expect(migrateWorkoutV2({ ...v2, position: { exercise: 1, set: 0 }, rest: null }).step).toBe(2);
  });
});

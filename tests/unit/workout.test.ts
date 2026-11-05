import { describe, expect, it } from 'vitest';
import type { TrainingDay, Workout } from '../../src/lib/domain/types';
import {
  adjustRest,
  completeSet,
  createWorkout,
  durationMinutes,
  endRest,
  exerciseResult,
  exercisesDone,
  formatTimer,
  isFinished,
  pauseRest,
  restRemainingMs,
  resumeRest,
  settle,
  skipExercise,
  summaryText,
} from '../../src/lib/domain/workout';

const T0 = new Date(2026, 10, 5, 18, 40).getTime();
const SEC = 1000;

const day = (items: [string, [number, number][]][], name = 'Верх тела', position = 0): TrainingDay => ({
  id: 'day-1',
  position,
  name,
  createdAt: 0,
  items: items.map(([exerciseId, sets], i) => ({
    kind: 'exercise',
    id: `item-${i}`,
    exerciseId,
    sets: sets.map(([reps, restSec]) => ({ reps, restSec })),
  })),
});

const NAMES = new Map([
  ['bench', 'Жим лёжа'],
  ['pull', 'Подтягивания'],
  ['dips', 'Отжимания на брусьях'],
]);

/** Bench 2 sets (rest 90, 60), pull-ups 1 set (rest 120). */
function sample(): Workout {
  return createWorkout(
    day([
      ['bench', [[8, 90], [6, 60]]],
      ['pull', [[10, 120]]],
    ]),
    NAMES,
    'w1',
    T0,
  )!;
}

describe('createWorkout', () => {
  it('snapshots the day: names, sets, day number and name', () => {
    const w = sample();
    expect(w).toMatchObject({ id: 'w1', dayId: 'day-1', dayNumber: 1, dayName: 'Верх тела', startedAt: T0 });
    expect(w.finishedAt).toBeNull();
    expect(w.exercises.map((e) => e.name)).toEqual(['Жим лёжа', 'Подтягивания']);
    expect(w.exercises[0].sets).toEqual([
      { reps: 8, restSec: 90, done: false },
      { reps: 6, restSec: 60, done: false },
    ]);
    expect(w.position).toEqual({ exercise: 0, set: 0 });
    expect(w.rest).toBeNull();
  });

  it('copies sets, so later program edits do not change the workout', () => {
    const d = day([['bench', [[8, 90]]]]);
    const w = createWorkout(d, NAMES, 'w', T0)!;
    d.items[0].sets[0].reps = 99;
    expect(w.exercises[0].sets[0].reps).toBe(8);
  });

  it('numbers the day from its position', () => {
    expect(createWorkout(day([['bench', [[8, 90]]]], '', 2), NAMES, 'w', T0)!.dayNumber).toBe(3);
  });

  it('returns null for a day without exercises', () => {
    expect(createWorkout(day([]), NAMES, 'w', T0)).toBeNull();
  });
});

describe('finishing sets and rest', () => {
  it('starts the set’s own rest after finishing it', () => {
    const w = completeSet(sample(), T0);
    expect(w.exercises[0].sets[0].done).toBe(true);
    expect(w.rest).toEqual({ next: { exercise: 0, set: 1 }, endsAt: T0 + 90 * SEC, pausedRemainingMs: null });
    expect(restRemainingMs(w, T0 + 30 * SEC)).toBe(60 * SEC);
  });

  it('opens the next set automatically when the rest runs out', () => {
    let w = completeSet(sample(), T0);
    expect(settle(w, T0 + 89 * SEC).rest).not.toBeNull();
    w = settle(w, T0 + 90 * SEC);
    expect(w.rest).toBeNull();
    expect(w.position).toEqual({ exercise: 0, set: 1 });
  });

  it('rests after the last set of an exercise too, before the next exercise', () => {
    let w = endRest(completeSet(sample(), T0));
    w = completeSet(w, T0 + 100 * SEC);
    expect(w.rest?.next).toEqual({ exercise: 1, set: 0 });
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
    const w = completeSet(createWorkout(day([['bench', [[8, 0], [8, 60]]]]), NAMES, 'w', T0)!, T0);
    expect(w.rest).toBeNull();
    expect(w.position).toEqual({ exercise: 0, set: 1 });
  });

  it('ignores finishing a set while resting or after the end', () => {
    const resting = completeSet(sample(), T0);
    expect(completeSet(resting, T0 + SEC)).toBe(resting);
    const done = { ...sample(), finishedAt: T0 };
    expect(completeSet(done, T0)).toBe(done);
  });

  it('keeps counting while the app is closed: the timer is a timestamp', () => {
    const w = completeSet(sample(), T0);
    // Reopened 10 minutes later: the rest is long over and the next set is open.
    expect(settle(w, T0 + 600 * SEC).position).toEqual({ exercise: 0, set: 1 });
  });

  it('never mutates its input', () => {
    const w = sample();
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
    expect(w.position).toEqual({ exercise: 0, set: 1 });
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
    expect(endRest(resting()).position).toEqual({ exercise: 0, set: 1 });
  });
});

describe('skipping an exercise', () => {
  it('leaves its remaining sets undone and moves to the next exercise without rest', () => {
    let w = endRest(completeSet(sample(), T0));
    w = skipExercise(w, T0 + 100 * SEC);
    expect(w.exercises[0].skipped).toBe(true);
    expect(w.exercises[0].sets.map((s) => s.done)).toEqual([true, false]);
    expect(w.position).toEqual({ exercise: 1, set: 0 });
    expect(w.rest).toBeNull();
  });

  it('skipping the last exercise finishes the workout', () => {
    const w = skipExercise(skipExercise(sample(), T0), T0 + 5 * SEC);
    expect(isFinished(w)).toBe(true);
    expect(w.exercises.every((e) => e.skipped)).toBe(true);
  });

  it('counts done and skipped exercises for the progress scale', () => {
    let w = sample();
    expect(exercisesDone(w)).toBe(0);
    w = skipExercise(w, T0);
    expect(exercisesDone(w)).toBe(1);
    w = skipExercise(w, T0);
    expect(exercisesDone(w)).toBe(2);
  });
});

describe('results and summary text', () => {
  it('shows each set’s repetitions and «-» for sets not done', () => {
    const ex = { exerciseId: 'b', name: 'Жим', skipped: true, sets: [
      { reps: 8, restSec: 90, done: true },
      { reps: 8, restSec: 90, done: false },
      { reps: 6, restSec: 90, done: false },
    ] };
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

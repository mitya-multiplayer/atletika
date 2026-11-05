import Dexie from 'dexie';
import { beforeEach, describe, expect, it } from 'vitest';
import { AtletikaDB, db } from '../../src/lib/db/db';
import { loadDemoData } from '../../src/lib/db/demo';
import {
  addExerciseToDay,
  addExerciseToSeries,
  addSeriesToDay,
  createDay,
  deleteDay,
  deleteExercise,
  finishedWorkoutsQuery,
  getActiveWorkout,
  getDay,
  getLastFinishedWorkout,
  getWorkout,
  modifySeries,
  moveDayItem,
  removeItem,
  renameDay,
  saveExercise,
  saveWorkout,
  startOrResumeWorkout,
  updateItemSets,
} from '../../src/lib/db/repo';
import { moveSeriesExercise, removeSeriesExercise, setRoundRest, setRounds, updateSeriesExercise } from '../../src/lib/domain/series';
import type { ExerciseItem, SeriesItem } from '../../src/lib/domain/types';
import { completeSet, finish, skipExercise } from '../../src/lib/domain/workout';

beforeEach(async () => {
  await db.exercises.clear();
  await db.days.clear();
  await db.workouts.clear();
});

const exercise = (name: string) => saveExercise({ name, description: '', videoUrl: '' });
/** A day's items, all of them plain exercises in these tests. */
const exerciseItems = async (dayId: string) => (await getDay(dayId))!.items as ExerciseItem[];

describe('training days', () => {
  it('numbers new days in creation order', async () => {
    const first = await createDay();
    const second = await createDay();
    expect([first.position, second.position]).toEqual([0, 1]);
  });

  it('renumbers the following days after a delete', async () => {
    const [a, b, c] = [await createDay(), await createDay(), await createDay()];
    await deleteDay(a.id);
    expect((await getDay(b.id))?.position).toBe(0);
    expect((await getDay(c.id))?.position).toBe(1);
  });

  it('trims the day name', async () => {
    const day = await createDay();
    await renameDay(day.id, '  Верх тела ');
    expect((await getDay(day.id))?.name).toBe('Верх тела');
  });
});

describe('exercises in a day', () => {
  it('adds an exercise with default sets, reorders and removes it', async () => {
    const day = await createDay();
    const pushUps = await exercise('Отжимания');
    const pullUps = await exercise('Подтягивания');
    const first = await addExerciseToDay(day.id, pushUps);
    await addExerciseToDay(day.id, pullUps);

    let items = await exerciseItems(day.id);
    expect(items.map((item) => item.exerciseId)).toEqual([pushUps, pullUps]);
    expect(items[0].sets).toHaveLength(3);

    await moveDayItem(day.id, 0, 1);
    items = await exerciseItems(day.id);
    expect(items.map((item) => item.exerciseId)).toEqual([pullUps, pushUps]);

    await removeItem(day.id, first);
    items = await exerciseItems(day.id);
    expect(items.map((item) => item.exerciseId)).toEqual([pullUps]);
  });

  it('stores per-set reps and rest, including the last set', async () => {
    const day = await createDay();
    const item = await addExerciseToDay(day.id, await exercise('Жим лёжа'));
    const sets = [
      { reps: 10, restSec: 90 },
      { reps: 8, restSec: 120 },
      { reps: 6, restSec: 180 },
    ];
    await updateItemSets(day.id, item, sets);
    expect((await exerciseItems(day.id))[0].sets).toEqual(sets);
  });
});

describe('library exercises', () => {
  it('blocks deleting an exercise that a day uses', async () => {
    const day = await createDay();
    const id = await exercise('Жим лёжа');
    await addExerciseToDay(day.id, id);

    const result = await deleteExercise(id);
    expect(result.deleted).toBe(false);
    expect(await db.exercises.get(id)).toBeDefined();
  });

  it('deletes an unused exercise', async () => {
    const id = await exercise('Жим лёжа');
    expect(await deleteExercise(id)).toEqual({ deleted: true });
    expect(await db.exercises.get(id)).toBeUndefined();
  });
});

describe('demo data', () => {
  it('loads only into an empty database', async () => {
    expect(await loadDemoData()).toBe(true);
    expect(await db.days.count()).toBe(3);
    expect(await loadDemoData()).toBe(false);
  });
});

describe('workouts', () => {
  async function dayWith(...names: string[]) {
    const day = await createDay();
    await renameDay(day.id, 'Верх тела');
    for (const name of names) await addExerciseToDay(day.id, await exercise(name));
    return day;
  }

  it('starts a workout from a snapshot of the day and stores it', async () => {
    const day = await dayWith('Жим лёжа', 'Подтягивания');
    const w = (await startOrResumeWorkout(day.id, 1000))!;
    expect(w.exercises.map((e) => e.name)).toEqual(['Жим лёжа', 'Подтягивания']);
    expect(w).toMatchObject({ dayId: day.id, dayNumber: 1, dayName: 'Верх тела', startedAt: 1000, finishedAt: null });
    expect(await getWorkout(w.id)).toEqual(w);
    expect((await getActiveWorkout())?.id).toBe(w.id);
  });

  it('resumes the workout in progress instead of starting another', async () => {
    const day = await dayWith('Жим лёжа');
    const other = await dayWith('Подтягивания');
    const first = (await startOrResumeWorkout(day.id, 1000))!;
    const again = await startOrResumeWorkout(other.id, 2000);
    expect(again?.id).toBe(first.id);
    expect(await db.workouts.count()).toBe(1);
  });

  it('does not start a day without exercises', async () => {
    const day = await createDay();
    expect(await startOrResumeWorkout(day.id)).toBeNull();
    expect(await db.workouts.count()).toBe(0);
  });

  it('keeps the snapshot when the program changes afterwards', async () => {
    const day = await dayWith('Жим лёжа');
    const w = (await startOrResumeWorkout(day.id))!;
    const item = (await getDay(day.id))!.items[0];
    await updateItemSets(day.id, item.id, [{ reps: 99, restSec: 1 }]);
    await renameDay(day.id, 'Другое');
    const stored = (await getWorkout(w.id))!;
    expect(stored.exercises[0].sets[0].reps).toBe(10);
    expect(stored.dayName).toBe('Верх тела');
  });

  it('saves progress, including a running rest timer', async () => {
    const day = await dayWith('Жим лёжа');
    const w = completeSet((await startOrResumeWorkout(day.id, 1000))!, 5000);
    await saveWorkout(w);
    const stored = (await getWorkout(w.id))!;
    expect(stored.exercises[0].sets[0].done).toBe(true);
    expect(stored.rest).toEqual({ endsAt: 5000 + 90_000, pausedRemainingMs: null });
    expect(stored.step).toBe(0);
  });

  it('a finished workout is no longer active and becomes the last finished one', async () => {
    const day = await dayWith('Жим лёжа');
    const w = (await startOrResumeWorkout(day.id, 1000))!;
    expect(await getLastFinishedWorkout()).toBeUndefined();
    await saveWorkout(skipExercise(w, 9000));
    expect(await getActiveWorkout()).toBeUndefined();
    expect((await getLastFinishedWorkout())?.id).toBe(w.id);
  });

  it('the last finished workout is the most recent one', async () => {
    const day1 = await dayWith('Жим лёжа');
    const day2 = await dayWith('Подтягивания');
    await saveWorkout(finish((await startOrResumeWorkout(day1.id, 1000))!, 2000));
    await saveWorkout(finish((await startOrResumeWorkout(day2.id, 3000))!, 4000));
    expect((await getLastFinishedWorkout())?.dayId).toBe(day2.id);
  });
});

describe('history', () => {
  /** First value of a live query. */
  function first<T>(query: { subscribe: (next: (value: T) => void) => { unsubscribe: () => void } }): Promise<T> {
    return new Promise((resolve) => {
      const subscription = query.subscribe((value) => {
        resolve(value);
        queueMicrotask(() => subscription.unsubscribe());
      });
    });
  }

  it('lists finished workouts newest first and leaves out the one in progress', async () => {
    const day = await createDay();
    await addExerciseToDay(day.id, await exercise('Жим лёжа'));
    await saveWorkout(finish((await startOrResumeWorkout(day.id, 1000))!, 2000));
    await saveWorkout(finish((await startOrResumeWorkout(day.id, 5000))!, 6000));
    await startOrResumeWorkout(day.id, 9000); // in progress

    const list = await first(finishedWorkoutsQuery());
    expect(list.map((w) => w.startedAt)).toEqual([5000, 1000]);
  });

  it('is empty before the first finished workout', async () => {
    expect(await first(finishedWorkoutsQuery())).toEqual([]);
  });
});

describe('database upgrade', () => {
  it('converts a v2 workout in progress to steps, keeping its rest timer', async () => {
    const name = 'atletika-upgrade-v2-test';
    await Dexie.delete(name);
    const v2 = new Dexie(name);
    v2.version(1).stores({ exercises: 'id, name', days: 'id, position' });
    v2.version(2).stores({ workouts: 'id, startedAt, finishedAt' });
    await v2.table('workouts').add({
      id: 'w1', dayId: 'd1', dayNumber: 1, dayName: 'Верх тела', startedAt: 1000, finishedAt: null,
      exercises: [{ exerciseId: 'e1', name: 'Жим лёжа', skipped: false, sets: [
        { reps: 8, restSec: 90, done: true },
        { reps: 8, restSec: 90, done: false },
      ] }],
      position: { exercise: 0, set: 0 },
      rest: { next: { exercise: 0, set: 1 }, endsAt: 99_000, pausedRemainingMs: null },
    });
    v2.close();

    const v3 = new AtletikaDB(name);
    const w = (await v3.workouts.get('w1'))!;
    expect(w.steps).toEqual([
      { exercise: 0, set: 0, restSec: 90 },
      { exercise: 0, set: 1, restSec: 90 },
    ]);
    expect(w.step).toBe(0);
    expect(w.rest).toEqual({ endsAt: 99_000, pausedRemainingMs: null });
    expect(w.exercises[0]).toMatchObject({ block: 0, series: null, sets: [{ reps: 8, done: true }, { reps: 8, done: false }] });
    expect('position' in w).toBe(false);
    v3.close();
    await Dexie.delete(name);
  });

  it('keeps version 1 data and adds the workouts table', async () => {
    const name = 'atletika-upgrade-test';
    await Dexie.delete(name);
    const v1 = new Dexie(name);
    v1.version(1).stores({ exercises: 'id, name', days: 'id, position' });
    await v1.table('exercises').add({ id: 'e1', name: 'Жим лёжа', description: '', videoUrl: '', createdAt: 1 });
    await v1.table('days').add({ id: 'd1', position: 0, name: 'Верх тела', items: [], createdAt: 1 });
    v1.close();

    const v2 = new AtletikaDB(name);
    expect(await v2.exercises.get('e1')).toMatchObject({ name: 'Жим лёжа' });
    expect(await v2.days.get('d1')).toMatchObject({ name: 'Верх тела' });
    expect(await v2.workouts.count()).toBe(0);
    expect(v2.verno).toBe(3);
    v2.close();
    await Dexie.delete(name);
  });
});

describe('series in a day', () => {
  const seriesOf = async (dayId: string, itemId: string) =>
    (await getDay(dayId))!.items.find((item) => item.id === itemId) as SeriesItem;

  it('adds an empty series with the defaults at the end of the day', async () => {
    const day = await createDay();
    await addExerciseToDay(day.id, await exercise('Жим лёжа'));
    const id = await addSeriesToDay(day.id);
    const items = (await getDay(day.id))!.items;
    expect(items.map((item) => item.kind)).toEqual(['exercise', 'series']);
    expect(await seriesOf(day.id, id)).toEqual({ kind: 'series', id, rounds: 3, roundRestSec: 120, exercises: [] });
  });

  it('adds, edits, reorders and removes exercises in a series', async () => {
    const day = await createDay();
    const id = await addSeriesToDay(day.id);
    const pull = await exercise('Подтягивания');
    const dips = await exercise('Отжимания на брусьях');
    const a = await addExerciseToSeries(day.id, id, pull);
    const b = await addExerciseToSeries(day.id, id, dips);
    await modifySeries(day.id, id, (s) => updateSeriesExercise(setRoundRest(setRounds(s, 5), 90), a, { reps: 5, restSec: 45 }));

    let series = await seriesOf(day.id, id);
    expect(series.rounds).toBe(5);
    expect(series.roundRestSec).toBe(90);
    expect(series.exercises).toEqual([
      { id: a, exerciseId: pull, reps: 5, restSec: 45 },
      { id: b, exerciseId: dips, reps: 10, restSec: 30 },
    ]);

    await modifySeries(day.id, id, (s) => moveSeriesExercise(s, 0, 1));
    series = await seriesOf(day.id, id);
    expect(series.exercises.map((e) => e.id)).toEqual([b, a]);

    await modifySeries(day.id, id, (s) => removeSeriesExercise(s, b));
    expect((await seriesOf(day.id, id)).exercises.map((e) => e.id)).toEqual([a]);
  });

  it('keeps rounds, reps and rest within limits', async () => {
    const day = await createDay();
    const id = await addSeriesToDay(day.id);
    const a = await addExerciseToSeries(day.id, id, await exercise('Подтягивания'));
    await modifySeries(day.id, id, (s) => updateSeriesExercise(setRoundRest(setRounds(s, 0), -10), a, { reps: 0, restSec: -5 }));
    const series = await seriesOf(day.id, id);
    expect(series.rounds).toBe(1);
    expect(series.roundRestSec).toBe(0);
    expect(series.exercises[0]).toMatchObject({ reps: 1, restSec: 0 });
  });

  it('blocks deleting a library exercise that a series uses', async () => {
    const day = await createDay();
    const id = await addSeriesToDay(day.id);
    const pull = await exercise('Подтягивания');
    await addExerciseToSeries(day.id, id, pull);
    expect((await deleteExercise(pull)).deleted).toBe(false);
  });

  it('removing a series removes it from the day', async () => {
    const day = await createDay();
    const id = await addSeriesToDay(day.id);
    await removeItem(day.id, id);
    expect((await getDay(day.id))!.items).toEqual([]);
  });

  it('starts a workout with the series exercises named', async () => {
    const day = await createDay();
    const id = await addSeriesToDay(day.id);
    await addExerciseToSeries(day.id, id, await exercise('Подтягивания'));
    const w = (await startOrResumeWorkout(day.id))!;
    expect(w.exercises.map((e) => [e.name, e.series])).toEqual([['Подтягивания', { number: 1, rounds: 3 }]]);
    expect(w.steps).toHaveLength(3);
  });
});

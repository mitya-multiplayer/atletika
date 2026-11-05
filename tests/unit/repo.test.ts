import Dexie from 'dexie';
import { beforeEach, describe, expect, it } from 'vitest';
import { AtletikaDB, db } from '../../src/lib/db/db';
import { loadDemoData } from '../../src/lib/db/demo';
import {
  addExerciseToDay,
  createDay,
  deleteDay,
  deleteExercise,
  finishedWorkoutsQuery,
  getActiveWorkout,
  getDay,
  getLastFinishedWorkout,
  getWorkout,
  moveDayItem,
  removeItem,
  renameDay,
  saveExercise,
  saveWorkout,
  startOrResumeWorkout,
  updateItemSets,
} from '../../src/lib/db/repo';
import { completeSet, finish, skipExercise } from '../../src/lib/domain/workout';

beforeEach(async () => {
  await db.exercises.clear();
  await db.days.clear();
  await db.workouts.clear();
});

const exercise = (name: string) => saveExercise({ name, description: '', videoUrl: '' });

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

    let items = (await getDay(day.id))!.items;
    expect(items.map((item) => item.exerciseId)).toEqual([pushUps, pullUps]);
    expect(items[0].sets).toHaveLength(3);

    await moveDayItem(day.id, 0, 1);
    items = (await getDay(day.id))!.items;
    expect(items.map((item) => item.exerciseId)).toEqual([pullUps, pushUps]);

    await removeItem(day.id, first);
    items = (await getDay(day.id))!.items;
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
    expect((await getDay(day.id))!.items[0].sets).toEqual(sets);
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
    expect(stored.rest).toEqual({ next: { exercise: 0, set: 1 }, endsAt: 5000 + 90_000, pausedRemainingMs: null });
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
    expect(v2.verno).toBe(2);
    v2.close();
    await Dexie.delete(name);
  });
});

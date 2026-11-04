import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/lib/db/db';
import { loadDemoData } from '../../src/lib/db/demo';
import {
  addExerciseToDay,
  createDay,
  deleteDay,
  deleteExercise,
  getDay,
  moveDayItem,
  removeItem,
  renameDay,
  saveExercise,
  updateItemSets,
} from '../../src/lib/db/repo';

beforeEach(async () => {
  await db.exercises.clear();
  await db.days.clear();
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

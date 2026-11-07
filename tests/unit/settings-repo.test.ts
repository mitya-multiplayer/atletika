// Settings and the danger zone against fake-indexeddb: what ends up stored.
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/lib/db/db';
import { loadDemoData } from '../../src/lib/db/demo';
import {
  addExerciseToDay,
  addExerciseToSeries,
  addSeriesToDay,
  clearHistory,
  createDay,
  dataCounts,
  daysUsingExercises,
  deleteAllDays,
  deleteAllExercises,
  exportBackup,
  getSettings,
  importBackup,
  saveExercise,
  saveWorkout,
  setDefaultRest,
  startOrResumeWorkout,
} from '../../src/lib/db/repo';
import { backupJson, parseBackup } from '../../src/lib/domain/backup';
import { REST_MAX_SEC } from '../../src/lib/domain/defaults';
import type { ExerciseItem } from '../../src/lib/domain/types';
import { finish, skipExercise } from '../../src/lib/domain/workout';

const NOW = new Date(2026, 10, 7, 9, 0).getTime();

beforeEach(async () => {
  await Promise.all([db.exercises.clear(), db.days.clear(), db.workouts.clear(), db.settings.clear()]);
});

const exercise = (name: string) => saveExercise({ name, description: '', videoUrl: '' });

/** Demo program; Day 1 finished twice, Day 2 in progress. */
async function demoWithHistory() {
  await loadDemoData();
  const [day1, day2] = await db.days.orderBy('position').toArray();
  for (const start of [NOW - 2 * 86_400_000, NOW - 86_400_000]) {
    let workout = (await startOrResumeWorkout(day1.id, start))!;
    for (let i = 0; i < 4; i++) workout = skipExercise(workout, start + 1000);
    await saveWorkout(finish(workout, start + 2000));
  }
  await startOrResumeWorkout(day2.id, NOW);
}

describe('default rest', () => {
  it('is 1:30 until changed, and nothing is stored for it', async () => {
    expect(await getSettings()).toEqual({ defaultRestSec: 90 });
    expect(await db.settings.count()).toBe(0);
  });

  it('is stored as one record', async () => {
    await setDefaultRest(45);
    await setDefaultRest(60);
    expect(await getSettings()).toEqual({ defaultRestSec: 60 });
    expect(await db.settings.toArray()).toEqual([{ id: 'app', defaultRestSec: 60 }]);
  });

  it('is kept within 0:00 and the rest limit', async () => {
    await setDefaultRest(-30);
    expect((await getSettings()).defaultRestSec).toBe(0);
    await setDefaultRest(REST_MAX_SEC + 600);
    expect((await getSettings()).defaultRestSec).toBe(REST_MAX_SEC);
    await setDefaultRest(44.6);
    expect((await getSettings()).defaultRestSec).toBe(45);
  });

  it('applies to an exercise added to a day afterwards, not to existing ones', async () => {
    const day = await createDay();
    const before = await addExerciseToDay(day.id, await exercise('Жим лёжа'));
    await setDefaultRest(45);
    const after = await addExerciseToDay(day.id, await exercise('Подтягивания'));
    const items = (await db.days.get(day.id))!.items as ExerciseItem[];
    expect(items.find((i) => i.id === before)!.sets.map((s) => s.restSec)).toEqual([90, 90, 90]);
    expect(items.find((i) => i.id === after)!.sets).toEqual([
      { reps: 10, restSec: 45 },
      { reps: 10, restSec: 45 },
      { reps: 10, restSec: 45 },
    ]);
  });

  it('does not change the defaults of a series', async () => {
    await setDefaultRest(15);
    const day = await createDay();
    const seriesId = await addSeriesToDay(day.id);
    await addExerciseToSeries(day.id, seriesId, await exercise('Подтягивания'));
    const [series] = (await db.days.get(day.id))!.items;
    expect(series).toMatchObject({ kind: 'series', roundRestSec: 120, exercises: [{ restSec: 30 }] });
  });

  it('a full backup carries it; other files and imports leave it alone', async () => {
    await setDefaultRest(45);
    const all = await exportBackup('all', NOW);
    expect(all.settings).toEqual({ defaultRestSec: 45 });
    expect((await exportBackup('program', NOW)).settings).toBeUndefined();

    await setDefaultRest(120);
    await importBackup(await exportBackup('program', NOW), 'program');
    expect((await getSettings()).defaultRestSec).toBe(120);

    const parsed = parseBackup(backupJson(all));
    if (!parsed.ok) throw new Error(parsed.error);
    await importBackup(parsed.backup, 'all');
    expect(await db.settings.toArray()).toEqual([{ id: 'app', defaultRestSec: 45 }]);
  });

  it('a full backup without settings restores the default', async () => {
    await setDefaultRest(45);
    const all = await exportBackup('all', NOW);
    delete all.settings;
    await importBackup(all, 'all');
    expect(await getSettings()).toEqual({ defaultRestSec: 90 });
  });
});

describe('danger zone', () => {
  it('counts what each action would delete; a workout in progress is not history', async () => {
    expect(await dataCounts()).toEqual({ exercises: 0, days: 0, finishedWorkouts: 0 });
    await demoWithHistory();
    expect(await dataCounts()).toEqual({ exercises: 10, days: 3, finishedWorkouts: 2 });
  });

  it('clearing history deletes finished workouts only', async () => {
    await demoWithHistory();
    const inProgress = await db.workouts.filter((w) => w.finishedAt === null).toArray();
    await clearHistory();
    expect(await db.workouts.toArray()).toEqual(inProgress);
    expect(await db.days.count()).toBe(3);
    expect(await db.exercises.count()).toBe(10);
  });

  it('clearing an empty history changes nothing', async () => {
    await clearHistory();
    expect(await db.workouts.count()).toBe(0);
  });

  it('deleting days keeps the library, history and the workout in progress', async () => {
    await demoWithHistory();
    const workouts = await db.workouts.toArray();
    await deleteAllDays();
    expect(await db.days.count()).toBe(0);
    expect(await db.exercises.count()).toBe(10);
    expect(await db.workouts.toArray()).toEqual(workouts);
  });

  it('deleting exercises is refused while days use them, naming those days in order', async () => {
    await loadDemoData();
    const empty = await createDay(); // Day 4, with no exercises: not listed
    const result = await deleteAllExercises();
    expect(result.deleted).toBe(false);
    if (result.deleted) return;
    expect(result.usedIn.map((d) => d.name)).toEqual(['Верх тела', 'Низ тела', 'Жимовые']);
    expect(result.usedIn.some((d) => d.id === empty.id)).toBe(false);
    expect(await db.exercises.count()).toBe(10);
  });

  it('a series counts as using its exercises; an empty series does not', async () => {
    const day = await createDay();
    const seriesId = await addSeriesToDay(day.id);
    await exercise('Планка');
    expect(await daysUsingExercises()).toEqual([]);
    await addExerciseToSeries(day.id, seriesId, await exercise('Подтягивания'));
    expect((await daysUsingExercises()).map((d) => d.id)).toEqual([day.id]);
  });

  it('deleting exercises works once no day uses them; days without exercises stay', async () => {
    await demoWithHistory();
    const workouts = await db.workouts.toArray();
    await deleteAllDays();
    const empty = await createDay();
    expect(await deleteAllExercises()).toEqual({ deleted: true });
    expect(await db.exercises.count()).toBe(0);
    expect((await db.days.toArray()).map((d) => d.id)).toEqual([empty.id]);
    expect(await db.workouts.toArray()).toEqual(workouts); // history keeps its own names
  });
});

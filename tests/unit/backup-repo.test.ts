// Export and import against fake-indexeddb: what is read, and what ends up stored.
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/lib/db/db';
import { loadDemoData } from '../../src/lib/db/demo';
import { exportBackup, importBackup, previewImport, saveExercise, saveWorkout, startOrResumeWorkout } from '../../src/lib/db/repo';
import { backupJson, parseBackup, type BackupFile } from '../../src/lib/domain/backup';
import { sortByName } from '../../src/lib/domain/exercises';
import type { Exercise } from '../../src/lib/domain/types';
import { finish, skipExercise } from '../../src/lib/domain/workout';

const NOW = new Date(2026, 10, 7, 9, 0).getTime();

beforeEach(async () => {
  await Promise.all([db.exercises.clear(), db.days.clear(), db.workouts.clear()]);
});

/** Demo program, one finished workout of Day 1 and one in progress of Day 2. */
async function demoWithHistory() {
  await loadDemoData();
  const [day1, day2] = await db.days.orderBy('position').toArray();
  let workout = (await startOrResumeWorkout(day1.id, NOW - 7_200_000))!;
  for (let i = 0; i < 4; i++) workout = skipExercise(workout, NOW - 7_000_000);
  await saveWorkout(finish(workout, NOW - 6_000_000));
  await startOrResumeWorkout(day2.id, NOW - 60_000);
}

async function stored() {
  return {
    exercises: sortByName(await db.exercises.toArray()),
    days: await db.days.orderBy('position').toArray(),
    workouts: await db.workouts.orderBy('startedAt').toArray(),
  };
}

/** Writes a file and reads it back, as importing from disk does. */
function throughFile(backup: BackupFile): BackupFile {
  const result = parseBackup(backupJson(backup));
  if (!result.ok) throw new Error(result.error);
  return result.backup;
}

const exerciseFile = (exercises: Exercise[]): BackupFile => ({ app: 'atletika', format: 1, kind: 'exercises', exportedAt: NOW, exercises });
const ex = (id: string, name: string, description = ''): Exercise => ({ id, name, description, videoUrl: '', createdAt: 1 });

describe('exportBackup', () => {
  it('reads every table for the full backup', async () => {
    await demoWithHistory();
    const backup = await exportBackup('all', NOW);
    const data = await stored();
    expect(backup.exportedAt).toBe(NOW);
    expect(sortByName(backup.exercises)).toEqual(data.exercises);
    expect(backup.days).toEqual(data.days);
    expect(backup.workouts).toEqual(data.workouts);
    expect(backup.workouts!.filter((w) => w.finishedAt === null)).toHaveLength(1);
  });

  it('leaves out what the kind does not include', async () => {
    await demoWithHistory();
    const exercises = await exportBackup('exercises', NOW);
    expect(exercises.exercises).toHaveLength(10);
    expect(exercises.days).toBeUndefined();
    const program = await exportBackup('program', NOW);
    expect(program.days).toHaveLength(3);
    expect(program.workouts).toBeUndefined();
  });

  it('works on an empty app', async () => {
    expect(await exportBackup('all', NOW)).toMatchObject({ exercises: [], days: [], workouts: [] });
  });

  it('changes nothing', async () => {
    await demoWithHistory();
    const before = await stored();
    await exportBackup('all', NOW);
    expect(await stored()).toEqual(before);
  });
});

describe('importBackup: exercises', () => {
  it('adds only exercises the library lacks; the others stay exactly as they were', async () => {
    await saveExercise({ name: 'Жим лёжа', description: 'Мой вариант', videoUrl: '' });
    const before = await stored();
    const plan = await importBackup(exerciseFile([ex('a', 'ЖИМ ЛЕЖА', 'Из файла'), ex('b', 'Планка', 'Ровно')]), 'exercises');

    expect(plan.exercises.map((e) => e.name)).toEqual(['Планка']);
    const after = await stored();
    expect(after.exercises).toHaveLength(2);
    expect(after.exercises.find((e) => e.name === 'Жим лёжа')).toEqual(before.exercises[0]);
    expect(after.exercises.find((e) => e.name === 'Планка')).toMatchObject({ description: 'Ровно', videoUrl: '' });
    expect(after.exercises.find((e) => e.name === 'Планка')!.id).not.toBe('b');
  });

  it('touches neither days nor history', async () => {
    await demoWithHistory();
    const before = await stored();
    await importBackup(exerciseFile([ex('a', 'Планка')]), 'exercises');
    const after = await stored();
    expect(after.days).toEqual(before.days);
    expect(after.workouts).toEqual(before.workouts);
  });

  it('importing the same file twice adds nothing the second time', async () => {
    const file = exerciseFile([ex('a', 'Планка'), ex('b', 'Вис')]);
    await importBackup(file, 'exercises');
    expect((await previewImport(file, 'exercises')).exercises).toEqual([]);
    await importBackup(file, 'exercises');
    expect(await db.exercises.count()).toBe(2);
  });

  it('the preview writes nothing', async () => {
    await previewImport(exerciseFile([ex('a', 'Планка')]), 'exercises');
    expect(await db.exercises.count()).toBe(0);
  });
});

describe('importBackup: exercises and days', () => {
  it('replaces the days, adds missing exercises, and keeps history and the rest of the library', async () => {
    await demoWithHistory();
    const program = throughFile(await exportBackup('program', NOW));
    // Another phone: its own library (one shared name, one of its own), a day and history.
    await Promise.all([db.exercises.clear(), db.days.clear()]);
    await saveExercise({ name: 'жим лежа', description: 'Своё', videoUrl: '' });
    await saveExercise({ name: 'Планка', description: '', videoUrl: '' });
    await db.days.add({ id: 'mine', position: 0, name: 'Мой день', createdAt: 1, items: [] });
    const workoutsBefore = await db.workouts.toArray();

    const plan = await importBackup(program, 'program');

    const after = await stored();
    expect(after.workouts).toEqual(sortByStart(workoutsBefore));
    expect(after.days.map((d) => d.name)).toEqual(['Верх тела', 'Низ тела', 'Жимовые']);
    expect(after.days.map((d) => d.position)).toEqual([0, 1, 2]);
    expect(after.days.map((d) => d.id)).toEqual(program.days!.map((d) => d.id));
    // 10 demo exercises; «Жим лёжа» was there already (as «жим лежа»), «Планка» stays.
    expect(plan.exercises).toHaveLength(9);
    expect(after.exercises).toHaveLength(11);
    const own = after.exercises.find((e) => e.name === 'жим лежа')!;
    expect(own.description).toBe('Своё');
    expect(after.exercises.some((e) => e.name === 'Жим лёжа')).toBe(false);
    // Every exercise a day uses is in the library, and «Жим лёжа» is the phone's own.
    const ids = new Set(after.exercises.map((e) => e.id));
    const used = after.days.flatMap((d) => d.items.flatMap((i) => (i.kind === 'exercise' ? [i.exerciseId] : i.exercises.map((e) => e.exerciseId))));
    expect(used.every((id) => ids.has(id))).toBe(true);
    expect(after.days[0].items[0]).toMatchObject({ kind: 'exercise', exerciseId: own.id });
  });

  it('a file with no days leaves no days', async () => {
    await loadDemoData();
    await importBackup({ ...exerciseFile([]), kind: 'program', days: [] }, 'program');
    expect(await db.days.count()).toBe(0);
    expect(await db.exercises.count()).toBe(10);
  });
});

describe('importBackup: everything', () => {
  it('a full backup restores the app exactly as it was', async () => {
    await demoWithHistory();
    const before = await stored();
    const file = throughFile(await exportBackup('all', NOW));

    // Changes after the copy was made, all of which the import undoes.
    await saveExercise({ name: 'Новое', description: '', videoUrl: '' });
    await db.days.update(before.days[0].id, { name: 'Переименован' });
    await db.workouts.clear();

    await importBackup(file, 'all');
    expect(await stored()).toEqual(before);
  });

  it('restores into an empty app, including the workout in progress', async () => {
    await demoWithHistory();
    const before = await stored();
    const file = throughFile(await exportBackup('all', NOW));
    await Promise.all([db.exercises.clear(), db.days.clear(), db.workouts.clear()]);
    await importBackup(file, 'all');
    expect(await stored()).toEqual(before);
    expect((await db.workouts.filter((w) => w.finishedAt === null).toArray()).map((w) => w.dayNumber)).toEqual([2]);
  });

  it('an empty backup empties the app', async () => {
    await demoWithHistory();
    await importBackup({ ...exerciseFile([]), kind: 'all', days: [], workouts: [] }, 'all');
    expect(await stored()).toEqual({ exercises: [], days: [], workouts: [] });
  });

  it('writes all or nothing: a failure part-way leaves the data untouched', async () => {
    await demoWithHistory();
    const before = await stored();
    const file = await exportBackup('all', NOW);
    // Not possible through parseBackup (it rejects repeated ids); forces a write error late on.
    const broken: BackupFile = { ...file, days: [...file.days!, file.days![0]] };
    await expect(importBackup(broken, 'all')).rejects.toThrow();
    expect(await stored()).toEqual(before);
  });
});

function sortByStart<T extends { startedAt: number }>(list: T[]): T[] {
  return [...list].sort((a, b) => a.startedAt - b.startedAt);
}

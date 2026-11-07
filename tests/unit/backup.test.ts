import { describe, expect, it } from 'vitest';
import {
  BACKUP_ERRORS,
  BACKUP_FORMAT,
  backupFileName,
  backupJson,
  importDoneMessage,
  importProblem,
  importQuestion,
  makeBackup,
  parseBackup,
  planImport,
  type BackupFile,
  type BackupKind,
} from '../../src/lib/domain/backup';
import { exerciseNameKey } from '../../src/lib/domain/exercises';
import { countDays, countExercises, countWorkouts } from '../../src/lib/domain/format';
import type { Exercise, TrainingDay, Workout } from '../../src/lib/domain/types';
import { createWorkout, finish } from '../../src/lib/domain/workout';

const NOW = new Date(2026, 10, 7, 9, 5).getTime();

const ex = (id: string, name: string, extra: Partial<Exercise> = {}): Exercise => ({
  id,
  name,
  description: '',
  videoUrl: '',
  createdAt: 1,
  ...extra,
});

const EXERCISES = [ex('bench', 'Жим лёжа', { description: 'Лопатки сведены', videoUrl: 'https://example.com/v' }), ex('pull', 'Подтягивания')];

const DAYS: TrainingDay[] = [
  {
    id: 'day-b',
    position: 1,
    name: 'Низ',
    createdAt: 2,
    items: [{ kind: 'exercise', id: 'item-3', exerciseId: 'pull', sets: [{ reps: 12, restSec: 60 }] }],
  },
  {
    id: 'day-a',
    position: 0,
    name: 'Верх тела',
    createdAt: 1,
    items: [
      { kind: 'exercise', id: 'item-1', exerciseId: 'bench', sets: [{ reps: 8, restSec: 90 }, { reps: 8, restSec: 90 }] },
      {
        kind: 'series',
        id: 'item-2',
        rounds: 3,
        roundRestSec: 120,
        exercises: [
          { id: 's-1', exerciseId: 'pull', reps: 5, restSec: 30 },
          { id: 's-2', exerciseId: 'bench', reps: 6, restSec: 0 },
        ],
      },
    ],
  },
];

const NAMES = new Map(EXERCISES.map((e) => [e.id, e.name]));
const finished = finish(createWorkout(DAYS[1], NAMES, 'w-1', NOW - 3_600_000)!, NOW - 600_000);
const inProgress = createWorkout(DAYS[0], NAMES, 'w-2', NOW)!;
const WORKOUTS: Workout[] = [inProgress, finished];
const SETTINGS = { defaultRestSec: 120 };
const DATA = { exercises: EXERCISES, days: DAYS, workouts: WORKOUTS, settings: SETTINGS };

/** A file as the app writes it, as plain JSON data to edit in tests. */
const fileData = (kind: BackupKind) => JSON.parse(backupJson(makeBackup(kind, DATA, NOW)));
const parse = (data: unknown) => parseBackup(JSON.stringify(data));
const parsed = (kind: BackupKind) => {
  const result = parseBackup(backupJson(makeBackup(kind, DATA, NOW)));
  if (!result.ok) throw new Error(result.error);
  return result.backup;
};
const damaged = { ok: false, error: BACKUP_ERRORS.damaged };

/** Imports a file with the row of its own kind. */
const planFor = (backup: BackupFile, current: Exercise[], id = newId) => planImport(backup, backup.kind, current, id);

let counter = 0;
const newId = () => `new-${++counter}`;

describe('makeBackup', () => {
  it('exercises: only the library', () => {
    const backup = makeBackup('exercises', DATA, NOW);
    expect(backup).toEqual({ app: 'atletika', format: BACKUP_FORMAT, kind: 'exercises', exportedAt: NOW, exercises: EXERCISES });
  });

  it('program: the library and the days in order', () => {
    const backup = makeBackup('program', DATA, NOW);
    expect(backup.days!.map((d) => d.id)).toEqual(['day-a', 'day-b']);
    expect(backup.workouts).toBeUndefined();
    expect(backup.settings).toBeUndefined();
  });

  it('all: also every workout, oldest first, including one in progress', () => {
    const backup = makeBackup('all', DATA, NOW);
    expect(backup.settings).toEqual(SETTINGS);
    expect(backup.workouts!.map((w) => w.id)).toEqual(['w-1', 'w-2']);
    expect(backup.workouts![1].finishedAt).toBeNull();
  });

  it('an empty app makes a valid, empty file', () => {
    const backup = makeBackup('all', { exercises: [], days: [], workouts: [], settings: SETTINGS }, NOW);
    expect(parseBackup(backupJson(backup))).toEqual({ ok: true, backup });
  });
});

describe('backupFileName', () => {
  it('names the kind and the date, with Latin letters only', () => {
    expect(backupFileName('exercises', NOW)).toBe('atletika-exercises-2026-11-07.json');
    expect(backupFileName('program', NOW)).toBe('atletika-days-2026-11-07.json');
    expect(backupFileName('all', new Date(2027, 0, 31).getTime())).toBe('atletika-all-2027-01-31.json');
  });
});

describe('parseBackup', () => {
  it.each(['exercises', 'program', 'all'] as const)('reads back what the app wrote: %s', (kind) => {
    const backup = makeBackup(kind, DATA, NOW);
    expect(parseBackup(backupJson(backup))).toEqual({ ok: true, backup });
  });

  it('keeps Russian text with ё exactly', () => {
    const result = parseBackup(backupJson(makeBackup('exercises', { ...DATA, exercises: [ex('a', 'Подъёмы ног в висе')] }, NOW)));
    expect(result.ok && result.backup.exercises[0].name).toBe('Подъёмы ног в висе');
  });

  it('accepts a byte order mark, which some editors add', () => {
    expect(parseBackup('﻿' + backupJson(makeBackup('exercises', DATA, NOW))).ok).toBe(true);
  });

  it.each([
    ['not JSON', 'hello'],
    ['empty', ''],
    ['JSON null', 'null'],
    ['a list', '[]'],
    ['another app', JSON.stringify({ app: 'other', format: 1, kind: 'all' })],
    ['no app mark', JSON.stringify({ format: 1, kind: 'all', exercises: [] })],
  ])('says it is not our file: %s', (_, text) => {
    expect(parseBackup(text)).toEqual({ ok: false, error: BACKUP_ERRORS.notOurs });
  });

  it('asks to update the app for a file from a newer version', () => {
    expect(parse({ ...fileData('all'), format: BACKUP_FORMAT + 1 })).toEqual({ ok: false, error: BACKUP_ERRORS.newer });
  });

  it.each([0, -1, 1.5, '1', null])('a broken format number is damage: %s', (format) => {
    expect(parse({ ...fileData('all'), format })).toEqual(damaged);
  });

  it.each([
    ['unknown kind', (f: BackupFile) => ({ ...f, kind: 'history' })],
    ['no exercises', (f: BackupFile) => ({ ...f, exercises: undefined })],
    ['exercises not a list', (f: BackupFile) => ({ ...f, exercises: {} })],
    ['no export date', (f: BackupFile) => ({ ...f, exportedAt: 'today' })],
    ['an empty name', (f: BackupFile) => ({ ...f, exercises: [ex('a', '')] })],
    ['a name of spaces', (f: BackupFile) => ({ ...f, exercises: [ex('a', '   ')] })],
    ['a missing description', (f: BackupFile) => ({ ...f, exercises: [{ ...ex('a', 'А'), description: undefined }] })],
    ['an empty id', (f: BackupFile) => ({ ...f, exercises: [ex('', 'А')] })],
    ['a numeric id', (f: BackupFile) => ({ ...f, exercises: [{ ...ex('a', 'А'), id: 7 }] })],
    ['a repeated id', (f: BackupFile) => ({ ...f, exercises: [ex('a', 'А'), ex('a', 'Б')] })],
  ])('an exercises file with %s is damaged', (_, edit) => {
    expect(parse(edit(fileData('exercises')))).toEqual(damaged);
  });

  const editDay = (edit: (day: Record<string, unknown>) => void) => {
    const file = fileData('program');
    edit(file.days[0]);
    return parse(file);
  };
  const firstSet = (day: Record<string, unknown>) => (day.items as { sets: Record<string, unknown>[] }[])[0].sets[0];
  const firstSeries = (day: Record<string, unknown>) => (day.items as Record<string, unknown>[])[1];

  it.each([
    ['no days', () => parse({ ...fileData('program'), days: undefined })],
    ['a day using an exercise not in the file', () => editDay((d) => ((d.items as { exerciseId: string }[])[0].exerciseId = 'ghost'))],
    ['an exercise with no sets', () => editDay((d) => ((d.items as { sets: unknown[] }[])[0].sets = []))],
    ['0 repetitions', () => editDay((d) => (firstSet(d).reps = 0))],
    ['1000 repetitions', () => editDay((d) => (firstSet(d).reps = 1000))],
    ['fractional repetitions', () => editDay((d) => (firstSet(d).reps = 8.5))],
    ['repetitions as text', () => editDay((d) => (firstSet(d).reps = '8'))],
    ['negative rest', () => editDay((d) => (firstSet(d).restSec = -15))],
    ['rest over an hour', () => editDay((d) => (firstSet(d).restSec = 3601))],
    ['0 rounds', () => editDay((d) => (firstSeries(d).rounds = 0))],
    ['51 rounds', () => editDay((d) => (firstSeries(d).rounds = 51))],
    ['a series exercise not in the file', () => editDay((d) => ((firstSeries(d).exercises as { exerciseId: string }[])[0].exerciseId = 'x'))],
    ['an unknown item kind', () => editDay((d) => ((d.items as { kind: string }[])[0].kind = 'superset'))],
    ['a negative position', () => editDay((d) => (d.position = -1))],
    ['a day name that is not text', () => editDay((d) => (d.name = null))],
    ['a repeated item id', () => editDay((d) => ((d.items as { id: string }[])[1].id = 'item-1'))],
    ['a repeated day id', () => parse({ ...fileData('program'), days: [fileData('program').days[0], fileData('program').days[0]] })],
  ])('a program file with %s is damaged', (_, run) => {
    expect(run()).toEqual(damaged);
  });

  it('accepts an empty series and a day without exercises', () => {
    const file = fileData('program');
    file.days[0].items[1].exercises = [];
    file.days[1].items = [];
    expect(parse(file).ok).toBe(true);
  });

  it('renumbers day positions without gaps, keeping their order', () => {
    const file = fileData('program');
    file.days[0].position = 4;
    file.days[1].position = 9;
    const result = parse(file);
    expect(result.ok && result.backup.days!.map((d) => [d.id, d.position])).toEqual([
      ['day-a', 0],
      ['day-b', 1],
    ]);
  });

  it('drops fields the app does not know', () => {
    const file = fileData('program');
    file.exercises[0].weight = 100;
    file.days[0].secret = '<script>';
    file.extra = true;
    const result = parse(file);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.backup.exercises[0]).not.toHaveProperty('weight');
    expect(result.backup.days![0]).not.toHaveProperty('secret');
    expect(result.backup).not.toHaveProperty('extra');
  });

  it('an exercises file ignores days and workouts in it', () => {
    const result = parse({ ...fileData('exercises'), days: 'junk', workouts: 'junk' });
    expect(result.ok && result.backup.days).toBeUndefined();
  });

  const editWorkout = (edit: (workout: Record<string, any>) => void) => {
    const file = fileData('all');
    edit(file.workouts[0]);
    return parse(file);
  };

  it.each([
    ['no workouts', () => parse({ ...fileData('all'), workouts: undefined })],
    ['two workouts in progress', () => editWorkout((w) => (w.finishedAt = null))],
    ['a step pointing past the exercises', () => editWorkout((w) => (w.steps[0].exercise = 99))],
    ['a step pointing past the sets', () => editWorkout((w) => (w.steps[0].set = 99))],
    ['a current step past the end', () => editWorkout((w) => (w.step = w.steps.length + 1))],
    ['negative actual repetitions', () => editWorkout((w) => (w.exercises[0].sets[0].actual = -1))],
    ['«done» as text', () => editWorkout((w) => (w.exercises[0].sets[0].done = 'yes'))],
    ['a broken rest', () => editWorkout((w) => (w.rest = { endsAt: 'soon', pausedRemainingMs: null }))],
    ['a day number 0', () => editWorkout((w) => (w.dayNumber = 0))],
    ['a repeated workout id', () => editWorkout((w) => (w.id = 'w-2'))],
  ])('a full backup with %s is damaged', (_, run) => {
    expect(run()).toEqual(damaged);
  });

  it('keeps recorded actual repetitions and a running rest', () => {
    const file = fileData('all');
    file.workouts[1].exercises[0].sets[0].actual = 0;
    file.workouts[1].rest = { endsAt: NOW + 30_000, pausedRemainingMs: 12_000 };
    const result = parse(file);
    expect(result.ok && result.backup.workouts![1].exercises[0].sets[0].actual).toBe(0);
    expect(result.ok && result.backup.workouts![1].rest).toEqual({ endsAt: NOW + 30_000, pausedRemainingMs: 12_000 });
  });

  it('settings missing or out of range in a full backup read as defaults', () => {
    for (const settings of [undefined, null, { defaultRestSec: -5 }, { defaultRestSec: '90' }, { defaultRestSec: 3601 }]) {
      const result = parse({ ...fileData('all'), settings });
      expect(result.ok && result.backup.settings).toEqual({ defaultRestSec: 90 });
    }
    const zero = parse({ ...fileData('all'), settings: { defaultRestSec: 0 } });
    expect(zero.ok && zero.backup.settings).toEqual({ defaultRestSec: 0 });
  });

  it('settings in a smaller file are ignored', () => {
    const result = parse({ ...fileData('program'), settings: { defaultRestSec: 30 } });
    expect(result.ok && result.backup.settings).toBeUndefined();
  });

  it('history keeps exercises that are no longer in the library', () => {
    const file = fileData('all');
    file.exercises = [];
    file.days = [];
    expect(parse(file).ok).toBe(true);
  });
});

describe('exerciseNameKey', () => {
  it('ignores case, ё/е and extra spaces', () => {
    expect(exerciseNameKey('  Жим  лёжа ')).toBe(exerciseNameKey('ЖИМ ЛЕЖА'));
    expect(exerciseNameKey('Подъёмы ног')).toBe(exerciseNameKey('подъемы НОГ'));
    expect(exerciseNameKey('Жим лёжа')).not.toBe(exerciseNameKey('Жим стоя'));
  });
});

describe('planImport', () => {
  it('exercises: adds only new names, with new ids, keeping the rest of each record', () => {
    const backup = { ...parsed('exercises'), exercises: [ex('a', 'ЖИМ ЛЕЖА'), ex('b', 'Планка', { description: 'Ровно', createdAt: 5 })] };
    const plan = planFor(backup, [ex('bench', 'Жим лёжа')], () => 'fresh');
    expect(plan.exercises).toEqual([{ id: 'fresh', name: 'Планка', description: 'Ровно', videoUrl: '', createdAt: 5 }]);
    expect(plan.skipped).toBe(1);
    expect(plan.days).toBeUndefined();
    expect(plan.workouts).toBeUndefined();
  });

  it('exercises: a stored exercise with the same id but another name is not overwritten', () => {
    const plan = planFor({ ...parsed('exercises'), exercises: [ex('bench', 'Жим стоя')] }, [ex('bench', 'Жим лёжа')], newId);
    expect(plan.exercises).toHaveLength(1);
    expect(plan.exercises[0].id).not.toBe('bench');
  });

  it('exercises: a name listed twice in the file is added once', () => {
    const plan = planFor({ ...parsed('exercises'), exercises: [ex('a', 'Планка'), ex('b', 'планка')] }, [], newId);
    expect(plan.exercises.map((e) => e.name)).toEqual(['Планка']);
    expect(plan.skipped).toBe(0);
  });

  it('exercises: an empty file or an empty library', () => {
    expect(planFor({ ...parsed('exercises'), exercises: [] }, EXERCISES, newId)).toMatchObject({ exercises: [], skipped: 0 });
    expect(planFor(parsed('exercises'), [], newId).exercises.map((e) => e.name)).toEqual(['Жим лёжа', 'Подтягивания']);
  });

  it('program: days use the phone exercise with the same name, or the newly added one', () => {
    const phone = [ex('phone-bench', 'жим лежа')];
    const plan = planFor(parsed('program'), phone, () => 'added-pull');
    expect(plan.exercises.map((e) => [e.id, e.name])).toEqual([['added-pull', 'Подтягивания']]);
    expect(plan.skipped).toBe(1);
    const [dayA, dayB] = plan.days!;
    expect(dayA.items[0]).toMatchObject({ kind: 'exercise', exerciseId: 'phone-bench' });
    expect(dayA.items[1]).toMatchObject({
      kind: 'series',
      exercises: [{ id: 's-1', exerciseId: 'added-pull' }, { id: 's-2', exerciseId: 'phone-bench' }],
    });
    expect(dayB.items[0]).toMatchObject({ exerciseId: 'added-pull', sets: [{ reps: 12, restSec: 60 }] });
    // Days and items keep their ids, so a restored program continues where it was.
    expect(plan.days!.map((d) => [d.id, d.position, d.name])).toEqual([
      ['day-a', 0, 'Верх тела'],
      ['day-b', 1, 'Низ'],
    ]);
  });

  it('all: everything from the file as it is, settings included', () => {
    const plan = planFor(parsed('all'), [ex('x', 'Жим лёжа')], newId);
    expect(plan).toEqual({
      kind: 'all',
      exercises: EXERCISES,
      skipped: 0,
      days: parsed('all').days,
      workouts: parsed('all').workouts,
      settings: SETTINGS,
    });
  });

  it('the exercises row takes only the exercises, from any kind of file', () => {
    for (const file of [parsed('program'), parsed('all')]) {
      const plan = planImport(file, 'exercises', [EXERCISES[0]], () => 'n');
      expect(plan).toEqual({ kind: 'exercises', exercises: [{ ...EXERCISES[1], id: 'n' }], skipped: 1 });
    }
  });

  it('the days row takes the days of a full backup too, but not its history or settings', () => {
    const plan = planImport(parsed('all'), 'program', EXERCISES, newId);
    expect(plan.days!.map((d) => d.id)).toEqual(['day-a', 'day-b']);
    expect(plan.workouts).toBeUndefined();
    expect(plan.settings).toBeUndefined();
  });

  it('refuses a file the row cannot take', () => {
    expect(() => planImport(parsed('exercises'), 'program', [], newId)).toThrow();
    expect(() => planImport(parsed('program'), 'all', [], newId)).toThrow();
  });
});

describe('importProblem', () => {
  it('every file has exercises', () => {
    for (const kind of ['exercises', 'program', 'all'] as const) expect(importProblem(parsed(kind), 'exercises')).toBeNull();
  });

  it('the days row needs a file with days', () => {
    expect(importProblem(parsed('exercises'), 'program')).toBe('В этом файле нет тренировочных дней.');
    expect(importProblem(parsed('program'), 'program')).toBeNull();
    expect(importProblem(parsed('all'), 'program')).toBeNull();
  });

  it('the full restore needs a full backup', () => {
    const message = 'Это не полная копия. Выберите файл, сохранённый через «Экспортировать всё».';
    expect(importProblem(parsed('exercises'), 'all')).toBe(message);
    expect(importProblem(parsed('program'), 'all')).toBe(message);
    expect(importProblem(parsed('all'), 'all')).toBeNull();
  });
});

describe('import wording', () => {
  it('counts in Russian', () => {
    expect([1, 2, 5, 11, 21, 22].map(countExercises)).toEqual([
      '1 упражнение',
      '2 упражнения',
      '5 упражнений',
      '11 упражнений',
      '21 упражнение',
      '22 упражнения',
    ]);
    expect([1, 3, 7].map(countDays)).toEqual(['1 день', '3 дня', '7 дней']);
    expect([1, 4, 12].map(countWorkouts)).toEqual(['1 тренировка', '4 тренировки', '12 тренировок']);
  });

  it('exercises: nothing new says so instead of asking', () => {
    const backup = parsed('exercises');
    expect(importQuestion(backup, planFor(backup, EXERCISES, newId))).toEqual({
      kind: 'nothing',
      title: 'Нечего добавлять',
      message: 'Все упражнения из файла уже есть в библиотеке.',
    });
  });

  it('exercises: how many are new and how many stay as they are', () => {
    const backup = parsed('exercises');
    const one = importQuestion(backup, planFor(backup, [EXERCISES[0]], newId));
    expect(one).toEqual({
      kind: 'confirm',
      title: 'Добавить упражнения?',
      message: 'Новых в файле: 1 упражнение.\nЕщё 1 упражнение уже есть в библиотеке и не изменится.',
      confirmLabel: 'Добавить',
    });
    expect(importQuestion(backup, planFor(backup, [], newId)).message).toBe('Новых в файле: 2 упражнения.');
    const three = { ...backup, exercises: [...EXERCISES, ex('c', 'Планка'), ex('d', 'Отжимания')] };
    expect(importQuestion(three, planFor(three, [EXERCISES[0], ex('x', 'Планка'), ex('y', 'Отжимания')], newId)).message).toBe(
      'Новых в файле: 1 упражнение.\nЕщё 3 упражнения уже есть в библиотеке и не изменятся.',
    );
  });

  it('program: says the days are replaced and history stays', () => {
    const backup = parsed('program');
    expect(importQuestion(backup, planFor(backup, [EXERCISES[0]], newId))).toEqual({
      kind: 'confirm',
      title: 'Заменить дни?',
      message:
        'В файле: 2 дня, 2 упражнения.\nДни в приложении будут заменены днями из файла. ' +
        'Упражнения, которых нет в библиотеке, добавятся (новых: 1). История не изменится.',
      confirmLabel: 'Заменить',
    });
  });

  it('all: shows the copy date and contents, and that everything is replaced', () => {
    const backup = parsed('all');
    expect(importQuestion(backup, planFor(backup, [], newId))).toEqual({
      kind: 'confirm',
      title: 'Заменить все данные?',
      message:
        'Копия от 7 ноя 2026: 2 упражнения · 2 дня · 1 тренировка и одна незаконченная.\n' +
        'Всё, что сейчас в приложении, будет заменено.',
      confirmLabel: 'Заменить',
    });
    const done = { ...backup, workouts: [finished] };
    expect(importQuestion(done, planFor(done, [], newId)).message).toContain('· 1 тренировка.\n');
  });

  it('says what was done', () => {
    expect(importDoneMessage(planFor(parsed('exercises'), [], newId))).toBe('Добавлено: 2 упражнения.');
    expect(importDoneMessage(planFor(parsed('program'), EXERCISES, newId))).toBe('Дни заменены: 2 дня. Новых упражнений: 0.');
    expect(importDoneMessage(planFor(parsed('all'), [], newId))).toBe('Данные восстановлены из копии.');
  });
});

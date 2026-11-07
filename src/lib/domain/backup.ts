// Export and import files (docs/DECISIONS.md, 2026-11-07). Pure: reading and writing the
// database is in src/lib/db/repo.ts, files and the share sheet in src/screens/Settings.svelte.
import { REPS_MAX, REPS_MIN, REST_MAX_SEC, REST_MIN_SEC } from './defaults';
import { exerciseNameKey } from './exercises';
import { countDays, countExercises, countWorkouts, formatDateParts } from './format';
import { ROUNDS_MAX, ROUNDS_MIN, pluralRu } from './series';
import { readSettings, type Settings } from './settings';
import type {
  DayItem,
  Exercise,
  Id,
  SeriesExercise,
  SetConfig,
  TrainingDay,
  Workout,
  WorkoutExercise,
  WorkoutSet,
  WorkoutStep,
} from './types';
import { ACTUAL_REPS_MAX, ACTUAL_REPS_MIN } from './workout';

/**
 * What a file holds, and what an import row in Settings takes from a file:
 * - `exercises` («…упражнения»): the exercise library. Importing adds exercises the phone does not have.
 * - `program` («…дни»): the library and the training days. Importing adds missing exercises and replaces the days.
 * - `all` («…всё»): library, days, workouts (history and one in progress) and settings. Importing replaces everything.
 */
export type BackupKind = 'exercises' | 'program' | 'all';

/** Marks a file as ours. */
export const BACKUP_APP = 'atletika';
/** Raise when the file layout changes, and keep reading older formats. */
export const BACKUP_FORMAT = 1;

export interface BackupFile {
  app: typeof BACKUP_APP;
  format: number;
  kind: BackupKind;
  exportedAt: number;
  exercises: Exercise[];
  /** `program` and `all` only. */
  days?: TrainingDay[];
  /** `all` only. */
  workouts?: Workout[];
  /** `all` only. */
  settings?: Settings;
}

export interface BackupData {
  exercises: readonly Exercise[];
  days: readonly TrainingDay[];
  workouts: readonly Workout[];
  settings: Settings;
}

export function makeBackup(kind: BackupKind, data: BackupData, now: number): BackupFile {
  const backup: BackupFile = { app: BACKUP_APP, format: BACKUP_FORMAT, kind, exportedAt: now, exercises: [...data.exercises] };
  if (kind !== 'exercises') backup.days = [...data.days].sort((a, b) => a.position - b.position);
  if (kind === 'all') {
    backup.workouts = [...data.workouts].sort((a, b) => a.startedAt - b.startedAt);
    backup.settings = { ...data.settings };
  }
  return backup;
}

const FILE_NAMES: Record<BackupKind, string> = { exercises: 'exercises', program: 'days', all: 'all' };

/** `atletika-days-2026-11-07.json`: Latin, so every app and file system keeps the name intact. */
export function backupFileName(kind: BackupKind, now: number): string {
  const date = new Date(now);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `atletika-${FILE_NAMES[kind]}-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`;
}

export function backupJson(backup: BackupFile): string {
  return JSON.stringify(backup, null, 2);
}

// ---- Reading a file ----

export const BACKUP_ERRORS = {
  notOurs: 'Это не файл Атлетики.',
  newer: 'Файл сделан более новой версией приложения. Обновите приложение и попробуйте снова.',
  damaged: 'Файл повреждён: данные в нём не читаются.',
} as const;

export type ParseResult = { ok: true; backup: BackupFile } | { ok: false; error: string };

class Damaged extends Error {}

const DAY_MS = 24 * 60 * 60 * 1000;
/** Byte order mark, which some editors put at the start of a file. */
const BOM = String.fromCharCode(0xfeff);

/**
 * Reads an export file. Everything is checked and copied field by field, so a damaged or
 * edited file can never put malformed records into the database.
 */
export function parseBackup(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text.startsWith(BOM) ? text.slice(1) : text);
  } catch {
    return { ok: false, error: BACKUP_ERRORS.notOurs };
  }
  if (!isObject(raw) || raw.app !== BACKUP_APP) return { ok: false, error: BACKUP_ERRORS.notOurs };
  if (!Number.isInteger(raw.format) || (raw.format as number) < 1) return { ok: false, error: BACKUP_ERRORS.damaged };
  if ((raw.format as number) > BACKUP_FORMAT) return { ok: false, error: BACKUP_ERRORS.newer };
  try {
    return { ok: true, backup: readBackup(raw) };
  } catch (error) {
    if (error instanceof Damaged) return { ok: false, error: BACKUP_ERRORS.damaged };
    throw error;
  }
}

function readBackup(raw: Record<string, unknown>): BackupFile {
  const kind = raw.kind;
  check(kind === 'exercises' || kind === 'program' || kind === 'all');
  const exercises = list(raw.exercises, readExercise);
  unique(exercises.map((e) => e.id));
  const backup: BackupFile = { app: BACKUP_APP, format: raw.format as number, kind, exportedAt: timestamp(raw.exportedAt), exercises };

  if (kind !== 'exercises') {
    const known = new Set(exercises.map((e) => e.id));
    const days = list(raw.days, (day) => readDay(day, known));
    unique(days.map((d) => d.id));
    unique(days.flatMap((d) => d.items.map((item) => item.id)));
    // Positions become 0, 1, 2… in the stored order, so «ДЕНЬ N» has no gaps.
    backup.days = days.sort((a, b) => a.position - b.position).map((day, position) => ({ ...day, position }));
  }
  if (kind === 'all') {
    const workouts = list(raw.workouts, readWorkout);
    unique(workouts.map((w) => w.id));
    check(workouts.filter((w) => w.finishedAt === null).length <= 1);
    backup.workouts = workouts;
    // Settings came with the file format later than workouts could; missing values read as defaults.
    backup.settings = readSettings(raw.settings);
  }
  return backup;
}

function readExercise(raw: unknown): Exercise {
  check(isObject(raw));
  const name = string(raw.name).trim();
  check(name.length > 0);
  return {
    id: id(raw.id),
    name,
    description: string(raw.description),
    videoUrl: string(raw.videoUrl),
    createdAt: timestamp(raw.createdAt),
  };
}

function readDay(raw: unknown, exerciseIds: ReadonlySet<Id>): TrainingDay {
  check(isObject(raw));
  return {
    id: id(raw.id),
    position: integer(raw.position, 0, Number.MAX_SAFE_INTEGER),
    name: string(raw.name),
    items: list(raw.items, (item) => readItem(item, exerciseIds)),
    createdAt: timestamp(raw.createdAt),
  };
}

function readItem(raw: unknown, exerciseIds: ReadonlySet<Id>): DayItem {
  check(isObject(raw));
  const exerciseId = (value: unknown) => {
    const result = id(value);
    check(exerciseIds.has(result)); // a day may only use exercises from the same file
    return result;
  };
  if (raw.kind === 'exercise') {
    const sets = list(raw.sets, readSet);
    check(sets.length > 0);
    return { kind: 'exercise', id: id(raw.id), exerciseId: exerciseId(raw.exerciseId), sets };
  }
  check(raw.kind === 'series');
  const exercises = list(raw.exercises, (e): SeriesExercise => {
    check(isObject(e));
    return {
      id: id(e.id),
      exerciseId: exerciseId(e.exerciseId),
      reps: integer(e.reps, REPS_MIN, REPS_MAX),
      restSec: integer(e.restSec, REST_MIN_SEC, REST_MAX_SEC),
    };
  });
  unique(exercises.map((e) => e.id));
  return {
    kind: 'series',
    id: id(raw.id),
    rounds: integer(raw.rounds, ROUNDS_MIN, ROUNDS_MAX),
    roundRestSec: integer(raw.roundRestSec, REST_MIN_SEC, REST_MAX_SEC),
    exercises,
  };
}

function readSet(raw: unknown): SetConfig {
  check(isObject(raw));
  return { reps: integer(raw.reps, REPS_MIN, REPS_MAX), restSec: integer(raw.restSec, REST_MIN_SEC, REST_MAX_SEC) };
}

function readWorkout(raw: unknown): Workout {
  check(isObject(raw));
  const exercises = list(raw.exercises, readWorkoutExercise);
  const steps = list(raw.steps, (s): WorkoutStep => {
    check(isObject(s));
    const exercise = integer(s.exercise, 0, exercises.length - 1);
    return {
      exercise,
      set: integer(s.set, 0, exercises[exercise].sets.length - 1),
      restSec: integer(s.restSec, REST_MIN_SEC, REST_MAX_SEC),
    };
  });
  const finishedAt = raw.finishedAt === null ? null : timestamp(raw.finishedAt);
  let rest: Workout['rest'] = null;
  if (raw.rest !== null) {
    check(isObject(raw.rest));
    rest = {
      endsAt: timestamp(raw.rest.endsAt),
      pausedRemainingMs: raw.rest.pausedRemainingMs === null ? null : integer(raw.rest.pausedRemainingMs, 0, DAY_MS),
    };
  }
  return {
    id: id(raw.id),
    dayId: id(raw.dayId),
    dayNumber: integer(raw.dayNumber, 1, Number.MAX_SAFE_INTEGER),
    dayName: string(raw.dayName),
    startedAt: timestamp(raw.startedAt),
    finishedAt,
    exercises,
    steps,
    step: integer(raw.step, 0, steps.length),
    rest,
  };
}

function readWorkoutExercise(raw: unknown): WorkoutExercise {
  check(isObject(raw));
  let series: WorkoutExercise['series'] = null;
  if (raw.series !== null) {
    check(isObject(raw.series));
    series = { number: integer(raw.series.number, 1, Number.MAX_SAFE_INTEGER), rounds: integer(raw.series.rounds, ROUNDS_MIN, ROUNDS_MAX) };
  }
  return {
    exerciseId: id(raw.exerciseId),
    name: string(raw.name),
    sets: list(raw.sets, (s): WorkoutSet => {
      check(isObject(s));
      const set: WorkoutSet = { reps: integer(s.reps, REPS_MIN, REPS_MAX), done: boolean(s.done) };
      if (s.actual !== undefined) set.actual = integer(s.actual, ACTUAL_REPS_MIN, ACTUAL_REPS_MAX);
      return set;
    }),
    skipped: boolean(raw.skipped),
    block: integer(raw.block, 0, Number.MAX_SAFE_INTEGER),
    series,
  };
}

function check(condition: boolean): asserts condition {
  if (!condition) throw new Damaged();
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function list<T>(value: unknown, read: (item: unknown) => T): T[] {
  check(Array.isArray(value));
  return value.map(read);
}

function string(value: unknown): string {
  check(typeof value === 'string');
  return value;
}

function id(value: unknown): Id {
  const result = string(value);
  check(result.length > 0 && result.length <= 100);
  return result;
}

function boolean(value: unknown): boolean {
  check(typeof value === 'boolean');
  return value;
}

function integer(value: unknown, min: number, max: number): number {
  check(Number.isInteger(value) && (value as number) >= min && (value as number) <= max);
  return value as number;
}

function timestamp(value: unknown): number {
  return integer(value, 0, 8.64e15);
}

function unique(ids: readonly Id[]): void {
  check(new Set(ids).size === ids.length);
}

// ---- Planning an import ----

/** Why a file cannot be imported by this row, or null when it can. Every file holds exercises. */
export function importProblem(backup: BackupFile, kind: BackupKind): string | null {
  if (kind === 'program' && !backup.days) return 'В этом файле нет тренировочных дней.';
  if (kind === 'all' && backup.kind !== 'all') {
    return 'Это не полная копия. Выберите файл, сохранённый через «Экспортировать всё».';
  }
  return null;
}

/** What importing will write. `days`, `workouts` and `settings` replace the stored ones when set. */
export interface ImportPlan {
  /** The import row used, which decides what is taken from the file. */
  kind: BackupKind;
  /** Exercises to add (`exercises`, `program`) or the whole new library (`all`). */
  exercises: Exercise[];
  /** How many of the file's exercises the phone already has (same name), so they are not added. */
  skipped: number;
  days?: TrainingDay[];
  workouts?: Workout[];
  settings?: Settings;
}

/**
 * Exercises already on the phone (same name: case, ё/е and spaces ignored) are kept as they are,
 * and the file's days use them. New ones get new ids, so they never overwrite a stored exercise.
 */
export function planImport(backup: BackupFile, kind: BackupKind, current: readonly Exercise[], newId: () => Id): ImportPlan {
  if (importProblem(backup, kind)) throw new Error(`A ${backup.kind} file cannot be imported as ${kind}`);
  if (kind === 'all') {
    return {
      kind,
      exercises: backup.exercises,
      skipped: 0,
      days: backup.days ?? [],
      workouts: backup.workouts ?? [],
      settings: backup.settings ?? readSettings(undefined),
    };
  }

  const onPhone = new Map(current.map((e) => [exerciseNameKey(e.name), e.id]));
  const added = new Map<string, Exercise>();
  const skipped = new Set<string>();
  const idMap = new Map<Id, Id>();
  for (const exercise of backup.exercises) {
    const key = exerciseNameKey(exercise.name);
    const existing = onPhone.get(key);
    if (existing) {
      skipped.add(key);
      idMap.set(exercise.id, existing);
      continue;
    }
    // A name listed twice in the file is added once.
    let copy = added.get(key);
    if (!copy) added.set(key, (copy = { ...exercise, id: newId() }));
    idMap.set(exercise.id, copy.id);
  }

  const plan: ImportPlan = { kind, exercises: [...added.values()], skipped: skipped.size };
  if (kind === 'program') {
    const mapId = (exerciseId: Id) => idMap.get(exerciseId) ?? exerciseId;
    plan.days = (backup.days ?? []).map((day) => ({
      ...day,
      items: day.items.map((item) =>
        item.kind === 'exercise'
          ? { ...item, exerciseId: mapId(item.exerciseId) }
          : { ...item, exercises: item.exercises.map((e) => ({ ...e, exerciseId: mapId(e.exerciseId) })) },
      ),
    }));
  }
  return plan;
}

// ---- Wording ----

export type ImportQuestion =
  | { kind: 'confirm'; title: string; message: string; confirmLabel: string }
  /** Nothing would change: say so instead of asking. */
  | { kind: 'nothing'; title: string; message: string };

/** The confirmation shown before importing. */
export function importQuestion(backup: BackupFile, plan: ImportPlan): ImportQuestion {
  const added = plan.exercises.length;
  if (plan.kind === 'exercises') {
    if (added === 0) {
      return { kind: 'nothing', title: 'Нечего добавлять', message: 'Все упражнения из файла уже есть в библиотеке.' };
    }
    const kept = plan.skipped > 0 ? `\nЕщё ${countExercises(plan.skipped)} уже есть в библиотеке и ${pluralRu(plan.skipped, 'не изменится', 'не изменятся', 'не изменятся')}.` : '';
    return {
      kind: 'confirm',
      title: 'Добавить упражнения?',
      message: `Новых в файле: ${countExercises(added)}.${kept}`,
      confirmLabel: 'Добавить',
    };
  }
  const days = backup.days?.length ?? 0;
  if (plan.kind === 'program') {
    return {
      kind: 'confirm',
      title: 'Заменить дни?',
      message:
        `В файле: ${countDays(days)}, ${countExercises(backup.exercises.length)}.\n` +
        `Дни в приложении будут заменены днями из файла. ` +
        `Упражнения, которых нет в библиотеке, добавятся (новых: ${added}). История не изменится.`,
      confirmLabel: 'Заменить',
    };
  }
  const workouts = backup.workouts ?? [];
  const finished = workouts.filter((w) => w.finishedAt !== null).length;
  const inProgress = workouts.length > finished ? ' и одна незаконченная' : '';
  return {
    kind: 'confirm',
    title: 'Заменить все данные?',
    message:
      `Копия от ${formatDateParts(backup.exportedAt).full.toLocaleLowerCase('ru')}: ` +
      `${countExercises(backup.exercises.length)} · ${countDays(days)} · ${countWorkouts(finished)}${inProgress}.\n` +
      'Всё, что сейчас в приложении, будет заменено.',
    confirmLabel: 'Заменить',
  };
}

/** Shown after a successful import. */
export function importDoneMessage(plan: ImportPlan): string {
  if (plan.kind === 'exercises') return `Добавлено: ${countExercises(plan.exercises.length)}.`;
  if (plan.kind === 'program') {
    return `Дни заменены: ${countDays(plan.days?.length ?? 0)}. Новых упражнений: ${plan.exercises.length}.`;
  }
  return 'Данные восстановлены из копии.';
}

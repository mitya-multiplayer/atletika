import { liveQuery } from 'dexie';
import { sortByName, type ExerciseInput } from '../domain/exercises';
import { moveItem } from '../domain/order';
import { addSeriesExercise, exerciseIdsOf, newSeries, newSeriesExercise } from '../domain/series';
import { defaultSets } from '../domain/sets';
import type { Exercise, Id, SeriesItem, SetConfig, TrainingDay, Workout } from '../domain/types';
import { createWorkout } from '../domain/workout';
import { db } from './db';

/** Random id that also works outside secure contexts (crypto.randomUUID does not). */
export function newId(): Id {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

// ---- Live queries (Svelte can subscribe to these with $store) ----

export const exercisesQuery = () => liveQuery(async () => sortByName(await db.exercises.toArray()));
export const daysQuery = () => liveQuery(() => db.days.orderBy('position').toArray());
export const dayQuery = (id: Id) => liveQuery(() => db.days.get(id));

// ---- Exercises ----

export async function saveExercise(input: ExerciseInput & { id?: Id }): Promise<Id> {
  const fields = {
    name: input.name.trim(),
    description: input.description.trim(),
    videoUrl: input.videoUrl.trim(),
  };
  if (input.id) {
    await db.exercises.update(input.id, fields);
    return input.id;
  }
  const id = newId();
  await db.exercises.add({ id, ...fields, createdAt: Date.now() });
  return id;
}

export async function daysUsingExercise(id: Id): Promise<TrainingDay[]> {
  const days = await db.days.orderBy('position').toArray();
  return days.filter((day) => day.items.some((item) => exerciseIdsOf(item).includes(id)));
}

export type DeleteExerciseResult = { deleted: true } | { deleted: false; usedIn: TrainingDay[] };

/**
 * PROVISIONAL: deleting an exercise that training days still use is blocked,
 * so no day silently loses an exercise. The product rule is not decided yet.
 */
export async function deleteExercise(id: Id): Promise<DeleteExerciseResult> {
  return db.transaction('rw', db.exercises, db.days, async () => {
    const usedIn = await daysUsingExercise(id);
    if (usedIn.length > 0) return { deleted: false, usedIn };
    await db.exercises.delete(id);
    return { deleted: true };
  });
}

// ---- Training days ----

export async function createDay(): Promise<TrainingDay> {
  return db.transaction('rw', db.days, async () => {
    const day: TrainingDay = {
      id: newId(),
      position: await db.days.count(),
      name: '',
      items: [],
      createdAt: Date.now(),
    };
    await db.days.add(day);
    return day;
  });
}

export async function renameDay(id: Id, name: string): Promise<void> {
  await db.days.update(id, { name: name.trim() });
}

/** Deletes a day and renumbers the following days so `ДЕНЬ N` stays continuous. */
export async function deleteDay(id: Id): Promise<void> {
  await db.transaction('rw', db.days, async () => {
    await db.days.delete(id);
    const rest = await db.days.orderBy('position').toArray();
    await Promise.all(
      rest.map((day, position) => (day.position === position ? null : db.days.update(day.id, { position }))),
    );
  });
}

// ---- Exercises inside a day ----

export async function addExerciseToDay(dayId: Id, exerciseId: Id): Promise<Id> {
  const itemId = newId();
  await modifyDay(dayId, (day) => ({
    items: [...day.items, { kind: 'exercise', id: itemId, exerciseId, sets: defaultSets() }],
  }));
  return itemId;
}

export async function updateItemSets(dayId: Id, itemId: Id, sets: SetConfig[]): Promise<void> {
  await modifyDay(dayId, (day) => ({
    items: day.items.map((item) => (item.id === itemId && item.kind === 'exercise' ? { ...item, sets } : item)),
  }));
}

export async function removeItem(dayId: Id, itemId: Id): Promise<void> {
  await modifyDay(dayId, (day) => ({ items: day.items.filter((item) => item.id !== itemId) }));
}

export async function moveDayItem(dayId: Id, from: number, to: number): Promise<void> {
  await modifyDay(dayId, (day) => ({ items: moveItem(day.items, from, to) }));
}

// ---- Series inside a day ----

/** Adds an empty series at the end of the day. */
export async function addSeriesToDay(dayId: Id): Promise<Id> {
  const itemId = newId();
  await modifyDay(dayId, (day) => ({ items: [...day.items, newSeries(itemId)] }));
  return itemId;
}

/** Applies a pure change (src/lib/domain/series.ts) to one series of a day. */
export async function modifySeries(dayId: Id, itemId: Id, change: (series: SeriesItem) => SeriesItem): Promise<void> {
  await modifyDay(dayId, (day) => ({
    items: day.items.map((item) => (item.id === itemId && item.kind === 'series' ? change(item) : item)),
  }));
}

export async function addExerciseToSeries(dayId: Id, itemId: Id, exerciseId: Id): Promise<Id> {
  const id = newId();
  await modifySeries(dayId, itemId, (series) => addSeriesExercise(series, newSeriesExercise(id, exerciseId)));
  return id;
}

async function modifyDay(id: Id, change: (day: TrainingDay) => Partial<TrainingDay>): Promise<void> {
  await db.transaction('rw', db.days, async () => {
    const day = await db.days.get(id);
    if (!day) throw new Error(`Training day ${id} not found`);
    await db.days.update(id, change(day));
  });
}

export async function getExercise(id: Id): Promise<Exercise | undefined> {
  return db.exercises.get(id);
}

export async function getDay(id: Id): Promise<TrainingDay | undefined> {
  return db.days.get(id);
}

// ---- Workouts (docs/DECISIONS.md, 2026-11-05) ----

/** The workout in progress, if any. There is at most one. */
export async function getActiveWorkout(): Promise<Workout | undefined> {
  return db.workouts.filter((workout) => workout.finishedAt === null).first();
}

/** The most recently finished workout. Unfinished ones have no finishedAt key and are not in the index. */
export async function getLastFinishedWorkout(): Promise<Workout | undefined> {
  return db.workouts.orderBy('finishedAt').last();
}

/** What Home needs: the workout in progress and the day of the last finished one. */
export const workoutStatusQuery = () =>
  liveQuery(async () => ({
    active: (await getActiveWorkout()) ?? null,
    lastFinishedDayId: (await getLastFinishedWorkout())?.dayId ?? null,
  }));

export async function getWorkout(id: Id): Promise<Workout | undefined> {
  return db.workouts.get(id);
}

/**
 * Resumes the workout in progress, or starts one for `dayId` from a snapshot of the day.
 * Returns null when the day has no exercises.
 */
export async function startOrResumeWorkout(dayId: Id, now = Date.now()): Promise<Workout | null> {
  return db.transaction('rw', db.workouts, db.days, db.exercises, async () => {
    const active = await getActiveWorkout();
    if (active) return active;
    const day = await db.days.get(dayId);
    if (!day) throw new Error(`Training day ${dayId} not found`);
    const exercises = await db.exercises.bulkGet(day.items.flatMap(exerciseIdsOf));
    const names = new Map(exercises.filter((e) => !!e).map((e) => [e.id, e.name]));
    const workout = createWorkout(day, names, newId(), now);
    if (workout) await db.workouts.add(workout);
    return workout;
  });
}

/** Stores the workout's new state. Pass a plain object ($state.snapshot), not a Svelte proxy. */
export async function saveWorkout(workout: Workout): Promise<void> {
  await db.workouts.put(workout);
}

/** History: finished workouts, newest first. A workout in progress has no finishedAt key, so it is left out. */
export const finishedWorkoutsQuery = () => liveQuery(() => db.workouts.orderBy('finishedAt').reverse().toArray());

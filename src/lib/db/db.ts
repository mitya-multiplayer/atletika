import Dexie, { type EntityTable } from 'dexie';
import type { Settings } from '../domain/settings';
import type { Exercise, TrainingDay, Workout } from '../domain/types';
import { migrateWorkoutV2 } from '../domain/workout';

export class AtletikaDB extends Dexie {
  exercises!: EntityTable<Exercise, 'id'>;
  days!: EntityTable<TrainingDay, 'id'>;
  workouts!: EntityTable<Workout, 'id'>;
  settings!: EntityTable<Settings & { id: string }, 'id'>;

  constructor(name = 'atletika') {
    super(name);
    // Add a new version() block for every schema change; never edit a shipped one.
    this.version(1).stores({
      exercises: 'id, name',
      days: 'id, position',
    });
    // v2: workouts in progress and finished (history). Existing tables are unchanged.
    this.version(2).stores({
      workouts: 'id, startedAt, finishedAt',
    });
    // v3: workouts store a flat list of steps (series interleave rounds) instead of a position.
    this.version(3)
      .stores({})
      .upgrade((tx) =>
        tx
          .table('workouts')
          .toCollection()
          .modify((workout) => {
            if (workout.steps) return;
            Object.assign(workout, migrateWorkoutV2(workout));
            delete workout.position;
          }),
      );
    // v4: app settings, one record (src/lib/domain/settings.ts). Missing values read as defaults.
    this.version(4).stores({
      settings: 'id',
    });
  }
}

export const db = new AtletikaDB();

/** Ask the browser not to evict our data under storage pressure. */
export async function requestPersistentStorage(): Promise<void> {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch {
    // Not supported: data still persists, just without the eviction guarantee.
  }
}

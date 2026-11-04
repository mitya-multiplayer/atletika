import Dexie, { type EntityTable } from 'dexie';
import type { Exercise, TrainingDay } from '../domain/types';

export class AtletikaDB extends Dexie {
  exercises!: EntityTable<Exercise, 'id'>;
  days!: EntityTable<TrainingDay, 'id'>;

  constructor(name = 'atletika') {
    super(name);
    // Add a new version() block for every schema change; never edit a shipped one.
    this.version(1).stores({
      exercises: 'id, name',
      days: 'id, position',
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

// Sample program for trying the draft. Exercise names come from the reference screens.
import { db } from './db';
import { newId } from './repo';
import type { Exercise, SetConfig, TrainingDay } from '../domain/types';

const EXERCISES = [
  'Жим лёжа',
  'Подтягивания',
  'Жим гантелей стоя',
  'Тяга штанги в наклоне',
  'Приседания со штангой',
  'Выпады с гантелями',
  'Отжимания на брусьях',
  'Отжимания на упорах',
  'Сгибания на бицепс',
  'Подъёмы ног в висе',
];

const DAYS: [string, [string, number, number][]][] = [
  ['Верх тела', [['Жим лёжа', 3, 8], ['Подтягивания', 3, 10], ['Жим гантелей стоя', 3, 10], ['Тяга штанги в наклоне', 3, 12]]],
  ['Низ тела', [['Приседания со штангой', 4, 8], ['Выпады с гантелями', 3, 12], ['Подъёмы ног в висе', 3, 15]]],
  ['Жимовые', [['Отжимания на упорах', 4, 15], ['Отжимания на брусьях', 3, 10], ['Сгибания на бицепс', 3, 12]]],
];

/** Fills an empty database. Returns false and changes nothing when data already exists. */
export async function loadDemoData(): Promise<boolean> {
  return db.transaction('rw', db.exercises, db.days, async () => {
    if ((await db.exercises.count()) > 0 || (await db.days.count()) > 0) return false;

    const now = Date.now();
    const exercises: Exercise[] = EXERCISES.map((name, i) => ({
      id: newId(),
      name,
      description: '',
      videoUrl: '',
      createdAt: now + i,
    }));
    const idByName = new Map(exercises.map((exercise) => [exercise.name, exercise.id]));

    const days: TrainingDay[] = DAYS.map(([name, items], position) => ({
      id: newId(),
      position,
      name,
      createdAt: now + position,
      items: items.map(([exercise, setCount, reps]) => ({
        kind: 'exercise' as const,
        id: newId(),
        exerciseId: idByName.get(exercise)!,
        sets: Array.from({ length: setCount }, (): SetConfig => ({ reps, restSec: 90 })),
      })),
    }));

    await db.exercises.bulkAdd(exercises);
    await db.days.bulkAdd(days);
    return true;
  });
}

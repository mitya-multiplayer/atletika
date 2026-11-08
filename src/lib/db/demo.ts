// Sample program for trying the draft. Exercise names come from the reference screens.
import { db } from './db';
import { newId } from './repo';
import type { DayItem, Exercise, SetConfig, TrainingDay } from '../domain/types';

/** A YouTube search, not a particular video: it always opens something relevant. */
const search = (query: string) => `https://www.youtube.com/results?search_query=${query.replaceAll(' ', '+')}`;

// Some exercises have a description and a video, some only one of them, some neither, so every
// case shows on the workout set screen.
const EXERCISES: { name: string; description?: string; video?: string }[] = [
  {
    name: 'Жим лёжа',
    description: 'Лопатки сведены, ноги упираются в пол.\nОпускать штангу к нижней части груди, выжимать вверх без отрыва таза.',
    video: search('bench press technique'),
  },
  {
    name: 'Подтягивания',
    description: 'Хват чуть шире плеч. Подбородок над перекладиной, вниз до прямых рук, без рывков.',
    video: search('pull up technique'),
  },
  { name: 'Жим гантелей стоя' },
  { name: 'Тяга штанги в наклоне', description: 'Спина прямая, наклон около 45°. Тянуть штангу к поясу, сводя лопатки.' },
  {
    name: 'Приседания со штангой',
    description: 'Штанга на трапециях, стопы на ширине плеч. Опускаться до параллели бёдер с полом, колени — по носкам.',
    video: search('barbell squat technique'),
  },
  { name: 'Выпады с гантелями', video: search('dumbbell lunges technique') },
  {
    name: 'Отжимания на брусьях',
    description: 'Корпус слегка наклонён вперёд. Опускаться, пока плечо не станет параллельно полу.',
    video: search('dips technique'),
  },
  { name: 'Отжимания на упорах', description: 'Тело — одна прямая линия. Опускаться ниже уровня упоров, локти вдоль корпуса.' },
  { name: 'Сгибания на бицепс' },
  { name: 'Подъёмы ног в висе', video: search('hanging leg raise technique') },
];

// [exercise, sets, reps] for a plain exercise; { series } for a series: [exercise, reps] × rounds.
type DemoItem = [string, number, number] | { rounds: number; exercises: [string, number][] };

const DAYS: [string, DemoItem[]][] = [
  ['Верх тела', [['Жим лёжа', 3, 8], ['Подтягивания', 3, 10], ['Жим гантелей стоя', 3, 10], ['Тяга штанги в наклоне', 3, 12]]],
  ['Низ тела', [
    ['Приседания со штангой', 4, 8],
    { rounds: 3, exercises: [['Выпады с гантелями', 12], ['Подъёмы ног в висе', 15]] },
  ]],
  ['Жимовые', [
    ['Отжимания на упорах', 4, 15],
    { rounds: 5, exercises: [['Подтягивания', 5], ['Отжимания на брусьях', 6], ['Отжимания на упорах', 10]] },
    ['Сгибания на бицепс', 3, 12],
  ]],
];

/** Fills an empty database. Returns false and changes nothing when data already exists. */
export async function loadDemoData(): Promise<boolean> {
  return db.transaction('rw', db.exercises, db.days, async () => {
    if ((await db.exercises.count()) > 0 || (await db.days.count()) > 0) return false;

    const now = Date.now();
    const exercises: Exercise[] = EXERCISES.map((exercise, i) => ({
      id: newId(),
      name: exercise.name,
      description: exercise.description ?? '',
      videoUrl: exercise.video ?? '',
      createdAt: now + i,
    }));
    const idByName = new Map(exercises.map((exercise) => [exercise.name, exercise.id]));

    const days: TrainingDay[] = DAYS.map(([name, items], position) => ({
      id: newId(),
      position,
      name,
      createdAt: now + position,
      items: items.map((item): DayItem => {
        if (Array.isArray(item)) {
          const [exercise, setCount, reps] = item;
          return {
            kind: 'exercise',
            id: newId(),
            exerciseId: idByName.get(exercise)!,
            sets: Array.from({ length: setCount }, (): SetConfig => ({ reps, restSec: 90 })),
          };
        }
        return {
          kind: 'series',
          id: newId(),
          rounds: item.rounds,
          roundRestSec: 120,
          exercises: item.exercises.map(([exercise, reps]) => ({
            id: newId(),
            exerciseId: idByName.get(exercise)!,
            reps,
            restSec: 30,
          })),
        };
      }),
    }));

    await db.exercises.bulkAdd(exercises);
    await db.days.bulkAdd(days);
    return true;
  });
}

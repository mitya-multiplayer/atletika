export type Id = string;

/** Reusable library item. No weight fields: weight is out of scope (spec 4.7). */
export interface Exercise {
  id: Id;
  name: string;
  description: string;
  videoUrl: string;
  createdAt: number;
}

/** One set: exact repetitions and the rest that follows it, including after the last set. */
export interface SetConfig {
  reps: number;
  restSec: number;
}

/** A library exercise placed in a training day, with its own sets. */
export interface ExerciseItem {
  kind: 'exercise';
  id: Id;
  exerciseId: Id;
  sets: SetConfig[];
}

// Series items join this union once the series UX is decided (spec 4.9).
export type DayItem = ExerciseItem;

/** `position` is 0-based; the visible `ДЕНЬ N` label is derived from it. */
export interface TrainingDay {
  id: Id;
  position: number;
  name: string;
  items: DayItem[];
  createdAt: number;
}

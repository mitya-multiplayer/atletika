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

/** A planned set inside a workout, and whether it was done. */
export interface WorkoutSet {
  reps: number;
  restSec: number;
  done: boolean;
}

/** An exercise as it was when the workout started: later program edits do not change it. */
export interface WorkoutExercise {
  exerciseId: Id;
  name: string;
  sets: WorkoutSet[];
  skipped: boolean;
}

export interface WorkoutPosition {
  exercise: number;
  set: number;
}

/** Rest after a set. `endsAt` is a timestamp, so the timer keeps running while the app is closed. */
export interface WorkoutRest {
  next: WorkoutPosition;
  endsAt: number;
  /** Set while paused: the time that was left when pausing. */
  pausedRemainingMs: number | null;
}

/** A workout in progress (`finishedAt` null) or finished: the history record. */
export interface Workout {
  id: Id;
  dayId: Id;
  dayNumber: number;
  dayName: string;
  startedAt: number;
  finishedAt: number | null;
  exercises: WorkoutExercise[];
  /** The set to do next (while resting: the set just finished). */
  position: WorkoutPosition;
  rest: WorkoutRest | null;
}

/** `position` is 0-based; the visible `ДЕНЬ N` label is derived from it. */
export interface TrainingDay {
  id: Id;
  position: number;
  name: string;
  items: DayItem[];
  createdAt: number;
}

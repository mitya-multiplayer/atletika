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

/** An exercise inside a series: its repetitions in every round and the rest after it. */
export interface SeriesExercise {
  id: Id;
  exerciseId: Id;
  reps: number;
  /** Rest after this exercise within a round. After the round's last exercise, `roundRestSec` applies instead. */
  restSec: number;
}

/** Exercises done one after another, repeated for `rounds` (spec 4.9). Named «Серия N» by its order in the day. */
export interface SeriesItem {
  kind: 'series';
  id: Id;
  rounds: number;
  roundRestSec: number;
  exercises: SeriesExercise[];
}

export type DayItem = ExerciseItem | SeriesItem;

/** A planned set (or, in a series, a round) inside a workout, and whether it was done. */
export interface WorkoutSet {
  /** Planned repetitions. */
  reps: number;
  /** Repetitions actually done, when set on the set screen; otherwise the plan counts. */
  actual?: number;
  done: boolean;
}

/** An exercise as it was when the workout started: later program edits do not change it. */
export interface WorkoutExercise {
  exerciseId: Id;
  name: string;
  /** One per set; in a series, one per round. */
  sets: WorkoutSet[];
  skipped: boolean;
  /** Index of the day item it came from: exercises of one series share it. */
  block: number;
  /** Set for exercises from a series: «Серия number», `rounds` rounds. */
  series: { number: number; rounds: number } | null;
}

/** One set to do, in workout order. A series interleaves its exercises round by round. */
export interface WorkoutStep {
  exercise: number;
  set: number;
  /** Rest after this step; 0 goes straight on. */
  restSec: number;
}

/** Rest after the current step. `endsAt` is a timestamp, so the timer keeps running while the app is closed. */
export interface WorkoutRest {
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
  steps: WorkoutStep[];
  /** The step to do (while resting: the step just finished; the next one follows it). */
  step: number;
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

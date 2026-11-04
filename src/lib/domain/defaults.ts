import type { SetConfig } from './types';

// PROVISIONAL: the product has not fixed these values yet (docs/DECISIONS.md).
export const DEFAULT_SET: Readonly<SetConfig> = { reps: 10, restSec: 90 };
export const DEFAULT_SET_COUNT = 3;

export const REPS_MIN = 1;
export const REPS_MAX = 999;
export const REST_MIN_SEC = 0;
export const REST_MAX_SEC = 60 * 60;
export const REST_STEP_SEC = 15;

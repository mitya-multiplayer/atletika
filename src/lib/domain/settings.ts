// App settings (docs/DECISIONS.md, 2026-11-07). Stored as one record in the `settings` table.
import { DEFAULT_SET, REST_MAX_SEC, REST_MIN_SEC } from './defaults';

export interface Settings {
  /** Rest after each set of an exercise newly added to a day. Existing days do not change. */
  defaultRestSec: number;
}

/** The id of the one settings record. */
export const SETTINGS_ID = 'app';

export const DEFAULT_SETTINGS: Readonly<Settings> = { defaultRestSec: DEFAULT_SET.restSec };

/** Settings from a stored or imported record; anything missing or out of range falls back to the default. */
export function readSettings(stored: unknown): Settings {
  const record = typeof stored === 'object' && stored !== null ? (stored as Record<string, unknown>) : {};
  const rest = record.defaultRestSec;
  const valid = Number.isInteger(rest) && (rest as number) >= REST_MIN_SEC && (rest as number) <= REST_MAX_SEC;
  return { defaultRestSec: valid ? (rest as number) : DEFAULT_SETTINGS.defaultRestSec };
}

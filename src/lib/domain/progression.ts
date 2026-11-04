import type { Id, TrainingDay } from './types';

/**
 * PROVISIONAL (spec 4.1 is OPEN): the day after the last completed one,
 * wrapping to the first; the first day when nothing has been completed or the
 * completed day no longer exists. Kept isolated so the real rule can replace it.
 */
export function nextDay(days: readonly TrainingDay[], lastCompletedDayId: Id | null): TrainingDay | null {
  if (days.length === 0) return null;
  const ordered = [...days].sort((a, b) => a.position - b.position);
  const last = lastCompletedDayId ? ordered.findIndex((day) => day.id === lastCompletedDayId) : -1;
  return ordered[(last + 1) % ordered.length];
}

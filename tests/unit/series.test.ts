import { describe, expect, it } from 'vitest';
import {
  clampRounds,
  exerciseIdsOf,
  newSeries,
  newSeriesExercise,
  pluralRu,
  roundsLabel,
  seriesNumber,
  seriesTitle,
} from '../../src/lib/domain/series';
import type { DayItem } from '../../src/lib/domain/types';

const ex = (id: string): DayItem => ({ kind: 'exercise', id, exerciseId: `e-${id}`, sets: [] });
const se = (id: string): DayItem => ({ ...newSeries(id), exercises: [newSeriesExercise('x', 'pull'), newSeriesExercise('y', 'dips')] });

describe('series', () => {
  it('starts with the provisional defaults and no exercises', () => {
    expect(newSeries('s')).toEqual({ kind: 'series', id: 's', rounds: 3, roundRestSec: 120, exercises: [] });
    expect(newSeriesExercise('i', 'pull')).toEqual({ id: 'i', exerciseId: 'pull', reps: 10, restSec: 30 });
  });

  it('numbers series by their order among the day’s series', () => {
    const items = [ex('a'), se('s1'), ex('b'), se('s2')];
    expect(seriesNumber(items, 's1')).toBe(1);
    expect(seriesNumber(items, 's2')).toBe(2);
    expect(seriesNumber(items, 'a')).toBe(0);
    expect(seriesTitle(2)).toBe('Серия 2');
  });

  it('uses Russian plural forms for rounds', () => {
    expect([1, 2, 4, 5, 11, 12, 14, 21, 22, 25, 101, 111].map((n) => roundsLabel(n))).toEqual([
      '× 1 круг',
      '× 2 круга',
      '× 4 круга',
      '× 5 кругов',
      '× 11 кругов',
      '× 12 кругов',
      '× 14 кругов',
      '× 21 круг',
      '× 22 круга',
      '× 25 кругов',
      '× 101 круг',
      '× 111 кругов',
    ]);
    expect(pluralRu(0, 'a', 'b', 'c')).toBe('c');
  });

  it('keeps rounds between 1 and 50', () => {
    expect([0, -3, 1, 7.6, 50, 99].map(clampRounds)).toEqual([1, 1, 1, 8, 50, 50]);
  });

  it('lists the library exercises an item uses', () => {
    expect(exerciseIdsOf(ex('a'))).toEqual(['e-a']);
    expect(exerciseIdsOf(se('s'))).toEqual(['pull', 'dips']);
  });
});

import { describe, expect, it } from 'vitest';
import { matchesQuery, sortByName, validateExercise, videoHref } from '../../src/lib/domain/exercises';
import { dayNumber, formatDateParts, formatRest, formatToday, setsSummary } from '../../src/lib/domain/format';
import { moveItem } from '../../src/lib/domain/order';
import { nextDay } from '../../src/lib/domain/progression';
import { addSet, defaultSets, removeSet, updateSet } from '../../src/lib/domain/sets';
import type { TrainingDay } from '../../src/lib/domain/types';

const day = (id: string, position: number): TrainingDay => ({ id, position, name: '', items: [], createdAt: 0 });

describe('sets', () => {
  it('gives every default set its own rest, including the last one', () => {
    const sets = defaultSets();
    expect(sets).toHaveLength(3);
    expect(sets.every((set) => set.restSec > 0)).toBe(true);
  });

  it('adds a copy of the last set', () => {
    const sets = addSet([{ reps: 10, restSec: 90 }, { reps: 6, restSec: 120 }]);
    expect(sets.at(-1)).toEqual({ reps: 6, restSec: 120 });
  });

  it('never removes the only set', () => {
    expect(removeSet([{ reps: 10, restSec: 90 }], 0)).toHaveLength(1);
    expect(removeSet([{ reps: 10, restSec: 90 }, { reps: 8, restSec: 60 }], 0)).toEqual([{ reps: 8, restSec: 60 }]);
  });

  it('clamps reps to at least 1 and rest to at least 0', () => {
    const sets = updateSet([{ reps: 1, restSec: 0 }], 0, { reps: 0, restSec: -15 });
    expect(sets[0]).toEqual({ reps: 1, restSec: 0 });
  });
});

describe('format', () => {
  it('formats rest as m:ss', () => {
    expect(formatRest(90)).toBe('1:30');
    expect(formatRest(5)).toBe('0:05');
    expect(formatRest(180)).toBe('3:00');
  });

  describe('setsSummary: repetitions × sets', () => {
    const sets = (...reps: number[]) => reps.map((r) => ({ reps: r, restSec: 90 }));

    it('puts repetitions first and the number of sets second', () => {
      expect(setsSummary(sets(8, 8, 8))).toBe('8 × 3');
      expect(setsSummary(sets(15, 15, 15, 15))).toBe('15 × 4');
    });

    it('does not let different rest times change the summary', () => {
      expect(setsSummary([{ reps: 10, restSec: 90 }, { reps: 10, restSec: 60 }])).toBe('10 × 2');
    });

    it('shows a single set as repetitions × 1', () => {
      expect(setsSummary(sets(12))).toBe('12 × 1');
    });

    it('is not symmetric: 3 sets of 8 differs from 8 sets of 3', () => {
      expect(setsSummary(sets(8, 8, 8))).not.toBe(setsSummary(sets(3, 3, 3, 3, 3, 3, 3, 3)));
      expect(setsSummary(sets(3, 3, 3, 3, 3, 3, 3, 3))).toBe('3 × 8');
    });

    it('lists repetitions per set, in order, when they differ', () => {
      expect(setsSummary(sets(10, 8))).toBe('10 · 8');
      expect(setsSummary(sets(12, 10, 8, 6))).toBe('12 · 10 · 8 · 6');
    });

    it('is empty without sets', () => {
      expect(setsSummary([])).toBe('');
    });
  });

  it('numbers days from their position', () => {
    expect(dayNumber({ position: 0 })).toBe(1);
  });

  it('splits a workout date into parts for History', () => {
    expect(formatDateParts(new Date(2026, 9, 18, 7, 5).getTime())).toEqual({
      day: '18',
      month: 'ОКТ',
      year: '2026',
      full: '18 ОКТ 2026',
    });
    expect(formatDateParts(new Date(2027, 0, 1).getTime()).full).toBe('1 ЯНВ 2027');
    expect(formatDateParts(new Date(2026, 4, 9).getTime()).month).toBe('МАЙ');
  });

  it('formats the date in Russian', () => {
    expect(formatToday(new Date(2026, 10, 3))).toEqual({ weekday: 'ВТ', date: '3 НОЯ 2026' });
  });
});

describe('moveItem', () => {
  it('moves an element and leaves the input untouched', () => {
    const list = ['a', 'b', 'c'];
    expect(moveItem(list, 0, 2)).toEqual(['b', 'c', 'a']);
    expect(list).toEqual(['a', 'b', 'c']);
  });

  it('ignores out-of-range moves', () => {
    expect(moveItem(['a', 'b'], 0, 5)).toEqual(['a', 'b']);
  });
});

describe('nextDay (provisional)', () => {
  const days = [day('b', 1), day('a', 0), day('c', 2)];

  it('starts with the first day', () => {
    expect(nextDay(days, null)?.id).toBe('a');
  });

  it('follows the last completed day and wraps around', () => {
    expect(nextDay(days, 'a')?.id).toBe('b');
    expect(nextDay(days, 'c')?.id).toBe('a');
  });

  it('falls back to the first day when the completed day is gone', () => {
    expect(nextDay(days, 'deleted')?.id).toBe('a');
  });

  it('returns null for an empty program', () => {
    expect(nextDay([], null)).toBeNull();
  });
});

describe('exercises', () => {
  it('sorts in Russian alphabetical order, treating Ё like Е', () => {
    const names = sortByName([{ name: 'Ёлочка' }, { name: 'Жим' }, { name: 'Армейский жим' }, { name: 'Ель' }]).map(
      (e) => e.name,
    );
    // Code-point order would put Ё (U+0401) before А.
    expect(names).toEqual(['Армейский жим', 'Ёлочка', 'Ель', 'Жим']);
  });

  it('searches without case and treats ё as е', () => {
    expect(matchesQuery('Жим лёжа', 'ЖИМ ЛЕЖА')).toBe(true);
    expect(matchesQuery('Подтягивания', 'тяг')).toBe(true);
    expect(matchesQuery('Подтягивания', 'жим')).toBe(false);
  });

  it('requires a name and an http(s) video link', () => {
    expect(validateExercise({ name: ' ', description: '', videoUrl: '' })).toEqual({
      name: 'Введите название упражнения',
    });
    expect(validateExercise({ name: 'Жим', description: '', videoUrl: 'youtube.com/x' }).videoUrl).toBeTruthy();
    expect(validateExercise({ name: 'Жим', description: '', videoUrl: 'https://youtu.be/x' })).toEqual({});
  });

  it('shows only http(s) video links', () => {
    expect(videoHref('https://youtu.be/abc')).toBe('https://youtu.be/abc');
    expect(videoHref('  http://example.com/видео  ')).toBe('http://example.com/%D0%B2%D0%B8%D0%B4%D0%B5%D0%BE');
    expect(videoHref('')).toBeNull();
    expect(videoHref(undefined)).toBeNull();
    expect(videoHref('youtube.com/x')).toBeNull();
    expect(videoHref('javascript:alert(1)')).toBeNull();
    expect(videoHref('ftp://example.com/v.mp4')).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { DEFAULT_SET_COUNT, REST_MAX_SEC } from '../../src/lib/domain/defaults';
import { defaultSets } from '../../src/lib/domain/sets';
import { DEFAULT_SETTINGS, readSettings } from '../../src/lib/domain/settings';

describe('readSettings', () => {
  it('nothing stored yet reads as the defaults: 1:30 rest', () => {
    expect(readSettings(undefined)).toEqual({ defaultRestSec: 90 });
    expect(DEFAULT_SETTINGS).toEqual({ defaultRestSec: 90 });
  });

  it('keeps a valid rest, including the limits', () => {
    expect(readSettings({ defaultRestSec: 45 })).toEqual({ defaultRestSec: 45 });
    expect(readSettings({ defaultRestSec: 0 })).toEqual({ defaultRestSec: 0 });
    expect(readSettings({ defaultRestSec: REST_MAX_SEC })).toEqual({ defaultRestSec: REST_MAX_SEC });
  });

  it.each([null, 'x', [], { defaultRestSec: -1 }, { defaultRestSec: REST_MAX_SEC + 1 }, { defaultRestSec: 1.5 }, { defaultRestSec: '60' }])(
    'falls back to the default for %j',
    (stored) => {
      expect(readSettings(stored)).toEqual({ defaultRestSec: 90 });
    },
  );

  it('drops unknown fields', () => {
    expect(readSettings({ id: 'app', defaultRestSec: 60, sound: true })).toEqual({ defaultRestSec: 60 });
  });
});

describe('defaultSets', () => {
  it('uses the default rest after every set', () => {
    expect(defaultSets(45)).toEqual(Array.from({ length: DEFAULT_SET_COUNT }, () => ({ reps: 10, restSec: 45 })));
    expect(defaultSets()).toEqual(Array.from({ length: DEFAULT_SET_COUNT }, () => ({ reps: 10, restSec: 90 })));
  });

  it('a rest of 0:00 is kept', () => {
    expect(defaultSets(0).every((set) => set.restSec === 0)).toBe(true);
  });

  it('returns new objects each time', () => {
    const sets = defaultSets(60);
    sets[0].reps = 3;
    expect(defaultSets(60)[0].reps).toBe(10);
  });
});

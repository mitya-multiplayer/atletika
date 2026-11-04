import type { Exercise } from './types';

const collator = new Intl.Collator('ru', { sensitivity: 'base', numeric: true });

/** Russian alphabetical order (code-point order would put Ё before А). */
export function sortByName<T extends { name: string }>(list: readonly T[]): T[] {
  return [...list].sort((a, b) => collator.compare(a.name, b.name));
}

function normalize(text: string): string {
  return text.toLocaleLowerCase('ru').replaceAll('ё', 'е').trim();
}

/** Case-insensitive search that treats ё and е as the same letter. */
export function matchesQuery(name: string, query: string): boolean {
  return normalize(name).includes(normalize(query));
}

export type ExerciseInput = Pick<Exercise, 'name' | 'description' | 'videoUrl'>;
export type ExerciseErrors = Partial<Record<'name' | 'videoUrl', string>>;

export function validateExercise(input: ExerciseInput): ExerciseErrors {
  const errors: ExerciseErrors = {};
  if (!input.name.trim()) errors.name = 'Введите название упражнения';
  const url = input.videoUrl.trim();
  if (url && !isHttpUrl(url)) errors.videoUrl = 'Ссылка должна начинаться с http:// или https://';
  return errors;
}

function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

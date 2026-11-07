import { pluralRu } from './series';
import type { SetConfig, TrainingDay } from './types';

export function dayNumber(day: Pick<TrainingDay, 'position'>): number {
  return day.position + 1;
}

export function dayTitle(number: number): string {
  return `День ${number}`;
}

/** 90 → "1:30" */
export function formatRest(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

/**
 * Repetitions first, then sets: 3 sets of 10 → "10 × 3". When the sets differ,
 * the repetitions of each set in order: "10 · 8 · 6". The only place this text is built.
 */
export function setsSummary(sets: readonly SetConfig[]): string {
  if (sets.length === 0) return '';
  const first = sets[0].reps;
  if (sets.every((set) => set.reps === first)) return `${first} × ${sets.length}`;
  return sets.map((set) => set.reps).join(' · ');
}

const WEEKDAYS = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];
const MONTHS = ['ЯНВ', 'ФЕВ', 'МАР', 'АПР', 'МАЙ', 'ИЮН', 'ИЮЛ', 'АВГ', 'СЕН', 'ОКТ', 'НОЯ', 'ДЕК'];

/** { weekday: "ВТ", date: "3 НОЯ 2026" } */
export function formatToday(date: Date): { weekday: string; date: string } {
  return {
    weekday: WEEKDAYS[date.getDay()],
    date: `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`,
  };
}

/** A workout date for History: { day: "18", month: "ОКТ", year: "2026", full: "18 ОКТ 2026" }. */
export function formatDateParts(timestamp: number): { day: string; month: string; year: string; full: string } {
  const date = new Date(timestamp);
  const day = String(date.getDate());
  const month = MONTHS[date.getMonth()];
  const year = String(date.getFullYear());
  return { day, month, year, full: `${day} ${month} ${year}` };
}

export function countExercises(n: number): string {
  return `${n} ${pluralRu(n, 'упражнение', 'упражнения', 'упражнений')}`;
}

export function countDays(n: number): string {
  return `${n} ${pluralRu(n, 'день', 'дня', 'дней')}`;
}

export function countWorkouts(n: number): string {
  return `${n} ${pluralRu(n, 'тренировка', 'тренировки', 'тренировок')}`;
}

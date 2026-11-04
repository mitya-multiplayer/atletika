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

/** "3 × 10" when every set has the same reps, otherwise "10 · 8 · 6". */
export function setsSummary(sets: readonly SetConfig[]): string {
  if (sets.length === 0) return '';
  const first = sets[0].reps;
  if (sets.every((set) => set.reps === first)) return `${sets.length} × ${first}`;
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

// Таблица «клавиша → интервал» (C-SOL-2, OB-6, приложение Г): расстояние клавиши от «до» в
// полутонах и есть интервал. «До» — октава: прима в заданиях не встречается (Р-10).

import { INTERVALS, type IntervalId } from './intervals'

/** Ступень звукоряда от «до» (0–11) → интервал. */
export const INTERVAL_KEYMAP: Readonly<Record<number, IntervalId>> = Object.fromEntries(
  INTERVALS.map(({ id, semitones }) => [semitones % 12, id]),
)

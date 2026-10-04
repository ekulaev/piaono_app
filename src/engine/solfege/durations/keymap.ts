// Таблица «клавиша → длительность» (C-SOL-3, OB-6, приложение Д): до — целая … соль — 1/16.
// Ля, си и чёрные клавиши в таблицу не входят — резерв под точки (Б-SOL-9).

import type { DurationId } from './durations'

/** Ступень звукоряда от «до» (0–11) → длительность. */
export const DURATION_KEYMAP: Readonly<Record<number, DurationId>> = {
  0: 'w',
  2: 'h',
  4: 'q',
  5: '8',
  7: '16',
}

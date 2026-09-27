// Настройки режима «Ритм» (C-STF-6, OB-2): что выбирает ученик на экране режима.

import type { RhythmLevel } from './figures'
import type { Meter } from './generate'

export interface RhythmSettings {
  /** «Длительности»: уровень фигур 1–4 (LIM-1). */
  level: RhythmLevel
  /** «Размер»: 3/4 или 4/4. */
  meter: Meter
  /** «Тактов» в рисунке. */
  bars: 1 | 2
  /** «Рисунков в сессии». */
  patterns: number
}

export const PATTERNS_LIMITS = { min: 1, max: 10 }

export const DEFAULT_RHYTHM_SETTINGS: RhythmSettings = { level: 1, meter: 4, bars: 1, patterns: 10 }

export const LEVEL_CHOICES: readonly RhythmLevel[] = [1, 2, 3, 4]
export const METER_CHOICES: readonly Meter[] = [3, 4]
export const BAR_CHOICES: readonly (1 | 2)[] = [1, 2]

function oneOf<T>(value: unknown, options: readonly T[], fallback: T): T {
  return options.includes(value as T) ? (value as T) : fallback
}

/** Сохранённые настройки: каждое неверное или отсутствующее поле — значение по умолчанию. */
export function readRhythmSettings(value: unknown): RhythmSettings {
  const saved =
    typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
  const d = DEFAULT_RHYTHM_SETTINGS
  const patterns = saved.patterns
  return {
    level: oneOf(saved.level, LEVEL_CHOICES, d.level),
    meter: oneOf(saved.meter, METER_CHOICES, d.meter),
    bars: oneOf(saved.bars, BAR_CHOICES, d.bars),
    patterns:
      Number.isInteger(patterns) &&
      (patterns as number) >= PATTERNS_LIMITS.min &&
      (patterns as number) <= PATTERNS_LIMITS.max
        ? (patterns as number)
        : d.patterns,
  }
}

// Настройки режима «Разминка» (C-STF-9): что ученик выбирает на экране режима.
// Значения по умолчанию воспроизводят «Разминку» такой, какой она была до настроек (Р-1).

import type { ClefChoice } from '../sequences/settings'
import { DEFAULT_TONALITY_ID, isTonalityId } from './keys'
import { stepOf } from './steps'

/** Диапазон ключа: границы включительно, в ступенях (см. steps.ts). */
export interface StepRange {
  low: number
  high: number
}

export interface WarmupSettings {
  /** Секунд от появления ноты до правой границы знаков в начале стана. */
  travelSeconds: number
  clef: ClefChoice
  trebleRange: StepRange
  bassRange: StepRange
  /** Идентификатор тональности из `TONALITIES`. */
  tonality: string
  /** Нота со знаком при ключе может прийти с бекаром. */
  naturals: boolean
  /** На «Старт» и при смене ключа ставить нижнюю ноту диапазона крайней слева на клавиатуре. */
  autoShift: boolean
}

export const TRAVEL_SECONDS_LIMITS = { min: 1, max: 10 }

/** Допустимые границы диапазонов (LIM-2, LIM-3): E3–F6 и G1–A4. */
export const TREBLE_LIMITS: StepRange = { low: stepOf('E', 3), high: stepOf('F', 6) }
export const BASS_LIMITS: StepRange = { low: stepOf('G', 1), high: stepOf('A', 4) }

/** Наименьший диапазон — 2 ноты (LIM-4). */
export const MIN_RANGE_NOTES = 2

export const DEFAULT_WARMUP_SETTINGS: WarmupSettings = {
  travelSeconds: 5,
  clef: 'both',
  // G3–D6 и B1–F4: диапазоны, в которых нота пишется не больше чем с двумя добавочными линиями.
  trebleRange: { low: stepOf('G', 3), high: stepOf('D', 6) },
  bassRange: { low: stepOf('B', 1), high: stepOf('F', 4) },
  tonality: DEFAULT_TONALITY_ID,
  naturals: false,
  autoShift: false,
}

const CLEFS: readonly ClefChoice[] = ['treble', 'bass', 'both']

function readRange(value: unknown, limits: StepRange, fallback: StepRange): StepRange {
  if (typeof value !== 'object' || value === null) return fallback
  const { low, high } = value as Record<string, unknown>
  const valid =
    Number.isInteger(low) &&
    Number.isInteger(high) &&
    (low as number) >= limits.low &&
    (high as number) <= limits.high &&
    (high as number) - (low as number) + 1 >= MIN_RANGE_NOTES
  return valid ? { low: low as number, high: high as number } : fallback
}

/**
 * Сохранённые настройки: каждое неверное или отсутствующее поле — значение по умолчанию только
 * для него, остальные не страдают (CLAUDE.md §7).
 */
export function readWarmupSettings(value: unknown): WarmupSettings {
  const saved =
    typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
  const d = DEFAULT_WARMUP_SETTINGS
  const seconds = saved.travelSeconds
  return {
    travelSeconds:
      Number.isInteger(seconds) &&
      (seconds as number) >= TRAVEL_SECONDS_LIMITS.min &&
      (seconds as number) <= TRAVEL_SECONDS_LIMITS.max
        ? (seconds as number)
        : d.travelSeconds,
    clef: CLEFS.includes(saved.clef as ClefChoice) ? (saved.clef as ClefChoice) : d.clef,
    trebleRange: readRange(saved.trebleRange, TREBLE_LIMITS, d.trebleRange),
    bassRange: readRange(saved.bassRange, BASS_LIMITS, d.bassRange),
    tonality: isTonalityId(saved.tonality) ? saved.tonality : d.tonality,
    naturals: typeof saved.naturals === 'boolean' ? saved.naturals : d.naturals,
    autoShift: typeof saved.autoShift === 'boolean' ? saved.autoShift : d.autoShift,
  }
}

/** Сколько нот (ступеней) в диапазоне. */
export function rangeNoteCount(range: StepRange): number {
  return range.high - range.low + 1
}

/**
 * Диапазон шире клавиатуры: ученик не сыграет его без прокрутки (C-STF-9, OB-27). Вместимость
 * null — клавиатуры нет, предупреждать не о чем.
 */
export function rangeExceedsCapacity(range: StepRange, capacity: number | null): boolean {
  return capacity !== null && rangeNoteCount(range) > capacity
}

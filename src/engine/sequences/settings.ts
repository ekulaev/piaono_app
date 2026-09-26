// Настройки режима «Последовательности» (C-STF-2): что выбирает ученик на экране режима.

export type ClefChoice = 'treble' | 'bass' | 'both'
export type RangeChoice = 'position' | 'octave' | 'staff'
/** Самый широкий интервал между соседними нотами (C-STF-3): терция, квинта или октава. */
export type IntervalChoice = 'third' | 'fifth' | 'octave'

export interface SequenceSettings {
  clef: ClefChoice
  range: RangeChoice
  /** Допустимые интервалы между соседними нотами (для шагов из одной ноты). */
  intervals: IntervalChoice
  /** Последовательностей в сессии. */
  sequences: number
  /** Нот в каждом шаге (1 — по одной ноте, 2–3 — аккорды). */
  notesPerStep: number
  /** Подсказки «якорь + интервал» (действуют только для шагов из одной ноты). */
  hints: boolean
  /** После последовательности — отсчёт 3 секунды и переход сам. */
  autoAdvance: boolean
}

export const SEQUENCES_LIMITS = { min: 1, max: 10 }
export const NOTES_PER_STEP_LIMITS = { min: 1, max: 3 }

export const DEFAULT_SEQUENCE_SETTINGS: SequenceSettings = {
  clef: 'treble',
  range: 'position',
  intervals: 'third',
  sequences: 10,
  notesPerStep: 1,
  hints: true,
  autoAdvance: false,
}

const CLEFS: readonly ClefChoice[] = ['treble', 'bass', 'both']
const RANGES: readonly RangeChoice[] = ['position', 'octave', 'staff']
const INTERVALS: readonly IntervalChoice[] = ['third', 'fifth', 'octave']

function oneOf<T>(value: unknown, options: readonly T[], fallback: T): T {
  return options.includes(value as T) ? (value as T) : fallback
}

function integerIn(value: unknown, limits: { min: number; max: number }, fallback: number) {
  return Number.isInteger(value) &&
    (value as number) >= limits.min &&
    (value as number) <= limits.max
    ? (value as number)
    : fallback
}

/** Сохранённые настройки: каждое неверное или отсутствующее поле — значение по умолчанию. */
export function readSequenceSettings(value: unknown): SequenceSettings {
  const saved =
    typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
  const d = DEFAULT_SEQUENCE_SETTINGS
  return {
    clef: oneOf(saved.clef, CLEFS, d.clef),
    range: oneOf(saved.range, RANGES, d.range),
    intervals: oneOf(saved.intervals, INTERVALS, d.intervals),
    sequences: integerIn(saved.sequences, SEQUENCES_LIMITS, d.sequences),
    notesPerStep: integerIn(saved.notesPerStep, NOTES_PER_STEP_LIMITS, d.notesPerStep),
    hints: typeof saved.hints === 'boolean' ? saved.hints : d.hints,
    autoAdvance: typeof saved.autoAdvance === 'boolean' ? saved.autoAdvance : d.autoAdvance,
  }
}

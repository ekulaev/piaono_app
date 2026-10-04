// Задания «Интервалов» (C-SOL-2, OB-1…OB-4): тип по трудности, первая нота — белая клавиша,
// обе ноты в C4–C6 (Р-8).

import { pickTypes } from '../pick'
import type { Task } from '../types'
import { naturalPitch, stepOf } from '../../warmup/steps'
import {
  ALL_TASK_TYPES,
  intervalInfo,
  parseTaskType,
  type Direction,
  type IntervalId,
  type IntervalTaskType,
  type Variant,
} from './intervals'
import { INTERVAL_KEYMAP } from './keymap'
import type { VariantChoice } from './settings'
import { spellSecond, type SpelledNote } from './spell'

/** Диапазон режима: обе ноты задания и прокрутка клавиатуры (C-SOL-2, LIM-1). */
export const INTERVALS_RANGE = { low: 60, high: 84 } // C4–C6

const LOW_STEP = stepOf('C', 4)
const HIGH_STEP = stepOf('C', 6)

/** Что рисует и пишет задание «Интервалов». */
export interface IntervalContent {
  variant: Variant
  direction: Direction
  interval: IntervalId
  /** Первая нота: ступень белой клавиши. */
  firstStep: number
  first: number
  second: SpelledNote
}

export type IntervalTask = Task<IntervalContent>

/** Типы заданий, доступные при выборе «Что тренировать». */
export function typesFor(variant: VariantChoice): IntervalTaskType[] {
  return ALL_TASK_TYPES.filter((type) => variant === 'both' || type.startsWith(`${variant}:`))
}

/** Белые клавиши, от которых интервал не выходит за C4–C6. */
function firstSteps(id: IntervalId, direction: Direction): number[] {
  const { semitones } = intervalInfo(id)
  const sign = direction === 'up' ? 1 : -1
  const result: number[] = []
  for (let step = LOW_STEP; step <= HIGH_STEP; step++) {
    const second = naturalPitch(step) + sign * semitones
    if (second >= INTERVALS_RANGE.low && second <= INTERVALS_RANGE.high) result.push(step)
  }
  return result
}

/** Ближайшая октава «до–до» внутри C4–C6 — её показывает клавиатура для легенды (OB-11). */
function legendOctave(first: number): { low: number; high: number } {
  const low = Math.min(INTERVALS_RANGE.high - 12, Math.floor(first / 12) * 12)
  return { low, high: low + 12 }
}

export function buildTask(type: IntervalTaskType, random: () => number): IntervalTask {
  const { variant, direction, id } = parseTaskType(type)
  const steps = firstSteps(id, direction)
  const firstStep = steps[Math.floor(random() * steps.length)]
  const first = naturalPitch(firstStep)
  const second = spellSecond(firstStep, id, direction)
  const content: IntervalContent = { variant, direction, interval: id, firstStep, first, second }
  return {
    mode: 'intervals',
    type,
    answer:
      variant === 'play'
        ? { kind: 'note', pitches: [second.pitch] }
        : { kind: 'value', value: id, table: INTERVAL_KEYMAP },
    range:
      variant === 'play'
        ? { low: Math.min(first, second.pitch), high: Math.max(first, second.pitch) }
        : legendOctave(first),
    content,
  }
}

/** Задания сессии: типы — взвешенно по трудности, подряд тип не повторяется (C-SOL-1, OB-2). */
export function buildIntervalTasks(
  count: number,
  variant: VariantChoice,
  weight: (type: string) => number,
  random: () => number,
): IntervalTask[] {
  return pickTypes(count, typesFor(variant), weight, random).map((type) => buildTask(type, random))
}

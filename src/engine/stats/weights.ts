// Трудность места и веса для подбора нот (C-STF-4, OB-7, OB-8, OB-9, OB-10).

import type { Direction } from '../sequences/anchors'
import type { Clef } from '../staff/pickNote'
import { intervalKey, noteKey, type ItemStats, type ModeStats } from './stats'

/** Меньше попыток — оценке рано верить, трудность средняя (LIM-1). */
export const MIN_ATTEMPTS = 3
/** Трудность того, что ещё не встречалось или встречалось мало. */
export const UNKNOWN_DIFFICULTY = 0.5
/** Вес = 1 + WEIGHT_SPAN × трудность: самое трудное в 3 раза чаще самого лёгкого (LIM-2). */
export const WEIGHT_SPAN = 2

/** Медиана средних времён мест одного вида; null — мест со временем меньше MIN_ATTEMPTS. */
export function medianAvg(items: readonly ItemStats[]): number | null {
  const times = items
    .filter((item) => item.timeCount > 0)
    .map((item) => item.avgMs)
    .sort((a, b) => a - b)
  if (times.length < MIN_ATTEMPTS) return null
  const middle = Math.floor(times.length / 2)
  return times.length % 2 ? times[middle] : (times[middle - 1] + times[middle]) / 2
}

/**
 * Трудность 0–1: большее из доли неудач (ошибка, пропуск, «не успел») и замедленности —
 * время вдвое больше медианы даёт 1, не больше медианы — 0 (LIM-7).
 */
export function difficulty(item: ItemStats | undefined, median: number | null): number {
  if (!item || item.attempts < MIN_ATTEMPTS) return UNKNOWN_DIFFICULTY
  const fail = (item.errors + item.skips) / item.attempts
  const slow = median && item.timeCount > 0 ? Math.min(1, Math.max(0, item.avgMs / median - 1)) : 0
  return Math.max(fail, slow)
}

export const weightOf = (difficultyValue: number) => 1 + WEIGHT_SPAN * difficultyValue

/** Веса мест для генераторов. */
export interface Weights {
  note(clef: Clef, pitch: number): number
  interval(size: number, direction: Direction): number
}

/** Все веса равны: выбор равновероятный, как до этапа 6. */
export const UNIFORM: Weights = { note: () => 1, interval: () => 1 }

/**
 * Веса по статистике режима. Медиана считается отдельно для нот и для интервалов: это разные
 * величины. Без статистики все веса одинаковы (трудность 0,5), и выбор равновероятный.
 */
export function weightsFor(stats: ModeStats): Weights {
  const noteMedian = medianAvg(Object.values(stats.notes))
  const intervalMedian = medianAvg(Object.values(stats.intervals))
  return {
    note: (clef, pitch) => weightOf(difficulty(stats.notes[noteKey(clef, pitch)], noteMedian)),
    interval: (size, direction) =>
      weightOf(difficulty(stats.intervals[intervalKey(size, direction)], intervalMedian)),
  }
}

/**
 * Взвешенный выбор одним вызовом random(). При равных весах результат совпадает с
 * options[floor(r × n)] — прежним равновероятным выбором.
 */
export function weightedPick<T>(
  options: readonly T[],
  weight: (option: T) => number,
  random: () => number,
): T {
  const weights = options.map(weight)
  const total = weights.reduce((sum, w) => sum + w, 0)
  let target = random() * total
  for (let i = 0; i < options.length; i++) {
    target -= weights[i]
    if (target < 0) return options[i]
  }
  return options[options.length - 1]
}

// Опорные ноты и интервалы (C-STF-3): от чего ученик находит первую ноту и как далеко
// до следующей. Все ноты режима — белые клавиши, поэтому интервал считается по ним.

import { isBlackKey, WHITE_PITCHES } from '../keyboard/layout'
import type { Clef } from '../staff/pickNote'
import type { IntervalChoice } from './settings'

/** Ориентиры стана: C4, G4 (линия скрипичного ключа), C5 / C3, F3 (линия басового ключа), C4. */
export const ANCHORS: Record<Clef, readonly number[]> = {
  treble: [60, 67, 72],
  bass: [48, 53, 60],
}

/** Самый широкий допустимый интервал каждой настройки «Интервалы» (в ступенях стана). */
export const MAX_INTERVAL: Record<IntervalChoice, number> = { third: 3, fifth: 5, octave: 8 }

/** Самый узкий интервал: прима (повтор ноты) не используется. */
export const MIN_INTERVAL = 2

/** Для строки «В этом диапазоне — не больше …» (родительный падеж). */
export const INTERVAL_NAMES: Record<number, string> = {
  2: 'секунды',
  3: 'терции',
  4: 'кварты',
  5: 'квинты',
  6: 'сексты',
  7: 'септимы',
  8: 'октавы',
}

export type Direction = 'up' | 'down'

export interface Interval {
  /** Число ступеней стана, считая обе ноты: 2 — секунда … 8 — октава. */
  size: number
  direction: Direction
}

/** Опорные ноты ключа внутри диапазона. */
export function anchorsIn(clef: Clef, low: number, high: number): number[] {
  return ANCHORS[clef].filter((pitch) => pitch >= low && pitch <= high)
}

/** Номер белой клавиши (A0 = 0). Для чёрной клавиши — ошибка: в режиме их нет. */
export function whiteIndex(pitch: number): number {
  if (isBlackKey(pitch)) throw new Error(`чёрная клавиша ${pitch} — не нота режима`)
  return WHITE_PITCHES.indexOf(pitch)
}

/** Интервал от ноты from до ноты to. Для одинаковых нот size = 1 (прима), направление 'up'. */
export function intervalBetween(from: number, to: number): Interval {
  const steps = whiteIndex(to) - whiteIndex(from)
  return { size: Math.abs(steps) + 1, direction: steps < 0 ? 'down' : 'up' }
}

/** Нота на интервал выше или ниже; null — за пределами клавиатуры. */
export function moveBy(pitch: number, size: number, direction: Direction): number | null {
  const index = whiteIndex(pitch) + (direction === 'up' ? size - 1 : -(size - 1))
  return WHITE_PITCHES[index] ?? null
}

/** Самый широкий интервал из настройки, который помещается в диапазон low–high. */
export function widestFitting(low: number, high: number, choice: IntervalChoice): number {
  const widestInRange = whiteIndex(high) - whiteIndex(low) + 1
  return Math.min(MAX_INTERVAL[choice], widestInRange)
}

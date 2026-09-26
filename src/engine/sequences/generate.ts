import { isBlackKey } from '../keyboard/layout'
import type { Clef } from '../staff/pickNote'
import { anchorsIn, MAX_INTERVAL, MIN_INTERVAL, moveBy, type Direction } from './anchors'
import type { RangeChoice, SequenceSettings } from './settings'

/** Диапазоны настройки «Диапазон» по ключам (MIDI-номера, включительно). */
export const RANGES: Record<RangeChoice, Record<Clef, { low: number; high: number }>> = {
  position: { treble: { low: 60, high: 67 }, bass: { low: 48, high: 55 } }, // C4–G4 / C3–G3
  octave: { treble: { low: 60, high: 72 }, bass: { low: 48, high: 60 } }, // C4–C5 / C3–C4
  staff: { treble: { low: 60, high: 81 }, bass: { low: 40, high: 60 } }, // C4–A5 / E2–C4
}

export const MIN_STEPS = 3
export const MAX_STEPS = 8

/** Последовательность: ключ, диапазон и шаги; шаг — ноты, играемые вместе (по возрастанию). */
export interface Sequence {
  clef: Clef
  low: number
  high: number
  /** Опорная нота, от которой построен ход интервалами; null — шаги из нескольких нот. */
  anchor: number | null
  steps: number[][]
}

function whiteKeys(low: number, high: number): number[] {
  const keys: number[] = []
  for (let pitch = low; pitch <= high; pitch++) if (!isBlackKey(pitch)) keys.push(pitch)
  return keys
}

/** n разных случайных элементов (перемешивание Фишера — Йетса по первым n позициям). */
function pickDistinct(candidates: number[], n: number, random: () => number): number[] {
  const pool = [...candidates]
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(random() * (pool.length - i))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, n).sort((a, b) => a - b)
}

function pickOne<T>(options: readonly T[], random: () => number): T {
  return options[Math.floor(random() * options.length)]
}

/**
 * Следующая нота хода: сначала размер интервала — равновероятно среди тех, что помещаются
 * в диапазон хотя бы в одну сторону, затем направление — среди помещающихся. Так у края
 * диапазона широкие интервалы не вытесняются узкими.
 */
export function nextByInterval(
  from: number,
  maxInterval: number,
  low: number,
  high: number,
  random: () => number,
): number {
  const fits = (size: number, direction: Direction) => {
    const pitch = moveBy(from, size, direction)
    return pitch !== null && pitch >= low && pitch <= high
  }
  const directions: Direction[] = ['up', 'down']
  const sizes: number[] = []
  for (let size = MIN_INTERVAL; size <= maxInterval; size++) {
    if (directions.some((direction) => fits(size, direction))) sizes.push(size)
  }
  const size = pickOne(sizes, random)
  const direction = pickOne(
    directions.filter((d) => fits(size, d)),
    random,
  )
  return moveBy(from, size, direction)!
}

/**
 * Одна последовательность: ключ (для «Оба» — случайный), 3–8 шагов. Шаги из одной ноты —
 * ход интервалами от случайной опорной ноты диапазона; из 2–3 нот — случайные разные белые
 * клавиши диапазона. random передаётся снаружи.
 */
export function buildSequence(settings: SequenceSettings, random: () => number): Sequence {
  const clef: Clef = settings.clef === 'both' ? (random() < 0.5 ? 'treble' : 'bass') : settings.clef
  const { low, high } = RANGES[settings.range][clef]
  const length = MIN_STEPS + Math.floor(random() * (MAX_STEPS - MIN_STEPS + 1))

  if (settings.notesPerStep === 1) {
    const anchor = pickOne(anchorsIn(clef, low, high), random)
    const maxInterval = MAX_INTERVAL[settings.intervals]
    const steps: number[][] = []
    let previous = anchor
    for (let i = 0; i < length; i++) {
      previous = nextByInterval(previous, maxInterval, low, high, random)
      steps.push([previous])
    }
    return { clef, low, high, anchor, steps }
  }

  const candidates = whiteKeys(low, high)
  const steps = Array.from({ length }, () =>
    pickDistinct(candidates, settings.notesPerStep, random),
  )
  return { clef, low, high, anchor: null, steps }
}

/** Все последовательности сессии — хранятся целиком, чтобы «Повторить» дал те же ноты. */
export function buildSession(settings: SequenceSettings, random: () => number): Sequence[] {
  return Array.from({ length: settings.sequences }, () => buildSequence(settings, random))
}

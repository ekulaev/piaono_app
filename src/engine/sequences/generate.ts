import { isBlackKey } from '../keyboard/layout'
import type { Clef } from '../staff/pickNote'
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

/**
 * Одна последовательность: ключ (для «Оба» — случайный), 3–8 шагов, в каждом шаге ровно
 * notesPerStep разных белых клавиш из диапазона. random передаётся снаружи.
 */
export function buildSequence(settings: SequenceSettings, random: () => number): Sequence {
  const clef: Clef = settings.clef === 'both' ? (random() < 0.5 ? 'treble' : 'bass') : settings.clef
  const { low, high } = RANGES[settings.range][clef]
  const candidates = whiteKeys(low, high)
  const length = MIN_STEPS + Math.floor(random() * (MAX_STEPS - MIN_STEPS + 1))
  const steps = Array.from({ length }, () =>
    pickDistinct(candidates, settings.notesPerStep, random),
  )
  return { clef, low, high, steps }
}

/** Все последовательности сессии — хранятся целиком, чтобы «Повторить» дал те же ноты. */
export function buildSession(settings: SequenceSettings, random: () => number): Sequence[] {
  return Array.from({ length: settings.sequences }, () => buildSequence(settings, random))
}

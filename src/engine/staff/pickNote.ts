import { UNIFORM, weightedPick, type Weights } from '../stats/weights'
import { alterationOf, tonalityById } from '../warmup/keys'
import { DEFAULT_WARMUP_SETTINGS, type StepRange, type WarmupSettings } from '../warmup/settings'
import { naturalPitch, stepLetter } from '../warmup/steps'

export type Clef = 'treble' | 'bass'

/**
 * Нота упражнения: звучащая высота (MIDI-номер), ключ и написание — ступень на стане и знак
 * бекара. Знак тональности в ноте не хранится: он стоит при ключе и уже учтён в `pitch`.
 * По `pitch` нота проверяется и учитывается в статистике, по `step` и `natural` рисуется.
 */
export interface StaffNote {
  pitch: number
  clef: Clef
  /** Ступень на стане (steps.ts): E3, F♯3 и F3 — три разные ноты на двух ступенях. */
  step: number
  /** Перед нотой бекар: знак тональности отменён, играть белую клавишу. */
  natural: boolean
}

export interface PoolEntry {
  note: StaffNote
  /** Вероятность без учёта трудности: нота общей зоны ключей делит её между ключами пополам. */
  base: number
}

function rangeOf(settings: WarmupSettings, clef: Clef): StepRange {
  return clef === 'treble' ? settings.trebleRange : settings.bassRange
}

function clefsOf(settings: WarmupSettings): readonly Clef[] {
  // Порядок «басовый, скрипичный» — как в прежней таблице нот: выбор по случайному числу не меняется.
  if (settings.clef === 'treble') return ['treble']
  if (settings.clef === 'bass') return ['bass']
  return ['bass', 'treble']
}

/**
 * Все ноты, из которых «Разминка» выбирает (C-STF-9, OB-13, OB-16): ступени диапазона каждого
 * включённого ключа, высота — с учётом знаков тональности. Ступень общей зоны ключей входит в оба.
 * Со включённым бекаром у ступени со знаком при ключе добавляется вторая нота — с бекаром:
 * это ещё одна нота набора, а не отдельная вероятность (Р-10).
 */
export function buildPool(settings: WarmupSettings = DEFAULT_WARMUP_SETTINGS): PoolEntry[] {
  const clefs = clefsOf(settings)
  const tonality = tonalityById(settings.tonality)
  const ranges = clefs.map((clef) => rangeOf(settings, clef))
  const first = Math.min(...ranges.map((range) => range.low))
  const last = Math.max(...ranges.map((range) => range.high))
  const pool: PoolEntry[] = []
  for (let step = first; step <= last; step++) {
    const here = clefs.filter((clef) => {
      const range = rangeOf(settings, clef)
      return step >= range.low && step <= range.high
    })
    const alteration = alterationOf(tonality, stepLetter(step))
    const variants = alteration !== 0 && settings.naturals ? [false, true] : [false]
    for (const natural of variants) {
      const pitch = naturalPitch(step) + (natural ? 0 : alteration)
      for (const clef of here) {
        pool.push({ note: { pitch, clef, step, natural }, base: 1 / here.length })
      }
    }
  }
  return pool
}

/**
 * Случайная нота набора `buildPool`. Трудные ноты выбираются чаще (C-STF-4, OB-9): вероятность
 * ноты — прежняя, умноженная на вес; без статистики — равновероятно. random передаётся снаружи
 * (Math.random в приложении, предсказуемый — в тестах).
 */
export function pickNote(
  random: () => number,
  weights: Weights = UNIFORM,
  settings: WarmupSettings = DEFAULT_WARMUP_SETTINGS,
): StaffNote {
  return weightedPick(
    buildPool(settings),
    ({ note, base }) => base * weights.note(note.clef, note.pitch),
    random,
  ).note
}

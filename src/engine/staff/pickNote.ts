import { isBlackKey } from '../keyboard/layout'
import { UNIFORM, weightedPick, type Weights } from '../stats/weights'

export type Clef = 'treble' | 'bass'

/** Нота упражнения: высота (MIDI-номер) и ключ, в котором она записана. */
export interface StaffNote {
  pitch: number
  clef: Clef
}

/**
 * Диапазоны, в которых нота пишется не больше чем с двумя добавочными линиями.
 * Скрипичный ключ: G3 (под второй нижней добавочной) – D6 (над второй верхней).
 * Басовый ключ: B1 (под второй нижней) – F4 (над второй верхней).
 */
export const CLEF_RANGES: Record<Clef, { low: number; high: number }> = {
  treble: { low: 55, high: 86 }, // G3 – D6
  bass: { low: 35, high: 65 }, // B1 – F4
}

const inRange = (pitch: number, clef: Clef) =>
  pitch >= CLEF_RANGES[clef].low && pitch <= CLEF_RANGES[clef].high

/** Все белые клавиши от B1 до D6 — объединение диапазонов обоих ключей. */
const CANDIDATES: readonly number[] = Array.from(
  { length: CLEF_RANGES.treble.high - CLEF_RANGES.bass.low + 1 },
  (_, i) => CLEF_RANGES.bass.low + i,
).filter((pitch) => !isBlackKey(pitch))

/**
 * Пары «нота + ключ» с прежней вероятностью: каждая белая клавиша равновероятна, в общей
 * зоне G3–F4 её вероятность делится между ключами пополам.
 */
const PAIRS: readonly { note: StaffNote; base: number }[] = CANDIDATES.flatMap((pitch) => {
  const clefs = (['bass', 'treble'] as const).filter((clef) => inRange(pitch, clef))
  return clefs.map((clef) => ({ note: { pitch, clef }, base: 1 / clefs.length }))
})

/**
 * Случайная нота: белая клавиша из общего диапазона; ключ — тот, в диапазон которого она
 * входит, а для общей зоны G3–F4 — случайный. Трудные ноты выбираются чаще (C-STF-4, OB-9):
 * вероятность пары — прежняя, умноженная на вес; без статистики — равновероятно.
 * random передаётся снаружи (Math.random в приложении, предсказуемый — в тестах).
 */
export function pickNote(random: () => number, weights: Weights = UNIFORM): StaffNote {
  return weightedPick(PAIRS, ({ note, base }) => base * weights.note(note.clef, note.pitch), random)
    .note
}

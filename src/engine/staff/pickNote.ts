import { isBlackKey } from '../keyboard/layout'

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
 * Случайная нота: равновероятно любая белая клавиша из общего диапазона; ключ — тот,
 * в диапазон которого она входит, а для общей зоны G3–F4 — случайный.
 * random передаётся снаружи (Math.random в приложении, предсказуемый — в тестах).
 */
export function pickNote(random: () => number): StaffNote {
  const pitch = CANDIDATES[Math.floor(random() * CANDIDATES.length)]
  const treble = inRange(pitch, 'treble')
  const bass = inRange(pitch, 'bass')
  if (treble && bass) return { pitch, clef: random() < 0.5 ? 'treble' : 'bass' }
  return { pitch, clef: treble ? 'treble' : 'bass' }
}

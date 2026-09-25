import type { Level } from './types'

/** Сила нажатия пианино (velocity 1–127) → уровень: 1–42 тихо, 43–84 средне, 85–127 громко. */
export function levelFromVelocity(velocity: number): Level {
  if (velocity <= 42) return 1
  if (velocity <= 84) return 2
  return 3
}

/**
 * Давление касания (0–1) → уровень. Значения 0 и 0.5 стандарт Pointer Events отдаёт
 * устройствам без датчика давления — такое касание считаем «средне».
 */
export function levelFromPressure(pressure: number): Level {
  if (pressure === 0 || pressure === 0.5) return 2
  if (pressure <= 1 / 3) return 1
  if (pressure <= 2 / 3) return 2
  return 3
}

// Арифметика ползунков без React: доля положения ↔ значение, привязка к шагу, границы диапазона.
// Отдельно от компонента, чтобы проверять тестами без касаний.

/** Доля положения значения на шкале, 0–1. */
export function fractionOf(value: number, min: number, max: number): number {
  if (max <= min) return 0
  return Math.min(1, Math.max(0, (value - min) / (max - min)))
}

/** Значение по доле положения (0–1), привязанное к шагу и границам шкалы. */
export function valueAt(fraction: number, min: number, max: number, step = 1): number {
  const raw = min + Math.min(1, Math.max(0, fraction)) * (max - min)
  const snapped = min + Math.round((raw - min) / step) * step
  return Math.min(max, Math.max(min, snapped))
}

export type Thumb = 'low' | 'high'

export interface Range {
  low: number
  high: number
}

/**
 * Какую ручку тянуть при касании шкалы: ближайшую к месту касания. Если обе на одном расстоянии
 * (значения сошлись или касание ровно посередине), касание левее — нижняя, правее — верхняя.
 */
export function nearestThumb(value: number, range: Range): Thumb {
  const toLow = Math.abs(value - range.low)
  const toHigh = Math.abs(value - range.high)
  if (toLow !== toHigh) return toLow < toHigh ? 'low' : 'high'
  return value <= range.low ? 'low' : 'high'
}

/**
 * Передвинуть ручку на значение. Ручки не пересекаются: между ними остаётся не меньше `gap`
 * шагов шкалы (gap = 1 — не меньше двух нот, LIM-4).
 */
export function moveThumb(
  range: Range,
  thumb: Thumb,
  value: number,
  min: number,
  max: number,
  gap = 1,
): Range {
  if (thumb === 'low') {
    return { low: Math.min(Math.max(value, min), range.high - gap), high: range.high }
  }
  return { low: range.low, high: Math.max(Math.min(value, max), range.low + gap) }
}

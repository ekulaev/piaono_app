// Выбор типов заданий на сессию (C-SOL-1, OB-2): трудные чаще, подряд один тип не повторяется.

import { weightedPick } from '../stats/weights'

/** n типов: каждый следующий — взвешенный выбор из всех, кроме только что выбранного. */
export function pickTypes<T>(
  n: number,
  types: readonly T[],
  weight: (type: T) => number,
  random: () => number,
): T[] {
  const picked: T[] = []
  for (let i = 0; i < n; i++) {
    const previous = picked[i - 1]
    const options = types.length > 1 ? types.filter((type) => type !== previous) : types
    picked.push(weightedPick(options, weight, random))
  }
  return picked
}

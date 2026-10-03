// Прозрачность карточек по порядку нажатия и время перехода (C-STF-8, OB-18…OB-20).
// Чистые функции: ступени задаются порядком, а не временем, поэтому при быстрой игре видно
// больше ступеней сразу, при медленной — меньше: вид сам идёт за темпом.

import type { EchoSlots } from './slots'

/** Непрозрачность по порядку от последней: 100, 85, 75, 70, 65 % [→ LIM-7]. Не ниже 65 %: ниже контраст < 4,5:1. */
const ORDER_OPACITY = [1, 0.85, 0.75, 0.7, 0.65] as const

/** Время перехода: меньшее из 150 мс и 20 % времени показа [→ LIM-8]. */
export function fadeMs(displayMs: number): number {
  return Math.min(150, displayMs * 0.2)
}

/**
 * Порядок видимых (не уходящих) карточек: 1 — самая свежая, дальше по убыванию свежести.
 * Свежесть — по номеру нажатия, а не по положению в слотах.
 */
export function cardOrders(slots: EchoSlots): Map<number, number> {
  const ids = slots
    .filter((slot) => slot !== null && !slot.leaving)
    .map((slot) => slot!.id)
    .sort((a, b) => b - a)
  return new Map(ids.map((id, index) => [id, index + 1]))
}

/** Непрозрачность карточки по порядку (1 — последняя). */
export function opacityForOrder(order: number): number {
  return ORDER_OPACITY[Math.min(order, ORDER_OPACITY.length) - 1]
}

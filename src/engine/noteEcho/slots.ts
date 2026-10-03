// Карточки нажатых нот по слотам (C-STF-8, OB-6…OB-10). Чистые функции: состояние — массив
// из пяти ячеек. Карточки не «подтягиваются» друг к другу при исчезновении, чтобы ничего
// не прыгало (CLAUDE.md §6); единственный сдвиг — шестое нажатие.

import type { NoteDescription } from './describeNote'

/** Сколько карточек помещается одновременно [→ LIM-1]. */
export const SLOT_COUNT = 5

export interface EchoCard {
  /** Уникальный номер нажатия: по нему карточка находит свой таймер и ключ в React. */
  id: number
  note: NoteDescription
  /** Длительность перехода непрозрачности этой карточки, мс: считается при нажатии (OB-20). */
  fadeMs: number
  /** Карточка затухает перед удалением: она уже не «видимая» для порядка (OB-19). */
  leaving?: boolean
}

export type EchoSlots = readonly (EchoCard | null)[]

export const EMPTY_SLOTS: EchoSlots = Array.from({ length: SLOT_COUNT }, () => null)

/**
 * Новая карточка встаёт справа от самой правой видимой; при пустой полосе — в первый слот.
 * Если правая уже в последнем слоте, все сдвигаются на один слот влево (старейшая уходит).
 */
export function addCard(slots: EchoSlots, card: EchoCard): EchoSlots {
  const rightmost = slots.findLastIndex((slot) => slot !== null)
  if (rightmost < SLOT_COUNT - 1) {
    const next = [...slots]
    next[rightmost + 1] = card
    return next
  }
  return [...slots.slice(1), card]
}

/** Убрать карточку по номеру нажатия; остальные остаются на местах. Если её нет — тот же массив. */
export function removeCard(slots: EchoSlots, id: number): EchoSlots {
  if (!slots.some((slot) => slot?.id === id)) return slots
  return slots.map((slot) => (slot?.id === id ? null : slot))
}

/** Пометить карточку уходящей; остальные не трогаем. Если её нет — тот же массив. */
export function markLeaving(slots: EchoSlots, id: number): EchoSlots {
  if (!slots.some((slot) => slot?.id === id && !slot.leaving)) return slots
  return slots.map((slot) => (slot?.id === id ? { ...slot, leaving: true } : slot))
}

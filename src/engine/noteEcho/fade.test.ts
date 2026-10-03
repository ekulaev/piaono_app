import { describe, expect, it } from 'vitest'
import { cardOrders, fadeMs, opacityForOrder } from './fade'
import { describeNote } from './describeNote'
import { addCard, EMPTY_SLOTS, markLeaving, removeCard, type EchoSlots } from './slots'

const card = (id: number) => ({ id, note: describeNote(60 + id), fadeMs: 150 })
const addAll = (...ids: number[]): EchoSlots =>
  ids.reduce<EchoSlots>((slots, id) => addCard(slots, card(id)), EMPTY_SLOTS)

describe('opacityForOrder', () => {
  it('ступени 100, 85, 75, 70, 65 %', () => {
    expect([1, 2, 3, 4, 5].map(opacityForOrder)).toEqual([1, 0.85, 0.75, 0.7, 0.65])
  })

  it('глубже пятого порядка не темнее 65 %', () => {
    expect(opacityForOrder(9)).toBe(0.65)
  })
})

describe('cardOrders', () => {
  it('последняя — первая по порядку, дальше по убыванию свежести', () => {
    const orders = cardOrders(addAll(1, 2, 3))
    expect([orders.get(3), orders.get(2), orders.get(1)]).toEqual([1, 2, 3])
  })

  it('порядок идёт по номеру нажатия, а не по слоту: после сдвига', () => {
    const orders = cardOrders(addAll(1, 2, 3, 4, 5, 6))
    expect(orders.get(6)).toBe(1)
    expect(orders.get(2)).toBe(5)
    expect(orders.has(1)).toBe(false)
  })

  it('уходящая карточка не считается: остальные светлеют', () => {
    const orders = cardOrders(markLeaving(addAll(1, 2, 3), 1))
    expect(orders.has(1)).toBe(false)
    expect([orders.get(3), orders.get(2)]).toEqual([1, 2])
  })

  it('после ухода двух старейших из пяти остаются порядки 1–3', () => {
    let slots = addAll(1, 2, 3, 4, 5)
    slots = removeCard(removeCard(slots, 1), 2)
    expect([...cardOrders(slots).values()].sort()).toEqual([1, 2, 3])
  })

  it('одна карточка после паузы — полностью непрозрачная', () => {
    expect(opacityForOrder(cardOrders(addAll(7)).get(7)!)).toBe(1)
  })
})

describe('markLeaving', () => {
  it('помечает только свою карточку и не трогает исходный массив', () => {
    const before = addAll(1, 2)
    const after = markLeaving(before, 1)
    expect(after[0]?.leaving).toBe(true)
    expect(after[1]?.leaving).toBeUndefined()
    expect(before[0]?.leaving).toBeUndefined()
  })

  it('нет такой или уже уходит — тот же массив', () => {
    const slots = markLeaving(addAll(1), 1)
    expect(markLeaving(slots, 1)).toBe(slots)
    expect(markLeaving(slots, 9)).toBe(slots)
  })
})

describe('fadeMs', () => {
  it('меньшее из 150 мс и 20 % времени показа', () => {
    expect(fadeMs(1000)).toBe(150)
    expect(fadeMs(500)).toBe(100)
    expect(fadeMs(5000)).toBe(150)
    expect(fadeMs(700)).toBeCloseTo(140)
  })
})

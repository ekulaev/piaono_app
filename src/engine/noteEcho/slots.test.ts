import { describe, expect, it } from 'vitest'
import { describeNote } from './describeNote'
import {
  addCard,
  EMPTY_SLOTS,
  removeCard,
  SLOT_COUNT,
  type EchoCard,
  type EchoSlots,
} from './slots'

const card = (id: number): EchoCard => ({ id, note: describeNote(60 + id), fadeMs: 150 })
const ids = (slots: EchoSlots) => slots.map((slot) => slot?.id ?? null)

function addAll(...nums: number[]): EchoSlots {
  return nums.reduce<EchoSlots>((slots, n) => addCard(slots, card(n)), EMPTY_SLOTS)
}

describe('addCard', () => {
  it('на пустой полосе карточка встаёт в первый слот', () => {
    expect(ids(addAll(1))).toEqual([1, null, null, null, null])
  })

  it('аккорд: слева направо в порядке получения', () => {
    expect(ids(addAll(1, 2, 3))).toEqual([1, 2, 3, null, null])
  })

  it('шестое нажатие: старейшая уходит, остальные сдвигаются влево, новая — в последний слот', () => {
    const slots = addAll(1, 2, 3, 4, 5, 6)
    expect(ids(slots)).toEqual([2, 3, 4, 5, 6])
    expect(slots).toHaveLength(SLOT_COUNT)
  })

  it('после исчезновения первой карточки новая встаёт правее второй, вторая не двигается', () => {
    const slots = addCard(removeCard(addAll(1, 2), 1), card(3))
    expect(ids(slots)).toEqual([null, 2, 3, null, null])
  })

  it('когда все исчезли, следующая карточка снова в первом слоте', () => {
    const empty = removeCard(removeCard(addAll(1, 2), 1), 2)
    expect(ids(addCard(empty, card(3)))).toEqual([3, null, null, null, null])
  })

  it('правая в последнем слоте при дырках слева: всё сдвигается на один слот', () => {
    const slots = addCard(removeCard(addAll(1, 2, 3, 4, 5), 1), card(6))
    expect(ids(slots)).toEqual([2, 3, 4, 5, 6])
  })

  it('не меняет старый массив', () => {
    const before = addAll(1)
    addCard(before, card(2))
    expect(ids(before)).toEqual([1, null, null, null, null])
  })
})

describe('removeCard', () => {
  it('убирает только свою карточку', () => {
    expect(ids(removeCard(addAll(1, 2, 3), 2))).toEqual([1, null, 3, null, null])
  })

  it('нет такой карточки — тот же массив', () => {
    const slots = addAll(1)
    expect(removeCard(slots, 9)).toBe(slots)
  })
})

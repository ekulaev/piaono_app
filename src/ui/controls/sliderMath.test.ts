import { describe, expect, it } from 'vitest'
import { fractionOf, moveThumb, nearestThumb, valueAt } from './sliderMath'

describe('Ползунок: значение и положение', () => {
  it('доля положения значения', () => {
    expect(fractionOf(1, 1, 10)).toBe(0)
    expect(fractionOf(10, 1, 10)).toBe(1)
    expect(fractionOf(5.5, 1, 10)).toBe(0.5)
    expect(fractionOf(99, 1, 10)).toBe(1)
  })

  it('значение по доле: целыми шагами, в границах шкалы', () => {
    expect(valueAt(0, 1, 10)).toBe(1)
    expect(valueAt(1, 1, 10)).toBe(10)
    expect(valueAt(0.5, 1, 10)).toBe(6)
    expect(valueAt(-3, 1, 10)).toBe(1)
    expect(valueAt(7, 1, 10)).toBe(10)
    // Ручка не встаёт между значениями.
    for (let f = 0; f <= 1; f += 0.013) expect(Number.isInteger(valueAt(f, 1, 10))).toBe(true)
  })

  it('шаг больше единицы', () => {
    expect(valueAt(0.5, 0, 10, 5)).toBe(5)
    expect(valueAt(0.2, 0, 10, 5)).toBe(0)
  })
})

describe('Ползунок с двумя ручками', () => {
  const range = { low: 10, high: 20 }

  it('касание шкалы тянет ближайшую ручку', () => {
    expect(nearestThumb(11, range)).toBe('low')
    expect(nearestThumb(19, range)).toBe('high')
    expect(nearestThumb(3, range)).toBe('low')
    expect(nearestThumb(30, range)).toBe('high')
  })

  it('ручки сошлись: левее — нижняя, правее — верхняя', () => {
    const together = { low: 15, high: 16 }
    expect(nearestThumb(14, together)).toBe('low')
    expect(nearestThumb(17, together)).toBe('high')
  })

  it('верхняя ручка не опускается ниже нижней: остаётся не меньше двух нот', () => {
    expect(moveThumb(range, 'high', 5, 0, 22)).toEqual({ low: 10, high: 11 })
    expect(moveThumb(range, 'low', 25, 0, 22)).toEqual({ low: 19, high: 20 })
  })

  it('границы шкалы', () => {
    expect(moveThumb(range, 'low', -4, 0, 22)).toEqual({ low: 0, high: 20 })
    expect(moveThumb(range, 'high', 40, 0, 22)).toEqual({ low: 10, high: 22 })
  })

  it('обычное движение', () => {
    expect(moveThumb(range, 'low', 12, 0, 22)).toEqual({ low: 12, high: 20 })
    expect(moveThumb(range, 'high', 18, 0, 22)).toEqual({ low: 10, high: 18 })
  })
})

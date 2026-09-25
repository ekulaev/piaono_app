import { describe, expect, it } from 'vitest'
import { levelFromPressure, levelFromVelocity } from './levels'

describe('Вид нажатия и сила: уровни', () => {
  it('Три уровня силы: 20, 64, 120 → 1, 2, 3', () => {
    expect(levelFromVelocity(20)).toBe(1)
    expect(levelFromVelocity(64)).toBe(2)
    expect(levelFromVelocity(120)).toBe(3)
  })

  it('границы velocity 42/43 и 84/85', () => {
    expect(levelFromVelocity(1)).toBe(1)
    expect(levelFromVelocity(42)).toBe(1)
    expect(levelFromVelocity(43)).toBe(2)
    expect(levelFromVelocity(84)).toBe(2)
    expect(levelFromVelocity(85)).toBe(3)
    expect(levelFromVelocity(127)).toBe(3)
  })

  it('Экран без датчика давления: 0 и 0.5 → уровень 2', () => {
    expect(levelFromPressure(0)).toBe(2)
    expect(levelFromPressure(0.5)).toBe(2)
  })

  it('границы давления ⅓ и ⅔', () => {
    expect(levelFromPressure(0.1)).toBe(1)
    expect(levelFromPressure(1 / 3)).toBe(1)
    expect(levelFromPressure(0.34)).toBe(2)
    expect(levelFromPressure(2 / 3)).toBe(2)
    expect(levelFromPressure(0.67)).toBe(3)
    expect(levelFromPressure(1)).toBe(3)
  })
})

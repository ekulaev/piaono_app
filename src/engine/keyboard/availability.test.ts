import { describe, expect, it } from 'vitest'
import { canPlay, keyboardShown } from './availability'

describe('keyboardShown', () => {
  it.each([
    // compact, keyboardVisible, ожидаем
    [false, true, true],
    [false, false, false],
    [true, true, false],
    [true, false, false],
  ])('компактный=%s, «показывать»=%s → %s', (compact, visible, expected) => {
    expect(keyboardShown(compact, visible)).toBe(expected)
  })
})

describe('canPlay', () => {
  it.each([
    // клавиатура показана, пианино на связи, ожидаем
    [true, true, true],
    [true, false, true],
    [false, true, true],
    [false, false, false],
  ])('клавиатура=%s, пианино=%s → %s', (shown, piano, expected) => {
    expect(canPlay(shown, piano)).toBe(expected)
  })
})

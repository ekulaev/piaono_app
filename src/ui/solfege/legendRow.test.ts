import { describe, expect, it } from 'vitest'
import { INTERVAL_KEYMAP } from '../../engine/solfege/intervals/keymap'
import { DURATION_LEGEND } from './durationsView'
import { legendRowItems } from './legendRow'

describe('legendRowItems (C-APP-5, OB-17)', () => {
  it('«Интервалы»: пара на каждую ступень таблицы, по порядку от «до»', () => {
    const labels = Object.fromEntries(Object.keys(INTERVAL_KEYMAP).map((pc) => [pc, `i${pc}`]))
    const items = legendRowItems(labels)
    expect(items.map((item) => item.pitchClass)).toEqual(
      Object.keys(INTERVAL_KEYMAP)
        .map(Number)
        .sort((a, b) => a - b),
    )
    expect(items[0]).toMatchObject({ pitchClass: 0, name: 'Do', label: 'i0' })
  })

  it('чёрные клавиши — с диезом, октав в имени нет', () => {
    const items = legendRowItems({ 1: 'м2', 6: 'тр' })
    expect(items.map((item) => item.name)).toEqual(['Do♯', 'Fa♯'])
  })

  it('«Длительности»: значки сохраняются', () => {
    const items = legendRowItems(DURATION_LEGEND)
    expect(items.map((item) => item.name)).toEqual(['Do', 'Re', 'Mi', 'Fa', 'Sol'])
    expect(typeof items[0].label).toBe('object')
  })
})

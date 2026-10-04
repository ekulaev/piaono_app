import { describe, expect, it } from 'vitest'
import { DEFAULT_INTERVALS_SETTINGS, readIntervalsSettings } from './settings'

describe('Настройки «Интервалов» (C-SOL-2, «Настройки»)', () => {
  it('по умолчанию: «Оба», 10 заданий, автопереход выключен', () => {
    expect(DEFAULT_INTERVALS_SETTINGS).toEqual({ variant: 'both', tasks: 10, autoAdvance: false })
    expect(readIntervalsSettings(undefined)).toEqual(DEFAULT_INTERVALS_SETTINGS)
  })

  it('сохранённое читается; повреждённое поле — по умолчанию только оно', () => {
    expect(readIntervalsSettings({ variant: 'name', tasks: 4, autoAdvance: true })).toEqual({
      variant: 'name',
      tasks: 4,
      autoAdvance: true,
    })
    expect(readIntervalsSettings({ variant: 'sing', tasks: 30, autoAdvance: true })).toEqual({
      variant: 'both',
      tasks: 10,
      autoAdvance: true,
    })
  })
})

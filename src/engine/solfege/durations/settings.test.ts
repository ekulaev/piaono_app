import { describe, expect, it } from 'vitest'
import { DEFAULT_DURATIONS_SETTINGS, readDurationsSettings } from './settings'

describe('Настройки «Длительностей» (C-SOL-3, «Настройки»)', () => {
  it('по умолчанию: ноты и паузы, 10 заданий, без автоперехода', () => {
    expect(readDurationsSettings(undefined)).toEqual({
      kinds: 'both',
      tasks: 10,
      autoAdvance: false,
    })
  })

  it('сохранённое читается, мусор — значение по умолчанию только для своего поля', () => {
    expect(readDurationsSettings({ kinds: 'rests', tasks: 3, autoAdvance: true })).toEqual({
      kinds: 'rests',
      tasks: 3,
      autoAdvance: true,
    })
    expect(readDurationsSettings({ kinds: 'dots', tasks: 30, autoAdvance: 'yes' })).toEqual(
      DEFAULT_DURATIONS_SETTINGS,
    )
    expect(readDurationsSettings({ kinds: 'notes' }).kinds).toBe('notes')
  })
})

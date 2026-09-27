import { describe, expect, it } from 'vitest'
import { DEFAULT_RHYTHM_SETTINGS, readRhythmSettings } from './settings'

describe('Настройки «Ритма» (C-STF-6, OB-2)', () => {
  it('Настройки по умолчанию: уровень 1, 4/4, 1 такт, 10 рисунков', () => {
    expect(readRhythmSettings(undefined)).toEqual({ level: 1, meter: 4, bars: 1, patterns: 10 })
  })

  it('сохранённые значения читаются, неверные поля — по умолчанию', () => {
    expect(readRhythmSettings({ level: 3, meter: 3, bars: 2, patterns: 4 })).toEqual({
      level: 3,
      meter: 3,
      bars: 2,
      patterns: 4,
    })
    expect(readRhythmSettings({ level: 5, meter: 2, bars: 3, patterns: 11 })).toEqual(
      DEFAULT_RHYTHM_SETTINGS,
    )
    expect(readRhythmSettings('мусор')).toEqual(DEFAULT_RHYTHM_SETTINGS)
  })
})

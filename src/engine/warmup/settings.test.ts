import { describe, expect, it } from 'vitest'
import {
  DEFAULT_WARMUP_SETTINGS,
  BASS_LIMITS,
  TREBLE_LIMITS,
  rangeExceedsCapacity,
  rangeNoteCount,
  readWarmupSettings,
} from './settings'
import { naturalPitch, stepName, stepOf } from './steps'

describe('Ступени', () => {
  it('имена и высоты: E3, C4, A0, C8', () => {
    expect(stepName(stepOf('E', 3))).toBe('E3')
    expect(naturalPitch(stepOf('C', 4))).toBe(60)
    expect(naturalPitch(stepOf('A', 0))).toBe(21)
    expect(naturalPitch(stepOf('C', 8))).toBe(108)
  })
})

describe('Допустимые диапазоны', () => {
  it('скрипичный E3–F6 и басовый G1–A4 — по 23 ступени', () => {
    expect(rangeNoteCount(TREBLE_LIMITS)).toBe(23)
    expect(rangeNoteCount(BASS_LIMITS)).toBe(23)
    expect(stepName(TREBLE_LIMITS.low)).toBe('E3')
    expect(stepName(TREBLE_LIMITS.high)).toBe('F6')
    expect(stepName(BASS_LIMITS.low)).toBe('G1')
    expect(stepName(BASS_LIMITS.high)).toBe('A4')
  })

  it('по умолчанию: G3–D6 и B1–F4, оба ключа, 5 с, До мажор, всё выключено', () => {
    const d = DEFAULT_WARMUP_SETTINGS
    expect([stepName(d.trebleRange.low), stepName(d.trebleRange.high)]).toEqual(['G3', 'D6'])
    expect([stepName(d.bassRange.low), stepName(d.bassRange.high)]).toEqual(['B1', 'F4'])
    expect(d).toMatchObject({
      travelSeconds: 5,
      clef: 'both',
      tonality: 'C-major',
      naturals: false,
      autoShift: false,
    })
  })
})

describe('Чтение настроек с устройства', () => {
  it('нет данных — значения по умолчанию', () => {
    expect(readWarmupSettings(undefined)).toEqual(DEFAULT_WARMUP_SETTINGS)
    expect(readWarmupSettings(null)).toEqual(DEFAULT_WARMUP_SETTINGS)
    expect(readWarmupSettings('мусор')).toEqual(DEFAULT_WARMUP_SETTINGS)
    expect(readWarmupSettings({})).toEqual(DEFAULT_WARMUP_SETTINGS)
  })

  it('верные значения читаются', () => {
    const saved = {
      travelSeconds: 8,
      clef: 'bass',
      trebleRange: { low: stepOf('E', 3), high: stepOf('F', 6) },
      bassRange: { low: stepOf('C', 2), high: stepOf('C', 4) },
      tonality: 'Bb-major',
      naturals: true,
      autoShift: true,
    }
    expect(readWarmupSettings(saved)).toEqual(saved)
  })

  it('битое или вне границ значение заменяется только для себя', () => {
    const saved = {
      travelSeconds: 8,
      clef: 'bass',
      bassRange: { low: stepOf('A', 0), high: stepOf('C', 4) },
      tonality: 'Z-major',
      naturals: 'да',
      autoShift: true,
    }
    const read = readWarmupSettings(saved)
    expect(read.travelSeconds).toBe(8)
    expect(read.clef).toBe('bass')
    expect(read.autoShift).toBe(true)
    expect(read.bassRange).toEqual(DEFAULT_WARMUP_SETTINGS.bassRange)
    expect(read.tonality).toBe('C-major')
    expect(read.naturals).toBe(false)
  })

  it('время вне 1–10 или нецелое — по умолчанию', () => {
    for (const bad of [0, 11, 2.5, '5', null]) {
      expect(readWarmupSettings({ travelSeconds: bad }).travelSeconds).toBe(5)
    }
    expect(readWarmupSettings({ travelSeconds: 1 }).travelSeconds).toBe(1)
    expect(readWarmupSettings({ travelSeconds: 10 }).travelSeconds).toBe(10)
  })

  it('диапазон из одной ноты или перевёрнутый — по умолчанию', () => {
    const one = { low: stepOf('G', 3), high: stepOf('G', 3) }
    expect(readWarmupSettings({ trebleRange: one }).trebleRange).toEqual(
      DEFAULT_WARMUP_SETTINGS.trebleRange,
    )
    const flipped = { low: stepOf('D', 6), high: stepOf('G', 3) }
    expect(readWarmupSettings({ trebleRange: flipped }).trebleRange).toEqual(
      DEFAULT_WARMUP_SETTINGS.trebleRange,
    )
    const two = { low: stepOf('G', 3), high: stepOf('A', 3) }
    expect(readWarmupSettings({ trebleRange: two }).trebleRange).toEqual(two)
  })
})

describe('Предупреждение о диапазоне', () => {
  const range = { low: 0, high: 22 } // 23 ноты

  it('диапазон шире вместимости — предупреждение, не шире — нет', () => {
    expect(rangeExceedsCapacity(range, 20)).toBe(true)
    expect(rangeExceedsCapacity(range, 23)).toBe(false)
    expect(rangeExceedsCapacity(range, 30)).toBe(false)
  })

  it('клавиатуры нет — предупреждать не о чем', () => {
    expect(rangeExceedsCapacity(range, null)).toBe(false)
  })
})

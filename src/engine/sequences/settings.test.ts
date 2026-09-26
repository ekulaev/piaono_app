import { describe, expect, it } from 'vitest'
import { DEFAULT_SEQUENCE_SETTINGS, readSequenceSettings } from './settings'

describe('Настройки режима', () => {
  it('Настройки по умолчанию: Скрипичный, Позиция, До терции, 10, 1, подсказки, без автоперехода', () => {
    expect(readSequenceSettings(undefined)).toEqual({
      clef: 'treble',
      range: 'position',
      intervals: 'third',
      sequences: 10,
      notesPerStep: 1,
      hints: true,
      autoAdvance: false,
    })
  })

  it('корректные сохранённые настройки читаются как есть', () => {
    const saved = {
      clef: 'both',
      range: 'staff',
      intervals: 'octave',
      sequences: 3,
      notesPerStep: 2,
      hints: false,
      autoAdvance: true,
    }
    expect(readSequenceSettings(saved)).toEqual(saved)
  })

  it('Старые сохранённые настройки: без «Интервалов» и «Подсказок» — значения по умолчанию', () => {
    const old = { clef: 'bass', range: 'octave', sequences: 5, notesPerStep: 1, autoAdvance: true }
    expect(readSequenceSettings(old)).toEqual({ ...old, intervals: 'third', hints: true })
  })

  it('битые поля и выход за границы счётчиков — значения по умолчанию', () => {
    expect(
      readSequenceSettings({
        clef: 'alto',
        range: 7,
        sequences: 11,
        notesPerStep: 0,
        intervals: 'nona',
        hints: 1,
        autoAdvance: 'да',
      }),
    ).toEqual(DEFAULT_SEQUENCE_SETTINGS)
    expect(readSequenceSettings({ sequences: 2.5 }).sequences).toBe(10)
  })
})

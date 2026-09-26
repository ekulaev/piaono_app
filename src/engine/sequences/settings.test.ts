import { describe, expect, it } from 'vitest'
import { DEFAULT_SEQUENCE_SETTINGS, readSequenceSettings } from './settings'

describe('Настройки режима', () => {
  it('Настройки по умолчанию: Скрипичный, Позиция, 10, 1, флажок выключен', () => {
    expect(readSequenceSettings(undefined)).toEqual({
      clef: 'treble',
      range: 'position',
      sequences: 10,
      notesPerStep: 1,
      autoAdvance: false,
    })
  })

  it('корректные сохранённые настройки читаются как есть', () => {
    const saved = { clef: 'both', range: 'staff', sequences: 3, notesPerStep: 2, autoAdvance: true }
    expect(readSequenceSettings(saved)).toEqual(saved)
  })

  it('битые поля и выход за границы счётчиков — значения по умолчанию', () => {
    expect(
      readSequenceSettings({
        clef: 'alto',
        range: 7,
        sequences: 11,
        notesPerStep: 0,
        autoAdvance: 'да',
      }),
    ).toEqual(DEFAULT_SEQUENCE_SETTINGS)
    expect(readSequenceSettings({ sequences: 2.5 }).sequences).toBe(10)
  })
})

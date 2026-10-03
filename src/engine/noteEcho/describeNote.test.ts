import { describe, expect, it } from 'vitest'
import { describeNote } from './describeNote'

describe('describeNote', () => {
  it('середина клавиатуры: C4 = Do первой октавы', () => {
    expect(describeNote(60)).toEqual({ solfege: 'Do', letter: 'C', sharp: false, octave: 4 })
  })

  it('чёрная клавиша — диез', () => {
    expect(describeNote(54)).toEqual({ solfege: 'Fa', letter: 'F', sharp: true, octave: 3 })
  })

  it('края 88 клавиш: A0 и C8', () => {
    expect(describeNote(21)).toMatchObject({ solfege: 'La', octave: 0 })
    expect(describeNote(108)).toMatchObject({ solfege: 'Do', octave: 8 })
  })

  it('все двенадцать полутонов: белые без диеза, чёрные с диезом', () => {
    const sharps = Array.from({ length: 12 }, (_, i) => describeNote(60 + i).sharp)
    expect(sharps).toEqual([
      false,
      true,
      false,
      true,
      false,
      false,
      true,
      false,
      true,
      false,
      true,
      false,
    ])
  })

  it('ноты вне 88 клавиш не падают', () => {
    expect(describeNote(12)).toMatchObject({ letter: 'C', octave: 0 })
    expect(describeNote(11)).toMatchObject({ letter: 'B', solfege: 'Si', octave: -1 })
    expect(describeNote(127)).toMatchObject({ letter: 'G', octave: 9 })
  })
})

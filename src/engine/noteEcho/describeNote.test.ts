import { describe, expect, it } from 'vitest'
import { WHITE_PITCHES } from '../keyboard/layout'
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

describe('Подписи белых клавиш (C-KBD-3)', () => {
  const labels = WHITE_PITCHES.map((pitch) => {
    const note = describeNote(pitch)
    return { name: note.solfege, text: `${note.letter}${note.octave}`, sharp: note.sharp }
  })

  it('52 белые клавиши без диезов: от La/A0 до Do/C8', () => {
    expect(labels).toHaveLength(52)
    expect(labels.some((label) => label.sharp)).toBe(false)
    expect(labels[0]).toMatchObject({ name: 'La', text: 'A0' })
    expect(labels[51]).toMatchObject({ name: 'Do', text: 'C8' })
  })

  it('октава от C4: Do…Si с буквами C…B', () => {
    const c4 = WHITE_PITCHES.indexOf(60)
    expect(labels.slice(c4, c4 + 7).map((label) => `${label.name}/${label.text}`)).toEqual([
      'Do/C4',
      'Re/D4',
      'Mi/E4',
      'Fa/F4',
      'Sol/G4',
      'La/A4',
      'Si/B4',
    ])
  })
})

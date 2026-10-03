import { describe, expect, it } from 'vitest'
import { noteLabel } from './noteLabel'

describe('Название ноты по тональности', () => {
  it('F♯4 в Соль мажоре — диез от F', () => {
    expect(noteLabel(66, 'G-major')).toEqual({ letter: 'F', alteration: 1, octave: 4 })
  })

  it('G♭4 в Ре♭ мажоре — бемоль от G', () => {
    expect(noteLabel(66, 'Db-major')).toEqual({ letter: 'G', alteration: -1, octave: 4 })
  })

  it('нота вне тональности называется диезом', () => {
    expect(noteLabel(66, 'C-major')).toEqual({ letter: 'F', alteration: 1, octave: 4 })
    expect(noteLabel(61, 'F-major')).toEqual({ letter: 'C', alteration: 1, octave: 4 })
  })

  it('белая клавиша без знака в тональности без знака', () => {
    expect(noteLabel(64, 'C-major')).toEqual({ letter: 'E', alteration: 0, octave: 4 })
  })

  it('B♭ в Фа мажоре — бемоль от B', () => {
    expect(noteLabel(70, 'F-major')).toEqual({ letter: 'B', alteration: -1, octave: 4 })
  })

  it('C♭ мажор: звучащая B3 (59) называется C♭ в октаве 4', () => {
    expect(noteLabel(59, 'Cb-major')).toEqual({ letter: 'C', alteration: -1, octave: 4 })
  })

  it('E♯: в До♯ мажоре высота 65 называется E♯4', () => {
    expect(noteLabel(65, 'Cs-major')).toEqual({ letter: 'E', alteration: 1, octave: 4 })
  })
})

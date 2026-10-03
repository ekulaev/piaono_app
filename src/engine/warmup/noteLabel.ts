// Название ноты «Разминки» со знаком (C-STF-9, Р-19): по знакам выбранной тональности, а если
// нота ей не принадлежит — диезом. Слов здесь нет: «Do», «C♯» собирает интерфейс.

import { naturalPitch, stepLetter, stepOctave, stepOf, LETTERS, type Letter } from './steps'
import { alterationOf, tonalityById } from './keys'

export interface NoteLabel {
  letter: Letter
  /** +1 диез, −1 бемоль, 0 без знака. */
  alteration: -1 | 0 | 1
  /** Научная октава буквы: у C♭4 она 4, хотя звучит как B3. */
  octave: number
}

/** Ступень белой клавиши и знак → название; чёрные клавиши — диезом от нижней белой. */
export function noteLabel(pitch: number, tonalityId: string): NoteLabel {
  const tonality = tonalityById(tonalityId)
  const octave = Math.floor(pitch / 12) - 1
  // Перебираем соседние октавы: C♭ и B♯ пишутся в соседней октаве относительно звучания.
  for (const shift of [0, 1, -1]) {
    for (const letter of LETTERS) {
      const step = stepOf(letter, octave + shift)
      const alteration = alterationOf(tonality, letter)
      if (naturalPitch(step) + alteration === pitch && (alteration !== 0 || shift === 0)) {
        return { letter, alteration, octave: stepOctave(step) }
      }
    }
  }
  // Не принадлежит тональности: белая клавиша — без знака, чёрная — диез от нижней белой.
  for (const letter of LETTERS) {
    const step = stepOf(letter, octave)
    if (naturalPitch(step) === pitch) return { letter, alteration: 0, octave }
    if (naturalPitch(step) + 1 === pitch) return { letter: stepLetter(step), alteration: 1, octave }
  }
  return { letter: 'C', alteration: 0, octave }
}

// Ступень — позиция ноты на нотном стане без учёта знаков: «E3» — это одна ступень, а F♯ и F
// стоят на одной и той же. Диапазон «Разминки» задаётся ступенями: один шаг ползунка — одна ступень.

export type Letter = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B'

export const LETTERS: readonly Letter[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B']

/** Полутонов от C до буквы внутри октавы. */
const SEMITONES: Record<Letter, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

/** Ступень буквы в октаве: C0 = 0, D0 = 1, … C4 = 28 (октавы научные, C4 — середина клавиатуры). */
export function stepOf(letter: Letter, octave: number): number {
  return octave * 7 + LETTERS.indexOf(letter)
}

export function stepLetter(step: number): Letter {
  return LETTERS[step % 7]
}

export function stepOctave(step: number): number {
  return Math.floor(step / 7)
}

/** Высота (MIDI-номер) ступени без знака: белая клавиша. */
export function naturalPitch(step: number): number {
  return SEMITONES[stepLetter(step)] + 12 * (stepOctave(step) + 1)
}

/** Подпись ступени для ползунка: «E3». Знак тональности в ней не участвует. */
export function stepName(step: number): string {
  return `${stepLetter(step)}${stepOctave(step)}`
}

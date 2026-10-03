// Что показать о сыгранной ноте: только идентификаторы и числа. Слова («Do», «первая октава»)
// подставляет ui/ — engine/ языка не знает (CLAUDE.md §4).

export type Letter = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B'
export type Solfege = 'Do' | 'Re' | 'Mi' | 'Fa' | 'Sol' | 'La' | 'Si'

export interface NoteDescription {
  solfege: Solfege
  letter: Letter
  /** Чёрная клавиша: пишется диезом, бемолей нет (C-STF-8, OB-3). */
  sharp: boolean
  /** Октава в научной нотации: C4 = 60 (середина клавиатуры). Для нот вне 88 клавиш — любое целое. */
  octave: number
}

// Полутоны внутри октавы: буква и признак диеза.
const BY_SEMITONE: readonly { letter: Letter; solfege: Solfege; sharp: boolean }[] = [
  { letter: 'C', solfege: 'Do', sharp: false },
  { letter: 'C', solfege: 'Do', sharp: true },
  { letter: 'D', solfege: 'Re', sharp: false },
  { letter: 'D', solfege: 'Re', sharp: true },
  { letter: 'E', solfege: 'Mi', sharp: false },
  { letter: 'F', solfege: 'Fa', sharp: false },
  { letter: 'F', solfege: 'Fa', sharp: true },
  { letter: 'G', solfege: 'Sol', sharp: false },
  { letter: 'G', solfege: 'Sol', sharp: true },
  { letter: 'A', solfege: 'La', sharp: false },
  { letter: 'A', solfege: 'La', sharp: true },
  { letter: 'B', solfege: 'Si', sharp: false },
]

/** MIDI-номер ноты (0–127) → из чего собрать имя карточки. */
export function describeNote(pitch: number): NoteDescription {
  const entry = BY_SEMITONE[((pitch % 12) + 12) % 12]
  return { ...entry, octave: Math.floor(pitch / 12) - 1 }
}

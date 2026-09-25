const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

/** MIDI-номер ноты (0–127) → имя вида "C4". Октава считается от C4 = 60. */
export function pitchToNoteName(pitch: number): string {
  const name = NOTE_NAMES[pitch % 12]
  const octave = Math.floor(pitch / 12) - 1
  return `${name}${octave}`
}

import type { MidiNoteEvent } from './types'

const NOTE_OFF = 0x80
const NOTE_ON = 0x90

/**
 * Разбирает сырое MIDI-сообщение в понятное событие ноты.
 * velocity 0 у note-on — это тоже note-off (стандартное поведение MIDI-клавиатур).
 * Канал не важен: пианино может слать ноты на любом из 16.
 * Всё остальное — педаль (control change), pitch bend, sysex, служебные байты, обрезанные
 * сообщения — возвращает null: приложение не должно падать на неожиданном.
 */
export function parseMidiMessage(data: Uint8Array, time: number): MidiNoteEvent | null {
  if (data.length !== 3) return null
  const [status, pitch, velocity] = data
  // Статусный байт всегда ≥ 0x80, байты данных — меньше 0x80.
  if (status < 0x80 || pitch > 0x7f || velocity > 0x7f) return null

  const command = status & 0xf0
  if (command === NOTE_ON && velocity > 0) return { type: 'noteOn', pitch, velocity, time }
  if (command === NOTE_OFF || command === NOTE_ON) return { type: 'noteOff', pitch, time }
  return null
}

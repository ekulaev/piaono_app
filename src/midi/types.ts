// Публичный контракт слоя midi/. UI и будущий engine/ работают только с этими типами,
// никогда — с сырым Web MIDI API напрямую (см. CLAUDE.md, раздел 4).

/** Все состояния MIDI-соединения, которые нужно явно показывать пользователю. */
export type ConnectionState =
  | 'unavailable' // браузер не поддерживает Web MIDI (или нет разрешения)
  | 'connecting' // запросили доступ, ждём ответ браузера
  | 'no-device' // доступ есть, но ни одно устройство не подключено
  | 'connected' // хотя бы одно устройство подключено и активно

export interface MidiDeviceInfo {
  id: string
  name: string
}

export interface NoteOnEvent {
  type: 'noteOn'
  pitch: number
  velocity: number
  time: number
}

export interface NoteOffEvent {
  type: 'noteOff'
  pitch: number
  time: number
}

export type MidiNoteEvent = NoteOnEvent | NoteOffEvent

export interface MidiMonitorCallbacks {
  onConnectionChange: (state: ConnectionState, devices: MidiDeviceInfo[]) => void
  onNoteEvent: (event: MidiNoteEvent) => void
}

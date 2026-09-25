// Публичный контракт слоя midi/. UI и будущий engine/ работают только с этими типами,
// никогда — с сырым Web MIDI API напрямую (см. CLAUDE.md, раздел 4).

/** Все состояния MIDI-соединения, которые нужно явно показывать пользователю. */
export type ConnectionState =
  | 'unsupported' // в браузере вообще нет Web MIDI (не Chrome) — поможет только другой браузер
  | 'permission-denied' // Web MIDI есть, но браузер отказал в доступе — можно разрешить и повторить
  | 'connecting' // запросили доступ, ждём ответ браузера
  | 'no-device' // доступ есть, но ни одно устройство ещё не подключали в этой сессии
  | 'connected' // хотя бы одно устройство подключено и активно
  | 'lost' // устройство было на связи и пропало (кабель, сон планшета) — ждём его возвращения

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

/** Управление запущенным монитором. */
export interface MidiMonitor {
  /** Отписаться от всего: входов, statechange, смены видимости страницы. */
  stop: () => void
  /** Заново запросить доступ к MIDI без перезагрузки (после того как его разрешили). */
  retry: () => void
}

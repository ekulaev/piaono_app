import type {
  ConnectionState,
  MidiDeviceInfo,
  MidiMonitor,
  MidiMonitorCallbacks,
  MidiNoteEvent,
} from './types'

const NOTE_ON = 0x90
const NOTE_OFF = 0x80

/**
 * Входы, которые сейчас реально на связи. Chrome может оставлять отключённый порт
 * в access.inputs со state 'disconnected' — такой порт считать подключённым нельзя,
 * иначе «связь потеряна» никогда не наступит.
 */
function connectedInputs(access: MIDIAccess): MIDIInput[] {
  const inputs: MIDIInput[] = []
  access.inputs.forEach((input) => {
    if (input.state !== 'disconnected') inputs.push(input)
  })
  return inputs
}

function toDeviceInfo(input: MIDIInput): MidiDeviceInfo {
  return { id: input.id, name: input.name ?? 'MIDI-устройство' }
}

/**
 * Разбирает сырое MIDI-сообщение в понятное событие ноты.
 * velocity 0 у note-on — это тоже note-off (стандартное поведение MIDI-клавиатур).
 * Всё, что не note-on/note-off (control change, pitch bend, sustain и т.д.), молча
 * игнорируется — монитор не должен падать на неожиданных сообщениях.
 */
function buildNoteEvent(data: Uint8Array, time: number): MidiNoteEvent | null {
  if (data.length < 2) return null

  const command = data[0] & 0xf0
  const pitch = data[1]
  const velocity = data.length > 2 ? data[2] : 0

  if (command === NOTE_ON && velocity > 0) {
    return { type: 'noteOn' as const, pitch, velocity, time }
  }
  if (command === NOTE_OFF || (command === NOTE_ON && velocity === 0)) {
    return { type: 'noteOff' as const, pitch, time }
  }
  return null
}

/**
 * Запускает MIDI-монитор: запрашивает доступ, слушает подключённые входы и
 * переподписывается на них при любом statechange (в том числе после сна планшета —
 * основной сигнал для авто-реконнекта). Дополнительно пересматривает входы, когда
 * страница снова становится видимой: страховка на случай, если какая-то сборка
 * Android пропустит statechange после сна.
 */
export function startMidiMonitor(callbacks: MidiMonitorCallbacks): MidiMonitor {
  if (!navigator.requestMIDIAccess) {
    callbacks.onConnectionChange('unsupported', [])
    return { stop: () => {}, retry: () => {} }
  }

  let stopped = false
  let access: MIDIAccess | null = null
  // Номер последнего запроса доступа: ответ на устаревший запрос (после retry) игнорируем.
  let requestNumber = 0
  // Было ли пианино на связи в этой сессии. Отличает «потеряли» от «ещё не подключали».
  let hadDevice = false
  const attachedInputs = new Set<MIDIInput>()

  function detachAll() {
    attachedInputs.forEach((input) => {
      input.onmidimessage = null
    })
    attachedInputs.clear()
  }

  function attachInputs(inputs: MIDIInput[]) {
    detachAll()
    inputs.forEach((input) => {
      input.onmidimessage = (event) => {
        if (!event.data) return
        const parsed = buildNoteEvent(event.data, event.timeStamp)
        if (parsed) callbacks.onNoteEvent(parsed)
      }
      attachedInputs.add(input)
    })
  }

  /** Перечитать входы, переподписаться и сообщить актуальное состояние. */
  function sync(current: MIDIAccess) {
    const inputs = connectedInputs(current)
    attachInputs(inputs)
    if (inputs.length > 0) hadDevice = true

    let state: ConnectionState
    if (inputs.length > 0) state = 'connected'
    else if (hadDevice) state = 'lost'
    else state = 'no-device'
    callbacks.onConnectionChange(state, inputs.map(toDeviceInfo))
  }

  function requestAccess() {
    const thisRequest = ++requestNumber
    callbacks.onConnectionChange('connecting', [])

    navigator.requestMIDIAccess().then(
      (granted) => {
        if (stopped || thisRequest !== requestNumber) return
        if (access) access.onstatechange = null
        access = granted
        granted.onstatechange = () => {
          if (!stopped && access) sync(access)
        }
        sync(granted)
      },
      () => {
        // Отказ почти всегда означает «доступ запрещён». Прочие ошибки показываем так же:
        // действие для ученика одно — разрешить MIDI и попробовать снова.
        if (stopped || thisRequest !== requestNumber) return
        callbacks.onConnectionChange('permission-denied', [])
      },
    )
  }

  function handleVisibilityChange() {
    if (document.visibilityState === 'visible' && access && !stopped) sync(access)
  }

  document.addEventListener('visibilitychange', handleVisibilityChange)
  requestAccess()

  return {
    stop: () => {
      stopped = true
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (access) access.onstatechange = null
      detachAll()
    },
    retry: () => {
      if (!stopped) requestAccess()
    },
  }
}

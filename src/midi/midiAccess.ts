import { chooseActiveInput } from './inputChoice'
import { parseMidiMessage } from './messages'
import type {
  ConnectionState,
  MidiDeviceInfo,
  MidiMonitor,
  MidiMonitorCallbacks,
  MidiMonitorOptions,
} from './types'

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
 * Запускает MIDI-монитор: запрашивает доступ и слушает ровно один вход — активный
 * (см. chooseActiveInput). Пересматривает входы при любом statechange (в том числе после
 * сна планшета — основной сигнал для авто-реконнекта) и когда страница снова становится
 * видимой: страховка на случай, если какая-то сборка Android пропустит statechange.
 */
export function startMidiMonitor(
  callbacks: MidiMonitorCallbacks,
  options: MidiMonitorOptions = {},
): MidiMonitor {
  if (!navigator.requestMIDIAccess) {
    callbacks.onConnectionChange('unsupported', [], null)
    return { stop: () => {}, retry: () => {}, selectInput: () => {} }
  }

  let stopped = false
  let access: MIDIAccess | null = null
  // Номер последнего запроса доступа: ответ на устаревший запрос (после retry) игнорируем.
  let requestNumber = 0
  // Было ли пианино на связи в этой сессии. Отличает «потеряли» от «ещё не подключали».
  let hadDevice = false
  let preferred = options.preferred ?? null
  let activeInput: MIDIInput | null = null
  // Ноты, нажатые на активном входе и ещё не отпущенные.
  const held = new Set<number>()

  /** Передать событие наружу. Ошибка потребителя не должна обрывать приём следующих нот. */
  function emitNote(event: Parameters<MidiMonitorCallbacks['onNoteEvent']>[0]) {
    try {
      callbacks.onNoteEvent(event)
    } catch (error) {
      console.error('Ошибка в обработчике ноты', error)
    }
  }

  /**
   * Вход перестал быть активным (пропал, выбран другой, связь потеряна): его отпускания
   * уже не придут, поэтому отпускаем зажатые ноты сами — иначе клавиши «залипнут».
   */
  function releaseHeld() {
    const time = performance.now()
    held.forEach((pitch) => emitNote({ type: 'noteOff', pitch, time }))
    held.clear()
  }

  function detachActive() {
    if (activeInput) activeInput.onmidimessage = null
    activeInput = null
  }

  function attach(input: MIDIInput) {
    input.onmidimessage = (event) => {
      if (!event.data) return
      const note = parseMidiMessage(event.data, event.timeStamp)
      if (!note) return
      if (note.type === 'noteOn') held.add(note.pitch)
      else held.delete(note.pitch)
      emitNote(note)
    }
    // Явное открытие — на случай, когда после сна порт числится подключённым, но молчит.
    // Для уже открытого порта это пустая операция; отказ не мешает остальной работе.
    input.open?.().catch(() => {})
    activeInput = input
  }

  /** Перечитать входы, выбрать активный, переподписаться и сообщить состояние. */
  function sync(current: MIDIAccess) {
    const inputs = connectedInputs(current)
    const devices = inputs.map(toDeviceInfo)
    const nextId = chooseActiveInput(devices, preferred)
    const next = inputs.find((input) => input.id === nextId) ?? null

    if (next !== activeInput) releaseHeld()
    detachActive()
    if (next) attach(next)
    if (inputs.length > 0) hadDevice = true

    let state: ConnectionState
    if (inputs.length > 0) state = 'connected'
    else if (hadDevice) state = 'lost'
    else state = 'no-device'
    callbacks.onConnectionChange(state, devices, next?.id ?? null)
  }

  function requestAccess() {
    const thisRequest = ++requestNumber
    callbacks.onConnectionChange('connecting', [], null)

    navigator.requestMIDIAccess().then(
      (granted) => {
        if (stopped || thisRequest !== requestNumber) return
        if (access) access.onstatechange = null
        releaseHeld()
        detachActive()
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
        callbacks.onConnectionChange('permission-denied', [], null)
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
      releaseHeld()
      detachActive()
    },
    retry: () => {
      if (!stopped) requestAccess()
    },
    selectInput: (input) => {
      preferred = input
      if (!stopped && access) sync(access)
    },
  }
}

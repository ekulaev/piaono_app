import type { ConnectionState, MidiDeviceInfo, MidiMonitorCallbacks, MidiNoteEvent } from './types'

const NOTE_ON = 0x90
const NOTE_OFF = 0x80

function listDevices(access: MIDIAccess): MidiDeviceInfo[] {
  const devices: MidiDeviceInfo[] = []
  access.inputs.forEach((input) => {
    devices.push({ id: input.id, name: input.name ?? 'MIDI-устройство' })
  })
  return devices
}

function connectionStateFor(devices: MidiDeviceInfo[]): ConnectionState {
  return devices.length > 0 ? 'connected' : 'no-device'
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
 * это единственный сигнал, на который можно опереться для авто-реконнекта).
 * Возвращает функцию отписки.
 */
export function startMidiMonitor(callbacks: MidiMonitorCallbacks): () => void {
  if (!navigator.requestMIDIAccess) {
    callbacks.onConnectionChange('unavailable', [])
    return () => {}
  }

  let cancelled = false
  let access: MIDIAccess | null = null
  const attachedInputs = new Set<MIDIInput>()

  function detachAll() {
    attachedInputs.forEach((input) => {
      input.onmidimessage = null
    })
    attachedInputs.clear()
  }

  function attachInputs(current: MIDIAccess) {
    detachAll()
    current.inputs.forEach((input) => {
      input.onmidimessage = (event) => {
        if (!event.data) return
        const parsed = buildNoteEvent(event.data, event.timeStamp)
        if (parsed) callbacks.onNoteEvent(parsed)
      }
      attachedInputs.add(input)
    })
  }

  function reportState(current: MIDIAccess) {
    const devices = listDevices(current)
    callbacks.onConnectionChange(connectionStateFor(devices), devices)
  }

  callbacks.onConnectionChange('connecting', [])

  navigator.requestMIDIAccess().then(
    (granted) => {
      if (cancelled) return
      access = granted
      attachInputs(granted)
      reportState(granted)

      granted.onstatechange = () => {
        if (cancelled || !access) return
        attachInputs(access)
        reportState(access)
      }
    },
    () => {
      if (!cancelled) callbacks.onConnectionChange('unavailable', [])
    },
  )

  return () => {
    cancelled = true
    if (access) access.onstatechange = null
    detachAll()
  }
}

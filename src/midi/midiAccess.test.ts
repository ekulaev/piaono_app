import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { startMidiMonitor } from './midiAccess'
import type { ConnectionState, MidiMonitor, MidiNoteEvent, PreferredInput } from './types'

/** Подменённый вход: только то, чем пользуется midiAccess. */
interface FakeInput {
  id: string
  name: string
  state: 'connected' | 'disconnected'
  onmidimessage: ((event: { data: Uint8Array; timeStamp: number }) => void) | null
  open: () => Promise<unknown>
  close: () => Promise<unknown>
  opened: number
  closed: number
}

function fakeInput(id: string, name: string, openFails = false): FakeInput {
  const input: FakeInput = {
    id,
    name,
    state: 'connected',
    onmidimessage: null,
    opened: 0,
    closed: 0,
    close: () => {
      input.closed++
      return Promise.resolve(input)
    },
    open: () => {
      input.opened++
      return openFails ? Promise.reject(new Error('InvalidAccessError')) : Promise.resolve(input)
    },
  }
  return input
}

/** Подменённый Web MIDI: Map входов и ручные «подключить / выдернуть / сыграть». */
function fakeMidi() {
  const inputs = new Map<string, FakeInput>()
  const access = { inputs, outputs: new Map(), onstatechange: null as null | (() => void) }
  return {
    access,
    connect(input: FakeInput) {
      input.state = 'connected'
      inputs.set(input.id, input)
      access.onstatechange?.()
    },
    disconnect(input: FakeInput) {
      inputs.delete(input.id)
      access.onstatechange?.()
    },
    send(input: FakeInput, ...bytes: number[]) {
      input.onmidimessage?.({ data: new Uint8Array(bytes), timeStamp: 1 })
    },
  }
}

let midi: ReturnType<typeof fakeMidi>
let visibilityListener: (() => void) | null
let monitor: MidiMonitor | null
let notes: MidiNoteEvent[]
let last: { state: ConnectionState; devices: string[]; activeId: string | null }

beforeEach(() => {
  midi = fakeMidi()
  visibilityListener = null
  monitor = null
  notes = []
  vi.stubGlobal('navigator', { requestMIDIAccess: () => Promise.resolve(midi.access) })
  vi.stubGlobal('document', {
    visibilityState: 'visible',
    addEventListener: (_type: string, listener: () => void) => (visibilityListener = listener),
    removeEventListener: () => (visibilityListener = null),
  })
})

afterEach(() => {
  monitor?.stop()
  vi.unstubAllGlobals()
})

/** Запустить монитор и дождаться ответа на запрос доступа. */
async function start(preferred: PreferredInput | null = null) {
  monitor = startMidiMonitor(
    {
      onConnectionChange: (state, devices, activeId) => {
        last = { state, devices: devices.map((device) => device.name), activeId }
      },
      onNoteEvent: (event) => notes.push(event),
    },
    { preferred },
  )
  await Promise.resolve()
  await Promise.resolve()
  return monitor
}

/** Дождаться цепочки промисов (закрытие, запрос доступа). */
async function flush() {
  for (let i = 0; i < 5; i++) await Promise.resolve()
}

const pitches = (type: MidiNoteEvent['type']) =>
  notes.filter((note) => note.type === type).map((note) => note.pitch)

describe('Один активный вход', () => {
  it('Один вход: ноты принимаются без выбора', async () => {
    const piano = fakeInput('p1', 'Piano')
    midi.access.inputs.set('p1', piano)
    await start()
    expect(last).toEqual({ state: 'connected', devices: ['Piano'], activeId: 'p1' })
    midi.send(piano, 0x90, 60, 100)
    expect(pitches('noteOn')).toEqual([60])
  })

  it('Два входа без выбора: активен первый, нота со второго не приходит', async () => {
    const piano = fakeInput('p1', 'Piano')
    const synth = fakeInput('s1', 'Synth')
    midi.access.inputs.set('p1', piano)
    midi.access.inputs.set('s1', synth)
    await start()
    expect(last.activeId).toBe('p1')
    midi.send(synth, 0x90, 62, 100)
    midi.send(piano, 0x90, 60, 100)
    expect(pitches('noteOn')).toEqual([60])
  })

  it('Два входа с выбором: активен выбранный', async () => {
    midi.access.inputs.set('p1', fakeInput('p1', 'Piano'))
    midi.access.inputs.set('s1', fakeInput('s1', 'Synth'))
    await start({ id: 's1', name: 'Synth' })
    expect(last.activeId).toBe('s1')
  })
})

describe('Выбор запоминается и узнаёт вход после переподключения', () => {
  it('Новый идентификатор после переподключения: узнаём по имени', async () => {
    midi.access.inputs.set('p1', fakeInput('p1', 'Piano'))
    midi.access.inputs.set('s2', fakeInput('s2', 'Synth'))
    await start({ id: 's1', name: 'Synth' })
    expect(last.activeId).toBe('s2')
  })

  it('selectInput переключает активный вход', async () => {
    const piano = fakeInput('p1', 'Piano')
    const synth = fakeInput('s1', 'Synth')
    midi.access.inputs.set('p1', piano)
    midi.access.inputs.set('s1', synth)
    await start()
    monitor!.selectInput({ id: 's1', name: 'Synth' })
    expect(last.activeId).toBe('s1')
    midi.send(piano, 0x90, 60, 100)
    midi.send(synth, 0x90, 62, 100)
    expect(pitches('noteOn')).toEqual([62])
  })
})

describe('Пропажа активного входа при оставшихся других', () => {
  it('Выбранный вход выдернули — активен оставшийся; вернулся — снова выбранный', async () => {
    const piano = fakeInput('p1', 'Piano')
    const synth = fakeInput('s1', 'Synth')
    midi.access.inputs.set('p1', piano)
    midi.access.inputs.set('s1', synth)
    await start({ id: 's1', name: 'Synth' })

    midi.disconnect(synth)
    expect(last).toEqual({ state: 'connected', devices: ['Piano'], activeId: 'p1' })

    midi.connect(synth)
    expect(last.activeId).toBe('s1')
  })
})

describe('Зажатые ноты отпускаются при смене входа', () => {
  it('Кабель выдернули с зажатой клавишей: приходит отпускание, связь потеряна', async () => {
    const piano = fakeInput('p1', 'Piano')
    midi.access.inputs.set('p1', piano)
    await start()
    midi.send(piano, 0x90, 60, 100)
    midi.send(piano, 0x90, 64, 100)
    midi.send(piano, 0x80, 64, 0)
    midi.disconnect(piano)
    expect(pitches('noteOff')).toEqual([64, 60])
    expect(last.state).toBe('lost')
  })

  it('Смена входа с зажатой клавишей: отпускание E4', async () => {
    const piano = fakeInput('p1', 'Piano')
    midi.access.inputs.set('p1', piano)
    midi.access.inputs.set('s1', fakeInput('s1', 'Synth'))
    await start()
    midi.send(piano, 0x90, 64, 100)
    monitor!.selectInput({ id: 's1', name: 'Synth' })
    expect(pitches('noteOff')).toEqual([64])
  })

  it('пересмотр без смены входа не отпускает зажатые ноты', async () => {
    const piano = fakeInput('p1', 'Piano')
    midi.access.inputs.set('p1', piano)
    await start()
    midi.send(piano, 0x90, 60, 100)
    midi.access.onstatechange?.()
    expect(pitches('noteOff')).toEqual([])
    midi.send(piano, 0x80, 60, 0)
    expect(pitches('noteOff')).toEqual([60])
  })
})

describe('Восстановление связи после сна', () => {
  it('Сон и пробуждение: вход открывается заново, ноты идут', async () => {
    const piano = fakeInput('p1', 'Piano')
    midi.access.inputs.set('p1', piano)
    await start()
    const openedBefore = piano.opened
    visibilityListener?.()
    await flush()
    expect(piano.opened).toBe(openedBefore + 1)
    midi.send(piano, 0x90, 60, 100)
    expect(pitches('noteOn')).toEqual([60])
  })

  it('Перехват другим приложением: при возвращении вход закрывается и открывается заново', async () => {
    const piano = fakeInput('p1', 'Piano')
    midi.access.inputs.set('p1', piano)
    await start()
    midi.send(piano, 0x90, 60, 100)
    const openedBefore = piano.opened
    visibilityListener?.()
    visibilityListener?.() // второй сигнал возврата (фокус) не переоткрывает ещё раз
    await flush()
    expect(piano.closed).toBe(1)
    expect(piano.opened).toBe(openedBefore + 1)
    expect(pitches('noteOff')).toEqual([60])
    expect(last.state).toBe('connected')
    midi.send(piano, 0x90, 62, 100)
    expect(pitches('noteOn')).toEqual([60, 62])
  })

  it('«Переподключить пианино»: входы закрываются, доступ запрашивается заново', async () => {
    const piano = fakeInput('p1', 'Piano')
    midi.access.inputs.set('p1', piano)
    await start()
    monitor!.reconnect()
    expect(piano.closed).toBe(1)
    expect(last.state).toBe('connecting')
    await flush()
    expect(last.state).toBe('connected')
    midi.send(piano, 0x90, 60, 100)
    expect(pitches('noteOn')).toEqual([60])
  })

  it('Вход не открылся: модуль работает, состояние — по фактическому списку', async () => {
    const piano = fakeInput('p1', 'Piano', true)
    midi.access.inputs.set('p1', piano)
    await start()
    await Promise.resolve()
    expect(last.state).toBe('connected')
    midi.send(piano, 0x90, 60, 100)
    expect(pitches('noteOn')).toEqual([60])
  })

  it('отключённый порт, оставшийся в списке, не считается подключённым', async () => {
    const piano = fakeInput('p1', 'Piano')
    midi.access.inputs.set('p1', piano)
    await start()
    piano.state = 'disconnected'
    midi.access.onstatechange?.()
    expect(last.state).toBe('lost')
  })
})

describe('Неожиданные сообщения не ломают приём', () => {
  it('Ошибка в обработчике: следующее сообщение обрабатывается', async () => {
    const piano = fakeInput('p1', 'Piano')
    midi.access.inputs.set('p1', piano)
    let calls = 0
    vi.spyOn(console, 'error').mockImplementation(() => {})
    monitor = startMidiMonitor({
      onConnectionChange: () => {},
      onNoteEvent: () => {
        calls++
        if (calls === 1) throw new Error('сбой потребителя')
      },
    })
    await Promise.resolve()
    await Promise.resolve()
    midi.send(piano, 0x90, 60, 100)
    midi.send(piano, 0x90, 62, 100)
    expect(calls).toBe(2)
  })

  it('педаль и служебные байты не доходят наружу', async () => {
    const piano = fakeInput('p1', 'Piano')
    midi.access.inputs.set('p1', piano)
    await start()
    midi.send(piano, 0xb0, 0x40, 0x7f)
    midi.send(piano, 0xfe)
    midi.send(piano, 0x90)
    expect(notes).toEqual([])
  })
})

describe('Состояния связи', () => {
  it('нет пианино при запуске — no-device, затем подключили — connected', async () => {
    await start()
    expect(last.state).toBe('no-device')
    midi.connect(fakeInput('p1', 'Piano'))
    expect(last.state).toBe('connected')
  })

  it('отказ в доступе — permission-denied', async () => {
    vi.stubGlobal('navigator', { requestMIDIAccess: () => Promise.reject(new Error('denied')) })
    await start()
    expect(last.state).toBe('permission-denied')
  })

  it('нет Web MIDI — unsupported', async () => {
    vi.stubGlobal('navigator', {})
    await start()
    expect(last.state).toBe('unsupported')
  })
})

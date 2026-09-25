import { describe, expect, it } from 'vitest'
import { parseMidiMessage } from './messages'

const parse = (...bytes: number[]) => parseMidiMessage(new Uint8Array(bytes), 5)

describe('События нажатия и отпускания', () => {
  it('Нажатие и отпускание: 90 3C 64, затем 80 3C 00', () => {
    expect(parse(0x90, 0x3c, 0x64)).toEqual({ type: 'noteOn', pitch: 60, velocity: 100, time: 5 })
    expect(parse(0x80, 0x3c, 0x00)).toEqual({ type: 'noteOff', pitch: 60, time: 5 })
  })

  it('Отпускание через velocity 0: 90 3C 00', () => {
    expect(parse(0x90, 0x3c, 0x00)).toEqual({ type: 'noteOff', pitch: 60, time: 5 })
  })

  it('Другой канал: 99 24 50 — нажатие ноты 36', () => {
    expect(parse(0x99, 0x24, 0x50)).toEqual({ type: 'noteOn', pitch: 36, velocity: 80, time: 5 })
  })
})

describe('Неожиданные сообщения не ломают приём', () => {
  it('Педаль и служебные сообщения: B0 40 7F, FE, F8, sysex', () => {
    expect(parse(0xb0, 0x40, 0x7f)).toBeNull()
    expect(parse(0xfe)).toBeNull()
    expect(parse(0xf8)).toBeNull()
    expect(parse(0xf0, 0x7e, 0x7f, 0xf7)).toBeNull()
  })

  it('pitch bend, aftertouch, program change', () => {
    expect(parse(0xe0, 0x00, 0x40)).toBeNull()
    expect(parse(0xa0, 0x3c, 0x10)).toBeNull()
    expect(parse(0xc0, 0x05)).toBeNull()
  })

  it('Обрезанное сообщение: один байт 90', () => {
    expect(parse(0x90)).toBeNull()
    expect(parse(0x90, 0x3c)).toBeNull()
  })

  it('битые байты данных', () => {
    expect(parse(0x3c, 0x3c, 0x40)).toBeNull()
    expect(parse(0x90, 0x80, 0x40)).toBeNull()
  })
})

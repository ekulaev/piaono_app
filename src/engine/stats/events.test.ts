import { describe, expect, it } from 'vitest'
import type { Sequence } from '../sequences/generate'
import { sequenceEvents, warmupEvent } from './events'

const E4 = 64
const G4 = 67
const seq = (...steps: number[][]): Sequence => ({
  clef: 'treble',
  low: 60,
  high: 67,
  anchor: steps.every((s) => s.length === 1) ? 60 : null,
  steps,
})
const clean = (ms: number, hinted = false) =>
  ({ result: 'correct', hadError: false, reactionMs: ms, hinted }) as const
const skipped = { result: 'skipped', hadError: false, reactionMs: null, hinted: false } as const

describe('События «Последовательностей»', () => {
  it('Шаг с подсказкой: точность учитывается, времени нет; интервала от якоря нет', () => {
    const events = sequenceEvents(seq([E4], [G4]), [clean(900, true), clean(800, true)])
    expect(events).toEqual([
      { kind: 'note', key: 'treble:64', outcome: 'clean', ms: null },
      { kind: 'note', key: 'treble:67', outcome: 'clean', ms: null },
      { kind: 'interval', key: 'up3', outcome: 'clean', ms: null },
    ])
  })

  it('Пропуск: у ноты и у интервалов к ней и от неё', () => {
    const events = sequenceEvents(seq([E4], [G4], [E4]), [clean(900), skipped, clean(700)])
    expect(events.filter((e) => e.outcome === 'skip')).toEqual([
      { kind: 'note', key: 'treble:67', outcome: 'skip', ms: null },
      { kind: 'interval', key: 'up3', outcome: 'skip', ms: null },
    ])
    // Интервал ↓3 относится к третьему шагу — сыгранному верно.
    expect(events).toContainEqual({ kind: 'interval', key: 'down3', outcome: 'clean', ms: 700 })
  })

  it('ошибка: без времени; аккорд — событие каждой ноте, интервалов нет', () => {
    const withError = {
      result: 'correct',
      hadError: true,
      reactionMs: 3000,
      hinted: false,
    } as const
    expect(sequenceEvents(seq([E4]), [withError])).toEqual([
      { kind: 'note', key: 'treble:64', outcome: 'error', ms: null },
    ])
    const chord = sequenceEvents(seq([60, 64], [62, 65]), [clean(1200), clean(1300)])
    expect(chord.map((e) => e.key)).toEqual(['treble:60', 'treble:64', 'treble:62', 'treble:65'])
    expect(chord[1].ms).toBe(1200)
  })
})

describe('События «Разминки»', () => {
  it('Не успел после ошибки — пропуск, без времени', () => {
    expect(warmupEvent({ pitch: E4, clef: 'treble', outcome: 'missed', ms: null })).toEqual({
      kind: 'note',
      key: 'treble:64',
      outcome: 'skip',
      ms: null,
    })
  })

  it('верно сразу — со временем, после ошибки — без', () => {
    expect(warmupEvent({ pitch: 48, clef: 'bass', outcome: 'clean', ms: 1500 }).ms).toBe(1500)
    expect(warmupEvent({ pitch: 48, clef: 'bass', outcome: 'error', ms: 1500 })).toEqual({
      kind: 'note',
      key: 'bass:48',
      outcome: 'error',
      ms: null,
    })
  })
})

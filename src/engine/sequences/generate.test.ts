import { describe, expect, it } from 'vitest'
import { isBlackKey } from '../keyboard/layout'
import type { Clef } from '../staff/pickNote'
import { anchorsIn, intervalBetween, MAX_INTERVAL, widestFitting } from './anchors'
import { buildSequence, buildSession, RANGES } from './generate'
import {
  DEFAULT_SEQUENCE_SETTINGS,
  type IntervalChoice,
  type RangeChoice,
  type SequenceSettings,
} from './settings'

function seeded(seed: number) {
  let value = seed
  return () => {
    value = (value * 1103515245 + 12345) % 2147483648
    return value / 2147483648
  }
}

const settings = (change: Partial<SequenceSettings>): SequenceSettings => ({
  ...DEFAULT_SEQUENCE_SETTINGS,
  ...change,
})

describe('Построение последовательности', () => {
  it('Аккорды в шаге: 3 разные белые ноты в диапазоне, длина 3–8', () => {
    const random = seeded(1)
    const lengths = new Set<number>()
    for (let i = 0; i < 1000; i++) {
      const sequence = buildSequence(settings({ range: 'staff', notesPerStep: 3 }), random)
      const { low, high } = RANGES.staff[sequence.clef]
      lengths.add(sequence.steps.length)
      for (const step of sequence.steps) {
        expect(new Set(step).size).toBe(3)
        for (const pitch of step) {
          expect(isBlackKey(pitch)).toBe(false)
          expect(pitch).toBeGreaterThanOrEqual(low)
          expect(pitch).toBeLessThanOrEqual(high)
        }
      }
    }
    expect([...lengths].sort()).toEqual([3, 4, 5, 6, 7, 8])
  })

  it('Оба ключа: встречаются оба, внутри последовательности ключ один', () => {
    const random = seeded(2)
    const clefs = new Set(
      Array.from({ length: 100 }, () => buildSequence(settings({ clef: 'both' }), random).clef),
    )
    expect(clefs).toEqual(new Set(['treble', 'bass']))
  })

  it('выбранный ключ — во всех последовательностях сессии', () => {
    const session = buildSession(settings({ clef: 'bass', sequences: 5 }), seeded(3))
    expect(session).toHaveLength(5)
    expect(session.every((sequence) => sequence.clef === 'bass')).toBe(true)
    expect(session[0].low).toBe(48)
  })

  it('одиночные ноты по умолчанию: C4–G4', () => {
    const sequence = buildSequence(DEFAULT_SEQUENCE_SETTINGS, seeded(4))
    for (const step of sequence.steps) {
      expect(step).toHaveLength(1)
      expect(step[0]).toBeGreaterThanOrEqual(60)
      expect(step[0]).toBeLessThanOrEqual(67)
    }
  })

  it('у аккордов нет опорной ноты', () => {
    expect(buildSequence(settings({ notesPerStep: 2 }), seeded(5)).anchor).toBeNull()
  })
})

describe('Ход интервалами (шаги из одной ноты)', () => {
  const ranges: RangeChoice[] = ['position', 'octave', 'staff']
  const choices: IntervalChoice[] = ['third', 'fifth', 'octave']
  const clefs: Clef[] = ['treble', 'bass']

  for (const clef of clefs)
    for (const range of ranges)
      for (const intervals of choices) {
        it(`${clef}, ${range}, ${intervals}: интервалы из набора, все помещающиеся встречаются`, () => {
          const random = seeded(clefs.indexOf(clef) * 100 + ranges.indexOf(range) * 10 + 7)
          const { low, high } = RANGES[range][clef]
          const seen = new Set<number>()
          const anchorsSeen = new Set<number>()
          for (let i = 0; i < 1000; i++) {
            const sequence = buildSequence(settings({ clef, range, intervals }), random)
            expect(anchorsIn(clef, low, high)).toContain(sequence.anchor)
            anchorsSeen.add(sequence.anchor!)
            let previous = sequence.anchor!
            for (const step of sequence.steps) {
              expect(step).toHaveLength(1)
              const pitch = step[0]
              expect(isBlackKey(pitch)).toBe(false)
              expect(pitch).toBeGreaterThanOrEqual(low)
              expect(pitch).toBeLessThanOrEqual(high)
              const { size } = intervalBetween(previous, pitch)
              expect(size).toBeGreaterThanOrEqual(2)
              expect(size).toBeLessThanOrEqual(MAX_INTERVAL[intervals])
              seen.add(size)
              previous = pitch
            }
          }
          const widest = widestFitting(low, high, intervals)
          expect([...seen].sort((a, b) => a - b)).toEqual(
            Array.from({ length: widest - 1 }, (_, i) => i + 2),
          )
          expect(anchorsSeen).toEqual(new Set(anchorsIn(clef, low, high)))
        })
      }
})

import { describe, expect, it } from 'vitest'
import { isBlackKey } from '../keyboard/layout'
import { buildSequence, buildSession, RANGES } from './generate'
import { DEFAULT_SEQUENCE_SETTINGS, type SequenceSettings } from './settings'

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
})

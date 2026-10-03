import { describe, expect, it } from 'vitest'
import { MODES } from '../../engine/modes/modes'
import { DEFAULT_LOCALE, findLocale } from '../../i18n'
import type { ConnectionState } from '../../midi/types'
import { connectionHintId, HINTS, modeHintId, type HintBlock } from './hints'

const STATES: ConnectionState[] = [
  'unsupported',
  'permission-denied',
  'unavailable',
  'connecting',
  'no-device',
  'connected',
  'lost',
]

describe('Подсказки (C-APP-2)', () => {
  it('у каждого состояния связи и каждого режима есть подсказка', () => {
    for (const state of STATES) expect(HINTS[connectionHintId(state)]).toBeDefined()
    for (const mode of MODES) expect(HINTS[modeHintId(mode.id)]).toBeDefined()
    expect(connectionHintId('connected')).toBe('connection.guide')
  })

  it('у каждой подсказки есть заголовок и хотя бы один блок', () => {
    for (const hint of Object.values(HINTS)) {
      expect(hint.title.length).toBeGreaterThan(0)
      expect(hint.blocks.length).toBeGreaterThan(0)
    }
  })

  it('все тексты подсказок есть и на русском, и на английском (C-APP-3, INV-3)', () => {
    const ru = findLocale('ru')!
    for (const hint of Object.values(HINTS)) {
      const keys: string[] = [hint.title]
      for (const block of hint.blocks as HintBlock[]) {
        if (block.kind === 'text') keys.push(block.text)
        if (block.kind === 'steps') keys.push(...block.steps)
        if (block.kind === 'image') keys.push(block.caption)
      }
      for (const key of keys) {
        expect((DEFAULT_LOCALE.messages as Record<string, unknown>)[key], `en:${key}`).toBeTruthy()
        expect((ru.messages as Record<string, unknown>)[key], `ru:${key}`).toBeTruthy()
      }
    }
  })
})

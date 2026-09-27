import { describe, expect, it } from 'vitest'
import { MODES } from '../../engine/modes/modes'
import type { ConnectionState } from '../../midi/types'
import { connectionHintId, HINTS, modeHintId } from './hints'

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
})

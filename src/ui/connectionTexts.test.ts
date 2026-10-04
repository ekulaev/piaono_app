import { describe, expect, it } from 'vitest'
import { inviteKey } from './connectionTexts'
import type { ConnectionState } from '../midi/types'

describe('inviteKey (C-APP-5)', () => {
  const states: ConnectionState[] = [
    'unsupported',
    'permission-denied',
    'unavailable',
    'connecting',
    'no-device',
    'connected',
    'lost',
  ]

  it('у каждого состояния, кроме «на связи», своя строка приглашения', () => {
    const keys = states.filter((s) => s !== 'connected').map((s) => inviteKey(s))
    expect(keys.every((key) => key !== null)).toBe(true)
    expect(new Set(keys).size).toBe(6)
  })

  it('когда пианино на связи, приглашения нет', () => {
    expect(inviteKey('connected')).toBeNull()
  })
})

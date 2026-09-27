import { describe, expect, it } from 'vitest'
import type { ConnectionState } from '../midi/types'
import { CONNECTION_HELP, STATUS_TITLE } from './connectionTexts'

describe('Строка «что делать» (C-APP-1, приложение Г)', () => {
  it('есть у проблемных состояний и нет у «подключаемся» и «на связи»', () => {
    const problems: ConnectionState[] = [
      'unsupported',
      'permission-denied',
      'unavailable',
      'no-device',
      'lost',
    ]
    for (const state of problems) expect(CONNECTION_HELP[state]).toBeTruthy()
    expect(CONNECTION_HELP.connecting).toBeNull()
    expect(CONNECTION_HELP.connected).toBeNull()
    expect(Object.keys(CONNECTION_HELP).sort()).toEqual(Object.keys(STATUS_TITLE).sort())
  })
})

import { describe, expect, it } from 'vitest'
import { taskEvent } from './events'
import type { Task } from './types'

const task: Task = {
  mode: 'intervals',
  type: 'play:up:M3',
  answer: { kind: 'note', pitches: [68] },
  range: { low: 64, high: 68 },
  content: null,
}

describe('Исход задания → статистика (C-SOL-1, OB-16)', () => {
  it('время только у «верно сразу»', () => {
    expect(taskEvent(task, { outcome: 'clean', ms: 1800, errors: 0 })).toEqual({
      kind: 'task',
      key: 'play:up:M3',
      outcome: 'clean',
      ms: 1800,
    })
    expect(taskEvent(task, { outcome: 'error', ms: 1800, errors: 2 }).ms).toBeNull()
    expect(taskEvent(task, { outcome: 'skip', ms: null, errors: 1 }).outcome).toBe('skip')
  })
})

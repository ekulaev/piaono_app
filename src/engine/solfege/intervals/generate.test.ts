import { describe, expect, it } from 'vitest'
import { buildIntervalTasks, buildTask, INTERVALS_RANGE, typesFor } from './generate'
import { isBlackKey } from '../../keyboard/layout'

function seeded(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
}

describe('Задания «Интервалов» (C-SOL-2, OB-1…OB-4)', () => {
  it('10 000 заданий: первая нота белая, обе ноты в C4–C6', () => {
    const random = seeded(3)
    const tasks = buildIntervalTasks(10000, 'both', () => 1, random)
    for (const { content } of tasks) {
      expect(isBlackKey(content.first)).toBe(false)
      for (const pitch of [content.first, content.second.pitch]) {
        expect(pitch).toBeGreaterThanOrEqual(INTERVALS_RANGE.low)
        expect(pitch).toBeLessThanOrEqual(INTERVALS_RANGE.high)
      }
    }
  })

  it('«Сыграй»: ответ — вторая нота с октавой; «Узнай»: ответ — интервал по таблице', () => {
    const random = seeded(5)
    const play = buildTask('play:up:M3', random)
    expect(play.answer).toEqual({ kind: 'note', pitches: [play.content.second.pitch] })
    expect(play.content.second.pitch - play.content.first).toBe(4)
    const name = buildTask('name:down:TT', random)
    expect(name.answer).toMatchObject({ kind: 'value', value: 'TT' })
    expect(name.range.high - name.range.low).toBe(12)
    expect(name.range.low % 12).toBe(0)
  })

  it('вариант в настройке сужает типы; «Оба» — все 48', () => {
    expect(typesFor('play')).toHaveLength(24)
    expect(typesFor('name').every((t) => t.startsWith('name:'))).toBe(true)
    expect(typesFor('both')).toHaveLength(48)
  })

  it('B5 вверх — только м2 (C6)', () => {
    const random = seeded(11)
    const tasks = buildIntervalTasks(3000, 'play', () => 1, random)
    for (const task of tasks.filter((t) => t.content.first === 83)) {
      expect(task.content.direction === 'down' || task.content.interval === 'm2').toBe(true)
    }
  })

  it('трудный тип выпадает чаще', () => {
    const random = seeded(13)
    const tasks = buildIntervalTasks(4800, 'both', (t) => (t === 'name:down:m6' ? 3 : 1), random)
    const hard = tasks.filter((t) => t.type === 'name:down:m6').length
    const easy = tasks.filter((t) => t.type === 'play:down:m6').length
    expect(hard / easy).toBeGreaterThan(2)
  })
})

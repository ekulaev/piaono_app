import { describe, expect, it } from 'vitest'
import { naturalPitch } from '../../warmup/steps'
import { isBlackKey } from '../../keyboard/layout'
import { pairOf, parseDurationTaskType, type DurationTaskType } from './durations'
import { DURATION_KEYMAP } from './keymap'
import { buildDurationTask, buildDurationTasks, pickDurationTypes, typesFor } from './generate'

function seeded(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
}

const count = (types: readonly string[], type: string) => types.filter((t) => t === type).length

describe('Задания «Длительностей» (C-SOL-3, OB-1…OB-5, OB-13)', () => {
  it('«Что тренировать»: «Паузы» — только паузы, «Ноты» — ноты и группы', () => {
    expect(typesFor('rests').every((t) => t.startsWith('rest:'))).toBe(true)
    expect(typesFor('rests')).toHaveLength(5)
    expect(typesFor('notes')).toHaveLength(7)
    expect(typesFor('notes').some((t) => t.startsWith('rest:'))).toBe(false)
    expect(typesFor('both')).toHaveLength(12)
  })

  it('10 000 заданий: ноты — белые C4–B5, группа — 2–4 разные ноты, у паузы нот нет', () => {
    const tasks = buildDurationTasks(10000, 'both', () => 1, seeded(3))
    for (const { content } of tasks) {
      const expected = content.kind === 'rest' ? [0, 0] : content.kind === 'note' ? [1, 1] : [2, 4]
      expect(content.steps.length).toBeGreaterThanOrEqual(expected[0])
      expect(content.steps.length).toBeLessThanOrEqual(expected[1])
      expect(new Set(content.steps).size).toBe(content.steps.length)
      for (const step of content.steps) {
        const pitch = naturalPitch(step)
        expect(isBlackKey(pitch)).toBe(false)
        expect(pitch).toBeGreaterThanOrEqual(60)
        expect(pitch).toBeLessThanOrEqual(83)
      }
      if (content.kind === 'group') expect(['8', '16']).toContain(content.duration)
    }
  })

  it('ответ — длительность по таблице, род знака не важен', () => {
    const random = seeded(5)
    for (const type of ['rest:8', 'note:8', 'group:8'] as const) {
      expect(buildDurationTask(type, random).answer).toEqual({
        kind: 'value',
        value: '8',
        table: DURATION_KEYMAP,
      })
    }
  })

  it('подряд один тип не повторяется', () => {
    const types = pickDurationTypes(5000, typesFor('both'), () => 1, seeded(7))
    for (let i = 1; i < types.length; i++) expect(types[i]).not.toBe(types[i - 1])
  })

  it('после знака из коварной пары следом его пара — примерно в половине случаев (LIM-5)', () => {
    const types = pickDurationTypes(20000, typesFor('rests'), () => 1, seeded(11))
    let afterPaired = 0
    let followed = 0
    for (let i = 1; i < types.length; i++) {
      const pair = pairOf(types[i - 1])
      if (!pair) continue
      afterPaired++
      if (types[i] === pair) followed++
    }
    // Половина — по правилу, плюс случайные попадания при обычном выборе.
    expect(followed / afterPaired).toBeGreaterThan(0.5)
    expect(followed / afterPaired).toBeLessThan(0.75)
  })

  it('без статистики типы пар выпадают заметно чаще остальных (LIM-3)', () => {
    const types = pickDurationTypes(20000, typesFor('rests'), () => 1, seeded(13))
    const quarter = count(types, 'rest:q')
    for (const type of ['rest:w', 'rest:h'] as DurationTaskType[]) {
      expect(count(types, type) / quarter).toBeGreaterThan(2)
    }
  })

  it('пара недоступна настройкой — правило не срабатывает', () => {
    // В «Нотах» пар целых и половинных пауз нет; пары нот и групп работают.
    const types = pickDurationTypes(2000, typesFor('notes'), () => 1, seeded(17))
    expect(types.every((t) => parseDurationTaskType(t).kind !== 'rest')).toBe(true)
  })
})

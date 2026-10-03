import { describe, expect, it } from 'vitest'
import {
  FLASH_MS,
  IDLE,
  PAUSE_MS,
  TRAVEL_MS,
  isWrong,
  played,
  progress,
  finish,
  start,
  stop,
  summarizeWarmup,
  tick,
  type ExerciseState,
} from './exercise'
import { UNIFORM } from '../stats/weights'
import { DEFAULT_WARMUP_SETTINGS } from '../warmup/settings'
import { stepOf } from '../warmup/steps'

// random = 0.5 даёт одну и ту же ноту; для тестов важна только её высота.
const random = () => 0.5
const T0 = 1000

function started(): ExerciseState & { phase: 'moving' } {
  const state = start(T0, random)
  if (state.phase !== 'moving') throw new Error('ожидалась движущаяся нота')
  return state
}

describe('Запуск и остановка упражнения', () => {
  it('Старт: нота появляется сразу и стоит у правого края', () => {
    const state = started()
    expect(state.appearedAt).toBe(T0)
    expect(progress(state, T0)).toBe(0)
  })

  it('Стоп во время паузы: новая нота не появляется', () => {
    const pause = tick(started(), T0 + TRAVEL_MS, random)
    expect(pause.phase).toBe('pause')
    const stopped = stop()
    expect(tick(stopped, T0 + TRAVEL_MS + 10_000, random)).toBe(IDLE)
  })
})

describe('Движение ноты', () => {
  it('Нота не сыграна: через 5 с исчезает, через 0,5 с появляется новая', () => {
    const state = started()
    expect(progress(state, T0 + TRAVEL_MS / 2)).toBe(0.5)
    expect(tick(state, T0 + TRAVEL_MS - 1, random).phase).toBe('moving')
    const pause = tick(state, T0 + TRAVEL_MS, random)
    expect(pause).toMatchObject({ phase: 'pause', until: T0 + TRAVEL_MS + PAUSE_MS })
    expect(tick(pause, T0 + TRAVEL_MS + PAUSE_MS - 1, random).phase).toBe('pause')
    const next = tick(pause, T0 + TRAVEL_MS + PAUSE_MS, random)
    expect(next.phase === 'moving' && next.appearedAt).toBe(T0 + TRAVEL_MS + PAUSE_MS)
  })

  it('редкие кадры: переходы по расписанию, а не по времени кадра', () => {
    // Вкладка «проспала» 5,7 с: нота должна была исчезнуть в T0+5000 и появиться в T0+5500.
    const next = tick(started(), T0 + TRAVEL_MS + PAUSE_MS + 200, random)
    expect(next.phase === 'moving' && next.appearedAt).toBe(T0 + TRAVEL_MS + PAUSE_MS)
  })
})

describe('Реакция ноты на нажатия', () => {
  it('Верная нота: сразу останавливается, 0,5 с верная, затем пауза', () => {
    const state = started()
    const correct = played(state, state.note.pitch, T0 + 1000)
    expect(correct).toMatchObject({ phase: 'correct', until: T0 + 1000 + FLASH_MS })
    expect(progress(correct, T0 + 1400)).toBeCloseTo(0.2)
    expect(tick(correct, T0 + 1000 + FLASH_MS, random)).toMatchObject({
      phase: 'pause',
      until: T0 + 1000 + FLASH_MS + PAUSE_MS,
    })
  })

  it('Та же нота в другой октаве: через 50 мс неверная на 0,5 с, движение продолжается', () => {
    const state = started()
    const pressed = played(state, state.note.pitch + 12, T0 + 1000)
    expect(isWrong(tick(pressed, T0 + 1049, random), T0 + 1049)).toBe(false)
    const wrong = tick(pressed, T0 + 1050, random)
    expect(isWrong(wrong, T0 + 1050)).toBe(true)
    expect(progress(wrong, T0 + 1050)).toBeCloseTo(0.21)
    expect(isWrong(tick(wrong, T0 + 1550, random), T0 + 1550)).toBe(false)
  })

  it('Аккорд с верной нотой: верная, без подсветки неверной', () => {
    const state = started()
    const pitch = state.note.pitch
    let current = played(state, pitch - 4, T0 + 1000)
    current = played(current, pitch, T0 + 1020)
    expect(current.phase).toBe('correct')
  })

  it('неверные клавиши в одной группе — одна подсветка', () => {
    const state = started()
    let current = played(state, state.note.pitch + 1, T0 + 1000)
    current = played(current, state.note.pitch + 2, T0 + 1030)
    current = tick(current, T0 + 1050, random)
    expect(current.phase === 'moving' && current.wrongUntil).toBe(T0 + 1050 + FLASH_MS)
  })

  it('Повторная ошибка продлевает подсветку', () => {
    const state = started()
    let current = tick(played(state, state.note.pitch + 2, T0 + 1000), T0 + 1050, random)
    current = played(current, state.note.pitch + 2, T0 + 1300)
    current = tick(current, T0 + 1350, random)
    expect(current.phase === 'moving' && current.wrongUntil).toBe(T0 + 1350 + FLASH_MS)
    expect(isWrong(current, T0 + 1800)).toBe(true)
  })

  it('верное нажатие во время подсветки неверной — верная', () => {
    const state = started()
    const wrong = tick(played(state, state.note.pitch + 2, T0 + 1000), T0 + 1050, random)
    expect(played(wrong, state.note.pitch, T0 + 1200).phase).toBe('correct')
  })

  it('группа закрывается даже без кадра между нажатиями', () => {
    const state = started()
    const first = played(state, state.note.pitch + 2, T0 + 1000)
    const second = played(first, state.note.pitch + 2, T0 + 1200)
    expect(second.phase === 'moving' && second.wrongUntil).toBe(T0 + 1050 + FLASH_MS)
    expect(second.phase === 'moving' && second.groupStartedAt).toBe(T0 + 1200)
  })

  it('Нажатие во время паузы: ничего не меняется, новая нота в срок', () => {
    const pause = tick(started(), T0 + TRAVEL_MS, random)
    expect(played(pause, 60, T0 + TRAVEL_MS + 100)).toBe(pause)
    expect(played(IDLE, 60, T0)).toBe(IDLE)
  })

  it('нажатие во время показа верной ноты ничего не меняет', () => {
    const state = started()
    const correct = played(state, state.note.pitch, T0 + 1000)
    expect(played(correct, state.note.pitch + 2, T0 + 1100)).toBe(correct)
  })
})

describe('Итог «Разминки» (C-STF-4)', () => {
  it('Итог Разминки: 2 верно сразу, 1 после ошибки, 1 «не успел»', () => {
    let state: ExerciseState = started()
    const next = (s: ExerciseState, at: number) => tick(s, at, random)
    const pitchOf = (s: ExerciseState) => (s.phase === 'moving' ? s.note.pitch : 0)
    // 1: верно сразу через 1 с
    state = played(state, pitchOf(state), T0 + 1000)
    let t = T0 + 1000 + FLASH_MS + PAUSE_MS
    state = next(state, t)
    // 2: верно сразу через 2 с
    state = played(state, pitchOf(state), t + 2000)
    t = t + 2000 + FLASH_MS + PAUSE_MS
    state = next(state, t)
    // 3: неверное нажатие, затем верное
    state = played(state, pitchOf(state) + 12, t + 100)
    state = next(state, t + 200)
    state = played(state, pitchOf(state), t + 1500)
    t = t + 1500 + FLASH_MS + PAUSE_MS
    state = next(state, t)
    // 4: неверное нажатие, нота доезжает — «не успел»
    state = played(state, pitchOf(state) + 12, t + 100)
    state = next(state, t + TRAVEL_MS)
    const summary = finish(state)
    if (summary.phase !== 'summary') throw new Error('ожидался итог')
    expect(summary.results.map((r) => r.outcome)).toEqual(['clean', 'clean', 'error', 'missed'])
    const result = summarizeWarmup(summary.results)
    expect(result).toMatchObject({ clean: 2, errors: 1, missed: 1, accuracy: 0.5 })
    // random = 0.5 — всё время одна нота: её среднее — (1000 + 2000) / 2.
    const { pitch, clef } = summary.results[0]
    expect(result.slowest).toEqual([{ pitch, clef, averageMs: 1500 }])
  })

  it('Стоп до первой законченной ноты: итога нет', () => {
    expect(finish(started())).toBe(IDLE)
  })

  it('Не успел после ошибки: время не записано', () => {
    let state: ExerciseState = started()
    const pitch = state.phase === 'moving' ? state.note.pitch : 0
    state = played(state, pitch + 12, T0 + 100)
    state = tick(state, T0 + TRAVEL_MS, random)
    expect(state.phase === 'pause' && state.results).toEqual([
      expect.objectContaining({ outcome: 'missed', ms: null }),
    ])
  })

  it('старт после итога — новая сессия с пустыми итогами; стоп из меню — без итога', () => {
    const correct = played(started(), started().note.pitch, T0 + 500)
    expect(finish(correct).phase).toBe('summary')
    const again = start(T0 + 9000, random)
    expect(again.phase === 'moving' && again.results).toEqual([])
    expect(stop()).toBe(IDLE)
    expect(tick(finish(correct), T0 + 60_000, random).phase).toBe('summary')
  })
})

describe('Настройки «Разминки» в упражнении (C-STF-9)', () => {
  const eight = { ...DEFAULT_WARMUP_SETTINGS, travelSeconds: 8 }

  it('Другое время: нота доходит до ключа за заданное время', () => {
    const state = start(T0, random, UNIFORM, eight)
    if (state.phase !== 'moving') throw new Error('ожидалась движущаяся нота')
    expect(progress(state, T0 + 4000)).toBe(0.5)
    expect(tick(state, T0 + TRAVEL_MS, random, UNIFORM).phase).toBe('moving')
    expect(tick(state, T0 + 7999, random, UNIFORM).phase).toBe('moving')
    expect(tick(state, T0 + 8000, random, UNIFORM)).toMatchObject({
      phase: 'pause',
      until: T0 + 8000 + PAUSE_MS,
    })
  })

  it('время сессии сохраняется на следующую ноту', () => {
    const state = start(T0, random, UNIFORM, { ...DEFAULT_WARMUP_SETTINGS, travelSeconds: 2 })
    const next = tick(state, T0 + 2000 + PAUSE_MS, random, UNIFORM)
    if (next.phase !== 'moving') throw new Error('ожидалась новая нота')
    expect(next.appearedAt).toBe(T0 + 2000 + PAUSE_MS)
    expect(progress(next, next.appearedAt + 1000)).toBe(0.5)
  })

  it('Нота со знаком проверяется по звучащей высоте: в Соль мажоре верна F♯, а не F', () => {
    const sol = {
      ...DEFAULT_WARMUP_SETTINGS,
      clef: 'treble' as const,
      tonality: 'G-major',
      trebleRange: { low: stepOf('F', 4), high: stepOf('G', 4) },
    }
    // random = 0 выбирает первую ноту набора — ступень F4, звучащую как F♯4 (66).
    const state = start(T0, () => 0, UNIFORM, sol)
    if (state.phase !== 'moving') throw new Error('ожидалась движущаяся нота')
    expect(state.note).toMatchObject({ pitch: 66, step: stepOf('F', 4), natural: false })
    const wrong = played(state, 65, T0 + 100)
    expect(wrong.phase).toBe('moving')
    const right = played(state, 66, T0 + 100)
    expect(right.phase).toBe('correct')
  })

  it('Нота с бекаром проверяется по белой клавише', () => {
    const sol = {
      ...DEFAULT_WARMUP_SETTINGS,
      clef: 'treble' as const,
      tonality: 'G-major',
      naturals: true,
      trebleRange: { low: stepOf('F', 4), high: stepOf('G', 4) },
    }
    // Вторая нота набора — F4 с бекаром (65): random 0.3 попадает во вторую из трёх нот.
    const state = start(T0, () => 0.4, UNIFORM, sol)
    if (state.phase !== 'moving') throw new Error('ожидалась движущаяся нота')
    expect(state.note).toMatchObject({ pitch: 65, natural: true })
    expect(played(state, 66, T0 + 100).phase).toBe('moving')
    expect(played(state, 65, T0 + 100).phase).toBe('correct')
  })
})

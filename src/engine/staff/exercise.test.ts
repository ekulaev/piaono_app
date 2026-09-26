import { describe, expect, it } from 'vitest'
import {
  FLASH_MS,
  IDLE,
  PAUSE_MS,
  TRAVEL_MS,
  isWrong,
  played,
  progress,
  start,
  stop,
  tick,
  type ExerciseState,
} from './exercise'

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
    expect(pause).toEqual({ phase: 'pause', until: T0 + TRAVEL_MS + PAUSE_MS })
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
    expect(tick(correct, T0 + 1000 + FLASH_MS, random)).toEqual({
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

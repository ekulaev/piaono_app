import { describe, expect, it } from 'vitest'
import { createKeyboardState, heldPitches, isPressed, levelOf, reduce } from './keyboardState'
import type { KeyboardState, KeyInput, PlayedNote } from './types'

const C4 = 60
const D4 = 62
const E4 = 64
const G4 = 67

/** Прогоняет цепочку событий и собирает все сыгранные ноты. */
function run(inputs: KeyInput[], start: KeyboardState = createKeyboardState()) {
  let state = start
  const played: PlayedNote[] = []
  for (const input of inputs) {
    const result = reduce(state, input)
    state = result.state
    if (result.playedNote) played.push(result.playedNote)
  }
  return { state, played }
}

const touchDown = (pointerId: number, pitch: number, pressure = 0.5): KeyInput => ({
  kind: 'touchDown',
  pointerId,
  pitch,
  pressure,
})
const touchMove = (pointerId: number, pitch: number | null): KeyInput => ({
  kind: 'touchMove',
  pointerId,
  pitch,
})
const touchUp = (pointerId: number): KeyInput => ({ kind: 'touchUp', pointerId })
const pianoDown = (pitch: number, velocity = 64): KeyInput => ({
  kind: 'pianoDown',
  pitch,
  velocity,
})
const pianoUp = (pitch: number): KeyInput => ({ kind: 'pianoUp', pitch })

describe('Нажатие и отпускание', () => {
  it('Касание клавиши: E4 нажата, пока палец на экране, и отпущена после', () => {
    const down = run([touchDown(1, E4)])
    expect(isPressed(down.state, E4)).toBe(true)
    const up = run([touchUp(1)], down.state)
    expect(isPressed(up.state, E4)).toBe(false)
  })

  it('Клавиша на пианино: G4 нажата, пока нажата на пианино, и отпущена после', () => {
    const down = run([pianoDown(G4)])
    expect(isPressed(down.state, G4)).toBe(true)
    expect(isPressed(run([pianoUp(G4)], down.state).state, G4)).toBe(false)
  })

  it('Аккорд пальцами: поднят палец с E4 — C4 и G4 остаются нажатыми', () => {
    const { state } = run([touchDown(1, C4), touchDown(2, E4), touchDown(3, G4), touchUp(2)])
    expect(isPressed(state, E4)).toBe(false)
    expect(isPressed(state, C4)).toBe(true)
    expect(isPressed(state, G4)).toBe(true)
  })

  it('нажатие одной клавиши не меняет остальные', () => {
    const { state } = run([pianoDown(C4)])
    expect(isPressed(state, D4)).toBe(false)
  })
})

describe('Касание — полноценная сыгранная нота', () => {
  it('Нота касанием: касание C4 даёт сыгранную ноту C4', () => {
    const { played } = run([touchDown(1, C4)])
    expect(played).toEqual([{ pitch: C4, level: 2, source: 'touch' }])
  })

  it('Повторное нажатие нажатой клавиши: C4 держится на пианино, касание C4 — ещё одна нота', () => {
    const { played } = run([pianoDown(C4), touchDown(1, C4)])
    expect(played.map((note) => note.pitch)).toEqual([C4, C4])
  })

  it('отпускание не даёт сыгранной ноты', () => {
    const { played } = run([pianoDown(C4), pianoUp(C4), touchDown(1, E4), touchUp(1)])
    expect(played).toHaveLength(2)
  })
})

describe('Пианино главнее касания', () => {
  it('Палец отпущен, пианино держит: D4 нажата с интенсивностью от пианино', () => {
    const { state } = run([pianoDown(D4, 120), touchDown(1, D4, 0.1), touchUp(1)])
    expect(isPressed(state, D4)).toBe(true)
    expect(levelOf(state, D4)).toBe(3)
  })

  it('Пианино отпущено, палец держит: D4 отпущена (пианино первым)', () => {
    const { state } = run([pianoDown(D4), touchDown(1, D4), pianoUp(D4)])
    expect(isPressed(state, D4)).toBe(false)
  })

  it('Пианино отпущено, палец держит: D4 отпущена (касание первым)', () => {
    const { state } = run([touchDown(1, D4), pianoDown(D4), pianoUp(D4)])
    expect(isPressed(state, D4)).toBe(false)
  })

  it('Отрыв пальца после отпускания на пианино: D4 остаётся отпущенной', () => {
    const { state } = run([pianoDown(D4), touchDown(1, D4), pianoUp(D4), touchUp(1)])
    expect(isPressed(state, D4)).toBe(false)
  })

  it('Пианино после касания: D4 нажата с интенсивностью от пианино', () => {
    const { state } = run([touchDown(1, D4, 0.1), pianoDown(D4, 64)])
    expect(levelOf(state, D4)).toBe(2)
  })
})

describe('Глиссандо', () => {
  it('Глиссандо выключено: C4 держится, D4 и E4 не нажимаются, после отрыва C4 отпущена', () => {
    const moved = run([touchDown(1, C4), touchMove(1, D4), touchMove(1, E4)])
    expect(isPressed(moved.state, C4)).toBe(true)
    expect(isPressed(moved.state, D4)).toBe(false)
    expect(isPressed(moved.state, E4)).toBe(false)
    expect(moved.played).toHaveLength(1)
    expect(isPressed(run([touchUp(1)], moved.state).state, C4)).toBe(false)
  })

  it('Глиссандо включено: C4, D4, E4 по очереди — три сыгранные ноты', () => {
    const start = createKeyboardState(true)
    const atD4 = run([touchDown(1, C4), touchMove(1, D4)], start)
    expect(isPressed(atD4.state, C4)).toBe(false)
    expect(isPressed(atD4.state, D4)).toBe(true)
    const atE4 = run([touchMove(1, E4)], atD4.state)
    expect(isPressed(atE4.state, D4)).toBe(false)
    expect(isPressed(atE4.state, E4)).toBe(true)
    expect([...atD4.played, ...atE4.played].map((note) => note.pitch)).toEqual([C4, D4, E4])
  })

  it('движение внутри той же клавиши ничего не меняет и не перерисовывает', () => {
    const { state } = run([touchDown(1, C4)], createKeyboardState(true))
    expect(reduce(state, touchMove(1, C4)).state).toBe(state)
  })

  it('палец ушёл за пределы клавиш — клавиша остаётся нажатой', () => {
    const { state } = run([touchDown(1, C4), touchMove(1, null)], createKeyboardState(true))
    expect(isPressed(state, C4)).toBe(true)
  })
})

describe('heldPitches', () => {
  it('включает ноты вне A0–C8 и не включает отменённые касания', () => {
    const { state } = run([pianoDown(10), touchDown(1, D4), pianoDown(D4), pianoUp(D4)])
    expect([...heldPitches(state)]).toEqual([10])
  })
})

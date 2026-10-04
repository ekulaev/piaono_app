import { describe, expect, it } from 'vitest'
import { emptyModeStats } from '../stats/stats'
import {
  COUNTDOWN_MS,
  countdownSeconds,
  next,
  press,
  repeat,
  setAutoAdvance,
  skip,
  startSession,
  stop,
  summarize,
  tick,
  type SolfegeState,
} from './session'
import type { Task } from './types'

const noteTask = (type: string, pitches: number[]): Task => ({
  mode: 'intervals',
  type,
  answer: { kind: 'note', pitches },
  range: { low: Math.min(...pitches), high: Math.max(...pitches) },
  content: null,
})
const valueTask = (type: string, value: string): Task => ({
  mode: 'intervals',
  type,
  answer: { kind: 'value', value, table: { 0: 'P8', 3: 'm3', 4: 'M3' } },
  range: { low: 60, high: 72 },
  content: null,
})

const start = (tasks: Task[], autoAdvance = false) =>
  startSession(tasks, autoAdvance, emptyModeStats(), 1000)

function expectPhase<P extends SolfegeState['phase']>(state: SolfegeState, phase: P) {
  expect(state.phase).toBe(phase)
  return state as Extract<SolfegeState, { phase: P }>
}

describe('Короткий ответ (C-SOL-1, OB-5)', () => {
  it('верно сразу: исход «clean» со временем, событие статистики', () => {
    const done = expectPhase(press(start([noteTask('a', [64])]), 64, 3400), 'done')
    expect(done.outcome).toBe('clean')
    expect(done.history).toEqual([{ outcome: 'clean', ms: 2400, errors: 0 }])
    expect(done.stats.events).toEqual([{ kind: 'task', key: 'a', outcome: 'clean', ms: 2400 }])
  })

  it('неверно — задание остаётся, попыток сколько угодно, потом «после ошибок»', () => {
    let state = start([noteTask('a', [64])])
    state = press(state, 76, 1500)
    state = press(state, 65, 1600)
    const asking = expectPhase(state, 'asking')
    expect(asking.errors).toBe(2)
    expect(asking.wrong).toEqual({ pitch: 65, value: null })
    const done = expectPhase(press(state, 64, 2000), 'done')
    expect(done.outcome).toBe('error')
    expect(done.stats.events[0]).toEqual({ kind: 'task', key: 'a', outcome: 'error', ms: null })
  })

  it('ответ-значение: любая октава; клавиша вне таблицы не считается', () => {
    let state = start([valueTask('b', 'M3')])
    state = press(state, 62, 1100) // ре — нет в таблице
    expect(expectPhase(state, 'asking').errors).toBe(0)
    state = press(state, 51, 1200) // ре♯ — м3, неверно
    expect(expectPhase(state, 'asking').wrong).toEqual({ pitch: 51, value: 'm3' })
    expect(expectPhase(press(state, 40, 1300), 'done').outcome).toBe('error') // ми большой октавы
  })

  it('нажатия после завершения не меняют задание', () => {
    const done = press(start([noteTask('a', [64])]), 64, 1100)
    expect(press(done, 60, 1200)).toBe(done)
  })
})

describe('Длинный ответ (C-SOL-1, OB-6, OB-7)', () => {
  it('оценка только после последней ноты; ошибка — повтор целиком', () => {
    let state = start([noteTask('scale', [60, 62, 64])])
    state = press(state, 60, 1100)
    state = press(state, 61, 1200)
    expect(expectPhase(state, 'asking').review).toBeNull()
    state = press(state, 64, 1300)
    const asking = expectPhase(state, 'asking')
    expect(asking.review).toEqual({ played: [60, 61, 64], correct: [true, false, true] })
    expect(asking.errors).toBe(1)
    // Следующее нажатие — первая нота новой попытки.
    state = press(state, 60, 1400)
    expect(expectPhase(state, 'asking')).toMatchObject({ review: null, entered: [60] })
    state = press(press(state, 62, 1500), 64, 1600)
    expect(expectPhase(state, 'done').outcome).toBe('error')
  })
})

describe('Пропустить, Далее, автопереход, итог (C-SOL-1, OB-8…OB-11, OB-18)', () => {
  const tasks = [noteTask('a', [64]), noteTask('b', [67]), noteTask('c', [69])]

  it('«Пропустить» — исход «skip», без времени', () => {
    const done = expectPhase(skip(start(tasks), 5000), 'done')
    expect(done.outcome).toBe('skip')
    expect(done.history[0]).toEqual({ outcome: 'skip', ms: null, errors: 0 })
  })

  it('без флажка — только по «Далее»; с флажком — отсчёт 3 с', () => {
    const manual = skip(start(tasks), 2000)
    expect(tick(manual, 99999)).toBe(manual)
    const auto = skip(start(tasks, true), 2000)
    expect(countdownSeconds(auto, 2000)).toBe(3)
    const after = expectPhase(tick(auto, 2000 + COUNTDOWN_MS), 'asking')
    expect(after.index).toBe(1)
    expect(after.startedAt).toBe(2000 + COUNTDOWN_MS)
  })

  it('флажок на панели во время сессии запускает и снимает отсчёт', () => {
    const done = skip(start(tasks), 2000)
    const on = setAutoAdvance(done, true, 2500)
    expect(countdownSeconds(on, 2500)).toBe(3)
    expect(countdownSeconds(setAutoAdvance(on, false, 2600), 2600)).toBeNull()
  })

  it('после последнего задания — итог; «Повторить» — те же задания', () => {
    let state = start(tasks)
    state = next(press(state, 64, 1100), 1200)
    state = next(skip(state, 1300), 1400)
    state = next(press(press(state, 60, 1500), 69, 1600), 1700)
    const summary = expectPhase(state, 'summary')
    expect(summarize(summary.tasks, summary.history)).toEqual({
      clean: 1,
      withError: 1,
      skipped: 1,
      hardTypes: ['b', 'c'],
    })
    const again = expectPhase(repeat(state, 2000), 'asking')
    expect(again.tasks).toBe(tasks)
    expect(again.index).toBe(0)
    expect(again.stats.before.tasks.a.clean).toBe(1)
  })

  it('«Стоп» — без итога, незавершённое не записано', () => {
    expect(stop()).toEqual({ phase: 'idle' })
  })
})

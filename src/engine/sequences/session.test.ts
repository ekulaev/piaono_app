import { describe, expect, it } from 'vitest'
import type { Sequence } from './generate'
import { DEFAULT_HINT_PROGRESS, type HintProgress } from './hints'
import {
  COUNTDOWN_MS,
  countdownSeconds,
  IDLE,
  next,
  played,
  repeat,
  setAutoAdvance,
  skip,
  startSession,
  stop,
  summarize,
  tick,
  type SessionState,
} from './session'

const C4 = 60
const E4 = 64
const F4 = 65
const G4 = 67
const A4 = 69
const T0 = 1000

const seq = (...steps: number[][]): Sequence => ({
  clef: 'treble',
  low: 60,
  high: 67,
  anchor: steps.every((step) => step.length === 1) ? G4 : null,
  steps,
})

function playing(state: SessionState) {
  if (state.phase !== 'playing') throw new Error(`ожидалась фаза playing, а не ${state.phase}`)
  return state
}

describe('Текущий шаг и темп', () => {
  it('Ожидание: без нажатий текущий шаг не меняется', () => {
    const state = startSession([seq([E4], [F4], [G4])], false, T0)
    expect(playing(tick(state, T0 + 30_000)).stepIndex).toBe(0)
  })
})

describe('Верный шаг', () => {
  it('Верная нота: сразу засчитана, текущий — следующий, время реакции записано', () => {
    const state = played(startSession([seq([E4], [F4], [G4])], false, T0), E4, T0 + 1200)
    const p = playing(state)
    expect(p.stepIndex).toBe(1)
    expect(p.records[0]).toEqual({
      result: 'correct',
      hadError: false,
      reactionMs: 1200,
      hinted: false,
    })
    expect(p.stepStartedAt).toBe(T0 + 1200)
  })

  it('Верный аккорд: C4, E4, G4 в пределах 50 мс', () => {
    let state = startSession([seq([C4, E4, G4], [F4], [G4])], false, T0)
    state = played(state, C4, T0 + 500)
    expect(playing(state).stepIndex).toBe(0)
    state = played(state, E4, T0 + 510)
    state = played(state, G4, T0 + 530)
    expect(playing(state).stepIndex).toBe(1)
    expect(playing(state).records[0].result).toBe('correct')
  })
})

describe('Ошибка на шаге', () => {
  it('Неверная нота: шаг текущий, полая головка F4, ошибка отмечена', () => {
    const state = playing(played(startSession([seq([E4], [F4], [G4])], false, T0), F4, T0 + 300))
    expect(state.stepIndex).toBe(0)
    expect(state.wrongPitches).toEqual([F4])
    expect(state.records[0].hadError).toBe(true)
    expect(state.errorCount).toBe(1)
  })

  it('Неполный аккорд: через 50 мс ошибка без полых головок', () => {
    const pressed = played(startSession([seq([C4, E4], [F4], [G4])], false, T0), C4, T0 + 100)
    expect(playing(tick(pressed, T0 + 149)).errorCount).toBe(0)
    const state = playing(tick(pressed, T0 + 150))
    expect(state.errorCount).toBe(1)
    expect(state.wrongPitches).toEqual([])
    expect(state.stepIndex).toBe(0)
  })

  it('Повторная ошибка: новая полая головка заменяет прежнюю', () => {
    let state = played(startSession([seq([E4], [F4], [G4])], false, T0), F4, T0 + 100)
    state = played(state, A4, T0 + 500)
    expect(playing(state).wrongPitches).toEqual([A4])
    expect(playing(state).errorCount).toBe(2)
  })

  it('неверные ноты одной группы показываются вместе, пульсация одна', () => {
    let state = played(startSession([seq([E4], [F4], [G4])], false, T0), F4, T0 + 100)
    state = played(state, A4, T0 + 120)
    expect(playing(state).wrongPitches).toEqual([F4, A4])
    expect(playing(state).errorCount).toBe(1)
  })

  it('аккорд с лишней нотой — ошибка, даже если все ноты шага есть', () => {
    let state = startSession([seq([C4, E4], [F4], [G4])], false, T0)
    state = played(state, F4, T0 + 100)
    state = played(state, C4, T0 + 110)
    state = played(state, E4, T0 + 120)
    expect(playing(state).stepIndex).toBe(0)
  })

  it('время реакции после ошибок — от начала шага до верного нажатия', () => {
    let state = played(startSession([seq([E4], [F4], [G4])], false, T0), F4, T0 + 400)
    state = played(state, E4, T0 + 2000)
    expect(playing(state).records[0]).toEqual({
      result: 'correct',
      hadError: true,
      reactionMs: 2000,
      hinted: false,
    })
    expect(playing(state).wrongPitches).toEqual([])
  })
})

describe('Пропуск шага', () => {
  it('Пропустить: шаг пропущен, время не записано, текущий — следующий', () => {
    const state = playing(skip(startSession([seq([E4], [F4], [G4])], false, T0), T0 + 700))
    expect(state.records[0]).toEqual({
      result: 'skipped',
      hadError: false,
      reactionMs: null,
      hinted: false,
    })
    expect(state.stepIndex).toBe(1)
  })
})

describe('Переход между последовательностями', () => {
  const twoSequences = [seq([E4], [F4], [G4]), seq([C4], [E4], [G4])]
  const finish = (autoAdvance: boolean) => {
    let state = startSession(twoSequences, autoAdvance, T0)
    state = played(state, E4, T0 + 100)
    state = played(state, F4, T0 + 200)
    return played(state, G4, T0 + 300)
  }

  it('Далее вручную: нажатия не влияют, по «Далее» — следующая последовательность', () => {
    const finished = finish(false)
    expect(finished.phase).toBe('finished')
    expect(played(finished, C4, T0 + 400)).toBe(finished)
    expect(tick(finished, T0 + 60_000)).toBe(finished)
    const second = playing(next(finished, T0 + 5000))
    expect(second.seqIndex).toBe(1)
    expect(second.stepIndex).toBe(0)
    expect(second.stepStartedAt).toBe(T0 + 5000)
  })

  it('Автоматический переход: «Далее (3/2/1)», через 3000 мс — следующая', () => {
    const finished = finish(true)
    expect(countdownSeconds(finished, T0 + 300)).toBe(3)
    expect(countdownSeconds(finished, T0 + 300 + 1500)).toBe(2)
    expect(countdownSeconds(finished, T0 + 300 + 2500)).toBe(1)
    expect(tick(finished, T0 + 300 + COUNTDOWN_MS - 1).phase).toBe('finished')
    const second = playing(tick(finished, T0 + 300 + COUNTDOWN_MS))
    expect(second.seqIndex).toBe(1)
    expect(second.stepStartedAt).toBe(T0 + 300 + COUNTDOWN_MS)
  })

  it('после последней последовательности — итог', () => {
    let state = next(finish(false), T0 + 1000)
    state = skip(skip(skip(state, T0 + 1100), T0 + 1200), T0 + 1300)
    expect(next(state, T0 + 1400).phase).toBe('summary')
  })
})

describe('Экран итога', () => {
  it('Итог: 1 верный с первой попытки, 1 с ошибкой, 1 пропущен, точность 50 %', () => {
    let state = startSession([seq([E4], [F4], [G4])], false, T0)
    state = played(state, E4, T0 + 1000) // E4 за 1 с
    state = played(state, A4, T0 + 1500)
    state = played(state, F4, T0 + 4000) // F4 за 3 с, с ошибкой
    state = skip(state, T0 + 5000)
    state = next(state, T0 + 6000)
    if (state.phase !== 'summary') throw new Error('ожидался итог')
    const summary = summarize(state.sequences, state.history)
    expect(summary).toEqual({
      correctFirstTry: 1,
      withError: 1,
      skipped: 1,
      accuracy: 0.5,
      slowest: [
        { pitch: F4, averageMs: 3000 },
        { pitch: E4, averageMs: 1000 },
      ],
      withoutHint: null,
    })
  })

  it('Всё пропущено: точность null, медленных нот нет', () => {
    const sequences = [seq([E4], [F4], [G4])]
    const summary = summarize(sequences, [
      [0, 1, 2].map(() => ({
        result: 'skipped' as const,
        hadError: false,
        reactionMs: null,
        hinted: false,
      })),
    ])
    expect(summary.accuracy).toBeNull()
    expect(summary.slowest).toEqual([])
    expect(summary.skipped).toBe(3)
  })

  it('медленных нот не больше пяти; время аккорда — каждой его ноте', () => {
    const sequences = [seq([60, 62], [64, 65], [67, 69])]
    const summary = summarize(sequences, [
      [
        { result: 'correct', hadError: false, reactionMs: 1000, hinted: false },
        { result: 'correct', hadError: false, reactionMs: 2000, hinted: false },
        { result: 'correct', hadError: false, reactionMs: 3000, hinted: false },
      ],
    ])
    expect(summary.slowest.map((s) => s.pitch)).toEqual([67, 69, 64, 65, 60])
  })

  it('Повторить: те же последовательности заново', () => {
    const sequences = [seq([E4], [F4], [G4])]
    let state = startSession(sequences, false, T0)
    state = next(skip(skip(skip(state, T0), T0), T0), T0)
    const again = playing(repeat(state, T0 + 100))
    expect(again.sequences).toBe(sequences)
    expect(again.seqIndex).toBe(0)
    expect(again.history).toEqual([])
  })
})

describe('Остановка и нажатия', () => {
  it('Стоп во время отсчёта: упражнение остановлено', () => {
    let state = startSession([seq([E4], [F4], [G4])], true, T0)
    state = skip(skip(skip(state, T0), T0), T0)
    expect(state.phase).toBe('finished')
    expect(stop()).toBe(IDLE)
  })

  it('нажатия вне упражнения ничего не меняют', () => {
    expect(played(IDLE, E4, T0)).toBe(IDLE)
  })
})

describe('Флажок на главном экране', () => {
  const done = () => skip(skip(skip(startSession([seq([E4], [F4], [G4])], false, T0), T0), T0), T0)

  it('включили после конца последовательности — отсчёт 3 с от момента включения', () => {
    const state = setAutoAdvance(done(), true, T0 + 500)
    expect(countdownSeconds(state, T0 + 500)).toBe(3)
    expect(tick(state, T0 + 500 + COUNTDOWN_MS).phase).toBe('summary')
  })

  it('выключили во время отсчёта — отсчёта нет, ждём «Далее»', () => {
    const counting = setAutoAdvance(done(), true, T0)
    const state = setAutoAdvance(counting, false, T0 + 1000)
    expect(countdownSeconds(state, T0 + 1000)).toBeNull()
    expect(tick(state, T0 + 60_000)).toBe(state)
  })

  it('включили посреди последовательности — отсчёт начнётся в её конце', () => {
    let state = setAutoAdvance(startSession([seq([E4], [F4], [G4])], false, T0), true, T0)
    state = skip(skip(skip(state, T0), T0), T0 + 200)
    expect(countdownSeconds(state, T0 + 200)).toBe(3)
  })
})

describe('Подсказки в сессии', () => {
  const level = (treble: 0 | 1 | 2 | 3, streak = 0): HintProgress => ({
    ...DEFAULT_HINT_PROGRESS,
    treble: { level: treble, streak },
  })

  it('без уровней подсказок видимости нет, итог без строки «Без подсказки»', () => {
    const state = playing(startSession([seq([E4], [F4])], false, T0))
    expect(state.visibility).toBeNull()
    expect(state.hints).toBeNull()
  })

  it('у аккордов подсказок нет, даже если уровни переданы', () => {
    const state = playing(startSession([seq([C4, E4], [F4, G4])], false, T0, level(3)))
    expect(state.visibility).toBeNull()
  })

  it('видимость в начале последовательности — по уровню её ключа', () => {
    const state = playing(startSession([seq([E4], [F4], [G4])], false, T0, level(1)))
    expect(state.visibility).toEqual({
      anchor: true,
      anchorLabel: false,
      steps: [true, false, false],
    })
  })

  it('Ошибка на первом шаге при уровне 0: якорь, подпись и подсказка остаются после верного', () => {
    let state = startSession([seq([E4], [F4], [G4])], false, T0, level(0))
    state = played(state, A4, T0 + 100)
    expect(playing(state).visibility).toEqual({
      anchor: true,
      anchorLabel: true,
      steps: [true, false, false],
    })
    state = played(state, E4, T0 + 900)
    expect(playing(state).visibility!.steps[0]).toBe(true)
    expect(playing(state).records[0].hinted).toBe(true)
  })

  it('Пропуск: подсказка не появляется', () => {
    const state = playing(skip(startSession([seq([E4], [F4], [G4])], false, T0, level(0)), T0))
    expect(state.visibility!.steps).toEqual([false, false, false])
  })

  it('уровень пересчитывается при завершении последовательности и действует со следующей', () => {
    const sequences = [seq([E4], [F4]), seq([G4], [A4])]
    let state = startSession(sequences, false, T0, level(3, 1))
    state = played(played(state, E4, T0 + 100), F4, T0 + 200)
    expect(state.phase).toBe('finished')
    expect(state.phase === 'finished' && state.hints!.treble).toEqual({ level: 2, streak: 0 })
    // На завершённой последовательности подсказки прежние.
    expect(state.phase === 'finished' && state.visibility!.anchorLabel).toBe(true)
    state = next(state, T0 + 300)
    expect(playing(state).visibility).toEqual({
      anchor: true,
      anchorLabel: false,
      steps: [true, true],
    })
  })

  it('Стоп посреди последовательности не меняет уровни', () => {
    const hints = level(3, 1)
    const state = played(startSession([seq([E4], [F4], [G4])], false, T0, hints), E4, T0 + 100)
    expect(playing(state).hints).toBe(hints)
    expect(stop()).toBe(IDLE)
  })

  it('Повторить — с текущими уровнями', () => {
    let state = startSession([seq([E4], [F4])], false, T0, level(3, 1))
    state = played(played(state, E4, T0 + 100), F4, T0 + 200)
    state = next(state, T0 + 300)
    if (state.phase !== 'summary') throw new Error('ожидался итог')
    expect(playing(repeat(state, T0 + 400)).visibility!.anchorLabel).toBe(false)
  })

  it('Без подсказки: 2 из 4 на уровне 1', () => {
    let state = startSession([seq([E4], [F4], [G4], [A4])], false, T0, level(1))
    state = played(state, E4, T0 + 100) // с подсказкой
    state = played(state, F4, T0 + 200) // без подсказки
    state = played(state, G4, T0 + 300) // без подсказки
    state = played(state, C4, T0 + 400) // ошибка
    state = played(state, A4, T0 + 500)
    state = next(state, T0 + 600)
    if (state.phase !== 'summary') throw new Error('ожидался итог')
    expect(summarize(state.sequences, state.history, state.hints !== null).withoutHint).toEqual({
      count: 2,
      of: 4,
    })
  })

  it('Всё пропущено с подсказками: «Без подсказки» из 0', () => {
    let state = startSession([seq([E4], [F4])], false, T0, level(0))
    state = next(skip(skip(state, T0), T0), T0)
    if (state.phase !== 'summary') throw new Error('ожидался итог')
    expect(summarize(state.sequences, state.history, true).withoutHint).toEqual({ count: 0, of: 0 })
  })
})

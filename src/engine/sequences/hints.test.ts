import { describe, expect, it } from 'vitest'
import {
  classify,
  DEFAULT_HINT_PROGRESS,
  initialVisibility,
  nextProgress,
  readHintProgress,
  revealStep,
  type HintProgress,
} from './hints'

const ok = { result: 'correct', hadError: false } as const
const error = { result: 'correct', hadError: true } as const
const skipped = { result: 'skipped', hadError: false } as const

const progress = (level: 0 | 1 | 2 | 3, streak = 0): HintProgress => ({
  ...DEFAULT_HINT_PROGRESS,
  treble: { level, streak },
})

describe('Уровни подсказок', () => {
  it('уровень 3: якорь с подписью, подсказки над всеми шагами', () => {
    expect(initialVisibility(3, 3)).toEqual({
      anchor: true,
      anchorLabel: true,
      steps: [true, true, true],
    })
  })

  it('уровень 2: якорь без подписи, подсказки над всеми шагами', () => {
    expect(initialVisibility(2, 2)).toEqual({ anchor: true, anchorLabel: false, steps: [true, true] })
  })

  it('Уровень 1: якорь без подписи, подсказка только над первым шагом', () => {
    expect(initialVisibility(1, 3)).toEqual({
      anchor: true,
      anchorLabel: false,
      steps: [true, false, false],
    })
  })

  it('уровень 0: ничего', () => {
    expect(initialVisibility(0, 2)).toEqual({ anchor: false, anchorLabel: false, steps: [false, false] })
  })
})

describe('Подсказка после ошибки', () => {
  it('ошибка на третьем шаге при уровне 0 — подсказка только над ним', () => {
    expect(revealStep(initialVisibility(0, 4), 2)).toEqual({
      anchor: false,
      anchorLabel: false,
      steps: [false, false, true, false],
    })
  })

  it('ошибка на первом шаге — ещё якорь и подпись', () => {
    expect(revealStep(initialVisibility(0, 2), 0)).toEqual({
      anchor: true,
      anchorLabel: true,
      steps: [true, false],
    })
  })
})

describe('Угасание и возврат подсказок', () => {
  it('классификация последовательности', () => {
    expect(classify([ok, ok, ok])).toBe('success')
    expect(classify([error, skipped, ok, ok])).toBe('other') // ровно половина — не трудная
    expect(classify([error, error, skipped, ok])).toBe('hard')
    expect(classify([ok, skipped])).toBe('other')
  })

  it('Две успешные подряд снижают уровень на 1 и обнуляют счёт', () => {
    const once = nextProgress(progress(3), 'treble', [ok, ok, ok])
    expect(once.treble).toEqual({ level: 3, streak: 1 })
    expect(nextProgress(once, 'treble', [ok, ok, ok]).treble).toEqual({ level: 2, streak: 0 })
  })

  it('Трудная последовательность повышает уровень', () => {
    expect(nextProgress(progress(1, 1), 'treble', [error, error, skipped, ok]).treble).toEqual({
      level: 2,
      streak: 0,
    })
  })

  it('прочая обнуляет счёт, уровень прежний', () => {
    expect(nextProgress(progress(2, 1), 'treble', [ok, error, ok]).treble).toEqual({
      level: 2,
      streak: 0,
    })
  })

  it('границы 0 и 3 не пересекаются', () => {
    expect(nextProgress(progress(0, 1), 'treble', [ok]).treble.level).toBe(0)
    expect(nextProgress(progress(3), 'treble', [error]).treble.level).toBe(3)
  })

  it('Ключи независимы', () => {
    const next = nextProgress(progress(3, 1), 'treble', [ok])
    expect(next.treble.level).toBe(2)
    expect(next.bass).toEqual(DEFAULT_HINT_PROGRESS.bass)
  })
})

describe('Сохранённые уровни', () => {
  it('корректные данные читаются как есть', () => {
    const saved = { treble: { level: 1, streak: 1 }, bass: { level: 0, streak: 0 } }
    expect(readHintProgress(saved)).toEqual(saved)
  })

  it('Повреждённые данные — уровень 3 и нулевой счёт', () => {
    expect(readHintProgress('мусор')).toEqual(DEFAULT_HINT_PROGRESS)
    expect(readHintProgress({ treble: { level: 5, streak: 0 }, bass: { level: 2, streak: -1 } })).toEqual(
      DEFAULT_HINT_PROGRESS,
    )
    expect(readHintProgress({ bass: { level: 1, streak: 0 } })).toEqual({
      treble: { level: 3, streak: 0 },
      bass: { level: 1, streak: 0 },
    })
  })
})

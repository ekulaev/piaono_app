import { describe, expect, it } from 'vitest'
import { DEFAULT_HINT_PROGRESS, type HintProgress } from '../engine/sequences/hints'
import type { SettingsStorage } from './browserStorage'
import { aggregate, emptyModeStats } from '../engine/stats/stats'
import { loadHintProgress, loadProgress, saveHintProgress, saveModeStats } from './progress'

function memoryStorage(): SettingsStorage {
  const data = new Map<string, string>()
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
  }
}

describe('Сохранение уровней подсказок', () => {
  it('первый запуск — уровень 3 у обоих ключей', () => {
    expect(loadHintProgress(memoryStorage())).toEqual(DEFAULT_HINT_PROGRESS)
  })

  it('Перезапуск: уровень сохранился', () => {
    const storage = memoryStorage()
    const hints: HintProgress = { treble: { level: 1, streak: 1 }, bass: { level: 3, streak: 0 } }
    saveHintProgress(hints, storage)
    expect(loadHintProgress(storage)).toEqual(hints)
  })

  it('Повреждённые данные — уровень 3, без ошибки', () => {
    const storage = memoryStorage()
    storage.setItem('piaono.progress.v1', '{не json')
    expect(loadHintProgress(storage)).toEqual(DEFAULT_HINT_PROGRESS)
    storage.setItem('piaono.progress.v1', '42')
    expect(loadHintProgress(storage)).toEqual(DEFAULT_HINT_PROGRESS)
  })

  it('недоступное хранилище не роняет приложение', () => {
    const broken: SettingsStorage = {
      getItem: () => {
        throw new Error('SecurityError')
      },
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
    }
    expect(loadHintProgress(broken)).toEqual(DEFAULT_HINT_PROGRESS)
    expect(() => saveHintProgress(DEFAULT_HINT_PROGRESS, broken)).not.toThrow()
    expect(loadHintProgress(null)).toEqual(DEFAULT_HINT_PROGRESS)
  })
})

describe('Хранение статистики (C-STF-4)', () => {
  const stats = aggregate([{ kind: 'note', key: 'bass:48', outcome: 'clean', ms: 800 }])

  it('Перезапуск: статистика обоих режимов и уровни на месте', () => {
    const storage = memoryStorage()
    const hints: HintProgress = { treble: { level: 2, streak: 1 }, bass: { level: 3, streak: 0 } }
    saveHintProgress(hints, storage)
    saveModeStats('sequences', stats, storage)
    saveModeStats('warmup', stats, storage)
    expect(loadProgress(storage)).toEqual({
      hints,
      stats: { sequences: stats, contour: emptyModeStats(), warmup: stats },
    })
  })

  it('Уровни подсказок не стирают статистику, и наоборот', () => {
    const storage = memoryStorage()
    saveModeStats('warmup', stats, storage)
    saveHintProgress(DEFAULT_HINT_PROGRESS, storage)
    expect(loadProgress(storage).stats.warmup).toEqual(stats)
    const hints: HintProgress = { treble: { level: 0, streak: 0 }, bass: { level: 1, streak: 1 } }
    saveHintProgress(hints, storage)
    saveModeStats('sequences', stats, storage)
    expect(loadHintProgress(storage)).toEqual(hints)
  })

  it('Старая запись без статистики: уровни прочитаны, статистика пуста', () => {
    const storage = memoryStorage()
    const hints = { treble: { level: 1, streak: 0 }, bass: { level: 3, streak: 0 } }
    storage.setItem('piaono.progress.v1', JSON.stringify({ hints }))
    expect(loadProgress(storage)).toEqual({
      hints,
      stats: { sequences: emptyModeStats(), contour: emptyModeStats(), warmup: emptyModeStats() },
    })
  })

  it('повреждённый режим — пустой, другой режим и уровни целы', () => {
    const storage = memoryStorage()
    storage.setItem(
      'piaono.progress.v1',
      JSON.stringify({
        hints: DEFAULT_HINT_PROGRESS,
        stats: { sequences: 'мусор', warmup: stats },
      }),
    )
    expect(loadProgress(storage).stats).toEqual({
      sequences: emptyModeStats(),
      contour: emptyModeStats(),
      warmup: stats,
    })
  })
})

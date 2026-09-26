import { describe, expect, it } from 'vitest'
import { DEFAULT_HINT_PROGRESS, type HintProgress } from '../engine/sequences/hints'
import type { SettingsStorage } from './browserStorage'
import { loadHintProgress, saveHintProgress } from './progress'

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

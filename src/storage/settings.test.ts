import { describe, expect, it } from 'vitest'
import { loadSettings, saveSettings, type SettingsStorage } from './settings'

function memoryStorage(): SettingsStorage {
  const data = new Map<string, string>()
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
  }
}

const brokenStorage: SettingsStorage = {
  getItem: () => {
    throw new Error('SecurityError')
  },
  setItem: () => {
    throw new Error('QuotaExceededError')
  },
}

describe('Глиссандо: хранение настройки', () => {
  it('по умолчанию выключено', () => {
    expect(loadSettings(memoryStorage())).toEqual({
      glissando: false,
      preferredInput: null,
      activeMode: 'warmup',
    })
  })

  it('Настройка переживает перезапуск', () => {
    const storage = memoryStorage()
    saveSettings({ glissando: true, preferredInput: null, activeMode: 'warmup' }, storage)
    expect(loadSettings(storage)).toEqual({
      glissando: true,
      preferredInput: null,
      activeMode: 'warmup',
    })
  })

  it('битые данные → значения по умолчанию', () => {
    const storage = memoryStorage()
    storage.setItem('piaono.settings.v1', '{не json')
    expect(loadSettings(storage)).toEqual({
      glissando: false,
      preferredInput: null,
      activeMode: 'warmup',
    })
    storage.setItem('piaono.settings.v1', '{"glissando":"да"}')
    expect(loadSettings(storage)).toEqual({
      glissando: false,
      preferredInput: null,
      activeMode: 'warmup',
    })
    storage.setItem('piaono.settings.v1', 'null')
    expect(loadSettings(storage)).toEqual({
      glissando: false,
      preferredInput: null,
      activeMode: 'warmup',
    })
  })

  it('хранилище бросает исключения — приложение не падает', () => {
    expect(loadSettings(brokenStorage)).toEqual({
      glissando: false,
      preferredInput: null,
      activeMode: 'warmup',
    })
    expect(() =>
      saveSettings({ glissando: true, preferredInput: null, activeMode: 'warmup' }, brokenStorage),
    ).not.toThrow()
  })

  it('хранилища нет вовсе', () => {
    expect(loadSettings(null)).toEqual({
      glissando: false,
      preferredInput: null,
      activeMode: 'warmup',
    })
    expect(() =>
      saveSettings({ glissando: true, preferredInput: null, activeMode: 'warmup' }, null),
    ).not.toThrow()
  })
})

describe('Выбор запоминается и узнаёт вход после переподключения: хранение', () => {
  it('Перезапуск: выбранный вход сохраняется', () => {
    const storage = memoryStorage()
    const synth = { id: 's1', name: 'Synth' }
    saveSettings({ glissando: false, preferredInput: synth, activeMode: 'warmup' }, storage)
    expect(loadSettings(storage).preferredInput).toEqual(synth)
  })

  it('старые данные без поля — выбора нет, глиссандо сохраняется', () => {
    const storage = memoryStorage()
    storage.setItem('piaono.settings.v1', '{"glissando":true}')
    expect(loadSettings(storage)).toEqual({
      glissando: true,
      preferredInput: null,
      activeMode: 'warmup',
    })
  })

  it('битое значение входа — выбора нет', () => {
    const storage = memoryStorage()
    storage.setItem('piaono.settings.v1', '{"preferredInput":{"id":5}}')
    expect(loadSettings(storage).preferredInput).toBeNull()
    storage.setItem('piaono.settings.v1', '{"preferredInput":"Synth"}')
    expect(loadSettings(storage).preferredInput).toBeNull()
  })
})

describe('Активный режим запоминается', () => {
  it('Перезапуск: подтверждённый режим сохраняется', () => {
    const storage = memoryStorage()
    saveSettings({ glissando: false, preferredInput: null, activeMode: 'warmup' }, storage)
    expect(loadSettings(storage).activeMode).toBe('warmup')
  })

  it('Повреждённые данные: неизвестный режим → «Разминка»', () => {
    const storage = memoryStorage()
    storage.setItem('piaono.settings.v1', '{"activeMode":"sequences"}')
    expect(loadSettings(storage).activeMode).toBe('warmup')
    storage.setItem('piaono.settings.v1', '{"activeMode":42}')
    expect(loadSettings(storage).activeMode).toBe('warmup')
  })

  it('старые данные без поля — «Разминка», остальное сохраняется', () => {
    const storage = memoryStorage()
    storage.setItem('piaono.settings.v1', '{"glissando":true}')
    expect(loadSettings(storage)).toEqual({
      glissando: true,
      preferredInput: null,
      activeMode: 'warmup',
    })
  })
})

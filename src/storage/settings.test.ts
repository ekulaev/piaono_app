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
    expect(loadSettings(memoryStorage())).toEqual({ glissando: false, preferredInput: null })
  })

  it('Настройка переживает перезапуск', () => {
    const storage = memoryStorage()
    saveSettings({ glissando: true, preferredInput: null }, storage)
    expect(loadSettings(storage)).toEqual({ glissando: true, preferredInput: null })
  })

  it('битые данные → значения по умолчанию', () => {
    const storage = memoryStorage()
    storage.setItem('piaono.settings.v1', '{не json')
    expect(loadSettings(storage)).toEqual({ glissando: false, preferredInput: null })
    storage.setItem('piaono.settings.v1', '{"glissando":"да"}')
    expect(loadSettings(storage)).toEqual({ glissando: false, preferredInput: null })
    storage.setItem('piaono.settings.v1', 'null')
    expect(loadSettings(storage)).toEqual({ glissando: false, preferredInput: null })
  })

  it('хранилище бросает исключения — приложение не падает', () => {
    expect(loadSettings(brokenStorage)).toEqual({ glissando: false, preferredInput: null })
    expect(() =>
      saveSettings({ glissando: true, preferredInput: null }, brokenStorage),
    ).not.toThrow()
  })

  it('хранилища нет вовсе', () => {
    expect(loadSettings(null)).toEqual({ glissando: false, preferredInput: null })
    expect(() => saveSettings({ glissando: true, preferredInput: null }, null)).not.toThrow()
  })
})

describe('Выбор запоминается и узнаёт вход после переподключения: хранение', () => {
  it('Перезапуск: выбранный вход сохраняется', () => {
    const storage = memoryStorage()
    const synth = { id: 's1', name: 'Synth' }
    saveSettings({ glissando: false, preferredInput: synth }, storage)
    expect(loadSettings(storage).preferredInput).toEqual(synth)
  })

  it('старые данные без поля — выбора нет, глиссандо сохраняется', () => {
    const storage = memoryStorage()
    storage.setItem('piaono.settings.v1', '{"glissando":true}')
    expect(loadSettings(storage)).toEqual({ glissando: true, preferredInput: null })
  })

  it('битое значение входа — выбора нет', () => {
    const storage = memoryStorage()
    storage.setItem('piaono.settings.v1', '{"preferredInput":{"id":5}}')
    expect(loadSettings(storage).preferredInput).toBeNull()
    storage.setItem('piaono.settings.v1', '{"preferredInput":"Synth"}')
    expect(loadSettings(storage).preferredInput).toBeNull()
  })
})

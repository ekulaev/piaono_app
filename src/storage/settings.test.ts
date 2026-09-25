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
    expect(loadSettings(memoryStorage())).toEqual({ glissando: false })
  })

  it('Настройка переживает перезапуск', () => {
    const storage = memoryStorage()
    saveSettings({ glissando: true }, storage)
    expect(loadSettings(storage)).toEqual({ glissando: true })
  })

  it('битые данные → значения по умолчанию', () => {
    const storage = memoryStorage()
    storage.setItem('piaono.settings.v1', '{не json')
    expect(loadSettings(storage)).toEqual({ glissando: false })
    storage.setItem('piaono.settings.v1', '{"glissando":"да"}')
    expect(loadSettings(storage)).toEqual({ glissando: false })
    storage.setItem('piaono.settings.v1', 'null')
    expect(loadSettings(storage)).toEqual({ glissando: false })
  })

  it('хранилище бросает исключения — приложение не падает', () => {
    expect(loadSettings(brokenStorage)).toEqual({ glissando: false })
    expect(() => saveSettings({ glissando: true }, brokenStorage)).not.toThrow()
  })

  it('хранилища нет вовсе', () => {
    expect(loadSettings(null)).toEqual({ glissando: false })
    expect(() => saveSettings({ glissando: true }, null)).not.toThrow()
  })
})

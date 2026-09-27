import { describe, expect, it } from 'vitest'
import { DEFAULT_RHYTHM_SETTINGS } from '../engine/rhythm/settings'
import { DEFAULT_SEQUENCE_SETTINGS } from '../engine/sequences/settings'
import { loadSettings, saveSettings, type SettingsStorage } from './settings'

const modeSettings = {
  sequences: DEFAULT_SEQUENCE_SETTINGS,
  contour: DEFAULT_SEQUENCE_SETTINGS,
  rhythm: DEFAULT_RHYTHM_SETTINGS,
}

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
      modeSettings,
    })
  })

  it('Настройка переживает перезапуск', () => {
    const storage = memoryStorage()
    saveSettings(
      { glissando: true, preferredInput: null, activeMode: 'warmup', modeSettings },
      storage,
    )
    expect(loadSettings(storage)).toEqual({
      glissando: true,
      preferredInput: null,
      activeMode: 'warmup',
      modeSettings,
    })
  })

  it('битые данные → значения по умолчанию', () => {
    const storage = memoryStorage()
    storage.setItem('piaono.settings.v1', '{не json')
    expect(loadSettings(storage)).toEqual({
      glissando: false,
      preferredInput: null,
      activeMode: 'warmup',
      modeSettings,
    })
    storage.setItem('piaono.settings.v1', '{"glissando":"да"}')
    expect(loadSettings(storage)).toEqual({
      glissando: false,
      preferredInput: null,
      activeMode: 'warmup',
      modeSettings,
    })
    storage.setItem('piaono.settings.v1', 'null')
    expect(loadSettings(storage)).toEqual({
      glissando: false,
      preferredInput: null,
      activeMode: 'warmup',
      modeSettings,
    })
  })

  it('хранилище бросает исключения — приложение не падает', () => {
    expect(loadSettings(brokenStorage)).toEqual({
      glissando: false,
      preferredInput: null,
      activeMode: 'warmup',
      modeSettings,
    })
    expect(() =>
      saveSettings(
        { glissando: true, preferredInput: null, activeMode: 'warmup', modeSettings },
        brokenStorage,
      ),
    ).not.toThrow()
  })

  it('хранилища нет вовсе', () => {
    expect(loadSettings(null)).toEqual({
      glissando: false,
      preferredInput: null,
      activeMode: 'warmup',
      modeSettings,
    })
    expect(() =>
      saveSettings(
        { glissando: true, preferredInput: null, activeMode: 'warmup', modeSettings },
        null,
      ),
    ).not.toThrow()
  })
})

describe('Выбор запоминается и узнаёт вход после переподключения: хранение', () => {
  it('Перезапуск: выбранный вход сохраняется', () => {
    const storage = memoryStorage()
    const synth = { id: 's1', name: 'Synth' }
    saveSettings(
      { glissando: false, preferredInput: synth, activeMode: 'warmup', modeSettings },
      storage,
    )
    expect(loadSettings(storage).preferredInput).toEqual(synth)
  })

  it('старые данные без поля — выбора нет, глиссандо сохраняется', () => {
    const storage = memoryStorage()
    storage.setItem('piaono.settings.v1', '{"glissando":true}')
    expect(loadSettings(storage)).toEqual({
      glissando: true,
      preferredInput: null,
      activeMode: 'warmup',
      modeSettings,
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
    saveSettings(
      { glissando: false, preferredInput: null, activeMode: 'warmup', modeSettings },
      storage,
    )
    expect(loadSettings(storage).activeMode).toBe('warmup')
  })

  it('Повреждённые данные: неизвестный режим → «Разминка»', () => {
    const storage = memoryStorage()
    storage.setItem('piaono.settings.v1', '{"activeMode":"melody"}')
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
      modeSettings,
    })
  })
})

describe('Настройки режима «Последовательности»: хранение', () => {
  it('Перезапуск: подтверждённые настройки сохраняются', () => {
    const storage = memoryStorage()
    const sequences = { ...DEFAULT_SEQUENCE_SETTINGS, clef: 'bass' as const, sequences: 3 }
    saveSettings(
      {
        glissando: false,
        preferredInput: null,
        activeMode: 'sequences',
        modeSettings: { ...modeSettings, sequences },
      },
      storage,
    )
    const loaded = loadSettings(storage)
    expect(loaded.activeMode).toBe('sequences')
    expect(loaded.modeSettings.sequences).toEqual(sequences)
  })

  it('старые данные и битые настройки режима — значения по умолчанию', () => {
    const storage = memoryStorage()
    storage.setItem(
      'piaono.settings.v1',
      '{"modeSettings":{"sequences":{"clef":"alto","sequences":99}}}',
    )
    expect(loadSettings(storage).modeSettings.sequences).toEqual(DEFAULT_SEQUENCE_SETTINGS)
    storage.setItem('piaono.settings.v1', '{"modeSettings":"мусор"}')
    expect(loadSettings(storage).modeSettings.sequences).toEqual(DEFAULT_SEQUENCE_SETTINGS)
  })
})

describe('Настройки «Контура»: хранение (C-STF-5)', () => {
  it('Отдельно от Последовательностей', () => {
    const storage = memoryStorage()
    const contour = { ...DEFAULT_SEQUENCE_SETTINGS, clef: 'bass' as const }
    saveSettings(
      {
        glissando: false,
        preferredInput: null,
        activeMode: 'contour',
        modeSettings: { ...modeSettings, contour },
      },
      storage,
    )
    const loaded = loadSettings(storage)
    expect(loaded.activeMode).toBe('contour')
    expect(loaded.modeSettings.contour.clef).toBe('bass')
    expect(loaded.modeSettings.sequences.clef).toBe('treble')
  })

  it('старые настройки без «Контура» — у него значения по умолчанию', () => {
    const storage = memoryStorage()
    storage.setItem(
      'piaono.settings.v1',
      JSON.stringify({ activeMode: 'sequences', modeSettings: { sequences: { clef: 'bass' } } }),
    )
    const loaded = loadSettings(storage)
    expect(loaded.modeSettings.sequences.clef).toBe('bass')
    expect(loaded.modeSettings.contour).toEqual(DEFAULT_SEQUENCE_SETTINGS)
  })
})

describe('Настройки «Ритма» (C-STF-6)', () => {
  it('старые настройки без «Ритма» — у него значения по умолчанию, остальное прочитано', () => {
    const storage = memoryStorage()
    storage.setItem(
      'piaono.settings.v1',
      JSON.stringify({
        glissando: true,
        activeMode: 'contour',
        modeSettings: { sequences: DEFAULT_SEQUENCE_SETTINGS, contour: DEFAULT_SEQUENCE_SETTINGS },
      }),
    )
    const settings = loadSettings(storage)
    expect(settings.modeSettings.rhythm).toEqual(DEFAULT_RHYTHM_SETTINGS)
    expect(settings.activeMode).toBe('contour')
  })

  it('«Ритм» активным режимом и его настройки переживают перезапуск', () => {
    const storage = memoryStorage()
    const rhythm = { level: 4 as const, meter: 3 as const, bars: 2 as const, patterns: 5 }
    saveSettings(
      {
        glissando: false,
        preferredInput: null,
        activeMode: 'rhythm',
        modeSettings: { ...modeSettings, rhythm },
      },
      storage,
    )
    expect(loadSettings(storage).activeMode).toBe('rhythm')
    expect(loadSettings(storage).modeSettings.rhythm).toEqual(rhythm)
  })
})

import { describe, expect, it } from 'vitest'
import { DEFAULT_RHYTHM_SETTINGS } from '../engine/rhythm/settings'
import { DEFAULT_SEQUENCE_SETTINGS } from '../engine/sequences/settings'
import { DEFAULT_WARMUP_SETTINGS } from '../engine/warmup/settings'
import { DEFAULT_INTERVALS_SETTINGS } from '../engine/solfege/intervals/settings'
import { DEFAULT_DURATIONS_SETTINGS } from '../engine/solfege/durations/settings'
import { stepOf } from '../engine/warmup/steps'
import { loadSettings, saveSettings, type SettingsStorage } from './settings'

const modeSettings = {
  sequences: DEFAULT_SEQUENCE_SETTINGS,
  contour: DEFAULT_SEQUENCE_SETTINGS,
  rhythm: DEFAULT_RHYTHM_SETTINGS,
  warmup: DEFAULT_WARMUP_SETTINGS,
  intervals: DEFAULT_INTERVALS_SETTINGS,
  durations: DEFAULT_DURATIONS_SETTINGS,
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
      language: null,
      noteEchoEnabled: true,
      noteEchoMs: 1000,
      keyLabels: false,
      activeMode: 'warmup',
      modeSettings,
    })
  })

  it('Настройка переживает перезапуск', () => {
    const storage = memoryStorage()
    saveSettings(
      {
        glissando: true,
        preferredInput: null,
        language: null,
        noteEchoEnabled: true,
        noteEchoMs: 1000,
        keyLabels: false,
        activeMode: 'warmup',
        modeSettings,
      },
      storage,
    )
    expect(loadSettings(storage)).toEqual({
      glissando: true,
      preferredInput: null,
      language: null,
      noteEchoEnabled: true,
      noteEchoMs: 1000,
      keyLabels: false,
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
      language: null,
      noteEchoEnabled: true,
      noteEchoMs: 1000,
      keyLabels: false,
      activeMode: 'warmup',
      modeSettings,
    })
    storage.setItem('piaono.settings.v1', '{"glissando":"да"}')
    expect(loadSettings(storage)).toEqual({
      glissando: false,
      preferredInput: null,
      language: null,
      noteEchoEnabled: true,
      noteEchoMs: 1000,
      keyLabels: false,
      activeMode: 'warmup',
      modeSettings,
    })
    storage.setItem('piaono.settings.v1', 'null')
    expect(loadSettings(storage)).toEqual({
      glissando: false,
      preferredInput: null,
      language: null,
      noteEchoEnabled: true,
      noteEchoMs: 1000,
      keyLabels: false,
      activeMode: 'warmup',
      modeSettings,
    })
  })

  it('хранилище бросает исключения — приложение не падает', () => {
    expect(loadSettings(brokenStorage)).toEqual({
      glissando: false,
      preferredInput: null,
      language: null,
      noteEchoEnabled: true,
      noteEchoMs: 1000,
      keyLabels: false,
      activeMode: 'warmup',
      modeSettings,
    })
    expect(() =>
      saveSettings(
        {
          glissando: true,
          preferredInput: null,
          language: null,
          noteEchoEnabled: true,
          noteEchoMs: 1000,
          keyLabels: false,
          activeMode: 'warmup',
          modeSettings,
        },
        brokenStorage,
      ),
    ).not.toThrow()
  })

  it('хранилища нет вовсе', () => {
    expect(loadSettings(null)).toEqual({
      glissando: false,
      preferredInput: null,
      language: null,
      noteEchoEnabled: true,
      noteEchoMs: 1000,
      keyLabels: false,
      activeMode: 'warmup',
      modeSettings,
    })
    expect(() =>
      saveSettings(
        {
          glissando: true,
          preferredInput: null,
          language: null,
          noteEchoEnabled: true,
          noteEchoMs: 1000,
          keyLabels: false,
          activeMode: 'warmup',
          modeSettings,
        },
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
      {
        glissando: false,
        preferredInput: synth,
        language: null,
        noteEchoEnabled: true,
        noteEchoMs: 1000,
        keyLabels: false,
        activeMode: 'warmup',
        modeSettings,
      },
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
      language: null,
      noteEchoEnabled: true,
      noteEchoMs: 1000,
      keyLabels: false,
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
      {
        glissando: false,
        preferredInput: null,
        language: null,
        noteEchoEnabled: true,
        noteEchoMs: 1000,
        keyLabels: false,
        activeMode: 'warmup',
        modeSettings,
      },
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
      language: null,
      noteEchoEnabled: true,
      noteEchoMs: 1000,
      keyLabels: false,
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
        language: null,
        noteEchoEnabled: true,
        noteEchoMs: 1000,
        keyLabels: false,
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
        language: null,
        noteEchoEnabled: true,
        noteEchoMs: 1000,
        keyLabels: false,
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
        language: null,
        noteEchoEnabled: true,
        noteEchoMs: 1000,
        keyLabels: false,
        activeMode: 'rhythm',
        modeSettings: { ...modeSettings, rhythm },
      },
      storage,
    )
    expect(loadSettings(storage).activeMode).toBe('rhythm')
    expect(loadSettings(storage).modeSettings.rhythm).toEqual(rhythm)
  })
})

describe('Язык приложения: хранение (C-APP-3, OB-6, NFR-5)', () => {
  it('по умолчанию выбора нет', () => {
    expect(loadSettings(memoryStorage()).language).toBeNull()
  })

  it('Перезапуск: выбранный язык сохраняется, остальное цело', () => {
    const storage = memoryStorage()
    saveSettings(
      {
        glissando: true,
        preferredInput: null,
        language: 'en',
        noteEchoEnabled: true,
        noteEchoMs: 1000,
        keyLabels: false,
        activeMode: 'warmup',
        modeSettings,
      },
      storage,
    )
    const loaded = loadSettings(storage)
    expect(loaded.language).toBe('en')
    expect(loaded.glissando).toBe(true)
  })

  it('старые данные без поля языка — выбора нет, прочее читается', () => {
    const storage = memoryStorage()
    storage.setItem('piaono.settings.v1', '{"glissando":true,"activeMode":"warmup"}')
    const loaded = loadSettings(storage)
    expect(loaded.language).toBeNull()
    expect(loaded.glissando).toBe(true)
  })

  it('битое значение языка — выбора нет', () => {
    const storage = memoryStorage()
    storage.setItem('piaono.settings.v1', '{"language":5,"glissando":true}')
    expect(loadSettings(storage).language).toBeNull()
    storage.setItem('piaono.settings.v1', '{"language":""}')
    expect(loadSettings(storage).language).toBeNull()
  })
})

describe('Время показа ноты: хранение настройки', () => {
  it('по умолчанию 1 с, старые данные без поля читаются', () => {
    const storage = memoryStorage()
    expect(loadSettings(storage).noteEchoMs).toBe(1000)
    storage.setItem('piaono.settings.v1', '{"glissando":true}')
    const loaded = loadSettings(storage)
    expect(loaded.noteEchoMs).toBe(1000)
    expect(loaded.glissando).toBe(true)
  })

  it('сохранённое допустимое значение переживает перезапуск', () => {
    const storage = memoryStorage()
    saveSettings({ ...loadSettings(storage), noteEchoMs: 2500 }, storage)
    expect(loadSettings(storage).noteEchoMs).toBe(2500)
  })

  it('граничные значения допустимы', () => {
    const storage = memoryStorage()
    storage.setItem('piaono.settings.v1', '{"noteEchoMs":500}')
    expect(loadSettings(storage).noteEchoMs).toBe(500)
    storage.setItem('piaono.settings.v1', '{"noteEchoMs":5000}')
    expect(loadSettings(storage).noteEchoMs).toBe(5000)
  })

  it('не число, вне диапазона или не кратное шагу — значение по умолчанию, остальное цело', () => {
    const storage = memoryStorage()
    for (const bad of ['"1"', '0', '400', '5500', '1200', 'null']) {
      storage.setItem('piaono.settings.v1', `{"glissando":true,"noteEchoMs":${bad}}`)
      const loaded = loadSettings(storage)
      expect(loaded.noteEchoMs).toBe(1000)
      expect(loaded.glissando).toBe(true)
    }
  })
})

describe('Показ нажатых нот: выключатель', () => {
  it('по умолчанию включён, старые данные без поля читаются как «включено»', () => {
    const storage = memoryStorage()
    expect(loadSettings(storage).noteEchoEnabled).toBe(true)
    storage.setItem('piaono.settings.v1', '{"glissando":true,"noteEchoMs":2000}')
    const loaded = loadSettings(storage)
    expect(loaded.noteEchoEnabled).toBe(true)
    expect(loaded.noteEchoMs).toBe(2000)
  })

  it('выключено переживает перезапуск и не стирает время показа', () => {
    const storage = memoryStorage()
    saveSettings({ ...loadSettings(storage), noteEchoEnabled: false, noteEchoMs: 3000 }, storage)
    const loaded = loadSettings(storage)
    expect(loaded.noteEchoEnabled).toBe(false)
    expect(loaded.noteEchoMs).toBe(3000)
  })

  it('неподходящее значение — включено, остальное цело', () => {
    const storage = memoryStorage()
    for (const bad of ['"no"', '0', 'null']) {
      storage.setItem('piaono.settings.v1', `{"glissando":true,"noteEchoEnabled":${bad}}`)
      const loaded = loadSettings(storage)
      expect(loaded.noteEchoEnabled).toBe(true)
      expect(loaded.glissando).toBe(true)
    }
  })
})

describe('Настройки «Разминки» (C-STF-9): хранение', () => {
  const key = 'piaono.settings.v1'

  it('старые данные без настроек «Разминки» — значения по умолчанию, остальное цело', () => {
    const storage = memoryStorage()
    storage.setItem(
      key,
      JSON.stringify({ glissando: true, activeMode: 'contour', modeSettings: {} }),
    )
    const loaded = loadSettings(storage)
    expect(loaded.modeSettings.warmup).toEqual(DEFAULT_WARMUP_SETTINGS)
    expect(loaded.glissando).toBe(true)
    expect(loaded.activeMode).toBe('contour')
  })

  it('настройки «Разминки» переживают сохранение и чтение', () => {
    const storage = memoryStorage()
    const warmup = {
      ...DEFAULT_WARMUP_SETTINGS,
      travelSeconds: 8,
      clef: 'bass' as const,
      tonality: 'G-major',
      autoShift: true,
    }
    saveSettings({ ...loadSettings(storage), modeSettings: { ...modeSettings, warmup } }, storage)
    expect(loadSettings(storage).modeSettings.warmup).toEqual(warmup)
  })

  it('битое поле заменяется по умолчанию только для себя, остальные поля и режимы целы', () => {
    const storage = memoryStorage()
    storage.setItem(
      key,
      JSON.stringify({
        modeSettings: {
          sequences: { ...DEFAULT_SEQUENCE_SETTINGS, sequences: 4 },
          warmup: {
            travelSeconds: 8,
            bassRange: { low: stepOf('A', 0), high: stepOf('C', 4) },
          },
        },
      }),
    )
    const loaded = loadSettings(storage)
    expect(loaded.modeSettings.warmup.travelSeconds).toBe(8)
    expect(loaded.modeSettings.warmup.bassRange).toEqual(DEFAULT_WARMUP_SETTINGS.bassRange)
    expect(loaded.modeSettings.sequences.sequences).toBe(4)
  })
})

describe('Подписи на клавишах: хранение настройки (C-KBD-3)', () => {
  const rawRecord = (extra: Record<string, unknown>) => {
    const storage = memoryStorage()
    storage.setItem('piaono.settings.v1', JSON.stringify({ glissando: true, ...extra }))
    return storage
  }

  it('пустое хранилище → выключено', () => {
    expect(loadSettings(memoryStorage()).keyLabels).toBe(false)
  })

  it('старая запись без поля → выключено, остальное прежнее', () => {
    const loaded = loadSettings(rawRecord({ noteEchoMs: 2500 }))
    expect(loaded.keyLabels).toBe(false)
    expect(loaded.glissando).toBe(true)
    expect(loaded.noteEchoMs).toBe(2500)
  })

  it('значение не boolean → выключено, остальное прежнее', () => {
    const loaded = loadSettings(rawRecord({ keyLabels: 'yes', noteEchoMs: 2500 }))
    expect(loaded.keyLabels).toBe(false)
    expect(loaded.glissando).toBe(true)
    expect(loaded.noteEchoMs).toBe(2500)
  })

  it('включённое значение переживает перезапуск и не стирает остальное', () => {
    const storage = rawRecord({ noteEchoMs: 2500 })
    saveSettings({ ...loadSettings(storage), keyLabels: true }, storage)
    const loaded = loadSettings(storage)
    expect(loaded.keyLabels).toBe(true)
    expect(loaded.glissando).toBe(true)
    expect(loaded.noteEchoMs).toBe(2500)
  })
})

describe('Настройки «Интервалов» (C-SOL-1, NFR-3; C-SOL-2)', () => {
  it('старые данные без поля — «Интервалы» по умолчанию, остальное сохраняется', () => {
    const storage = memoryStorage()
    storage.setItem(
      'piaono.settings.v1',
      JSON.stringify({
        glissando: true,
        activeMode: 'warmup',
        modeSettings: { sequences: { clef: 'bass' } },
      }),
    )
    const settings = loadSettings(storage)
    expect(settings.modeSettings.intervals).toEqual(DEFAULT_INTERVALS_SETTINGS)
    expect(settings.modeSettings.sequences.clef).toBe('bass')
    expect(settings.glissando).toBe(true)
  })

  it('сохранённые настройки «Интервалов» переживают перезапуск', () => {
    const storage = memoryStorage()
    const intervals = { variant: 'name' as const, tasks: 5, autoAdvance: true }
    saveSettings(
      { ...loadSettings(storage), modeSettings: { ...modeSettings, intervals } },
      storage,
    )
    expect(loadSettings(storage).modeSettings.intervals).toEqual(intervals)
  })

  it('«Длительности»: старые данные — по умолчанию, сохранённые переживают перезапуск', () => {
    const storage = memoryStorage()
    const intervals = { variant: 'play' as const, tasks: 4, autoAdvance: false }
    storage.setItem('piaono.settings.v1', JSON.stringify({ modeSettings: { intervals } }))
    expect(loadSettings(storage).modeSettings.durations).toEqual(DEFAULT_DURATIONS_SETTINGS)
    expect(loadSettings(storage).modeSettings.intervals).toEqual(intervals)
    const durations = { kinds: 'rests' as const, tasks: 7, autoAdvance: true }
    saveSettings(
      {
        ...loadSettings(storage),
        modeSettings: { ...loadSettings(storage).modeSettings, durations },
      },
      storage,
    )
    expect(loadSettings(storage).modeSettings.durations).toEqual(durations)
    expect(loadSettings(storage).modeSettings.intervals).toEqual(intervals)
  })
})

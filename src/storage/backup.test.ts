import { describe, expect, it } from 'vitest'
import { aggregate, emptyModeStats } from '../engine/stats/stats'
import type { SettingsStorage } from './browserStorage'
import { backupFileName, createBackup, readBackup, restoreBackup, type Backup } from './backup'
import { loadProgress, saveModeStats } from './progress'
import { loadSettings, saveSettings } from './settings'

function memoryStorage(): SettingsStorage & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
  }
}

const NOW = new Date(2026, 9, 30, 14, 5, 42)

/** Хранилище с прогрессом «Ритма» и выбранным английским. */
function filledStorage() {
  const storage = memoryStorage()
  saveSettings({ ...loadSettings(storage), language: 'en', glissando: true }, storage)
  const rhythm = aggregate([{ kind: 'figure', key: 'dotted', outcome: 'error', ms: null }])
  saveModeStats('rhythm', rhythm, storage)
  return storage
}

function shell(overrides: Record<string, unknown>): string {
  const base = JSON.parse(createBackup(NOW, memoryStorage()).text)
  return JSON.stringify({ ...base, ...overrides })
}

describe('Создание копии (C-APP-4)', () => {
  it('имя файла — дата копии по времени устройства', () => {
    expect(createBackup(NOW, memoryStorage()).fileName).toBe('piaono-backup-2026-10-30-14-05.json')
    expect(backupFileName({ year: 2027, month: 1, day: 2, hour: 3, minute: 4 })).toBe(
      'piaono-backup-2027-01-02-03-04.json',
    )
  })

  it('в файле метка, версия, дата со смещением, настройки и прогресс', () => {
    const storage = filledStorage()
    const file = JSON.parse(createBackup(NOW, storage).text)
    expect(file.app).toBe('piaono')
    expect(file.format).toBe(1)
    expect(file.createdAt).toMatch(/^2026-10-30T14:05:42[+-]\d{2}:\d{2}$/)
    expect(file.settings).toEqual(loadSettings(storage))
    expect(file.progress).toEqual(loadProgress(storage))
  })

  it('пустое устройство — настройки по умолчанию и пустой прогресс', () => {
    const file = JSON.parse(createBackup(NOW, memoryStorage()).text)
    expect(file.settings).toEqual(loadSettings(null))
    expect(file.progress).toEqual(loadProgress(memoryStorage()))
  })

  it('создание копии не меняет данные на устройстве', () => {
    const storage = filledStorage()
    const before = new Map(storage.data)
    createBackup(NOW, storage)
    expect(storage.data).toEqual(before)
  })
})

describe('Проверка оболочки копии', () => {
  it.each([
    ['не JSON', '{не json'],
    ['массив', '[]'],
    ['число', '42'],
    ['нет метки', shell({ app: undefined })],
    ['чужая метка', shell({ app: 'other' })],
    ['версия 0', shell({ format: 0 })],
    ['более новая версия', shell({ format: 2 })],
    ['дробная версия', shell({ format: 1.5 })],
    ['нет даты', shell({ createdAt: undefined })],
    ['дата словами', shell({ createdAt: 'вчера' })],
    ['25 часов', shell({ createdAt: '2026-10-30T25:05:00+03:00' })],
    ['31 ноября', shell({ createdAt: '2026-11-31T10:00:00+03:00' })],
  ])('%s — копия повреждена', (_, text) => {
    expect(readBackup(text)).toEqual({ ok: false })
  })

  it('дата читается как записана, без пересчёта пояса', () => {
    const result = readBackup(shell({ createdAt: '2026-10-30T14:05:00+10:00' }))
    expect(result.ok && result.backup.createdAt).toEqual({
      year: 2026,
      month: 10,
      day: 30,
      hour: 14,
      minute: 5,
    })
  })

  it('без настроек — настройки по умолчанию, копия годная', () => {
    const result = readBackup(shell({ settings: undefined }))
    expect(result.ok && result.backup.settings).toEqual(loadSettings(null))
  })

  it('повреждённая статистика режима — пустая только у него', () => {
    const file = JSON.parse(createBackup(NOW, filledStorage()).text)
    file.progress.stats.intervals = 'мусор'
    const result = readBackup(JSON.stringify(file))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.backup.progress.stats.intervals).toEqual(emptyModeStats())
    expect(result.backup.progress.stats.rhythm).toEqual(file.progress.stats.rhythm)
  })

  it('круг «сохранить → загрузить» возвращает те же данные', () => {
    const storage = filledStorage()
    const result = readBackup(createBackup(NOW, storage).text)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.backup.settings).toEqual(loadSettings(storage))
    expect(result.backup.progress).toEqual(loadProgress(storage))
  })
})

describe('Восстановление из копии', () => {
  function backupOf(storage: SettingsStorage): Backup {
    const result = readBackup(createBackup(NOW, storage).text)
    if (!result.ok) throw new Error('копия не читается')
    return result.backup
  }

  it('обе части записаны и читаются', () => {
    const backup = backupOf(filledStorage())
    const target = memoryStorage()
    expect(restoreBackup(backup, target)).toBe(true)
    expect(loadSettings(target)).toEqual(backup.settings)
    expect(loadProgress(target)).toEqual(backup.progress)
  })

  it('сбой записи настроек — обе части прежние', () => {
    const backup = backupOf(filledStorage())
    const target = memoryStorage()
    saveSettings({ ...loadSettings(target), keyLabels: true }, target)
    saveModeStats(
      'sequences',
      aggregate([{ kind: 'note', key: 'bass:48', outcome: 'clean', ms: 800 }]),
      target,
    )
    const before = new Map(target.data)
    const failing: SettingsStorage = {
      getItem: target.getItem,
      setItem: (key, value) => {
        if (key === 'piaono.settings.v1') throw new Error('QuotaExceededError')
        target.setItem(key, value)
      },
    }
    expect(restoreBackup(backup, failing)).toBe(false)
    expect(target.data).toEqual(before)
  })

  it('сбой записи на пустом устройстве — прогресс пустой, как до вызова', () => {
    const backup = backupOf(filledStorage())
    const target = memoryStorage()
    const failing: SettingsStorage = {
      getItem: target.getItem,
      setItem: (key, value) => {
        if (key === 'piaono.settings.v1') throw new Error('QuotaExceededError')
        target.setItem(key, value)
      },
    }
    expect(restoreBackup(backup, failing)).toBe(false)
    expect(loadProgress(target)).toEqual(loadProgress(memoryStorage()))
    expect(loadSettings(target)).toEqual(loadSettings(null))
  })

  it('хранилища нет — не получилось', () => {
    expect(restoreBackup(backupOf(filledStorage()), null)).toBe(false)
  })
})

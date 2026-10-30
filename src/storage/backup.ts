// Резервная копия (C-APP-4): все настройки и весь прогресс в одном файле JSON. Здесь — сборка
// копии, проверка её оболочки и замена данных на устройстве. Сам файл (скачать, «Поделиться»,
// выбрать) — забота ui/: этот слой знает только текст.

import { browserStorage, type SettingsStorage } from './browserStorage'
import { loadProgress, readProgress, type Progress } from './progress'
import { loadSettings, readSettings, type Settings } from './settings'

const SETTINGS_KEY = 'piaono.settings.v1'
const PROGRESS_KEY = 'piaono.progress.v1'

/** Метка приложения: по ней чужой файл JSON отличается от копии. */
const BACKUP_APP = 'piaono'

/**
 * Версия формата файла. Новая версия приложения читает все версии до своей включительно
 * (INV-4); копия более новой версии считается повреждённой (Р-5).
 */
export const BACKUP_FORMAT = 1

/** Файл больше этого — не копия: копия реального ученика в сотни раз меньше [→ C-APP-4, LIM-3]. */
export const MAX_BACKUP_BYTES = 1_000_000

/**
 * Дата копии — «настенное» время устройства, где её сделали: то, что ученик видел на часах.
 * Часовой пояс не пересчитывается, иначе копия из Москвы на планшете в другом поясе
 * показала бы другое время (design, Д-2).
 */
export interface BackupDate {
  year: number
  /** 1–12. */
  month: number
  day: number
  hour: number
  minute: number
}

export interface Backup {
  createdAt: BackupDate
  settings: Settings
  progress: Progress
}

export type BackupReadResult = { ok: true; backup: Backup } | { ok: false }

const two = (n: number) => String(n).padStart(2, '0')

/** Местное время со смещением: «2026-10-30T14:05:00+03:00». */
function localIso(now: Date): string {
  const offset = -now.getTimezoneOffset()
  const sign = offset >= 0 ? '+' : '-'
  const abs = Math.abs(offset)
  return (
    `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}` +
    `T${two(now.getHours())}:${two(now.getMinutes())}:${two(now.getSeconds())}` +
    `${sign}${two(Math.floor(abs / 60))}:${two(abs % 60)}`
  )
}

/**
 * Имя файла по дате копии: только латиница, цифры и дефисы — Windows запрещает двоеточия,
 * а кириллицу показывают не все файловые менеджеры (Р-8).
 */
export function backupFileName(date: BackupDate): string {
  const { year, month, day, hour, minute } = date
  return `piaono-backup-${year}-${two(month)}-${two(day)}-${two(hour)}-${two(minute)}.json`
}

/**
 * Копия текущих настроек и прогресса. Пишутся уже прочитанные данные, а не сырые строки:
 * в файл не попадает мусор, а пустое устройство даёт значения по умолчанию само (OB-7).
 */
export function createBackup(
  now: Date,
  storage: SettingsStorage | null = browserStorage(),
): { fileName: string; text: string } {
  const createdAt = localIso(now)
  const file = {
    app: BACKUP_APP,
    format: BACKUP_FORMAT,
    createdAt,
    settings: loadSettings(storage),
    progress: loadProgress(storage),
  }
  return {
    fileName: backupFileName(readBackupDate(createdAt)!),
    text: JSON.stringify(file, null, 2),
  }
}

/** Дата копии из строки ISO: поля как записаны, без пересчёта пояса; нечитаемая — null. */
function readBackupDate(value: unknown): BackupDate | null {
  if (typeof value !== 'string') return null
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value)
  if (!match) return null
  const [year, month, day, hour, minute] = match.slice(1).map(Number)
  const valid =
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= new Date(Date.UTC(year, month, 0)).getUTCDate() &&
    hour <= 23 &&
    minute <= 59
  return valid ? { year, month, day, hour, minute } : null
}

/**
 * Прочитать файл копии. Проверяется только оболочка: объект JSON, метка приложения,
 * знакомая версия формата и дата (Р-4). Содержимое читается так же терпимо, как данные
 * на устройстве: повреждённая часть получает значение по умолчанию (OB-5).
 */
export function readBackup(text: string): BackupReadResult {
  try {
    const parsed: unknown = JSON.parse(text)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return { ok: false }
    const { app, format, createdAt, settings, progress } = parsed as Record<string, unknown>
    const knownFormat =
      typeof format === 'number' &&
      Number.isInteger(format) &&
      format >= 1 &&
      format <= BACKUP_FORMAT
    const date = readBackupDate(createdAt)
    if (app !== BACKUP_APP || !knownFormat || !date) return { ok: false }
    return {
      ok: true,
      backup: {
        createdAt: date,
        settings: readSettings(settings),
        progress: readProgress(progress),
      },
    }
  } catch {
    return { ok: false }
  }
}

/**
 * Заменить настройки и прогресс данными копии — обе части вместе (INV-5). Если вторую часть
 * записать не удалось, первая возвращается прежней; результат — получилось ли.
 */
export function restoreBackup(
  backup: Backup,
  storage: SettingsStorage | null = browserStorage(),
): boolean {
  if (!storage) return false
  let previousProgress: string | null
  try {
    previousProgress = storage.getItem(PROGRESS_KEY)
  } catch {
    return false
  }
  try {
    storage.setItem(PROGRESS_KEY, JSON.stringify(backup.progress))
  } catch {
    return false
  }
  try {
    storage.setItem(SETTINGS_KEY, JSON.stringify(backup.settings))
    return true
  } catch {
    try {
      // Прежней записи не было — пустой прогресс читается так же, как её отсутствие.
      storage.setItem(PROGRESS_KEY, previousProgress ?? JSON.stringify(readProgress(null)))
    } catch {
      // Вернуть не вышло: хранилище отказывает в записи целиком, значит и копия не легла.
    }
    return false
  }
}

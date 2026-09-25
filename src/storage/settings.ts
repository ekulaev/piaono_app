// Единственное место, где приложение обращается к localStorage. Остальной код работает
// с типизированными настройками и не знает, где и как они лежат.

export interface Settings {
  /** Скольжение пальцем по клавишам играет ноты. */
  glissando: boolean
}

const DEFAULT_SETTINGS: Settings = { glissando: false }

/** Версия в ключе: если формат поменяется, старые данные не прочитаются как новые. */
const STORAGE_KEY = 'piaono.settings.v1'

/** Минимальная часть интерфейса Storage, которая нам нужна (удобно подменять в тестах). */
export type SettingsStorage = Pick<Storage, 'getItem' | 'setItem'>

function browserStorage(): SettingsStorage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    // Некоторые браузеры бросают исключение при самом обращении к localStorage.
    return null
  }
}

/**
 * Настройки с устройства. Отсутствующие, битые или недоступные данные — не ошибка:
 * в этом случае действуют значения по умолчанию.
 */
export function loadSettings(storage: SettingsStorage | null = browserStorage()): Settings {
  try {
    const raw = storage?.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return { ...DEFAULT_SETTINGS }
    const glissando = (parsed as Record<string, unknown>).glissando
    return { glissando: typeof glissando === 'boolean' ? glissando : DEFAULT_SETTINGS.glissando }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

/**
 * Сохранить настройки. Если сохранить нельзя (приватный режим, нет места), приложение
 * продолжает работать — настройка просто не переживёт перезапуск.
 */
export function saveSettings(
  settings: Settings,
  storage: SettingsStorage | null = browserStorage(),
): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Молча: потеря настройки не должна ронять упражнение.
  }
}

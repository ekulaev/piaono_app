// Настройки на устройстве. Остальной код работает с типизированными настройками и не знает,
// где и как они лежат.

import { DEFAULT_MODE, isModeId, type ModeId } from '../engine/modes/modes'
import {
  DEFAULT_SEQUENCE_SETTINGS,
  readSequenceSettings,
  type SequenceSettings,
} from '../engine/sequences/settings'
import type { PreferredInput } from '../midi/types'
import { browserStorage, type SettingsStorage } from './browserStorage'

export type { SettingsStorage }

export interface Settings {
  /** Скольжение пальцем по клавишам играет ноты. */
  glissando: boolean
  /** MIDI-вход, который выбрал ученик; null — выбора не было. */
  preferredInput: PreferredInput | null
  /** Режим, который запускает «Старт» на главном экране. */
  activeMode: ModeId
  /** Подтверждённые настройки режимов (у «Разминки» их нет). */
  modeSettings: { sequences: SequenceSettings }
}

const DEFAULT_SETTINGS: Settings = {
  glissando: false,
  preferredInput: null,
  activeMode: DEFAULT_MODE,
  modeSettings: { sequences: DEFAULT_SEQUENCE_SETTINGS },
}

/** Версия в ключе: если формат поменяется, старые данные не прочитаются как новые. */
const STORAGE_KEY = 'piaono.settings.v1'

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
    const { glissando, preferredInput, activeMode, modeSettings } = parsed as Record<
      string,
      unknown
    >
    const savedModes = typeof modeSettings === 'object' && modeSettings !== null ? modeSettings : {}
    return {
      glissando: typeof glissando === 'boolean' ? glissando : DEFAULT_SETTINGS.glissando,
      preferredInput: readPreferredInput(preferredInput),
      // Неизвестный или недоступный режим — не ошибка: просто начинаем с режима по умолчанию.
      activeMode: isModeId(activeMode) ? activeMode : DEFAULT_MODE,
      modeSettings: {
        sequences: readSequenceSettings((savedModes as Record<string, unknown>).sequences),
      },
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

/** Сохранённый вход: объект со строковыми id и name, иначе «выбора не было». */
function readPreferredInput(value: unknown): PreferredInput | null {
  if (typeof value !== 'object' || value === null) return null
  const { id, name } = value as Record<string, unknown>
  return typeof id === 'string' && typeof name === 'string' ? { id, name } : null
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

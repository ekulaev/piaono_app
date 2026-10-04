// Настройки на устройстве. Остальной код работает с типизированными настройками и не знает,
// где и как они лежат.

import { DEFAULT_MODE, isModeId, type ModeId } from '../engine/modes/modes'
import {
  DEFAULT_SEQUENCE_SETTINGS,
  readSequenceSettings,
  type SequenceSettings,
} from '../engine/sequences/settings'
import {
  DEFAULT_RHYTHM_SETTINGS,
  readRhythmSettings,
  type RhythmSettings,
} from '../engine/rhythm/settings'
import {
  DEFAULT_WARMUP_SETTINGS,
  readWarmupSettings,
  type WarmupSettings,
} from '../engine/warmup/settings'
import {
  DEFAULT_INTERVALS_SETTINGS,
  readIntervalsSettings,
  type IntervalsSettings,
} from '../engine/solfege/intervals/settings'
import {
  DEFAULT_DURATIONS_SETTINGS,
  readDurationsSettings,
  type DurationsSettings,
} from '../engine/solfege/durations/settings'
import type { PreferredInput } from '../midi/types'
import { browserStorage, type SettingsStorage } from './browserStorage'

export type { SettingsStorage }

export interface Settings {
  /** Скольжение пальцем по клавишам играет ноты. */
  glissando: boolean
  /** MIDI-вход, который выбрал ученик; null — выбора не было. */
  preferredInput: PreferredInput | null
  /**
   * Язык, который выбрал ученик (C-APP-3); null — выбора не было, действует язык системы.
   * Есть ли такой язык в приложении, решает `resolveLanguage`: хранилище языков не знает.
   */
  language: string | null
  /** Показывать нажатые ноты (C-STF-8, OB-21); по умолчанию да. */
  noteEchoEnabled: boolean
  /** Сколько миллисекунд карточка нажатой ноты остаётся на экране (C-STF-8). */
  noteEchoMs: number
  /** Подписи нот на белых клавишах (C-KBD-3): одно значение на все режимы; по умолчанию выключено. */
  keyLabels: boolean
  /** Режим, который запускает «Старт» на главном экране. */
  activeMode: ModeId
  /**
   * Подтверждённые настройки режимов. «Контур» хранит свои отдельно —
   * того же вида, «Нот в шаге» и «Подсказки» у него не используются (C-STF-5). У «Ритма» —
   * свои (C-STF-6).
   */
  modeSettings: {
    sequences: SequenceSettings
    contour: SequenceSettings
    rhythm: RhythmSettings
    /** Настройки «Разминки» (C-STF-9): время хода, ключ, диапазоны, тональность. */
    warmup: WarmupSettings
    /** Настройки «Интервалов» (C-SOL-2): что тренировать, заданий в сессии, автопереход. */
    intervals: IntervalsSettings
    durations: DurationsSettings
  }
}

/** Время показа ноты: от 0,5 до 5 с с шагом 0,5 с, по умолчанию 1 с [→ C-STF-8, LIM-2]. */
export const MIN_NOTE_ECHO_MS = 500
export const MAX_NOTE_ECHO_MS = 5000
export const NOTE_ECHO_STEP_MS = 500
export const DEFAULT_NOTE_ECHO_MS = 1000

const DEFAULT_SETTINGS: Settings = {
  glissando: false,
  preferredInput: null,
  language: null,
  noteEchoEnabled: true,
  noteEchoMs: DEFAULT_NOTE_ECHO_MS,
  keyLabels: false,
  activeMode: DEFAULT_MODE,
  modeSettings: {
    sequences: DEFAULT_SEQUENCE_SETTINGS,
    contour: DEFAULT_SEQUENCE_SETTINGS,
    rhythm: DEFAULT_RHYTHM_SETTINGS,
    warmup: DEFAULT_WARMUP_SETTINGS,
    intervals: DEFAULT_INTERVALS_SETTINGS,
    durations: DEFAULT_DURATIONS_SETTINGS,
  },
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
    const {
      glissando,
      preferredInput,
      language,
      noteEchoEnabled,
      noteEchoMs,
      keyLabels,
      activeMode,
      modeSettings,
    } = parsed as Record<string, unknown>
    const savedModes = typeof modeSettings === 'object' && modeSettings !== null ? modeSettings : {}
    return {
      glissando: typeof glissando === 'boolean' ? glissando : DEFAULT_SETTINGS.glissando,
      preferredInput: readPreferredInput(preferredInput),
      language: typeof language === 'string' && language !== '' ? language : null,
      // Нет поля или не boolean — показ включён: старые данные не выключают новую функцию.
      noteEchoEnabled: typeof noteEchoEnabled === 'boolean' ? noteEchoEnabled : true,
      noteEchoMs: readNoteEchoMs(noteEchoMs),
      // Нет поля или не boolean — выключено: старые данные не меняют привычный вид клавиатуры.
      keyLabels: typeof keyLabels === 'boolean' ? keyLabels : DEFAULT_SETTINGS.keyLabels,
      // Неизвестный или недоступный режим — не ошибка: просто начинаем с режима по умолчанию.
      activeMode: isModeId(activeMode) ? activeMode : DEFAULT_MODE,
      modeSettings: {
        sequences: readSequenceSettings((savedModes as Record<string, unknown>).sequences),
        contour: readSequenceSettings((savedModes as Record<string, unknown>).contour),
        rhythm: readRhythmSettings((savedModes as Record<string, unknown>).rhythm),
        warmup: readWarmupSettings((savedModes as Record<string, unknown>).warmup),
        intervals: readIntervalsSettings((savedModes as Record<string, unknown>).intervals),
        durations: readDurationsSettings((savedModes as Record<string, unknown>).durations),
      },
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

/** Время показа ноты: число из допустимых значений, иначе значение по умолчанию. */
function readNoteEchoMs(value: unknown): number {
  const valid =
    typeof value === 'number' &&
    value >= MIN_NOTE_ECHO_MS &&
    value <= MAX_NOTE_ECHO_MS &&
    value % NOTE_ECHO_STEP_MS === 0
  return valid ? value : DEFAULT_NOTE_ECHO_MS
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

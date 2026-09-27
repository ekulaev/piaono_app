// Прогресс ученика на устройстве — отдельно от настроек и со своей версией формата:
// уровни подсказок (C-STF-3) и статистика режимов (C-STF-4) в одной записи.

import { readHintProgress, type HintProgress } from '../engine/sequences/hints'
import {
  readPracticeStats,
  type ModeStats,
  type PracticeStats,
  type StatsMode,
} from '../engine/stats/stats'
import { browserStorage, type SettingsStorage } from './browserStorage'

const STORAGE_KEY = 'piaono.progress.v1'

export interface Progress {
  hints: HintProgress
  stats: PracticeStats
}

/** Сырая запись: объект или пустой, если данных нет или они не читаются. */
function readRaw(storage: SettingsStorage | null): Record<string, unknown> {
  try {
    const raw = storage?.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : null
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

/**
 * Весь прогресс. Каждая часть читается независимо: повреждённые уровни — уровень 3,
 * повреждённый режим статистики — пустой. Запись этапа 5 без статистики тоже читается.
 */
export function loadProgress(storage: SettingsStorage | null = browserStorage()): Progress {
  const raw = readRaw(storage)
  return { hints: readHintProgress(raw.hints), stats: readPracticeStats(raw.stats) }
}

export function loadHintProgress(storage: SettingsStorage | null = browserStorage()): HintProgress {
  return loadProgress(storage).hints
}

/**
 * Заменить одну часть и записать. Остальное берётся из текущей записи, поэтому уровни
 * подсказок и статистика не стирают друг друга (C-STF-4, INV-4). Если записать нельзя —
 * молча: упражнение важнее памяти о прогрессе.
 */
function update(change: (progress: Progress) => Progress, storage: SettingsStorage | null) {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(change(loadProgress(storage))))
  } catch {
    // Приватный режим или нет места: прогресс просто не переживёт перезапуск.
  }
}

export function saveHintProgress(
  hints: HintProgress,
  storage: SettingsStorage | null = browserStorage(),
): void {
  update((progress) => ({ ...progress, hints }), storage)
}

export function saveModeStats(
  mode: StatsMode,
  stats: ModeStats,
  storage: SettingsStorage | null = browserStorage(),
): void {
  update((progress) => ({ ...progress, stats: { ...progress.stats, [mode]: stats } }), storage)
}

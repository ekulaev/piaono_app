// Прогресс ученика на устройстве — отдельно от настроек и со своей версией формата.
// Сейчас это уровни подсказок (C-STF-3); статистика этапа 6 ляжет сюда же.

import {
  DEFAULT_HINT_PROGRESS,
  readHintProgress,
  type HintProgress,
} from '../engine/sequences/hints'
import { browserStorage, type SettingsStorage } from './browserStorage'

const STORAGE_KEY = 'piaono.progress.v1'

/** Уровни подсказок. Отсутствующие, битые или недоступные данные — уровень 3 у обоих ключей. */
export function loadHintProgress(storage: SettingsStorage | null = browserStorage()): HintProgress {
  try {
    const raw = storage?.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_HINT_PROGRESS
    const parsed: unknown = JSON.parse(raw)
    const hints =
      typeof parsed === 'object' && parsed !== null
        ? (parsed as Record<string, unknown>).hints
        : undefined
    return readHintProgress(hints)
  } catch {
    return DEFAULT_HINT_PROGRESS
  }
}

/** Сохранить уровни. Если нельзя — молча: упражнение важнее памяти об уровне. */
export function saveHintProgress(
  hints: HintProgress,
  storage: SettingsStorage | null = browserStorage(),
): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify({ hints }))
  } catch {
    // Приватный режим или нет места: уровень просто не переживёт перезапуск.
  }
}

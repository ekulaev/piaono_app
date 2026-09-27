# Design

## Context

- Статистика: `engine/stats` — `ModeStats` с таблицами `notes`, `intervals`, `figures`, `difficulty`,
  `medianAvg`, `MIN_ATTEMPTS`, подписи `label()` в `improvements.ts`.
- Хранение: `storage/progress.ts` — `saveModeStats`, `saveHintProgress` (read-modify-write).
- Экраны: `App` — `screen: 'main' | 'settings' | 'check'`, `openSettings()` останавливает упражнение;
  `ScreenHeader`, `TopBar`, `ui/icons`.

## Goals / Non-Goals

**Goals:** сводка режима — чистая функция с тестами; экран и диалог — в `ui/`; сброс — через
`storage/progress.ts`.

**Non-Goals:** история по дням, графики, сброс всего, сброс одного места.

## Decisions

### D1. Сводка — `engine/stats/summary.ts`

- `summarizeMode(mode, stats): ModeSummary` → `{ totals: { attempts, cleanShare, avgMs | null }, lists: { title, items }[] }`.
- Основная таблица и списки — таблица `MODE_VIEW` по режиму (C-STF-7, LIM-1).
- `avgMs` — среднее, взвешенное по `timeCount`; `null`, если времён нет.
- Трудность — `difficulty(item, medianAvg(таблица))` из `weights.ts`: та же, что для выбора.
- Отбор: `attempts ≥ MIN_ATTEMPTS`, трудность > 0; сортировка: трудность ↓, неудачи ↓, подпись.

### D2. Экран — `ui/progress/ProgressScreen.tsx`

- `ScreenHeader` («Назад» → `main`), `ChoiceGroup` режимов (своё состояние, начальное — активный).
- Числа, списки в колонках (grid, до двух колонок), блок «Подсказки», кнопки сброса; `NoProgress`-текст.
- `App`: `screen: 'progress'`, `openProgress()` = `stopExercises()` + `closeMenu()`; после сброса —
  обновить `practice`, чтобы главный экран сразу показывал приглашение.

### D3. Диалог — `ui/ConfirmDialog.tsx`

- Нативный `<dialog>` с `showModal()`: фокус внутри, Esc — событие `cancel`, затемнение `::backdrop`.
- Касание по `::backdrop` = клик по самому `dialog` вне окна-содержимого → «Нет».
- Фокус при открытии — на «Нет» (`autoFocus`). Без анимации.

**Альтернатива:** своё окно на `div`. Отклонена: пришлось бы вручную держать фокус и Esc.

### D4. Сброс — `storage/progress.ts`

- `resetModeStats(mode)` = `saveModeStats(mode, emptyModeStats())`.
- `resetHintProgress()` = `saveHintProgress(DEFAULT_HINT_PROGRESS)`.

### D5. Панель

- `TopBar`: кнопка «Прогресс» между «Обновить» и «Настройками», `current: 'settings' | 'progress' | null`.
- Значок `ProgressIcon` — три столбика по возрастанию, линия 2.5.

## Risks / Trade-offs

- **[Высота «Последовательностей»]** Два списка по 5 + числа + подсказки + кнопки на 1280×800. →
  Списки в две колонки; проверка headless-снимком.
- **[`<dialog>` на Android Chrome]** Поддерживается с Chrome 37. → Проверка на планшете.

## Migration Plan

Хранение не меняется. Откат — revert PR.

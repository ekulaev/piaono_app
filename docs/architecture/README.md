# Архитектура тренажёра

> **Что это:** описание приложения таким, какое оно есть сейчас: из чего состоит, где что
> лежит в коде, как идут данные. Модель C4: от общей картины (C1) к компонентам кода (C3).
> **Чем это не является:** здесь нет требований и подробностей поведения. Требования — в
> `PSD/`, нормативный контракт поведения — в `openspec/specs/`. Документация на них ссылается.
> **Живой документ:** обновляется при архивации каждого change'а, который меняет состав,
> слои, данные или сценарии (`PSD/README.md`, шаг 6). Сверено с кодом: `main`, 31.10.2026.

## Как читать

| Файл | Вопрос, на который отвечает |
|---|---|
| [C1 Контекст](<C1 Контекст.md>) | Кто пользуется и с чем приложение связано снаружи |
| [C2 Контейнеры](<C2 Контейнеры.md>) | Из каких работающих частей состоит: приложение, service worker, хранилище, сайт, деплой |
| [C3 Компоненты](<C3 Компоненты.md>) | Какие слои и модули внутри приложения и кто от кого зависит |
| [Сценарии](<Сценарии.md>) | Как данные идут в главных путях: нота → отклик, сон планшета, запись прогресса, обновление, копия |
| [Данные](<Данные.md>) | Что лежит в `localStorage`, какая спецификация ввела каждое поле |

Четвёртого уровня C4 («код») нет: код читается сам, а такая схема устаревает первой.

## Карта функций

Что видит ученик → какие спецификации это задали → где нормативный контракт → где код →
какие данные на устройстве. Закрытые спецификации — история решений; актуальное поведение —
в capability OpenSpec.

| Функция | Спецификации | Capability OpenSpec | Код | Данные |
|---|---|---|---|---|
| Связь с пианино, выбор входа, авто-реконнект | `C-MIDI-1` | `midi-input`, `connection-status` | `midi/`; статус — `ui/ConnectionStatus.tsx`, `ui/connectionTexts.ts` | `preferredInput` |
| Верхняя панель, «Настройки», «Проверка пианино» | `C-APP-1`, `C-APP-6` | `app-settings` | `ui/topbar/`, `ui/settings/`, `ui/CheckScreen.tsx` | `settingsBarCollapsed` |
| Оффлайн и «Обновить» | `C-MIDI-1`, `C-APP-1` | `pwa-shell` | `vite.config.ts`, `ui/useAppUpdate.ts` | — |
| Экранная клавиатура | `C-KBD-1` | `piano-keyboard` | `engine/keyboard/`, `ui/keyboard/` | `glissando` |
| Мини-клавиатура навигации | `C-KBD-2` | `mini-keyboard` | `ui/keyboard/Keyboard.tsx` | — |
| Подписи на клавишах | `C-KBD-3` | `key-labels` | `ui/keyboard/` | `keyLabels` |
| Компактный экран, приглашение «нечем играть» | `C-APP-5` | `compact-screen` | `engine/keyboard/availability.ts`, `ui/screen/`, `ui/PlayInvite.tsx` | `keyboardVisible` |
| Меню режимов | `C-MODE-1` | `mode-menu` | `engine/modes/`, `ui/modes/` | `activeMode`, `modeSettings` |
| «Разминка» | `C-STF-1`, `C-STF-9` | `staff-exercise`, `warmup-settings` | `engine/staff/`, `engine/warmup/`, `ui/staff/`, `ui/warmup/` | `modeSettings.warmup`, `stats.warmup` |
| «Последовательности» и подсказки «якорь + интервал» | `C-STF-2`, `C-STF-3` | `sequences-mode`, `interval-hints` | `engine/sequences/`, `ui/sequences/` | `modeSettings.sequences`, `hints`, `stats.sequences` |
| «Контур» | `C-STF-5` | `contour-mode` | `engine/sequences/` (проверка `contour`), `ui/sequences/` | `modeSettings.contour`, `stats.contour` |
| «Ритм» | `C-STF-6` | `rhythm-mode` | `engine/rhythm/`, `ui/rhythm/` | `modeSettings.rhythm`, `stats.rhythm` |
| Статистика, трудные места чаще, «Что улучшилось» | `C-STF-4` | `practice-stats` | `engine/stats/`, `ui/stats/` | `stats` |
| Экран «Прогресс», сброс | `C-STF-7` | `progress-screen` | `ui/progress/` | `stats`, `hints` |
| Показ нажатых нот | `C-STF-8` | `note-echo` | `engine/noteEcho/`, `ui/echo/` | `noteEchoEnabled`, `noteEchoMs` |
| Подсказка «?» | `C-APP-2` | `hint` | `ui/hints/` | — |
| Язык приложения | `C-APP-3` | `localization` | `i18n/`, `ui/i18n/`, `ui/topbar/LanguageMenu.tsx` | `language` |
| Резервная копия | `C-APP-4` | `progress-backup` | `storage/backup.ts`, `ui/settings/BackupGroup.tsx`, `ui/settings/backupFile.ts` | оба ключа целиком |
| Ядро заданий сольфеджио | `C-SOL-1` | `solfege-tasks` | `engine/solfege/`, `ui/solfege/` | — |
| «Интервалы» | `C-SOL-2` | `intervals-mode` | `engine/solfege/intervals/`, `ui/solfege/intervalsView.ts` | `modeSettings.intervals`, `stats.intervals` |
| «Длительности» | `C-SOL-3` | `durations-mode` | `engine/solfege/durations/`, `ui/solfege/durationsView.ts` | `modeSettings.durations`, `stats.durations` |
| Сайт-лендинг (в работе) | `C-LAUNCH-1` | — | `site/` | — |

Пути кода — от `src/`, кроме `vite.config.ts` и `site/`. «Данные»: поля `piaono.settings.v1`
и, для `stats` и `hints`, `piaono.progress.v1` (подробно — [Данные](<Данные.md>)).

## Как это помогает новой спецификации

1. Найти функцию в карте выше: какие закрытые спецификации описали её и какая capability
   держит актуальный контракт.
2. По [C3](<C3 Компоненты.md>) понять, какие компоненты затронет изменение. В спецификации это
   записывается в блок «Затрагиваемая архитектура».
3. Если меняются данные на устройстве — свериться с [Данными](<Данные.md>) и правилами
   CLAUDE.md §7.

## Когда обновлять

В коммите `/opsx:archive`, если change:
- добавил функцию — строка в карте функций;
- добавил или перенёс модуль, поменял зависимости слоёв — C3;
- добавил поле в `localStorage` — «Данные»;
- поменял путь из «Сценариев» или внешнюю связь — соответствующий файл.

Если change ничего из этого не трогал, документация не меняется.

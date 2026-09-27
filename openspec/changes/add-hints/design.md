# Design

## Context

- `ui/ConfirmDialog.tsx` — модальный `<dialog>`: фокус, Esc (`cancel`), касание затемнения.
- `ui/connectionTexts.ts` — `CONNECTION_HELP` (строка «что делать»), `SettingsRow` с `note`.
- `ui/modes/ModeMenu.tsx` — шапка экрана режима: «Назад», `<h2>` заголовок, «Закрыть».
- Ноты: `drawSequence(host, geometry, view)` и `drawRhythm(host, geometry, view)` — рисуют целиком
  по `StaffGeometry`, отметки задаются видом (`pending` — без отметок).
- PWA кэширует `**/*.{js,css,html,ico,png,svg,webmanifest}`.

## Goals / Non-Goals

**Goals:** один компонент кнопки и одно окно; содержимое — типизированные данные; ноты — тем же кодом.

**Non-Goals:** видео, звук, ссылки, автоматические подсказки, фото подключения (появятся с
реальными снимками).

## Decisions

### D1. Данные — `ui/hints/hints.ts`

```ts
type HintBlock =
  | { kind: 'text'; text: string }
  | { kind: 'steps'; steps: string[] }
  | { kind: 'image'; src: string; caption: string }
  | { kind: 'notes'; clef: Clef; pitches: number[]; labels?: string[] }
  | { kind: 'rhythm'; meter: Meter; figures: FigureId[] }
interface Hint { title: string; blocks: HintBlock[] }
export const HINTS = { 'connection.no-device': {...}, 'mode.rhythm': {...}, ... } satisfies Record<string, Hint>
export type HintId = keyof typeof HINTS
```

- `HintId` — ключи объекта: `<HintButton id="...">` с несуществующим id не компилируется (INV-3).
- Подсказки связи — `connection.<state>`; для `connecting` и `connected` — `connection.guide`.
- `CONNECTION_HELP` удаляется, его строки становятся первыми абзацами подсказок.

### D2. Кнопка — `ui/hints/HintButton.tsx`

- `<HintButton id placement?="end" | "start" | "inline" beforeOpen? />`: значок «?» в круге (SVG,
  `line-icon`), `aria-label="Подсказка: <title>"`, ≥ 3.5rem.
- `beforeOpen` — для мест, где может идти упражнение (OB-6): `App` передаёт остановку. В 8в все места
  без упражнения — параметр не используется, но предусмотрен.
- Одно окно: кнопка хранит своё `open`; модальный `<dialog>` не даёт нажать вторую кнопку, пока
  открыто первое.

### D3. Окно — `ui/hints/HintDialog.tsx`

- Модальный `<dialog>` как у `ConfirmDialog`; `width: 80vw; max-height: 80vh`; внутри сетка
  `auto / minmax(0, 1fr)`: шапка (заголовок + «Закрыть») и тело с `overflow-y: auto; overflow-x: hidden`.
- Ползунок: `scrollbar-width: auto; scrollbar-color: var(--ink) var(--paper)` и `::-webkit-scrollbar`
  12px — Chrome на Android берёт второе.
- Закрытие: «Закрыть», `cancel` (Esc / системная «Назад»), клик по самому `<dialog>`; фокус — обратно
  на кнопку (`buttonRef.focus()`).
- Изображения: `max-width: 100%`, `height: auto`; текст — `overflow-wrap: anywhere`.

### D4. Ноты в подсказке — `ui/hints/HintNotes.tsx`

- Свой контейнер фиксированной высоты (≈ 8rem), ширина — окна; `staffGeometry(width, height)` и
  `drawSequence` / `drawRhythm` с видом «без отметок». Подписи (`labels`, например «↑3») — через
  полосу подсказок `drawSequence`, если заданы.
- Рисуется после готовности шрифта (`useMusicFont`), как стан упражнений.

### D5. Места

- `SettingsScreen`: строка «Пианино» без `note`; `<HintButton id={connectionHintId(state)} />`.
- `ModeMenu`: `<HintButton id={`mode.${modeId}`} placement="inline" />` рядом с заголовком.

## Risks / Trade-offs

- **[Толстый ползунок на Android]** Мобильный Chrome может рисовать тонкий оверлейный ползунок и
  игнорировать стили. → Проверка на планшете; содержимое первых подсказок короткое.
- **[Качество текстов]** Тексты подсказок — первая версия. → Владелец правит данные в одном файле.

## Migration Plan

Хранение не меняется. Откат — revert PR.

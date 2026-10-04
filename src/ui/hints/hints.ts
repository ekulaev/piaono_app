// Содержимое подсказок (C-APP-2): все подсказки приложения в одном месте. Новая подсказка —
// запись здесь и одна <HintButton id="..."> на экране; окно одно на всё приложение.
// Слова — в файлах перевода (C-APP-2, C-APP-3): здесь только ключи и устройство подсказки.

import type { ModeId } from '../../engine/modes/modes'
import { DURATION_FRACTION } from '../../engine/solfege/durations/durations'
import type { Mark } from '../../engine/rhythm/evaluate'
import type { FigureId } from '../../engine/rhythm/figures'
import type { Meter } from '../../engine/rhythm/generate'
import type { Clef } from '../../engine/staff/pickNote'
import type { MessageKey } from '../../i18n'
import type { ConnectionState } from '../../midi/types'

/** Блок подсказки. Порядок блоков — порядок на экране. */
export type HintBlock =
  | { kind: 'text'; text: MessageKey }
  | { kind: 'steps'; steps: MessageKey[] }
  /** Изображение из сборки (работает без сети); подпись обязательна — смысл не в одной картинке. */
  | { kind: 'image'; src: string; caption: MessageKey }
  /**
   * Нотный пример, как в «Последовательностях»: ключ и ноты; anchor — опорная нота с названием,
   * intervals — полоса подсказок «↑3» над нотами.
   */
  | { kind: 'notes'; clef: Clef; pitches: number[]; anchor?: number; intervals?: boolean }
  /** Ритмический пример, как в «Ритме»: фигуры одного такта и, если нужно, оценки нот. */
  | { kind: 'rhythm'; meter: Meter; figures: FigureId[]; marks?: Mark[] }
  /**
   * Таблица соответствий (сольфеджио: «клавиша → интервал», русские октавы → научные). Ячейка —
   * ключ перевода или текст, который не переводится («C4»).
   */
  | { kind: 'table'; head: HintCell[]; rows: HintCell[][] }

export type HintCell = MessageKey | { raw: string }

export interface Hint {
  title: MessageKey
  blocks: HintBlock[]
}

/** Русская нумерация октав и научные названия (C-SOL-1, OB-20; приложение Г). */
const OCTAVES_TABLE: HintBlock = {
  kind: 'table',
  head: ['hint.octaves.russian', 'hint.octaves.scientific'],
  rows: ([2, 3, 4, 5, 6] as const).map((n) => [`octave.${n}`, { raw: `C${n}` }]),
}

const CONNECT_STEPS: HintBlock = {
  kind: 'steps',
  steps: ['hint.connect.step1', 'hint.connect.step2', 'hint.connect.step3'],
}

export const HINTS = {
  'connection.guide': {
    title: 'hint.connection.guide.title',
    blocks: [
      CONNECT_STEPS,
      { kind: 'text', text: 'hint.connection.guide.1' },
      { kind: 'text', text: 'hint.connection.guide.2' },
    ],
  },
  'connection.unsupported': {
    title: 'hint.connection.unsupported.title',
    blocks: [{ kind: 'text', text: 'hint.connection.unsupported.1' }],
  },
  'connection.permission-denied': {
    title: 'hint.connection.permission-denied.title',
    blocks: [
      {
        kind: 'steps',
        steps: [
          'hint.connection.permission-denied.step1',
          'hint.connection.permission-denied.step2',
          'hint.connection.permission-denied.step3',
        ],
      },
    ],
  },
  'connection.unavailable': {
    title: 'hint.connection.unavailable.title',
    blocks: [
      { kind: 'text', text: 'hint.connection.unavailable.1' },
      { kind: 'text', text: 'hint.connection.unavailable.2' },
    ],
  },
  'connection.no-device': {
    title: 'hint.connection.no-device.title',
    blocks: [CONNECT_STEPS],
  },
  'connection.lost': {
    title: 'hint.connection.lost.title',
    blocks: [{ kind: 'text', text: 'hint.connection.lost.1' }],
  },
  'mode.sequences': {
    title: 'hint.mode.sequences.title',
    blocks: [
      { kind: 'text', text: 'hint.mode.sequences.1' },
      { kind: 'text', text: 'hint.mode.sequences.2' },
      { kind: 'notes', clef: 'treble', anchor: 60, pitches: [64, 62, 65], intervals: true },
      { kind: 'text', text: 'hint.mode.sequences.3' },
    ],
  },
  'mode.contour': {
    title: 'hint.mode.contour.title',
    blocks: [
      { kind: 'text', text: 'hint.mode.contour.1' },
      { kind: 'notes', clef: 'treble', pitches: [64, 67, 65, 65] },
      { kind: 'text', text: 'hint.mode.contour.2' },
    ],
  },
  'mode.rhythm': {
    title: 'hint.mode.rhythm.title',
    blocks: [
      { kind: 'text', text: 'hint.mode.rhythm.1' },
      { kind: 'text', text: 'hint.mode.rhythm.2' },
      {
        kind: 'rhythm',
        meter: 4,
        figures: ['quarter', 'eighths', 'half'],
        marks: ['onTime', 'early', 'onTime', 'late'],
      },
      { kind: 'text', text: 'hint.mode.rhythm.3' },
    ],
  },
  'mode.warmup': {
    title: 'hint.mode.warmup.title',
    blocks: [
      { kind: 'text', text: 'hint.mode.warmup.1' },
      { kind: 'text', text: 'hint.mode.warmup.2' },
      { kind: 'text', text: 'hint.mode.warmup.3' },
    ],
  },
  'mode.intervals': {
    title: 'hint.mode.intervals.title',
    blocks: [
      { kind: 'text', text: 'hint.mode.intervals.1' },
      { kind: 'text', text: 'hint.mode.intervals.2' },
      {
        kind: 'table',
        head: [
          'hint.intervals.keyHead',
          'hint.intervals.legendHead',
          'hint.intervals.intervalHead',
        ],
        rows: (
          [
            ['hint.intervals.key.1', 'm2'],
            ['hint.intervals.key.2', 'M2'],
            ['hint.intervals.key.3', 'm3'],
            ['hint.intervals.key.4', 'M3'],
            ['hint.intervals.key.5', 'P4'],
            ['hint.intervals.key.6', 'TT'],
            ['hint.intervals.key.7', 'P5'],
            ['hint.intervals.key.8', 'm6'],
            ['hint.intervals.key.9', 'M6'],
            ['hint.intervals.key.10', 'm7'],
            ['hint.intervals.key.11', 'M7'],
            ['hint.intervals.key.0', 'P8'],
          ] as const
        ).map(([key, id]) => [key, `interval.short.${id}`, `interval.full.${id}`]),
      },
      OCTAVES_TABLE,
    ],
  },
  'mode.durations': {
    title: 'hint.mode.durations.title',
    blocks: [
      { kind: 'text', text: 'hint.mode.durations.1' },
      { kind: 'text', text: 'hint.mode.durations.2' },
      {
        kind: 'table',
        head: [
          'hint.intervals.keyHead',
          'hint.intervals.legendHead',
          'hint.durations.durationHead',
        ],
        // Дроби одинаковы на всех языках — не переводятся (C-SOL-3, OB-11).
        rows: (
          [
            ['hint.intervals.key.0', 'w'],
            ['hint.intervals.key.2', 'h'],
            ['hint.intervals.key.4', 'q'],
            ['hint.intervals.key.5', '8'],
            ['hint.intervals.key.7', '16'],
          ] as const
        ).map(([key, id]) => [key, { raw: DURATION_FRACTION[id] }, `duration.name.${id}`]),
      },
      OCTAVES_TABLE,
    ],
  },
} satisfies Record<string, Hint>

/** Номер подсказки: ключ HINTS. Ссылка на несуществующую подсказку не компилируется. */
export type HintId = keyof typeof HINTS

/** Подсказка строки «Пианино»: по состоянию связи; когда всё в порядке — как подключить. */
export function connectionHintId(state: ConnectionState): HintId {
  return state === 'connected' || state === 'connecting'
    ? 'connection.guide'
    : `connection.${state}`
}

export const modeHintId = (mode: ModeId): HintId => `mode.${mode}`

// Содержимое подсказок (C-APP-2): все подсказки приложения в одном месте. Новая подсказка —
// запись здесь и одна <HintButton id="..."> на экране; окно одно на всё приложение.

import type { ModeId } from '../../engine/modes/modes'
import type { Mark } from '../../engine/rhythm/evaluate'
import type { FigureId } from '../../engine/rhythm/figures'
import type { Meter } from '../../engine/rhythm/generate'
import type { Clef } from '../../engine/staff/pickNote'
import type { ConnectionState } from '../../midi/types'

/** Блок подсказки. Порядок блоков — порядок на экране. */
export type HintBlock =
  | { kind: 'text'; text: string }
  | { kind: 'steps'; steps: string[] }
  /** Изображение из сборки (работает без сети); подпись обязательна — смысл не в одной картинке. */
  | { kind: 'image'; src: string; caption: string }
  /**
   * Нотный пример, как в «Последовательностях»: ключ и ноты; anchor — опорная нота с названием,
   * intervals — полоса подсказок «↑3» над нотами.
   */
  | { kind: 'notes'; clef: Clef; pitches: number[]; anchor?: number; intervals?: boolean }
  /** Ритмический пример, как в «Ритме»: фигуры одного такта и, если нужно, оценки нот. */
  | { kind: 'rhythm'; meter: Meter; figures: FigureId[]; marks?: Mark[] }

export interface Hint {
  title: string
  blocks: HintBlock[]
}

const CONNECT_STEPS: HintBlock = {
  kind: 'steps',
  steps: [
    'Включи пианино.',
    'Подключи его USB-кабелем к планшету (через переходник, если нужно).',
    'Подожди пару секунд — наверху появится «Пианино на связи».',
  ],
}

export const HINTS = {
  'connection.guide': {
    title: 'Как подключить пианино',
    blocks: [
      CONNECT_STEPS,
      {
        kind: 'text',
        text: 'Если связь пропала (выдернули кабель, планшет уснул) — ничего делать не нужно: как только пианино снова появится, всё продолжится само.',
      },
      {
        kind: 'text',
        text: 'Пианино на связи, а ноты не приходят? Нажми «Переподключить».',
      },
    ],
  },
  'connection.unsupported': {
    title: 'Этот браузер не умеет работать с пианино',
    blocks: [
      {
        kind: 'text',
        text: 'Открой приложение в Chrome: только он умеет получать ноты с пианино по кабелю.',
      },
    ],
  },
  'connection.permission-denied': {
    title: 'Доступ к пианино запрещён',
    blocks: [
      {
        kind: 'steps',
        steps: [
          'Нажми на значок замка рядом с адресом (в установленном приложении — «Настройки сайта»).',
          'Разреши MIDI-устройства.',
          'Вернись сюда и нажми «Переподключить».',
        ],
      },
    ],
  },
  'connection.unavailable': {
    title: 'Пианино занято',
    blocks: [
      {
        kind: 'text',
        text: 'Разрешение есть, но пианино держит другое приложение. Закрой его — связь вернётся сама через несколько секунд.',
      },
      { kind: 'text', text: 'Если не вернулась — нажми «Переподключить».' },
    ],
  },
  'connection.no-device': {
    title: 'Пианино не подключено',
    blocks: [CONNECT_STEPS],
  },
  'connection.lost': {
    title: 'Связь потеряна',
    blocks: [
      {
        kind: 'text',
        text: 'Проверь, что кабель на месте и пианино включено. Как только оно появится, всё продолжится само.',
      },
    ],
  },
  'mode.sequences': {
    title: 'Как играть: Последовательности',
    blocks: [
      {
        kind: 'text',
        text: 'На стане — несколько нот. Играй их по очереди слева направо в своём темпе; текущая нота выделена чертой под станом.',
      },
      {
        kind: 'text',
        text: 'Первая нота с названием — опорная, её играть не нужно. Над нотами — подсказки: «↑3» значит «на терцию выше предыдущей». Когда играешь без ошибок, подсказок становится меньше.',
      },
      { kind: 'notes', clef: 'treble', anchor: 60, pitches: [64, 62, 65], intervals: true },
      {
        kind: 'text',
        text: 'Верная нота получает кольцо. Мимо — нота пульсирует, играй ещё раз или нажми «Пропустить».',
      },
    ],
  },
  'mode.contour': {
    title: 'Как играть: Контур',
    blocks: [
      {
        kind: 'text',
        text: 'Важна не точная нота, а направление: следующая нота выше, ниже или на месте. Первую ноту играй любой клавишей.',
      },
      { kind: 'notes', clef: 'treble', pitches: [64, 67, 65, 65] },
      {
        kind: 'text',
        text: 'Здесь: любая клавиша, потом любая выше, потом любая ниже, потом та же ещё раз.',
      },
    ],
  },
  'mode.rhythm': {
    title: 'Как играть: Ритм',
    blocks: [
      {
        kind: 'text',
        text: 'Выстукивай рисунок на любой клавише в своём темпе — высота не важна. Метронома нет: темп задают твои удары.',
      },
      {
        kind: 'text',
        text: 'После последней ноты каждая получает оценку: кольцо — вовремя; пунктир и треугольник влево — рано, вправо — поздно.',
      },
      {
        kind: 'rhythm',
        meter: 4,
        figures: ['quarter', 'eighths', 'half'],
        marks: ['onTime', 'early', 'onTime', 'late'],
      },
      {
        kind: 'text',
        text: 'Сбился — «Сначала». Ударь ещё раз после оценки — начнётся новая попытка того же рисунка.',
      },
    ],
  },
  'mode.warmup': {
    title: 'Как играть: Разминка',
    blocks: [
      {
        kind: 'text',
        text: 'Нота едет по стану к ключу. Сыграй её, пока она не доехала: верная — сплошное кольцо, неверная — пунктир.',
      },
      {
        kind: 'text',
        text: 'Нажми «Стоп», когда захочешь закончить, — покажу итог и какие ноты даются труднее.',
      },
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

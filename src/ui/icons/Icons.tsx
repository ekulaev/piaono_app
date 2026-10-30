// Значки кнопок: встроенный SVG, цвет — от текста кнопки. Линии толстые (2.5 из 24): тонкие
// «волосяные» значки при слабом зрении не читаются (CLAUDE.md §6). Смысл всегда дублирует подпись.

import type { ReactNode } from 'react'
import './Icons.css'

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      className="line-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

/** «Настройки»: контур шестерёнки с восемью зубцами и отверстием в центре. */
export function GearIcon() {
  return (
    <Icon>
      <path d="M10.49 4.55 L10.80 2.07 L13.20 2.07 L13.51 4.55 L16.20 5.67 L18.17 4.13 L19.87 5.83 L18.33 7.80 L19.45 10.49 L21.93 10.80 L21.93 13.20 L19.45 13.51 L18.33 16.20 L19.87 18.17 L18.17 19.87 L16.20 18.33 L13.51 19.45 L13.20 21.93 L10.80 21.93 L10.49 19.45 L7.80 18.33 L5.83 19.87 L4.13 18.17 L5.67 16.20 L4.55 13.51 L2.07 13.20 L2.07 10.80 L4.55 10.49 L5.67 7.80 L4.13 5.83 L5.83 4.13 L7.80 5.67 Z" />
      <circle cx="12" cy="12" r="3" />
    </Icon>
  )
}

/** «Обновить»: круговая стрелка, как в браузере. */
export function RefreshIcon() {
  return (
    <Icon>
      <path d="M20 12a8 8 0 1 1-2.35-5.65" />
      <path d="M20 4v5h-5" />
    </Icon>
  )
}

/** «Домой»: домик. */
export function HomeIcon() {
  return (
    <Icon>
      <path d="M3.5 11 12 4l8.5 7" />
      <path d="M6 9.5V20h12V9.5" />
      <path d="M10 20v-5.5h4V20" />
    </Icon>
  )
}

/** «Прогресс»: три столбика по возрастанию. */
export function ProgressIcon() {
  return (
    <Icon>
      <path d="M5 20v-5M12 20V10M19 20V4" />
    </Icon>
  )
}

/** «Подсказка»: знак вопроса в круге. */
export function QuestionIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M9.3 9.2a2.8 2.8 0 1 1 3.9 2.6c-.8.4-1.2 1-1.2 1.9v.6" />
      <path d="M12 17.4v.1" />
    </Icon>
  )
}

/** «Внимание»: треугольник с восклицательным знаком; рядом всегда подпись. */
export function WarningIcon() {
  return (
    <Icon>
      <path d="M12 3 L22 20 H2 Z" />
      <path d="M12 9.5 V14" />
      <path d="M12 17 V17.2" />
    </Icon>
  )
}

/** «Подписи на клавишах»: белая клавиша с чёрной сверху и двумя строками текста внизу. */
export function KeyLabelsIcon() {
  return (
    <Icon>
      <rect x="5" y="2.5" width="14" height="19" rx="1.5" />
      <rect x="5" y="2.5" width="8" height="9.5" fill="currentColor" />
      <path d="M8.5 16 H15.5" />
      <path d="M8.5 19 H15.5" />
    </Icon>
  )
}

/** Группа «Пианино»: штекер кабеля — два контакта сверху, корпус и провод вниз. */
export function PlugIcon() {
  return (
    <Icon>
      <path d="M9 2.5V7M15 2.5V7" />
      <path d="M6 7h12v4a6 6 0 0 1-12 0Z" />
      <path d="M12 17v4.5" />
    </Icon>
  )
}

/** Группа «Клавиатура»: рамка экрана, внизу в ней клавиши — три белые и две чёрные. */
export function ScreenKeysIcon() {
  return (
    <Icon>
      <rect x="2.5" y="3.5" width="19" height="17" rx="2" />
      <path d="M2.5 10.5h19" />
      <rect x="7.5" y="10.5" width="2.5" height="5" fill="currentColor" />
      <rect x="14" y="10.5" width="2.5" height="5" fill="currentColor" />
      <path d="M8.75 15.5v5M15.25 15.5v5" />
    </Icon>
  )
}

/** Группа «Версия»: буква «i» в круге (круговая стрелка занята кнопкой «Обновить»). */
export function InfoIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M12 11v6" />
      <path d="M12 7.3v.1" />
    </Icon>
  )
}

/** Группа «Копия»: лист с загнутым углом, на нём стрелка вниз — «сохранить в файл». */
export function BackupIcon() {
  return (
    <Icon>
      <path d="M5 2.5h9.5l4.5 4.5v14.5H5Z" />
      <path d="M14.5 2.5V7H19" />
      <path d="M12 10v7.5" />
      <path d="M8.5 14.5 12 18l3.5-3.5" />
    </Icon>
  )
}

/** Удачный итог действия: галочка — форма, а не только цвет (CLAUDE.md §6). */
export function CheckIcon() {
  return (
    <Icon>
      <path d="M4 12.5 9.5 18 20 6.5" />
    </Icon>
  )
}

/** «Свернуть / развернуть» бар: двойная стрелка вправо (к краю) или влево. */
export function CollapseIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <Icon>
      {direction === 'right' ? (
        <path d="M6 6l6 6-6 6M13 6l6 6-6 6" />
      ) : (
        <path d="M18 6l-6 6 6 6M11 6l-6 6 6 6" />
      )}
    </Icon>
  )
}

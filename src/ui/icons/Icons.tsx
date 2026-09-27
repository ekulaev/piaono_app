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

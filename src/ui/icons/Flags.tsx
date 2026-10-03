// Флаги языков в списке: рисуются значками, не эмодзи (эмодзи-флаги не показываются на части
// систем; CLAUDE.md §6). Цвета флагов — часть смысла, а не оформления: по ним язык узнают
// боковым зрением. Толстая тёмная рамка отделяет флаг от «бумаги» (контраст, слабое зрение).

import type { FlagId } from '../../i18n'
import './Flags.css'

const FRAME = { fill: 'none', stroke: 'var(--ink)', strokeWidth: 2 }

function FlagFrame({ children }: { children: React.ReactNode }) {
  return (
    <svg
      className="flag"
      viewBox="0 0 30 20"
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
    >
      <clipPath id="flag-clip">
        <rect width="30" height="20" />
      </clipPath>
      <g clipPath="url(#flag-clip)">{children}</g>
      <rect x="1" y="1" width="28" height="18" rx="2" {...FRAME} />
    </svg>
  )
}

/** Россия: белая, синяя и красная полосы. */
function RussiaFlag() {
  return (
    <FlagFrame>
      <rect width="30" height="7" y="0" fill="#ffffff" />
      <rect width="30" height="6.5" y="6.7" fill="#1c57a5" />
      <rect width="30" height="7" y="13" fill="#d52b1e" />
    </FlagFrame>
  )
}

/** Великобритания: синее поле, белые и красные диагонали, белый и красный кресты. */
function BritainFlag() {
  return (
    <FlagFrame>
      <rect width="30" height="20" fill="#1c3f94" />
      <path d="M0 0 L30 20 M30 0 L0 20" stroke="#ffffff" strokeWidth="4" />
      <path d="M0 0 L30 20 M30 0 L0 20" stroke="#c8102e" strokeWidth="1.6" />
      <path d="M15 0 V20 M0 10 H30" stroke="#ffffff" strokeWidth="6.5" />
      <path d="M15 0 V20 M0 10 H30" stroke="#c8102e" strokeWidth="3.6" />
    </FlagFrame>
  )
}

/** Флаг языка; у языка без своего флага — его код в такой же рамке (OB-9). */
export function Flag({ id, code }: { id: FlagId | null; code: string }) {
  switch (id) {
    case 'ru':
      return <RussiaFlag />
    case 'gb':
      return <BritainFlag />
    default:
      return <span className="flag flag--code">{code.toUpperCase()}</span>
  }
}

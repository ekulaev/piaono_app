import type { ReactNode } from 'react'

interface RowProps {
  label: string
  /** Настройка сейчас не действует: название приглушено. */
  disabled?: boolean
  children: ReactNode
}

/** Одна настройка — одна строка: название слева, значение или кнопка справа (C-APP-1, OB-8). */
export default function SettingsRow({ label, disabled = false, children }: RowProps) {
  return (
    <li className={`settings-row${disabled ? ' settings-row--disabled' : ''}`}>
      <div className="settings-row__main">
        <span className="settings-row__label">{label}</span>
        <div className="settings-row__value">{children}</div>
      </div>
    </li>
  )
}

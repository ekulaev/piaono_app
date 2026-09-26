// Элементы настроек в стиле приложения: крупные цели касания (≥ 56 px), выбранное значение
// отличается заливкой и отметкой, а не только цветом. Только обычные кнопки — без системных
// ползунков и флажков браузера, у которых мелкие цели и чужое оформление.
import { useId, type ReactNode } from 'react'
import './Controls.css'

interface ChoiceGroupProps<T extends string> {
  label: string
  options: readonly { value: T; title: string }[]
  value: T
  onChange: (value: T) => void
  /** Настройка сейчас не действует: кнопки не нажимаются, значение сохраняется. */
  disabled?: boolean
  /** Строка под кнопками: пояснение к настройке. */
  note?: string
}

/** Выбор одного значения из нескольких — ряд кнопок. */
export function ChoiceGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled = false,
  note,
}: ChoiceGroupProps<T>) {
  const labelId = useId()
  return (
    <div className="control">
      <p id={labelId} className="control__label">
        {label}
      </p>
      <div className="choice" role="radiogroup" aria-labelledby={labelId}>
        {options.map((option) => {
          const selected = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`choice__option${selected ? ' choice__option--selected' : ''}`}
              disabled={disabled}
              onClick={() => onChange(option.value)}
            >
              {selected && <span aria-hidden="true">✓ </span>}
              {option.title}
            </button>
          )
        })}
      </div>
      {note && <p className="control__note">{note}</p>}
    </div>
  )
}

interface StepperProps {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}

/** Число «− N +»: вместо ползунка, у которого мелкая цель и трудное точное перетаскивание. */
export function Stepper({ label, value, min, max, onChange }: StepperProps) {
  const labelId = useId()
  return (
    <div className="control">
      <p id={labelId} className="control__label">
        {label}
      </p>
      <div className="stepper" role="group" aria-labelledby={labelId}>
        <button
          type="button"
          className="stepper__button"
          aria-label="Меньше"
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
        >
          −
        </button>
        <output className="stepper__value" aria-live="polite">
          {value}
        </output>
        <button
          type="button"
          className="stepper__button"
          aria-label="Больше"
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
        >
          +
        </button>
      </div>
    </div>
  )
}

interface ToggleProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  /** Значок между квадратом и подписью. */
  icon?: ReactNode
  /** Короткий вид: квадрат и значок, подпись — только для экранного диктора и подсказки. */
  compact?: boolean
  /** Настройка сейчас не действует: флажок не нажимается, значение сохраняется. */
  disabled?: boolean
  /** Строка под флажком: пояснение к настройке. */
  note?: string
}

/** Флажок: квадрат с «✓», значок и подпись — вся кнопка является целью касания. */
export function Toggle({
  label,
  checked,
  onChange,
  icon,
  compact = false,
  disabled = false,
  note,
}: ToggleProps) {
  const className = ['toggle', checked && 'toggle--on', compact && 'toggle--compact']
    .filter(Boolean)
    .join(' ')
  const toggle = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={compact ? label : undefined}
      title={compact ? label : undefined}
      className={className}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span className="toggle__box" aria-hidden="true">
        {checked ? '✓' : ''}
      </span>
      {icon}
      {!compact && <span className="toggle__label">{label}</span>}
    </button>
  )
  if (!note) return toggle
  return (
    <div className="control">
      {toggle}
      <p className="control__note">{note}</p>
    </div>
  )
}

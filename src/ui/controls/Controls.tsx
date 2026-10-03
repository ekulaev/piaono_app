// Элементы настроек в стиле приложения: крупные цели касания (≥ 56 px), выбранное значение
// отличается заливкой и отметкой, а не только цветом. Только обычные кнопки — без системных
// ползунков и флажков браузера, у которых мелкие цели и чужое оформление.
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'
import './Controls.css'
import { useT } from '../i18n/useI18n'
import { fractionOf, moveThumb, nearestThumb, valueAt, type Range, type Thumb } from './sliderMath'

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
  /** На сколько меняется значение за нажатие; по умолчанию 1. */
  step?: number
  /** Короткий вид (в строке настроек): название уже стоит рядом, на экране его не повторяем. */
  compact?: boolean
  /** Настройка сейчас не действует: кнопки не нажимаются, значение сохраняется и остаётся видно. */
  disabled?: boolean
  /** Как показать значение («1,0 с»); по умолчанию число как есть. */
  format?: (value: number) => string
  onChange: (value: number) => void
}

/** Число «− N +»: вместо ползунка, у которого мелкая цель и трудное точное перетаскивание. */
export function Stepper({
  label,
  value,
  min,
  max,
  step = 1,
  compact = false,
  disabled = false,
  format,
  onChange,
}: StepperProps) {
  const t = useT()
  const labelId = useId()
  return (
    <div className="control">
      {!compact && (
        <p id={labelId} className="control__label">
          {label}
        </p>
      )}
      <div
        className={`stepper${disabled ? ' stepper--disabled' : ''}`}
        role="group"
        aria-labelledby={compact ? undefined : labelId}
        aria-label={compact ? label : undefined}
      >
        <button
          type="button"
          className="stepper__button"
          aria-label={t('controls.less')}
          disabled={disabled || value <= min}
          onClick={() => onChange(value - step)}
        >
          −
        </button>
        <output className="stepper__value" aria-live="polite">
          {format ? format(value) : value}
        </output>
        <button
          type="button"
          className="stepper__button"
          aria-label={t('controls.more')}
          disabled={disabled || value >= max}
          onClick={() => onChange(value + step)}
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

/** Положение указателя на шкале → значение: шкала — внутренняя полоса, края касания прижимаются. */
function pointerValue(
  event: PointerEvent,
  track: HTMLElement | null,
  min: number,
  max: number,
  step: number,
): number {
  const rect = track?.getBoundingClientRect()
  if (!rect || rect.width === 0) return min
  return valueAt((event.clientX - rect.left) / rect.width, min, max, step)
}

/** Клавиши ручки: стрелки — шаг, Home и End — границы шкалы. null — клавиша не наша. */
function keyValue(
  event: KeyboardEvent,
  value: number,
  min: number,
  max: number,
  step: number,
): number | null {
  switch (event.key) {
    case 'ArrowLeft':
    case 'ArrowDown':
      return Math.max(min, value - step)
    case 'ArrowRight':
    case 'ArrowUp':
      return Math.min(max, value + step)
    case 'Home':
      return min
    case 'End':
      return max
    default:
      return null
  }
}

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  /** Шаг шкалы; ручка не встаёт между значениями. */
  step?: number
  /** Как показать значение («5 с»); по умолчанию число как есть. */
  format?: (value: number) => string
  onChange: (value: number) => void
}

/** Ползунок с одной ручкой: выбор одного числа из ряда. Вся шкала — цель касания (≥ 56 px). */
export function Slider({ label, value, min, max, step = 1, format, onChange }: SliderProps) {
  const labelId = useId()
  const trackRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const shown = format ? format(value) : String(value)

  const move = (event: PointerEvent) =>
    onChange(pointerValue(event, trackRef.current, min, max, step))
  return (
    <div className="control">
      <div className="slider__head">
        <p id={labelId} className="control__label">
          {label}
        </p>
        <output className="slider__value">{shown}</output>
      </div>
      <div
        className="slider"
        onPointerDown={(event) => {
          dragging.current = true
          event.currentTarget.setPointerCapture(event.pointerId)
          move(event)
        }}
        onPointerMove={(event) => dragging.current && move(event)}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
      >
        <div ref={trackRef} className="slider__track">
          <div
            className="slider__fill"
            style={{ width: `${fractionOf(value, min, max) * 100}%` }}
          />
          <button
            type="button"
            role="slider"
            className="slider__thumb"
            style={{ left: `${fractionOf(value, min, max) * 100}%` }}
            aria-labelledby={labelId}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={value}
            aria-valuetext={shown}
            onKeyDown={(event) => {
              const next = keyValue(event, value, min, max, step)
              if (next === null) return
              event.preventDefault()
              onChange(next)
            }}
          />
        </div>
      </div>
    </div>
  )
}

interface RangeSliderProps {
  label: string
  low: number
  high: number
  min: number
  max: number
  /** Наименьшее расстояние между ручками в шагах шкалы; 1 — не меньше двух значений. */
  gap?: number
  /** Подпись значения для экранного диктора и строки над шкалой. */
  describe: (value: number) => string
  /** Строка справа над шкалой: выбранный диапазон («Mi · E3 – Sol · G5, 17 нот»). */
  valueText: string
  lowLabel: string
  highLabel: string
  onChange: (range: Range) => void
}

/**
 * Ползунок с двумя ручками: нижняя и верхняя границы диапазона на одной шкале, шаг — одно
 * значение. Касание шкалы тянет ближайшую ручку; ручки не пересекаются.
 */
export function RangeSlider({
  label,
  low,
  high,
  min,
  max,
  gap = 1,
  describe,
  valueText,
  lowLabel,
  highLabel,
  onChange,
}: RangeSliderProps) {
  const labelId = useId()
  const trackRef = useRef<HTMLDivElement>(null)
  const dragging = useRef<Thumb | null>(null)
  const range = { low, high }
  const lowFraction = fractionOf(low, min, max)
  const highFraction = fractionOf(high, min, max)

  const move = (event: PointerEvent, thumb: Thumb) =>
    onChange(
      moveThumb(range, thumb, pointerValue(event, trackRef.current, min, max, 1), min, max, gap),
    )
  const thumbProps = (thumb: Thumb, value: number, name: string) => ({
    type: 'button' as const,
    role: 'slider',
    className: `slider__thumb slider__thumb--${thumb}`,
    style: { left: `${fractionOf(value, min, max) * 100}%` },
    'aria-label': `${label}: ${name}`,
    'aria-valuemin': thumb === 'low' ? min : low + gap,
    'aria-valuemax': thumb === 'low' ? high - gap : max,
    'aria-valuenow': value,
    'aria-valuetext': describe(value),
    onKeyDown: (event: KeyboardEvent) => {
      const next = keyValue(event, value, min, max, 1)
      if (next === null) return
      event.preventDefault()
      onChange(moveThumb(range, thumb, next, min, max, gap))
    },
  })

  return (
    <div className="control">
      <div className="slider__head slider__head--stacked">
        <p id={labelId} className="control__label">
          {label}
        </p>
        <output className="slider__value">{valueText}</output>
      </div>
      <div
        className="slider"
        role="group"
        aria-labelledby={labelId}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId)
          const start = pointerValue(event, trackRef.current, min, max, 1)
          dragging.current = nearestThumb(start, range)
          move(event, dragging.current)
        }}
        onPointerMove={(event) => dragging.current && move(event, dragging.current)}
        onPointerUp={() => (dragging.current = null)}
        onPointerCancel={() => (dragging.current = null)}
      >
        <div ref={trackRef} className="slider__track">
          <div
            className="slider__fill slider__fill--range"
            style={{
              left: `${lowFraction * 100}%`,
              width: `${(highFraction - lowFraction) * 100}%`,
            }}
          />
          <button {...thumbProps('low', low, lowLabel)} />
          <button {...thumbProps('high', high, highLabel)} />
        </div>
      </div>
    </div>
  )
}

interface DropdownProps<T extends string> {
  label: string
  options: readonly { value: T; title: string }[]
  value: T
  onChange: (value: T) => void
}

/**
 * Выпадающий список: кнопка с текущим значением раскрывает строки (≥ 56 px) под ней, внутри
 * настроек — в потоке, а не поверх. Закрывается выбором, касанием вне списка и Esc; выбор
 * применяется сразу. Поведение то же, что у списка языков (C-APP-3).
 */
export function Dropdown<T extends string>({ label, options, value, onChange }: DropdownProps<T>) {
  const labelId = useId()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    if (!open) return
    listRef.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest' })
    // Касание вне списка закрывает его, но само касание не гасим (как у списка языков).
    const onPointerDown = (event: globalThis.PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    // Esc закрывает только список: событие не доходит до меню режимов, которое иначе закрылось бы целиком.
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      setOpen(false)
      buttonRef.current?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [open])

  const current = options.find((option) => option.value === value)
  return (
    <div className="control dropdown" ref={rootRef}>
      <p id={labelId} className="control__label">
        {label}
      </p>
      <button
        ref={buttonRef}
        type="button"
        className="dropdown__button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-labelledby={labelId}
        onClick={() => setOpen(!open)}
      >
        <span>{current?.title}</span>
        <span aria-hidden="true">{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <ul ref={listRef} className="dropdown__list" aria-labelledby={labelId}>
          {options.map((option) => {
            const selected = option.value === value
            return (
              <li key={option.value}>
                <button
                  type="button"
                  className={`dropdown__item${selected ? ' dropdown__item--current' : ''}`}
                  aria-pressed={selected}
                  onClick={() => {
                    setOpen(false)
                    buttonRef.current?.focus()
                    onChange(option.value)
                  }}
                >
                  <span>{option.title}</span>
                  {selected && <span aria-hidden="true">✓</span>}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

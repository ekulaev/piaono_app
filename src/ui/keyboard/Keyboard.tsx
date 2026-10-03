import {
  memo,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
  type RefObject,
} from 'react'
import { heldPitches, levelOf } from '../../engine/keyboard/keyboardState'
import {
  BLACK_TO_WHITE,
  centerStartOn,
  computeLayout,
  cursorRect,
  hitTest,
  initialStart,
  isBlackKey,
  isBlocked,
  miniWhiteWidth,
  resizeStart,
  scrollHints,
  shiftStart,
  startFromDrag,
  startAtNote,
  startFromTapCenter,
  visibleRange,
  WHITE_KEY_COUNT,
  WHITE_PITCHES,
  type Side,
} from '../../engine/keyboard/layout'
import type { KeyboardState, KeyInput, Level } from '../../engine/keyboard/types'
import { useAutoRepeat } from './useAutoRepeat'
import './Keyboard.css'
import { useT } from '../i18n/useI18n'

/**
 * Запрос показать участок клавиатуры. align 'center' (по умолчанию): центрировать на диапазоне
 * low–high; 'left': нота low — крайняя слева (авто-сдвиг «Разминки»). Новый token — новый сдвиг.
 */
export interface KeyboardFocus {
  low: number
  high: number
  token: number
  align?: 'center' | 'left'
}

interface Props {
  state: KeyboardState
  onInput: (input: KeyInput) => void
  focus?: KeyboardFocus | null
  /** Вместимость: сколько белых клавиш видно сейчас (52 — все); null — клавиатуры нет. */
  onCapacity?: (capacity: number | null) => void
}

interface ZoneSize {
  width: number
  height: number
  remPx: number
}

/** Видимая часть: индекс первой видимой белой клавиши и сколько белых видно. */
interface VisibleWindow {
  start: number
  count: number
}

/**
 * Экранная клавиатура на 88 клавиш. Сама ничего не решает: рисует состояние из engine/
 * и превращает касания в события для него. Своё у неё только одно — какая часть
 * клавиатуры сейчас видна.
 */
function Keyboard({ state, onInput, focus, onCapacity }: Props) {
  const t = useT()
  const zoneRef = useRef<HTMLDivElement>(null)
  const keysRef = useRef<HTMLDivElement>(null)
  const size = useZoneSize(zoneRef)
  const layout = size ? computeLayout(size.width, size.remPx) : null

  const [visible, setVisible] = useState<VisibleWindow | null>(null)
  // Число видимых клавиш зависит от ширины: при первом измерении ставим C4 в центр,
  // при смене размера сохраняем центральную клавишу (обновление состояния во время
  // рендера — штатный приём React для производного состояния).
  if (layout && visible?.count !== layout.visibleWhiteCount) {
    const count = layout.visibleWhiteCount
    const start = visible ? resizeStart(visible.start, visible.count, count) : initialStart(count)
    setVisible({ start, count })
  }
  // Центрирование по запросу (начало последовательности) — один раз на token, дальше
  // видимую часть двигает только ученик.
  const [focusToken, setFocusToken] = useState<number | null>(null)
  if (layout && focus && focus.token !== focusToken) {
    const count = layout.visibleWhiteCount
    setFocusToken(focus.token)
    const start =
      focus.align === 'left'
        ? startAtNote(focus.low, count)
        : centerStartOn(focus.low, focus.high, count)
    setVisible({ start, count })
  }

  // Вместимость нужна настройкам «Разминки» (предупреждение о диапазоне): сообщаем при каждой смене.
  const capacity = layout ? layout.visibleWhiteCount : null
  useEffect(() => {
    onCapacity?.(capacity)
  }, [capacity, onCapacity])

  // Актуальное окно для автоповтора: таймер срабатывает между рендерами.
  const visibleRef = useRef(visible)
  visibleRef.current = visible
  const autoRepeat = useAutoRepeat()

  /** Сдвиг на одну белую клавишу; false — если в эту сторону уже некуда. */
  function step(side: Side): boolean {
    const current = visibleRef.current
    if (!current || isBlocked(side, current.start, current.count)) return false
    const next = {
      ...current,
      start: shiftStart(current.start, side === 'left' ? -1 : 1, current.count),
    }
    visibleRef.current = next
    setVisible(next)
    return true
  }

  /** Поставить видимую часть в заданный start (мини-клавиатура). Курсор выводится из него же. */
  function setStart(next: number) {
    const current = visibleRef.current
    if (!current || next === current.start) return
    const updated = { ...current, start: next }
    visibleRef.current = updated
    setVisible(updated)
  }

  // Пальцы, которые начали касание на клавишах. Остальные движения нас не касаются.
  const activePointers = useRef(new Set<number>())

  // Клавиатура исчезла с экрана (ушли на «Проверку пианино») с пальцем на клавише:
  // pointerup сюда уже не придёт, поэтому отпускаем такие касания сами.
  useEffect(() => {
    const pointers = activePointers.current
    return () => {
      pointers.forEach((pointerId) => onInput({ kind: 'touchUp', pointerId }))
      pointers.clear()
    }
  }, [onInput])

  function pitchAt(event: PointerEvent<HTMLDivElement>): number | null {
    const keys = keysRef.current
    if (!keys || !layout || !visible) return null
    const rect = keys.getBoundingClientRect()
    return hitTest(
      event.clientX - rect.left,
      event.clientY - rect.top,
      rect.height,
      layout,
      visible.start,
    )
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    const pitch = pitchAt(event)
    if (pitch === null) return
    // Захват: палец, съехавший с клавиатуры, всё равно пришлёт pointerup сюда.
    event.currentTarget.setPointerCapture(event.pointerId)
    activePointers.current.add(event.pointerId)
    // timeStamp — момент касания в шкале performance.now, как и время событий MIDI.
    onInput({
      kind: 'touchDown',
      pointerId: event.pointerId,
      pitch,
      pressure: event.pressure,
      time: event.timeStamp,
    })
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!activePointers.current.has(event.pointerId)) return
    onInput({
      kind: 'touchMove',
      pointerId: event.pointerId,
      pitch: pitchAt(event),
      time: event.timeStamp,
    })
  }

  function handlePointerEnd(event: PointerEvent<HTMLDivElement>) {
    if (!activePointers.current.delete(event.pointerId)) return
    onInput({ kind: 'touchUp', pointerId: event.pointerId })
  }

  let content = null
  if (layout && visible && visible.count === layout.visibleWhiteCount) {
    const { whiteWidthPx: whiteWidth, blackWidthPx: blackWidth, showButtons } = layout
    const whites = []
    const blacks = []
    for (let i = 0; i < visible.count; i++) {
      const pitch = WHITE_PITCHES[visible.start + i]
      whites.push(
        <Key
          key={pitch}
          pitch={pitch}
          black={false}
          left={i * whiteWidth}
          width={whiteWidth}
          level={levelOf(state, pitch)}
        />,
      )
      // Чёрная рисуется, только если видны обе её белые соседки.
      if (i > 0 && isBlackKey(pitch - 1)) {
        blacks.push(
          <Key
            key={pitch - 1}
            pitch={pitch - 1}
            black
            left={i * whiteWidth - blackWidth / 2}
            width={blackWidth}
            level={levelOf(state, pitch - 1)}
          />,
        )
      }
    }

    const hints = scrollHints(heldPitches(state), visibleRange(visible.start, visible.count))
    const scrollButton = (side: Side) => (
      <ScrollButton
        side={side}
        width={whiteWidth}
        hinted={hints[side]}
        blocked={isBlocked(side, visible.start, visible.count)}
        onPress={() => autoRepeat.start(() => step(side))}
        onRelease={autoRepeat.stop}
        onKeyboardStep={() => step(side)}
      />
    )

    content = (
      <>
        {showButtons && scrollButton('left')}
        <div
          ref={keysRef}
          className="kbd__keys"
          style={{ left: showButtons ? whiteWidth : 0, width: visible.count * whiteWidth }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onLostPointerCapture={handlePointerEnd}
        >
          {whites}
          {blacks}
        </div>
        {showButtons && scrollButton('right')}
      </>
    )
  }

  return (
    <div className="kbd-area">
      {layout && visible && size && (
        <MiniKeyboard
          start={visible.start}
          count={visible.count}
          zoneWidthPx={size.width}
          onStart={setStart}
        />
      )}
      <div ref={zoneRef} className="kbd" aria-label={t('keyboard.label')}>
        {content}
      </div>
    </div>
  )
}

/** Размер зоны и текущий rem: следим за изменением окна, поворотом, системным шрифтом. */
function useZoneSize(zoneRef: RefObject<HTMLDivElement | null>): ZoneSize | null {
  const [size, setSize] = useState<ZoneSize | null>(null)

  useLayoutEffect(() => {
    const zone = zoneRef.current
    if (!zone) return
    const measure = () => {
      const rect = zone.getBoundingClientRect()
      const remPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
      setSize((prev) =>
        prev && prev.width === rect.width && prev.height === rect.height && prev.remPx === remPx
          ? prev
          : { width: rect.width, height: rect.height, remPx },
      )
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(zone)
    return () => observer.disconnect()
  }, [zoneRef])

  return size
}

interface KeyProps {
  pitch: number
  black: boolean
  left: number
  width: number
  /** null — клавиша отпущена. */
  level: Level | null
}

/** Одна клавиша. memo: при нажатии перерисовывается только она, а не все 88. */
const Key = memo(function Key({ pitch, black, left, width, level }: KeyProps) {
  const className = [
    'key',
    black ? 'key--black' : 'key--white',
    level !== null && `key--pressed key--level-${level}`,
  ]
    .filter(Boolean)
    .join(' ')
  // data-pitch — номер ноты по MIDI: удобно видеть в инструментах разработчика.
  return <div className={className} style={{ left, width }} data-pitch={pitch} />
})

interface ScrollButtonProps {
  side: Side
  width: number
  hinted: boolean
  blocked: boolean
  onPress: () => void
  onRelease: () => void
  onKeyboardStep: () => void
}

function ScrollButton({
  side,
  width,
  hinted,
  blocked,
  onPress,
  onRelease,
  onKeyboardStep,
}: ScrollButtonProps) {
  const t = useT()
  const className = [
    'kbd__scroll',
    `kbd__scroll--${side}`,
    hinted && 'kbd__scroll--hinted',
    blocked && 'kbd__scroll--blocked',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      type="button"
      className={className}
      style={{ width }}
      aria-label={side === 'left' ? t('keyboard.shiftLow') : t('keyboard.shiftHigh')}
      aria-disabled={blocked}
      onPointerDown={(event) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return
        event.currentTarget.setPointerCapture(event.pointerId)
        onPress()
      }}
      onPointerUp={onRelease}
      onPointerCancel={onRelease}
      onLostPointerCapture={onRelease}
      // Клавиатура (Enter/пробел) даёт click без указателя: detail === 0. Касание уже
      // сдвинуло клавиатуру в pointerdown, второй раз не шагаем.
      onClick={(event) => {
        if (event.detail === 0) onKeyboardStep()
      }}
    >
      <svg className="kbd__arrow" viewBox="0 0 24 24" aria-hidden="true">
        <polygon points={side === 'left' ? '17,3 5,12 17,21' : '7,3 19,12 7,21'} />
      </svg>
    </button>
  )
}

interface MiniKeyboardProps {
  /** Индекс первой видимой белой клавиши и число видимых белых — та же модель, что у зоны. */
  start: number
  count: number
  /** Полная ширина зоны клавиатуры (вместе с кнопками прокрутки). */
  zoneWidthPx: number
  onStart: (start: number) => void
}

/**
 * Мини-клавиатура навигации: все 88 клавиш в миниатюре с курсором видимой части.
 * Курсор выводится из start/count, поэтому всегда совпадает с видимой частью. Клавиши мини
 * не играют — компонент лишь двигает видимую часть (C-KBD-2). Без анимаций.
 */
function MiniKeyboard({ start, count, zoneWidthPx, onStart }: MiniKeyboardProps) {
  const ref = useRef<HTMLDivElement>(null)
  // Перетаскивание: какой указатель тянет и за какую белую клавишу курсора взялись.
  const grab = useRef<{ pointerId: number; offsetWhite: number } | null>(null)

  const w = miniWhiteWidth(zoneWidthPx)
  const blackWidth = w * BLACK_TO_WHITE
  const rect = cursorRect(start, count, zoneWidthPx)
  // Вся клавиатура видна целиком: курсор во всю ширину, затемнения нет, жесты ничего не двигают.
  const full = count >= WHITE_KEY_COUNT

  function xAt(event: PointerEvent<HTMLDivElement>): number {
    const el = ref.current
    return el ? event.clientX - el.getBoundingClientRect().left : 0
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    if (full) return
    const x = xAt(event)
    event.currentTarget.setPointerCapture(event.pointerId)
    if (x >= rect.leftPx && x <= rect.leftPx + rect.widthPx) {
      // Взялись за курсор — перетаскивание: держим ту же белую клавишу курсора под пальцем.
      grab.current = { pointerId: event.pointerId, offsetWhite: x / w - start }
    } else {
      // Тап по затемнённой области — сразу центрируем курсор по точке; перетаскивания нет (OB-6).
      onStart(startFromTapCenter(x, count, zoneWidthPx))
    }
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const g = grab.current
    if (!g || g.pointerId !== event.pointerId) return
    onStart(startFromDrag(xAt(event), g.offsetWhite, count, zoneWidthPx))
  }

  function handlePointerEnd(event: PointerEvent<HTMLDivElement>) {
    if (grab.current?.pointerId === event.pointerId) grab.current = null
  }

  const whites = []
  const blacks = []
  for (let i = 0; i < WHITE_KEY_COUNT; i++) {
    const pitch = WHITE_PITCHES[i]
    whites.push(
      <div key={pitch} className="mini__key mini__key--white" style={{ left: i * w, width: w }} />,
    )
    if (i > 0 && isBlackKey(pitch - 1)) {
      blacks.push(
        <div
          key={pitch - 1}
          className="mini__key mini__key--black"
          style={{ left: i * w - blackWidth / 2, width: blackWidth }}
        />,
      )
    }
  }

  return (
    <div
      ref={ref}
      className="mini"
      // Вспомогательный указательный элемент: тот же переход по регистрам доступен кнопками
      // прокрутки, поэтому для скринридера мини скрыта.
      aria-hidden="true"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onLostPointerCapture={handlePointerEnd}
    >
      {whites}
      {blacks}
      {!full && (
        <>
          <div className="mini__dim" style={{ left: 0, width: rect.leftPx }} />
          <div className="mini__dim" style={{ left: rect.leftPx + rect.widthPx, right: 0 }} />
          <div className="mini__cursor" style={{ left: rect.leftPx, width: rect.widthPx }} />
        </>
      )}
    </div>
  )
}

export default Keyboard

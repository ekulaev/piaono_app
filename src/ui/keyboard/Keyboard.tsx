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
  centerStartOn,
  computeLayout,
  hitTest,
  initialStart,
  isBlackKey,
  isBlocked,
  resizeStart,
  scrollHints,
  shiftStart,
  visibleRange,
  WHITE_PITCHES,
  type Side,
} from '../../engine/keyboard/layout'
import type { KeyboardState, KeyInput, Level } from '../../engine/keyboard/types'
import { useAutoRepeat } from './useAutoRepeat'
import './Keyboard.css'

/** Диапазон, на котором центрировать видимую часть. Новый token — новое центрирование. */
export interface KeyboardFocus {
  low: number
  high: number
  token: number
}

interface Props {
  state: KeyboardState
  onInput: (input: KeyInput) => void
  focus?: KeyboardFocus | null
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
function Keyboard({ state, onInput, focus }: Props) {
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
    setVisible({ start: centerStartOn(focus.low, focus.high, count), count })
  }

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
    onInput({ kind: 'touchDown', pointerId: event.pointerId, pitch, pressure: event.pressure })
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!activePointers.current.has(event.pointerId)) return
    onInput({ kind: 'touchMove', pointerId: event.pointerId, pitch: pitchAt(event) })
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
    <div ref={zoneRef} className="kbd" aria-label="Клавиатура пианино">
      {content}
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
      aria-label={side === 'left' ? 'Сдвинуть к низким нотам' : 'Сдвинуть к высоким нотам'}
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

export default Keyboard

import { useCallback, useRef, useState } from 'react'
import type { KeyboardFocus } from './Keyboard'

/**
 * Запросы «показать этот участок клавиатуры»: от «Последовательностей» (центрировать на
 * диапазоне) и от авто-сдвига «Разминки» (нижняя нота диапазона слева). Один счётчик на всех:
 * клавиатура сдвигается ровно на каждый новый запрос и не сдвигается при смене режима.
 */
export function useKeyboardFocus() {
  const [focus, setFocus] = useState<KeyboardFocus | null>(null)
  const token = useRef(0)
  const request = useCallback(
    (low: number, high: number, align: KeyboardFocus['align'] = 'center') =>
      setFocus({ low, high, align, token: ++token.current }),
    [],
  )
  return { focus, request }
}

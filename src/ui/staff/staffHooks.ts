import { useEffect, useLayoutEffect, useState, type RefObject } from 'react'
import { staffGeometry, type StaffGeometry } from './staffDrawing'

/**
 * Размер зоны стана: следим за поворотом, окном, системным шрифтом. hintBand — высота полосы
 * подсказок над станом (условные единицы), 0 — без полосы.
 */
export function useStaffGeometry(zoneRef: RefObject<HTMLDivElement | null>, hintBand = 0) {
  const [geometry, setGeometry] = useState<StaffGeometry | null>(null)
  useLayoutEffect(() => {
    const zone = zoneRef.current
    if (!zone) return
    const measure = () => {
      const { width, height } = zone.getBoundingClientRect()
      if (width === 0 || height === 0) return
      setGeometry((prev) =>
        prev &&
        prev.widthPx === width * 0.9 &&
        prev.heightPx === height &&
        prev.hintBand === hintBand
          ? prev
          : staffGeometry(width, height, hintBand),
      )
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(zone)
    return () => observer.disconnect()
  }, [zoneRef, hintBand])
  return geometry
}

/**
 * Нотный шрифт Bravura встроен в сборку VexFlow и регистрируется при загрузке модуля.
 * Рисуем только после его готовности — иначе ключ нарисуется запасным шрифтом.
 */
export function useMusicFont() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let alive = true
    document.fonts
      .load('30px Bravura')
      .catch(() => {})
      .then(() => alive && setReady(true))
    return () => {
      alive = false
    }
  }, [])
  return ready
}

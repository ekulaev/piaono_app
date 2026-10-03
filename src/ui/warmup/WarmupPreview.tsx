import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { tonalityById } from '../../engine/warmup/keys'
import { BASS_LIMITS, TREBLE_LIMITS, type WarmupSettings } from '../../engine/warmup/settings'
import type { Clef } from '../../engine/staff/pickNote'
import { staffGeometry, type StaffGeometry } from '../staff/staffDrawing'
import { useMusicFont } from '../staff/staffHooks'
import { useT } from '../i18n/useI18n'
import { drawPreview } from './previewDrawing'
import './WarmupPreview.css'

interface Props {
  settings: WarmupSettings
}

interface Zone {
  width: number
  height: number
  /** До какого места от левого края зоны нет меню, px. */
  freeRight: number
}

/** Размер зоны и свободная часть слева от меню: следим за окном и поворотом. */
function useZone(ref: React.RefObject<HTMLDivElement | null>): Zone | null {
  const [zone, setZone] = useState<Zone | null>(null)
  useLayoutEffect(() => {
    const root = ref.current
    if (!root) return
    const measure = () => {
      const rect = root.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      // Меню лежит поверх экрана справа; ноты — только левее его левого края.
      const menuLeft = document.querySelector('.mode-menu')?.getBoundingClientRect().left
      const freeRight =
        menuLeft === undefined ? rect.width : Math.min(rect.width, menuLeft - rect.left)
      setZone((prev) =>
        prev &&
        prev.width === rect.width &&
        prev.height === rect.height &&
        prev.freeRight === freeRight
          ? prev
          : { width: rect.width, height: rect.height, freeRight },
      )
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(root)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [ref])
  return zone
}

/**
 * Предпросмотр диапазона «Разминки» в зоне нотного стана (C-STF-9, OB-9…OB-11): стан каждого
 * выбранного ключа со всеми нотами допустимого диапазона и знаками тональности; выбранный диапазон
 * подсвечен. Перерисовывается на каждое изменение черновика, поэтому следует за ручкой.
 */
function WarmupPreview({ settings }: Props) {
  const t = useT()
  const rootRef = useRef<HTMLDivElement>(null)
  const zone = useZone(rootRef)
  const fontReady = useMusicFont()
  const clefs: Clef[] = settings.clef === 'both' ? ['treble', 'bass'] : [settings.clef]

  return (
    <div ref={rootRef} className="warmup-preview" role="img" aria-label={t('staff.label')}>
      {zone &&
        clefs.map((clef) => (
          <PreviewStaff
            key={clef}
            clef={clef}
            settings={settings}
            zone={zone}
            height={zone.height / clefs.length}
            fontReady={fontReady}
          />
        ))}
    </div>
  )
}

interface StaffProps {
  clef: Clef
  settings: WarmupSettings
  zone: Zone
  height: number
  fontReady: boolean
}

function PreviewStaff({ clef, settings, zone, height, fontReady }: StaffProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const geometry: StaffGeometry = useMemo(
    () => staffGeometry(zone.width, height),
    [zone.width, height],
  )
  const treble = clef === 'treble'
  const { low, high } = treble ? settings.trebleRange : settings.bassRange
  const limits = treble ? TREBLE_LIMITS : BASS_LIMITS

  useLayoutEffect(() => {
    if (!hostRef.current || !fontReady) return
    // Стан стоит по центру зоны; свободная часть считается от левого края зоны.
    const staveLeftPx = (zone.width - geometry.widthPx) / 2
    const rightLimitX = (zone.freeRight - staveLeftPx) / geometry.scale
    drawPreview(
      hostRef.current,
      geometry,
      { clef, tonality: tonalityById(settings.tonality), limits, range: { low, high } },
      Math.min(rightLimitX, geometry.virtualWidth),
    )
  }, [fontReady, clef, settings.tonality, low, high, limits, zone.width, zone.freeRight, geometry])

  return (
    <div className="warmup-preview__staff">
      <div
        ref={hostRef}
        className="warmup-preview__canvas"
        style={{ width: geometry.widthPx, height: geometry.heightPx }}
      />
    </div>
  )
}

export default WarmupPreview

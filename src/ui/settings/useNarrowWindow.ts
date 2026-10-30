import { useSyncExternalStore } from 'react'

/**
 * Узкое окно «Настроек» (C-APP-6, LIM-5): уже 600 CSS-пикселей — телефон в портрете. Порог в px,
 * а не в rem, по той же причине, что и у компактного экрана: увеличенный шрифт не должен
 * превращать планшет в «телефон».
 */
const NARROW_QUERY = '(width < 600px)'

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(NARROW_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

const getSnapshot = () => window.matchMedia(NARROW_QUERY).matches

/** Окно узкое? Пересчитывается при повороте и смене размера окна. */
export function useNarrowWindow(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot)
}

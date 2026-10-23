import { useSyncExternalStore } from 'react'
import { COMPACT_QUERY } from './compact'

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(COMPACT_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

const getSnapshot = () => window.matchMedia(COMPACT_QUERY).matches

/**
 * Окно компактное (C-APP-5)? Пересчитывается при повороте, масштабе и смене размера окна без
 * перезагрузки; `useSyncExternalStore` даёт верное значение уже в первом кадре, без мигания.
 */
export function useCompactScreen(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot)
}

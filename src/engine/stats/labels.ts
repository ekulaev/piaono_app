// Подписи мест, которые не зависят от языка (C-APP-3): интервал — стрелка и число, нота — буква и
// октава. Слова («бас», названия фигур) подставляет интерфейс.

/** «↑3», «↓5», «=» (на месте) по ключу интервала статистики («up3», «down5», «same1»). */
export function intervalLabel(key: string): string {
  if (key.startsWith('same')) return '='
  const up = key.startsWith('up')
  return `${up ? '↑' : '↓'}${key.slice(up ? 2 : 4)}`
}

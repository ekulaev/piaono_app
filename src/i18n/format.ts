// Числа и даты по правилам языка: десятичный знак, формат даты (C-APP-3, OB-10).

/** Секунды с одним знаком после запятой: «2,1» / «2.1». */
export function formatSeconds(code: string, ms: number): string {
  return new Intl.NumberFormat(code, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(
    ms / 1000,
  )
}

/**
 * Дата сборки из ISO 8601 по местному времени планшета: «27.09.2026» / «27 September 2026».
 * Месяц английского — полным словом: короткие названия у разных версий ICU пишутся по-разному
 * («Sep» / «Sept»). Английский — британский (флаг языка), порядок «день месяц год».
 */
export function formatDate(code: string, iso: string): string {
  const date = new Date(iso)
  if (code === 'ru') {
    return new Intl.DateTimeFormat('ru', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date)
  }
  return new Intl.DateTimeFormat(code === 'en' ? 'en-GB' : code, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

/** Дата со временем: день, месяц, год, часы и минуты — как в `formatDate`, плюс «, 14:05». */
export interface WallClock {
  year: number
  /** 1–12. */
  month: number
  day: number
  hour: number
  minute: number
}

/**
 * Дата резервной копии (C-APP-4): «30.10.2026, 14:05» / «30 October 2026, 14:05». Время —
 * «настенное», как записано в копии: форматируем в UTC, чтобы пояс планшета его не сдвинул.
 */
export function formatDateTime(code: string, clock: WallClock): string {
  const date = new Date(Date.UTC(clock.year, clock.month - 1, clock.day, clock.hour, clock.minute))
  const time = `${String(clock.hour).padStart(2, '0')}:${String(clock.minute).padStart(2, '0')}`
  const day =
    code === 'ru'
      ? new Intl.DateTimeFormat('ru', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          timeZone: 'UTC',
        }).format(date)
      : new Intl.DateTimeFormat(code === 'en' ? 'en-GB' : code, {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        }).format(date)
  return `${day}, ${time}`
}

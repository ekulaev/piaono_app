// Компактный экран (C-APP-5): окно ниже порога по высоте или по ширине. Пороги — в rem, как в
// медиазапросах (там 1rem = 16 px, а не 18 px корневого шрифта); один источник и для запроса
// браузера, и для проверки в тестах, чтобы разметка и интерфейс не расходились.

export const COMPACT_MAX_HEIGHT_REM = 35
export const COMPACT_MAX_WIDTH_REM = 60

const MEDIA_REM_PX = 16

/** Медиазапрос «окно компактное»: строго ниже любого из порогов. */
export const COMPACT_QUERY = `(height < ${COMPACT_MAX_HEIGHT_REM}rem) or (width < ${COMPACT_MAX_WIDTH_REM}rem)`

/** То же правило по размеру окна в CSS-пикселях (для тестов). */
export function isCompactSize(width: number, height: number): boolean {
  return (
    height < COMPACT_MAX_HEIGHT_REM * MEDIA_REM_PX || width < COMPACT_MAX_WIDTH_REM * MEDIA_REM_PX
  )
}

// Компактный экран (C-APP-5): окно ниже порога по высоте или по ширине. Пороги — в CSS-пикселях,
// а не в rem: rem в медиазапросе считается от размера шрифта, который задал сам браузер или
// система, и при увеличенном шрифте (а ученик со слабым зрением его увеличивает) порог рос бы и
// обычное окно планшета становилось «компактным». Масштаб страницы по-прежнему влияет: он
// меняет и размер окна в CSS-пикселях. Один источник и для запроса браузера, и для тестов.

export const COMPACT_MAX_HEIGHT_PX = 560
export const COMPACT_MAX_WIDTH_PX = 960

/** Медиазапрос «окно компактное»: строго ниже любого из порогов. */
export const COMPACT_QUERY = `(height < ${COMPACT_MAX_HEIGHT_PX}px) or (width < ${COMPACT_MAX_WIDTH_PX}px)`

/** То же правило по размеру окна в CSS-пикселях (для тестов). */
export function isCompactSize(width: number, height: number): boolean {
  return height < COMPACT_MAX_HEIGHT_PX || width < COMPACT_MAX_WIDTH_PX
}

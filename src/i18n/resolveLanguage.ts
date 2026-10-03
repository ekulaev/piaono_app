import { DEFAULT_LANGUAGE } from './translate'

/** «ru-BY» → «ru»: региональный вариант считается своим языком (OB-5). */
export function baseLanguage(tag: string): string {
  return tag.split(/[-_]/)[0].toLowerCase()
}

/**
 * Какой язык включить при запуске: сохранённый выбор ученика (если такой язык есть), иначе первый
 * из языков системы, который есть среди доступных, иначе английский (OB-5, OB-6, OB-7).
 */
export function resolveLanguage(
  saved: string | null,
  systemLanguages: readonly string[],
  available: readonly string[],
): string {
  if (saved !== null && available.includes(saved)) return saved
  for (const tag of systemLanguages) {
    const code = baseLanguage(tag)
    if (available.includes(code)) return code
  }
  return DEFAULT_LANGUAGE
}

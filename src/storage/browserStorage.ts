// Единственное место, где приложение обращается к localStorage. Модули storage/ берут его
// отсюда; остальной код работает с типизированными данными и не знает, где они лежат.

/** Минимальная часть интерфейса Storage, которая нам нужна (удобно подменять в тестах). */
export type SettingsStorage = Pick<Storage, 'getItem' | 'setItem'>

export function browserStorage(): SettingsStorage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    // Некоторые браузеры бросают исключение при самом обращении к localStorage.
    return null
  }
}

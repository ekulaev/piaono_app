import { useRegisterSW } from 'virtual:pwa-register/react'

/**
 * Обновления приложения (service worker, политика registerType: 'prompt').
 * Новая версия скачивается в фоне и ждёт — сама страница не перезагружается никогда.
 *
 * Браузер сам ищет новую версию только при загрузке страницы, а установленное
 * приложение на планшете может неделями не перезагружаться. Поэтому дополнительно
 * проверяем обновление, когда приложение снова появляется на экране.
 */
export function useAppUpdate() {
  const {
    needRefresh: [updateReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible' || !navigator.onLine) return
        // Без сети проверка просто не удастся — это не ошибка для ученика.
        registration.update().catch(() => {})
      })
    },
  })

  return {
    updateReady,
    applyUpdate: () => updateServiceWorker(true),
  }
}

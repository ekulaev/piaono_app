import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// «Бумага» из src/index.css: фон заставки и цвет системной панели совпадают с интерфейсом,
// чтобы при запуске не было белой или тёмной вспышки.
const PAPER = '#f3ede0'

// Проект публикуется как GitHub Pages project site: https://<user>.github.io/piaono_app/
const BASE = '/piaono_app/'

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    VitePWA({
      // 'prompt' — новая версия скачивается в фоне и ждёт: либо следующего запуска,
      // либо кнопки «Обновить сейчас». Сама страница никогда не перезагружается
      // (в будущем это случилось бы посреди упражнения).
      registerType: 'prompt',
      strategies: 'generateSW',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'pwa-icon.svg'],
      manifest: {
        id: BASE,
        name: 'Нотный тренажёр',
        short_name: 'Ноты',
        description: 'Тренажёр чтения нот с листа для цифрового пианино',
        lang: 'ru',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        // Действует только в установленном приложении; во вкладке браузера раскладка
        // остаётся адаптивной и в портрете.
        orientation: 'landscape',
        background_color: PAPER,
        theme_color: PAPER,
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Всё, что собрано, кладём в кэш устройства: оболочка, стили, иконки.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
      },
    }),
  ],
})

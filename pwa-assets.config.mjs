// Настройки разовой генерации иконок из public/pwa-icon.svg:
//   npx @vite-pwa/assets-generator@1
// Как пресет minimal-2023, но поля maskable- и apple-иконок залиты «бумагой» (#f3ede0),
// а не белым, — иначе на заставке будет белая рамка. Рисунок в pwa-icon.svg уже лежит
// в безопасной зоне maskable-иконки, поэтому дополнительные поля не нужны.
const paper = '#f3ede0'

export default {
  preset: {
    transparent: { sizes: [64, 192, 512], favicons: [[48, 'favicon.ico']] },
    maskable: { sizes: [512], padding: 0, resizeOptions: { background: paper } },
    apple: { sizes: [180], padding: 0, resizeOptions: { background: paper } },
  },
  images: ['public/pwa-icon.svg'],
}

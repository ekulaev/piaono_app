// Съёмка медиа для сайта из настоящего приложения (C-LAUNCH-1, Р-7): видео экранной клавиатуры
// для первого экрана, снимок «Последовательностей» и отклик «верно / мимо».
// Нужны: запущенное приложение (`npm run dev`), Playwright (`npm i --no-save playwright`) и ffmpeg.
// Запуск: node site/tools/capture-media.mjs <папка для сырых файлов>
// Дальше — перекодирование (команды ffmpeg и ImageMagick в site/README.md).
//
// Скрипт «играет» на экранной клавиатуре сам: читает положение головки ноты на стане и
// нажимает нужную клавишу. Настройки подставляются в чистый профиль браузера —
// к данным на устройстве владельца это отношения не имеет.

import { chromium } from 'playwright'

const APP = 'http://localhost:5173/piaono_app/'
const out = process.argv[2] ?? '.'
const WHITE = [0, 2, 4, 5, 7, 9, 11]
const whites = []
for (let m = 21; m <= 108; m++) if (WHITE.includes(m % 12)) whites.push(m)

// «Разминка»: скрипичный ключ, C4–C5 — весь диапазон помещается на клавиатуре без сдвига.
// Подписи на клавишах выключены: change add-key-labels ещё не в архиве (INV-2).
const settings = (mode, language = 'en') => ({
  language,
  keyLabels: false,
  activeMode: mode,
  modeSettings: {
    warmup: {
      travelSeconds: 4,
      clef: 'treble',
      trebleRange: { low: 28, high: 35 },
      bassRange: { low: 15, high: 25 },
      tonality: 'C',
      naturals: false,
      autoShift: true,
    },
  },
})

/** Высота ноты по положению головки на стане (VexFlow: нижняя линия — y = 80, шаг — 5). */
async function targetPitch(page) {
  const { clef, y } = await page.evaluate(() => ({
    clef: document.querySelector('.vf-clef text')?.textContent.codePointAt(0),
    y: Number(document.querySelector('.staff__note .vf-notehead text')?.getAttribute('y')),
  }))
  if (!y) return null
  const bottomLine = clef === 0xe062 ? 43 : 64 // басовый — G2, скрипичный — E4
  return whites[whites.indexOf(bottomLine) + Math.round((80 - y) / 5)]
}

async function press(page, pitch, hold) {
  const box = await page.locator(`[data-pitch="${pitch}"]`).first().boundingBox()
  if (!box) return
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.8)
  await page.mouse.down()
  await page.waitForTimeout(hold)
  await page.mouse.up()
}

async function open(browser, mode, options = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, ...options })
  await context.addInitScript(
    (s) => localStorage.setItem('piaono.settings.v1', JSON.stringify(s)),
    settings(mode),
  )
  const page = await context.newPage()
  await page.goto(APP)
  await page.waitForTimeout(1500)
  await page.locator('.waiting__start').click()
  return { context, page }
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH })

// 1. Видео: только стан и клавиатура; верхняя панель, кнопки и полоса нот скрыты.
{
  const { context, page } = await open(browser, 'warmup', {
    recordVideo: { dir: out, size: { width: 1280, height: 720 } },
  })
  await page.addStyleTag({
    content:
      '.topbar, .waiting__actions, .waiting__mode-control, .note-echo { visibility: hidden !important; }',
  })
  const start = Date.now()
  while (Date.now() - start < 16000) {
    await page.waitForTimeout(550)
    const pitch = await targetPitch(page)
    if (pitch) await press(page, pitch, 300)
  }
  await context.close()
}

// 2. «Последовательности»: опорная нота и стрелки интервалов.
{
  const { context, page } = await open(browser, 'sequences', {
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
  })
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `${out}/sequence-full.png` })
  await context.close()
}

// 3. Отклик: верная нота и мимо.
{
  const { context, page } = await open(browser, 'warmup', {
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
  })
  await page.waitForTimeout(900)
  let pitch = await targetPitch(page)
  await press(page, pitch, 120)
  await page.waitForTimeout(60)
  await page.screenshot({ path: `${out}/note-correct-full.png` })
  await page.waitForTimeout(1500)
  pitch = await targetPitch(page)
  await press(page, whites[whites.indexOf(pitch) + (pitch < 70 ? 2 : -2)], 120)
  await page.waitForTimeout(60)
  await page.screenshot({ path: `${out}/note-wrong-full.png` })
  await context.close()
}

await browser.close()

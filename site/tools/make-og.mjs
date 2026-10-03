// Превью для мессенджеров и соцсетей (NFR-1): 1200×630, текст на языке версии, ≤ 150 КБ (LIM-6).
// Нужны собранный сайт на http://localhost:8080 (`npm run site:build`, затем любой
// статический сервер из site/dist) и Playwright: `npm i --no-save playwright`.
// Запуск: node site/tools/make-og.mjs — картинки пишутся в site/assets/og/.

import { chromium } from 'playwright'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { LOCALES } from '../build.mjs'

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'og')
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH })
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })

for (const l of LOCALES) {
  await page.goto('http://localhost:8080/')
  await page.setContent(`<!doctype html><html lang="${l.htmlLang}"><head>
    <link rel="stylesheet" href="http://localhost:8080/assets/site.css">
    <style>
      body { margin: 0; width: 1200px; height: 630px; display: grid; grid-template-rows: auto 1fr auto;
             padding: 56px 64px 40px; box-sizing: border-box; background: var(--paper); }
      .name { font-size: 30px; font-weight: 700; }
      h1 { font-size: ${l.code === 'zh' ? 92 : 96}px; align-self: center; max-width: 15ch; }
      img { width: 100%; height: 200px; object-fit: contain; object-position: left center; }
    </style></head><body>
      <div class="name">${l.siteName}</div>
      <h1>${l.hero.title}</h1>
      <img src="http://localhost:8080/assets/media/sequence.webp" alt="">
    </body></html>`)
  await page.waitForTimeout(400)
  await page.screenshot({ path: join(out, `og-${l.code}.png`) })
}
await browser.close()

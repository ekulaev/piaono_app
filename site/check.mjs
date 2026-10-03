// Автоматические проверки собранного сайта (C-LAUNCH-1, «Приёмочные гейты»).
// Запуск: `npm run site:build && npm run site:check`. Ошибка — код выхода 1 и список причин.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { LOCALES, SITE_URL, homePath } from './build.mjs'

const DIST = join(dirname(fileURLToPath(import.meta.url)), 'dist')
const KB = 1024
const PAGE_LIMIT = 500 * KB // LIM-4: страница без видео
const VIDEO_WIDE_LIMIT = 1.5 * 1024 * KB // LIM-5
const VIDEO_NARROW_LIMIT = 0.7 * 1024 * KB // LIM-5
const OG_LIMIT = 150 * KB // LIM-6

const problems = []
const fail = (msg) => problems.push(msg)

const read = (path) => readFileSync(join(DIST, path), 'utf8')
const size = (path) => statSync(join(DIST, path)).size

const attr = (html, re) => [...html.matchAll(re)].map((m) => m[1])

const pages = []
for (const l of LOCALES) {
  pages.push({ l, file: `${homePath(l)}index.html`, path: homePath(l), home: true })
  pages.push({ l, file: `${homePath(l)}privacy/index.html`, path: `${homePath(l)}privacy/` })
}

const expectedHreflang = [...LOCALES.map((l) => l.hreflang), 'x-default'].sort().join(',')
const titles = new Set()

for (const { l, file, path, home } of pages) {
  if (!existsSync(join(DIST, file))) {
    fail(`${file}: нет файла`)
    continue
  }
  const html = read(file)

  // NFR-1: язык, canonical, hreflang, заголовок и описание.
  if (!html.includes(`<html lang="${l.htmlLang}">`)) fail(`${file}: lang ≠ ${l.htmlLang}`)
  if (!html.includes(`<link rel="canonical" href="${SITE_URL}${path}">`))
    fail(`${file}: canonical не указывает на саму страницу`)
  const hreflangs = attr(html, /<link rel="alternate" hreflang="([^"]+)"/g)
  if (hreflangs.sort().join(',') !== expectedHreflang)
    fail(`${file}: набор hreflang ${hreflangs.join(',')} ≠ ${expectedHreflang}`)
  const title = attr(html, /<title>([^<]+)<\/title>/g)[0]
  if (!title) fail(`${file}: пустой <title>`)
  else if (titles.has(title)) fail(`${file}: <title> повторяет другую страницу`)
  else titles.add(title)
  if (!/<meta name="description" content="[^"]{20,}">/.test(html)) fail(`${file}: нет описания`)
  if (!html.includes(`<meta property="og:image" content="${SITE_URL}/assets/og/og-${l.code}.png">`))
    fail(`${file}: нет превью на своём языке`)

  // INV-4: ресурсы — только свои. Ссылки <a> на чужие сайты допустимы (условия Метрики).
  const resources = [
    ...attr(html, /<(?:img|script|source|video)[^>]*\ssrc="([^"]+)"/g),
    ...attr(html, /<link rel="(?:stylesheet|preload|icon)"[^>]*href="([^"]+)"/g),
    ...attr(html, /poster="([^"]+)"/g),
  ]
  for (const url of resources) {
    if (/^(https?:)?\/\//.test(url)) fail(`${file}: внешний ресурс ${url}`)
    else if (!existsSync(join(DIST, url))) fail(`${file}: нет файла ${url}`)
  }

  // INV-2 и INV-5: на каждой главной — четыре экрана и обе кнопки «Открыть тренажёр».
  if (home) {
    const screens = attr(html, /<section class="screen[^"]*" id="([^"]+)"/g).join(',')
    if (screens !== 'start,method,see,begin') fail(`${file}: экраны ${screens}`)
    if ((html.match(/data-cta/g) || []).length !== 2) fail(`${file}: CTA не на первом и последнем`)
    if (!l.appInLanguage && !html.includes(l.begin.appEnglish))
      fail(`${file}: нет строки «тренажёр пока на английском»`)

    // LIM-4: страница без видео (HTML, CSS, JS, шрифт своего языка, картинки, постер).
    let total = Buffer.byteLength(html) + size('assets/site.css') + size('assets/site.js')
    for (const url of resources) if (!url.endsWith('.woff2')) total += size(url)
    total += size('assets/media/keys-poster.webp')
    if (l.code !== 'zh') total += size('assets/fonts/golos-text-latin-wght-normal.woff2')
    if (l.code === 'ru') total += size('assets/fonts/golos-text-cyrillic-wght-normal.woff2')
    if (total > PAGE_LIMIT) fail(`${file}: ${Math.round(total / KB)} КБ > ${PAGE_LIMIT / KB} КБ`)
  }
}

// INV-1: сайт не регистрирует service worker и не трогает ключи приложения.
const js = read('assets/site.js')
if (/serviceWorker/.test(js)) fail('site.js: упоминается service worker')
if (/piaono\./.test(js.replace(/\/\/.*$/gm, ''))) fail('site.js: обращение к ключам piaono.*')
// INV-4: счётчик только после согласия — загрузка Метрики внутри startMetrika().
if (!/function startMetrika\(\)[\s\S]*mc\.yandex\.ru/.test(js))
  fail('site.js: Метрика вне согласия')

// LIM-5, LIM-6.
for (const type of ['webm', 'mp4']) {
  if (size(`assets/media/keys-1280.${type}`) > VIDEO_WIDE_LIMIT) fail(`keys-1280.${type} > 1,5 МБ`)
  if (size(`assets/media/keys-640.${type}`) > VIDEO_NARROW_LIMIT) fail(`keys-640.${type} > 0,7 МБ`)
}
for (const f of readdirSync(join(DIST, 'assets/og')))
  if (size(`assets/og/${f}`) > OG_LIMIT) fail(`${f} > 150 КБ`)

// Карта сайта: все адреса, у каждого — все языковые варианты.
const sitemap = read('sitemap.xml')
for (const { path } of pages) {
  if (!sitemap.includes(`<loc>${SITE_URL}${path}</loc>`)) fail(`sitemap.xml: нет ${path}`)
}
const altPerUrl = (LOCALES.length + 1) * pages.length
if ((sitemap.match(/<xhtml:link /g) || []).length !== altPerUrl)
  fail('sitemap.xml: у адресов не полный набор языков')
if (!read('robots.txt').includes(`Sitemap: ${SITE_URL}/sitemap.xml`)) fail('robots.txt: нет карты')

if (problems.length) {
  console.error(`Сайт: ${problems.length} проблем\n- ${problems.join('\n- ')}`)
  process.exit(1)
}
console.log(`Сайт: ${pages.length} страниц проверено, проблем нет`)

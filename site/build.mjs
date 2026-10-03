// Сборка сайта-лендинга (C-LAUNCH-1): шесть языковых версий из одного шаблона (Р-11).
// Запуск: `npm run site:build` → папка site/dist, готовая к публикации на корне
// https://ekulaev.github.io/. Зависимостей нет: только Node.
//
// Почему не Vite и не React: сайт — четыре экрана статического текста. Чистый HTML
// открывается без JavaScript (NFR-6), весит мало (LIM-4) и не тянет шрифт нот.

import { execSync } from 'node:child_process'
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import en from './locales/en.mjs'
import ru from './locales/ru.mjs'
import de from './locales/de.mjs'
import es from './locales/es.mjs'
import fr from './locales/fr.mjs'
import zh from './locales/zh.mjs'

export const SITE_URL = 'https://ekulaev.github.io'
/** Приложение не переезжает (Р-1): ссылка на его нынешний адрес. */
export const APP_PATH = '/piaono_app/'
/** Номер счётчика Яндекс Метрики (LIM-8). */
export const METRIKA_ID = 113374809
/** Почта для связи (В-2). Пока пусто — строка «Почта» в подвале не выводится. */
export const CONTACT_EMAIL = ''

/** Порядок — порядок в переключателе языков. Английский первым: он на корне (OB-10). */
export const LOCALES = [en, ru, de, es, fr, zh]

const here = dirname(fileURLToPath(import.meta.url))
const DIST = join(here, 'dist')

/** Адрес главной страницы языка: английский — корень, остальные — /<код>/. */
export const homePath = (l) => (l.code === 'en' ? '/' : `/${l.code}/`)
const privacyPath = (l) => `${homePath(l)}privacy/`

// Экранирование: тексты переводов вставляются в HTML как есть, без разметки.
const esc = (s) =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')

function buildVersion() {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: here }).toString().trim()
  } catch {
    return 'dev'
  }
}

/** Набор ссылок на все версии — одинаковый на каждой странице (NFR-1). */
function alternates(pathOf) {
  const links = LOCALES.map(
    (l) => `<link rel="alternate" hreflang="${l.hreflang}" href="${SITE_URL}${pathOf(l)}">`,
  )
  links.push(`<link rel="alternate" hreflang="x-default" href="${SITE_URL}${pathOf(en)}">`)
  return links.join('\n    ')
}

/** Шрифт подгружаем только для латиницы и кириллицы; китайский — системным шрифтом (NFR-2). */
function fontPreload(l) {
  if (l.code === 'zh') return ''
  const file = l.code === 'ru' ? 'golos-text-cyrillic-wght-normal' : 'golos-text-latin-wght-normal'
  return `<link rel="preload" href="/assets/fonts/${file}.woff2" as="font" type="font/woff2" crossorigin>`
}

function head(l, { title, description, path, pathOf, ogImage }) {
  const ogAlternates = LOCALES.filter((o) => o !== l)
    .map((o) => `<meta property="og:locale:alternate" content="${o.ogLocale}">`)
    .join('\n    ')
  return `<meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}">
    <link rel="canonical" href="${SITE_URL}${path}">
    ${alternates(pathOf)}
    <meta name="theme-color" content="#f3ede0">
    <link rel="icon" href="/assets/media/icon.svg" type="image/svg+xml">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="${esc(l.siteName)}">
    <meta property="og:title" content="${esc(title)}">
    <meta property="og:description" content="${esc(description)}">
    <meta property="og:url" content="${SITE_URL}${path}">
    <meta property="og:image" content="${SITE_URL}${ogImage}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:locale" content="${l.ogLocale}">
    ${ogAlternates}
    <meta name="twitter:card" content="summary_large_image">
    ${fontPreload(l)}
    <link rel="stylesheet" href="/assets/site.css">`
}

function header(l, pathOf) {
  const items = LOCALES.map((o) => {
    const current = o === l ? ' aria-current="true"' : ''
    return `<li><a href="${pathOf(o)}" hreflang="${o.hreflang}" lang="${o.htmlLang}"${current} data-lang-link>${esc(o.nativeName)}</a></li>`
  }).join('')
  return `<header class="topbar">
      <a class="topbar__name" href="${homePath(l)}">${esc(l.siteName)}</a>
      <details class="lang">
        <summary aria-label="${esc(l.language)}: ${esc(l.nativeName)}">${esc(l.nativeName)}</summary>
        <ul class="lang__list">${items}</ul>
      </details>
    </header>`
}

function footer(l, version, date) {
  const email = CONTACT_EMAIL
    ? `<li>${esc(l.footer.email)}: <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></li>`
    : ''
  return `<footer class="footer">
        <ul class="footer__links">
          ${email}
          <li><a href="${privacyPath(l)}">${esc(l.footer.privacy)}</a></li>
          <li><button type="button" class="linklike" data-consent-open>${esc(l.footer.counter)}</button></li>
          <li>${esc(l.footer.version)} ${esc(version)} · <time datetime="${date.toISOString().slice(0, 10)}">${esc(new Intl.DateTimeFormat(l.htmlLang, { dateStyle: 'long' }).format(date))}</time></li>
        </ul>
      </footer>`
}

function consentBar(l) {
  return `<div class="consent" data-consent hidden>
      <p class="consent__text">${esc(l.consent.text)} <a href="${privacyPath(l)}">${esc(l.consent.more)}</a></p>
      <div class="consent__actions">
        <button type="button" class="button button--plain" data-consent-answer="yes">${esc(l.consent.yes)}</button>
        <button type="button" class="button button--plain" data-consent-answer="no">${esc(l.consent.no)}</button>
      </div>
    </div>`
}

/** Настройки для site.js: язык страницы и строки «есть версия на вашем языке» (OB-13). */
function clientConfig(l) {
  const hints = Object.fromEntries(
    LOCALES.map((o) => [o.code, { text: o.langHint, close: o.close, href: homePath(o) }]),
  )
  return JSON.stringify({ lang: l.code, metrikaId: METRIKA_ID, hints }).replaceAll('<', '\\u003c')
}

function jsonLd(l) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: l.siteName,
    description: l.meta.description,
    inLanguage: l.htmlLang,
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Android, Windows, macOS, Linux',
    browserRequirements: 'Chrome or Edge with Web MIDI',
    url: `${SITE_URL}${APP_PATH}`,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
  }).replaceAll('<', '\\u003c')
}

function homePage(l, version, date) {
  const m = l.method
  const b = l.begin
  return `<!doctype html>
<html lang="${l.htmlLang}">
  <head>
    ${head(l, {
      title: l.meta.title,
      description: l.meta.description,
      path: homePath(l),
      pathOf: homePath,
      ogImage: `/assets/og/og-${l.code}.png`,
    })}
    <script type="application/ld+json">${jsonLd(l)}</script>
  </head>
  <body>
    ${header(l, homePath)}
    <main>
      <section class="screen hero" id="start">
        <video class="hero__video" muted loop playsinline preload="none" poster="/assets/media/keys-poster.webp" aria-hidden="true" tabindex="-1"></video>
        <div class="screen__inner hero__inner">
          <p class="lang-hint" data-lang-hint hidden></p>
          <h1 class="hero__title">${esc(l.hero.title)}</h1>
          <p class="hero__lead">${esc(l.hero.lead)}</p>
          <p class="cta-row">
            <a class="button button--cta" href="${APP_PATH}" data-cta>${esc(l.hero.cta)}</a>
            <span class="cta-note">${esc(l.hero.free)}</span>
          </p>
        </div>
      </section>

      <section class="screen method" id="method" aria-labelledby="method-title">
        <div class="screen__inner">
          <h2 id="method-title">${esc(m.title)}</h2>
          <img class="shot shot--wide" src="/assets/media/sequence.webp" width="1600" height="378" alt="${esc(m.alt)}" loading="lazy" decoding="async">
          <dl class="modes">
            ${m.modes.map((x) => `<div class="modes__item"><dt>${esc(x.name)}</dt><dd>${esc(x.text)}</dd></div>`).join('\n            ')}
          </dl>
          <p class="method__adaptive">${esc(m.adaptive)}</p>
        </div>
      </section>

      <section class="screen see" id="see" aria-labelledby="see-title">
        <div class="screen__inner">
          <h2 id="see-title">${esc(l.see.title)}</h2>
          <div class="feedback">
            <figure>
              <img class="shot" src="/assets/media/note-correct.webp" width="700" height="320" alt="" loading="lazy" decoding="async">
              <figcaption>${esc(l.see.correct)}</figcaption>
            </figure>
            <figure>
              <img class="shot" src="/assets/media/note-wrong.webp" width="700" height="320" alt="" loading="lazy" decoding="async">
              <figcaption>${esc(l.see.wrong)}</figcaption>
            </figure>
          </div>
          <ul class="lines">
            ${l.see.lines.map((x) => `<li>${esc(x)}</li>`).join('\n            ')}
          </ul>
        </div>
      </section>

      <section class="screen begin" id="begin" aria-labelledby="begin-title">
        <div class="screen__inner">
          <h2 id="begin-title">${esc(b.title)}</h2>
          <p class="alert" data-unsupported hidden>${esc(b.unsupported)}</p>
          <ol class="steps" aria-label="${esc(b.stepsLabel)}">
            ${b.steps.map((x) => `<li>${esc(x)}</li>`).join('\n            ')}
          </ol>
          <div class="facts">
            <div>
              <h3>${esc(b.needTitle)}</h3>
              <p>${esc(b.need)}</p>
              <p>${esc(b.ios)}</p>
            </div>
            <div>
              <h3>${esc(b.honestTitle)}</h3>
              <ul>
                ${b.honest.map((x) => `<li>${esc(x)}</li>`).join('\n                ')}
                ${l.appInLanguage ? '' : `<li><strong>${esc(b.appEnglish)}</strong></li>`}
              </ul>
            </div>
          </div>
          <p class="cta-row">
            <a class="button button--cta" href="${APP_PATH}" data-cta>${esc(l.hero.cta)}</a>
          </p>
        </div>
      </section>
    </main>
    ${footer(l, version, date)}
    ${consentBar(l)}
    <script type="application/json" id="site-config">${clientConfig(l)}</script>
    <script src="/assets/site.js" defer></script>
  </body>
</html>
`
}

function privacyPage(l, version, date) {
  const p = l.privacy
  return `<!doctype html>
<html lang="${l.htmlLang}">
  <head>
    ${head(l, {
      title: `${p.title} — ${l.siteName}`,
      description: p.paragraphs[0],
      path: privacyPath(l),
      pathOf: privacyPath,
      ogImage: `/assets/og/og-${l.code}.png`,
    })}
  </head>
  <body>
    ${header(l, privacyPath)}
    <main class="page">
      <h1>${esc(p.title)}</h1>
      ${p.paragraphs.map((x) => `<p>${esc(x)}</p>`).join('\n      ')}
      <p><a href="${p.termsUrl}" rel="noopener">${esc(p.termsLink)}</a></p>
      <p><a href="${homePath(l)}">${esc(p.back)}</a></p>
    </main>
    ${footer(l, version, date)}
    ${consentBar(l)}
    <script type="application/json" id="site-config">${clientConfig(l)}</script>
    <script src="/assets/site.js" defer></script>
  </body>
</html>
`
}

/** Карта сайта: у каждого адреса перечислены все языковые варианты (NFR-1). */
function sitemap() {
  const entries = []
  for (const pathOf of [homePath, privacyPath]) {
    const alts = [...LOCALES.map((l) => [l.hreflang, pathOf(l)]), ['x-default', pathOf(en)]]
      .map(([lang, p]) => `<xhtml:link rel="alternate" hreflang="${lang}" href="${SITE_URL}${p}"/>`)
      .join('\n    ')
    for (const l of LOCALES) {
      entries.push(`  <url>\n    <loc>${SITE_URL}${pathOf(l)}</loc>\n    ${alts}\n  </url>`)
    }
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join('\n')}
</urlset>
`
}

function write(path, content) {
  const file = join(DIST, path)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, content)
}

export function build() {
  const version = buildVersion()
  const date = new Date()
  rmSync(DIST, { recursive: true, force: true })
  cpSync(join(here, 'assets'), join(DIST, 'assets'), { recursive: true })
  for (const l of LOCALES) {
    write(`${homePath(l)}index.html`, homePage(l, version, date))
    write(`${privacyPath(l)}index.html`, privacyPage(l, version, date))
  }
  write('sitemap.xml', sitemap())
  // Приложение (/piaono_app/) индексировать можно: это обычная страница. Закрывать нечего.
  write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`)
  // GitHub Pages без Jekyll: файлы отдаются как есть.
  write('.nojekyll', '')
  console.log(`site/dist: ${LOCALES.length} языков, версия ${version}`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) build()

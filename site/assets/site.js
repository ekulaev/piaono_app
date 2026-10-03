// Скрипт сайта-лендинга (C-LAUNCH-1). Без него сайт полностью читается и работает (NFR-6);
// скрипт только добавляет: проверку браузера (OB-6), видео (OB-12), предложение языка (OB-13),
// согласие и счётчик (OB-14).
//
// INV-1: здесь нет service worker и нет ключей `piaono.*` — данные приложения не трогаем.
// Свои ключи — с префиксом `site.`.

;(function () {
  'use strict'

  var config = JSON.parse(document.getElementById('site-config').textContent)
  var CONSENT_KEY = 'site.metrikaConsent'
  var LANG_HINT_KEY = 'site.langHintDismissed'

  // localStorage может быть недоступен (приватный режим, запрет cookie) — тогда просто не помним.
  function load(key) {
    try {
      return window.localStorage.getItem(key)
    } catch {
      return null
    }
  }
  function save(key, value) {
    try {
      window.localStorage.setItem(key, value)
    } catch {
      /* не помним — не страшно */
    }
  }

  // ---------- OB-6: умеет ли браузер получать ноты с пианино ----------
  // Только проверка наличия API: доступ не запрашиваем, окна разрешения не будет.
  var unsupported = document.querySelector('[data-unsupported]')
  if (unsupported && typeof navigator.requestMIDIAccess !== 'function') {
    unsupported.hidden = false
  }

  // ---------- OB-12: фоновое видео ----------
  var video = document.querySelector('.hero__video')
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  var saveData = navigator.connection && navigator.connection.saveData
  if (video && !reduceMotion && !saveData) {
    // Узкий экран — облегчённый вариант (LIM-5). Источники добавляем скриптом: без скрипта,
    // с «уменьшением движения» и при экономии трафика видео не скачивается вовсе.
    var size = window.matchMedia('(max-width: 45em)').matches ? '640' : '1280'
    ;['webm', 'mp4'].forEach(function (type) {
      var source = document.createElement('source')
      source.src = '/assets/media/keys-' + size + '.' + type
      source.type = 'video/' + type
      video.appendChild(source)
    })
    video.load()
    var playing = video.play()
    if (playing && playing.catch) playing.catch(function () {}) // автозапуск запрещён — остаётся постер

    // Экран ушёл из вида — видео на паузе: не тратим батарею.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var p = video.play()
            if (p && p.catch) p.catch(function () {})
          } else {
            video.pause()
          }
        })
      }).observe(video)
    }
  }

  // ---------- OB-11: смена языка — на тот же экран ----------
  var screens = Array.prototype.slice.call(document.querySelectorAll('.screen[id]'))
  function currentScreen() {
    var middle = window.innerHeight / 2
    for (var i = screens.length - 1; i >= 0; i--) {
      if (screens[i].getBoundingClientRect().top <= middle) return screens[i].id
    }
    return ''
  }
  // Адреса ссылок обновляем, когда список языков открывается: в этот момент видно,
  // на каком экране посетитель.
  var langMenu = document.querySelector('.lang')
  if (langMenu) {
    langMenu.addEventListener('toggle', function () {
      if (!langMenu.open) return
      var id = currentScreen()
      langMenu.querySelectorAll('[data-lang-link]').forEach(function (link) {
        link.hash = id && id !== 'start' ? id : ''
      })
    })
  }

  // ---------- OB-13: «есть версия на вашем языке», без переадресации ----------
  var hint = document.querySelector('[data-lang-hint]')
  if (hint && load(LANG_HINT_KEY) !== '1') {
    var preferred = (navigator.languages || [navigator.language || '']).map(function (tag) {
      return String(tag).toLowerCase().split('-')[0]
    })
    var match = null
    for (var i = 0; i < preferred.length; i++) {
      if (config.hints[preferred[i]]) {
        match = preferred[i]
        break
      }
    }
    if (match && match !== config.lang) {
      var offer = config.hints[match]
      var link = document.createElement('a')
      link.href = offer.href
      link.lang = match === 'zh' ? 'zh-Hans' : match
      link.hreflang = link.lang
      link.textContent = offer.text
      var close = document.createElement('button')
      close.type = 'button'
      close.className = 'button button--plain'
      close.lang = link.lang
      close.textContent = offer.close
      close.addEventListener('click', function () {
        hint.hidden = true
        save(LANG_HINT_KEY, '1')
      })
      hint.appendChild(link)
      hint.appendChild(close)
      hint.hidden = false
    }
  }

  // ---------- OB-14: согласие и Яндекс Метрика ----------
  var bar = document.querySelector('[data-consent]')
  var metrikaLoaded = false

  // Код счётчика — присланный владельцем, без изменений в настройках. Выполняется только
  // после «Согласен». <noscript>-пиксель не ставим: без скрипта согласие не спросить.
  function startMetrika() {
    if (metrikaLoaded) return
    metrikaLoaded = true
    ;(function (m, e, t, r, i, k, a) {
      m[i] =
        m[i] ||
        function () {
          ;(m[i].a = m[i].a || []).push(arguments)
        }
      m[i].l = 1 * new Date()
      for (var j = 0; j < document.scripts.length; j++) {
        if (document.scripts[j].src === r) return
      }
      k = e.createElement(t)
      a = e.getElementsByTagName(t)[0]
      k.async = 1
      k.src = r
      a.parentNode.insertBefore(k, a)
    })(
      window,
      document,
      'script',
      'https://mc.yandex.ru/metrika/tag.js?id=' + config.metrikaId,
      'ym',
    )

    window.ym(config.metrikaId, 'init', {
      ssr: true,
      webvisor: true,
      clickmap: true,
      ecommerce: 'dataLayer',
      referrer: document.referrer,
      url: location.href,
      accurateTrackBounce: true,
      trackLinks: true,
    })
  }

  // Переход в приложение — тот же домен, поэтому Метрика не считает его внешней ссылкой.
  // Отдельная цель `open_app` показывает, сколько посетителей открыли тренажёр (US-5).
  document.querySelectorAll('[data-cta]').forEach(function (cta) {
    cta.addEventListener('click', function () {
      if (metrikaLoaded && window.ym) window.ym(config.metrikaId, 'reachGoal', 'open_app')
    })
  })

  var consent = load(CONSENT_KEY)
  if (consent === 'yes') startMetrika()
  else if (consent !== 'no' && bar) bar.hidden = false

  if (bar) {
    bar.querySelectorAll('[data-consent-answer]').forEach(function (button) {
      button.addEventListener('click', function () {
        var answer = button.getAttribute('data-consent-answer')
        save(CONSENT_KEY, answer)
        bar.hidden = true
        if (answer === 'yes') startMetrika()
        // Отказ после согласия: уже загруженный счётчик выгрузится только с перезагрузкой.
        else if (metrikaLoaded) location.reload()
      })
    })
  }

  document.querySelectorAll('[data-consent-open]').forEach(function (button) {
    button.addEventListener('click', function () {
      if (!bar) return
      bar.hidden = false
      var first = bar.querySelector('button')
      if (first) first.focus()
    })
  })
})()

# Сайт-лендинг

Публичная страница тренажёра на корне `https://ekulaev.github.io/`. Требования —
`PSD/specifications/M-LAUNCH/C-LAUNCH-1 Лендинг.md`. Приложение остаётся на `/piaono_app/` и
этим кодом не затрагивается.

## Как устроено

```
site/
  build.mjs          — сборка: шесть языков из одного шаблона → site/dist
  check.mjs          — автоматические проверки собранного сайта
  locales/<язык>.mjs — все тексты одного языка (en, ru, de, es, fr, zh)
  assets/
    site.css         — стили (правила дизайна — раздел «Дизайн сайта» спецификации)
    site.js          — браузер без Web MIDI, видео, «есть версия на вашем языке», согласие и Метрика
    fonts/           — Golos Text (SIL OFL, текст лицензии — OFL.txt)
    media/           — видео экранной клавиатуры, постер, снимки из приложения, значок
    og/              — превью для мессенджеров, по картинке на язык
  tools/             — скрипты съёмки медиа и превью (нужен Playwright, в зависимости не входит)
```

Зависимостей нет: сборка — обычный Node, страница — HTML и CSS. Без JavaScript всё читается,
работают ссылки, переключатель языка и кнопка «Открыть тренажёр».

| Команда              | Что делает                                                           |
| -------------------- | -------------------------------------------------------------------- |
| `npm run site:build` | Собирает `site/dist`                                                 |
| `npm run site:check` | Проверяет `hreflang`, canonical, размеры, чужие ресурсы, карту сайта |

Посмотреть локально: `npm run site:build`, затем `cd site/dist && python3 -m http.server 8080` и
`http://localhost:8080/ru/`.

## Адреса

| Язык                  | Главная | Конфиденциальность |
| --------------------- | ------- | ------------------ |
| English (`x-default`) | `/`     | `/privacy/`        |
| Русский               | `/ru/`  | `/ru/privacy/`     |
| Deutsch               | `/de/`  | `/de/privacy/`     |
| Español               | `/es/`  | `/es/privacy/`     |
| Français              | `/fr/`  | `/fr/privacy/`     |
| 中文                  | `/zh/`  | `/zh/privacy/`     |

## Публикация

Workflow `.github/workflows/deploy-site.yml` при каждом слиянии в `main`, затронувшем `site/`,
собирает и проверяет сайт, а потом отправляет `site/dist` в репозиторий
`ekulaev/ekulaev.github.io`. Один раз нужно:

1. Создать на GitHub публичный репозиторий **`ekulaev.github.io`** (пустой).
2. В его Settings → Pages выбрать Source: «Deploy from a branch», ветка `main`, папка `/ (root)`.
3. Создать fine-grained токен (Settings → Developer settings → Fine-grained tokens): доступ только
   к `ekulaev.github.io`, право **Contents: Read and write**.
4. В репозитории `piaono_app`: Settings → Secrets and variables → Actions → New repository secret,
   имя `SITE_DEPLOY_TOKEN`, значение — токен.
5. Actions → «Deploy landing site» → Run workflow.

**Не подключать свой домен** к `ekulaev.github.io`: GitHub переведёт на него и приложение, адрес
приложения сменится, и прогресс на планшете пропадёт (C-LAUNCH-1, Р-1).

## Яндекс Метрика

Счётчик загружается только после «Согласен» в полосе внизу страницы. Переход в приложение — цель
`open_app`: в Метрике создать цель типа «JavaScript-событие» с идентификатором `open_app`.

## Пересъёмка медиа

1. `npm run dev` (приложение на `localhost:5173`), `npm i --no-save playwright`.
2. `node site/tools/capture-media.mjs /tmp/raw` — видео (`*.webm`) и снимки в 2×.
3. Перекодировать (10 секунд с 3-й секунды записи):

```sh
V=/tmp/raw/<запись>.webm; M=site/assets/media
ffmpeg -ss 3 -t 10 -i $V -an -c:v libvpx-vp9 -b:v 0 -crf 34 -vf scale=1280:720 $M/keys-1280.webm
ffmpeg -ss 3 -t 10 -i $V -an -c:v libx264 -crf 26 -pix_fmt yuv420p -movflags +faststart -vf scale=1280:720 $M/keys-1280.mp4
ffmpeg -ss 3 -t 10 -i $V -an -c:v libvpx-vp9 -b:v 0 -crf 38 -vf scale=640:360 $M/keys-640.webm
ffmpeg -ss 3 -t 10 -i $V -an -c:v libx264 -crf 28 -pix_fmt yuv420p -movflags +faststart -vf scale=640:360 $M/keys-640.mp4
ffmpeg -ss 3.5 -i $V -frames:v 1 /tmp/poster.png && convert /tmp/poster.png -quality 72 $M/keys-poster.webp
convert /tmp/raw/sequence-full.png -crop 2200x520+170+200 +repage -resize 1600x -quality 80 $M/sequence.webp
convert /tmp/raw/note-correct-full.png -crop 700x320+1670+290 +repage -quality 85 $M/note-correct.webp
convert /tmp/raw/note-wrong-full.png -crop 700x320+1670+290 +repage -quality 85 $M/note-wrong.webp
```

4. Превью: собрать сайт, запустить сервер на 8080, `node site/tools/make-og.mjs`.

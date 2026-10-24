# Tasks

## 1. Правило в ядре

- [x] 1.1 Добавить в `engine/solfege/session.ts` чистую функцию `hasValueAnswers(state)` (true в `asking`/`done`, если в `tasks` есть ответ-значение; false в `idle`/`summary`) и тесты в `session.test.ts`: только ответы-ноты, только значения, смесь, `idle`, `summary` — `npm test` зелёный

## 2. Полоса легенды в UI

- [x] 2.1 В `ui/App.tsx` передавать `legend` в `<Keyboard>` только при `hasValueAnswers(solfegeState)`, `glyphs` — из вида режима текущего задания; обновить комментарий рядом — проверка: `npm run build`, `npm run lint`, `npm run format:check`
- [x] 2.2 Проверить в Chromium + Playwright с подменой `navigator.requestMIDIAccess` на 1280×720, 1280×752, 960×600, 740×360, 360×740: «Длительности» и «Интервалы» до «Старт» — мини вплотную к клавишам; «Длительности» в сессии — полоса со значками, клавиши на месте; «Интервалы» «Сыграй» — полосы нет; «Оба» — полоса не прыгает между заданиями; «Стоп» и итог — полосы нет; «Последовательности», «Разминка», «Контур», «Ритм» без изменений; компактный экран и «скрывать» — ряд под станом как раньше. Снимки приложить к PR

## 3. Сдача

- [x] 3.1 Прогнать `npm run build`, `npm run lint`, `npm test`, `npm run format:check`, `npx openspec validate --all --strict` — все зелёные; описание PR по-русски с инструкцией проверки на планшете
- [ ] 3.2 После проверки владельцем — `/opsx:archive solfege-legend-gap` последним коммитом ветки `apply/solfege-legend-gap`; паспорта M-SOL и M-KBD обновлены

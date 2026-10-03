#!/bin/bash
# Подготовка облачной сессии: зависимости проекта и CLI OpenSpec (в devDependencies),
# чтобы сборка, тесты и `npx openspec …` работали сразу, без ручной установки.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}"
# npm install, а не npm ci: состояние контейнера кешируется, повторный запуск быстрый.
npm install --no-audit --no-fund

# `openspec` без npx доступен в обычной команде: кладём node_modules/.bin в PATH сессии.
if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  echo "export PATH=\"$PWD/node_modules/.bin:\$PATH\"" >> "$CLAUDE_ENV_FILE"
fi

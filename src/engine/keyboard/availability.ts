// Когда на экране есть экранная клавиатура и когда ученику «нечем играть» (C-APP-5).

/** Клавиатура показана: экран обычный и ученик не скрыл её в «Настройках». */
export function keyboardShown(compact: boolean, keyboardVisible: boolean): boolean {
  return !compact && keyboardVisible
}

/** Есть ли источник нот: показанная клавиатура или пианино на связи. */
export function canPlay(shown: boolean, pianoConnected: boolean): boolean {
  return shown || pianoConnected
}

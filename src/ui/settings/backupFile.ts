// Файл резервной копии на устройстве ученика (C-APP-4): отдать готовый текст системе. Что
// в файле — решает storage/backup.ts; здесь только как он попадает в хранилище.

export type SaveFileResult = 'saved' | 'cancelled' | 'failed'

/**
 * iPhone и iPad. Приложение с экрана «Домой» на iOS не умеет скачивать файлы, поэтому там —
 * окно «Поделиться» (Р-6). iPad с «настольным» Safari называет себя Mac, его выдаёт сенсорный
 * экран. Это единственное место в приложении, где платформа определяется по userAgent.
 */
function isAppleMobile(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

/**
 * Сохранить файл копии. На Android и компьютерах — обычное скачивание, как привык ученик; на
 * iOS — «Поделиться» (там есть «Сохранить в Файлы»). Вызывать прямо из обработчика касания:
 * iOS отклоняет «Поделиться» без жеста пользователя.
 */
export async function saveBackupFile(fileName: string, text: string): Promise<SaveFileResult> {
  if (isAppleMobile()) {
    const file = new File([text], fileName, { type: 'application/json' })
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] })
        return 'saved'
      } catch (error) {
        // Закрыл окно «Поделиться» — ничего не сохранено, но и ошибки нет.
        return error instanceof DOMException && error.name === 'AbortError' ? 'cancelled' : 'failed'
      }
    }
  }
  return download(fileName, text)
}

function download(fileName: string, text: string): SaveFileResult {
  try {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.append(link)
    link.click()
    link.remove()
    // Браузеру нужно успеть начать скачивание, прежде чем ссылка станет недействительной.
    setTimeout(() => URL.revokeObjectURL(url), 0)
    return 'saved'
  } catch {
    return 'failed'
  }
}

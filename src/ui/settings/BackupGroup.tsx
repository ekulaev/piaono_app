import { useRef, useState, type ChangeEvent } from 'react'
import { formatDateTime } from '../../i18n'
import {
  createBackup,
  MAX_BACKUP_BYTES,
  readBackup,
  type Backup,
  type BackupDate,
} from '../../storage/backup'
import ConfirmDialog from '../ConfirmDialog'
import HintButton from '../hints/HintButton'
import { CheckIcon, WarningIcon } from '../icons/Icons'
import { useI18n } from '../i18n/useI18n'
import { saveBackupFile } from './backupFile'
import SettingsRow from './SettingsRow'
import './BackupGroup.css'

/** Итог последнего действия группы (C-APP-4, OB-9). */
export type BackupResult =
  | { kind: 'saved'; fileName: string }
  | { kind: 'restored'; createdAt: BackupDate }
  | { kind: 'broken' }
  | { kind: 'saveFailed' }
  | { kind: 'restoreFailed' }

interface Props {
  /** Итог, с которым группа открывается: после восстановления приложение пересоздано (Д-9). */
  initialResult?: BackupResult | null
  /**
   * Заменить данные копией. true — получилось, и приложение уже пересоздаётся на новых данных;
   * false — ничего не изменилось.
   */
  onRestore: (backup: Backup) => boolean
}

/**
 * Группа «Копия» в «Настройках»: сохранить настройки и прогресс в файл и вернуть их из файла.
 * Строки живут в списке группы и создаются заново при каждом её открытии — итог при уходе
 * из группы пропадает сам.
 */
function BackupGroup({ initialResult = null, onRestore }: Props) {
  const { t, language } = useI18n()
  const [result, setResult] = useState<BackupResult | null>(initialResult)
  // Прочитанная годная копия ждёт ответа «Да / Нет».
  const [pending, setPending] = useState<Backup | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dateOf = (backup: { createdAt: BackupDate }) => formatDateTime(language, backup.createdAt)

  async function save() {
    setResult(null)
    const { fileName, text } = createBackup(new Date())
    const saved = await saveBackupFile(fileName, text)
    if (saved === 'saved') setResult({ kind: 'saved', fileName })
    else if (saved === 'failed') setResult({ kind: 'saveFailed' })
  }

  function choose() {
    setResult(null)
    inputRef.current?.click()
  }

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const file = input.files?.[0]
    // Тот же файл можно выбрать снова — иначе браузер не пришлёт второго события.
    input.value = ''
    if (!file) return
    if (file.size > MAX_BACKUP_BYTES) {
      setResult({ kind: 'broken' })
      return
    }
    let text: string
    try {
      text = await file.text()
    } catch {
      setResult({ kind: 'broken' })
      return
    }
    const read = readBackup(text)
    if (read.ok) setPending(read.backup)
    else setResult({ kind: 'broken' })
  }

  function confirm() {
    const backup = pending!
    setPending(null)
    // При удаче приложение пересоздаётся с итогом «восстановлено» — эта группа уже не нужна.
    if (!onRestore(backup)) setResult({ kind: 'restoreFailed' })
  }

  return (
    <>
      <SettingsRow label={t('backup.make')}>
        <button type="button" className="button" onClick={save}>
          {t('backup.save')}
        </button>
        <HintButton id="backup" placement="inline" />
      </SettingsRow>

      <SettingsRow label={t('backup.load')}>
        <button type="button" className="button" onClick={choose}>
          {t('backup.choose')}
        </button>
        {/* Система показывает только файлы JSON, где умеет; настоящая проверка — readBackup (Р-11). */}
        <input
          ref={inputRef}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={onFile}
        />
      </SettingsRow>

      {/* Область итога есть всегда: так диктор объявит новый итог. Пустая не видна (OB-8). */}
      <li className="backup-result-slot" role="status">
        {result && resultLine(result)}
      </li>

      {pending && (
        <ConfirmDialog
          question={t('backup.confirm', { date: dateOf(pending) })}
          details={t('backup.confirmDetails')}
          onYes={confirm}
          onNo={() => setPending(null)}
        />
      )}
    </>
  )

  function resultLine(result: BackupResult) {
    const good = result.kind === 'saved' || result.kind === 'restored'
    const text =
      result.kind === 'saved'
        ? t('backup.saved', { name: result.fileName })
        : result.kind === 'restored'
          ? t('backup.restored', { date: dateOf(result) })
          : t(`backup.${result.kind}`)
    return (
      <p className={`backup-result ${good ? 'backup-result--good' : 'backup-result--bad'}`}>
        {good ? <CheckIcon /> : <WarningIcon />}
        <span>{text}</span>
      </p>
    )
  }
}

export default BackupGroup

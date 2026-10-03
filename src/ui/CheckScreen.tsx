import { pitchToNoteName } from '../midi/noteNames'
import type { MidiNoteEvent } from '../midi/types'
import ScreenHeader from './ScreenHeader'
import './CheckScreen.css'
import { useT } from './i18n/useI18n'

export interface LogEntry {
  id: number
  event: MidiNoteEvent
}

interface Props {
  log: LogEntry[]
  /** Текст последней ошибки запроса MIDI (для диагностики); null — ошибки нет. */
  accessError: string | null
  /** «Назад» — в «Настройки», откуда пришли. */
  onBack: () => void
  onHome: () => void
}

/**
 * «Проверка пианино» — вложенный экран «Настроек» (бывший MIDI-монитор этапа 0): какие ноты
 * приходят с активного устройства и что ответила система на запрос MIDI. Статус связи — в
 * верхней панели; устройства, глиссандо и переподключение — в «Настройках» (C-APP-1, OB-14).
 */
function CheckScreen({ log, accessError, onBack, onHome }: Props) {
  const t = useT()
  return (
    <main className="screen check">
      <ScreenHeader title={t('check.title')} onBack={onBack} onHome={onHome} />

      {accessError && <p className="check__error">{t('check.error', { error: accessError })}</p>}

      <section className="log">
        <h2>{t('check.logTitle')}</h2>
        {log.length === 0 ? (
          <p className="log__empty">{t('check.empty')}</p>
        ) : (
          <ul className="log__list">
            {log.map(({ id, event }) => (
              <li key={id} className={`log__entry log__entry--${event.type}`}>
                <span className="log__note">{pitchToNoteName(event.pitch)}</span>
                <span className="log__pitch">{t('check.noteNumber', { pitch: event.pitch })}</span>
                <span className="log__kind">
                  {event.type === 'noteOn' ? t('check.pressed') : t('check.released')}
                </span>
                {event.type === 'noteOn' && (
                  <span className="log__velocity">
                    {t('check.velocity', { value: event.velocity })}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

export default CheckScreen

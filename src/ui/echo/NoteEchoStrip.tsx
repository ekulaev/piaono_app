import type { NoteDescription } from '../../engine/noteEcho/describeNote'
import type { EchoSlots } from '../../engine/noteEcho/slots'
import type { MessageKey } from '../../i18n'
import { useT } from '../i18n/useI18n'
import './NoteEchoStrip.css'

interface Props {
  slots: EchoSlots
}

type Translate = (key: MessageKey, params?: Record<string, string | number>) => string

/** Название октавы на языке приложения; у октав вне 0–8 — «октава N» / «octave N». */
function octaveName(octave: number, t: Translate): string {
  if (Number.isInteger(octave) && octave >= 0 && octave <= 8) {
    return t(`octave.${octave}` as MessageKey)
  }
  return t('octave.other', { n: octave })
}

function smallLine(note: NoteDescription, t: Translate): string {
  const letters = `${note.letter}${note.sharp ? '♯' : ''}${note.octave}`
  return t('echo.small', { note: letters, octave: octaveName(note.octave, t) })
}

/**
 * Полоса нажатых нот (C-STF-8): пять постоянных слотов, пустой слот держит место. Диктору
 * карточки не читаются — поток объявлений мешал бы игре (NFR-4).
 */
function NoteEchoStrip({ slots }: Props) {
  const t = useT()
  return (
    <div className="note-echo" aria-hidden="true">
      {slots.map((card, index) => (
        <div key={index} className="note-echo__slot">
          {card && (
            <div key={card.id} className="note-echo__card">
              <span className="note-echo__name">
                {card.note.solfege}
                {card.note.sharp ? '♯' : ''}
              </span>
              <span className="note-echo__small">{smallLine(card.note, t)}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default NoteEchoStrip

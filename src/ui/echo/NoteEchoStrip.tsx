import type { CSSProperties } from 'react'
import type { NoteDescription } from '../../engine/noteEcho/describeNote'
import { cardOrders, opacityForOrder } from '../../engine/noteEcho/fade'
import type { EchoCard, EchoSlots } from '../../engine/noteEcho/slots'
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

interface CardProps {
  card: EchoCard
  /** Порядок среди видимых карточек (1 — последняя); у уходящей его нет. */
  order: number | undefined
  t: Translate
}

/** Одна карточка: последняя — полная непрозрачность и толстая рамка, старые тусклее (OB-18, OB-19). */
function Card({ card, order, t }: CardProps) {
  const opacity = order === undefined ? 0 : opacityForOrder(order)
  return (
    <div
      className={`note-echo__card${order === 1 ? ' note-echo__card--last' : ''}`}
      style={{ opacity, '--fade': `${card.fadeMs}ms` } as CSSProperties}
    >
      <span className="note-echo__name">
        {card.note.solfege}
        {card.note.sharp ? '♯' : ''}
      </span>
      <span className="note-echo__small">{smallLine(card.note, t)}</span>
    </div>
  )
}

/**
 * Полоса нажатых нот (C-STF-8): пять постоянных слотов, пустой слот держит место. Диктору
 * карточки не читаются — поток объявлений мешал бы игре (NFR-4).
 */
function NoteEchoStrip({ slots }: Props) {
  const t = useT()
  const orders = cardOrders(slots)
  return (
    <div className="note-echo" aria-hidden="true">
      {slots.map((card, index) => (
        <div key={index} className="note-echo__slot">
          {card && <Card card={card} order={orders.get(card.id)} t={t} />}
        </div>
      ))}
    </div>
  )
}

export default NoteEchoStrip

import type { ConnectionState } from '../midi/types'
import './ConnectionStatus.css'

/** Короткое название состояния — крупно, рядом с индикатором. */
const STATUS_TITLE: Record<ConnectionState, string> = {
  unsupported: 'Этот браузер не умеет работать с пианино',
  'permission-denied': 'Доступ к пианино запрещён',
  connecting: 'Подключаемся…',
  'no-device': 'Пианино не подключено',
  connected: 'Пианино на связи',
  lost: 'Связь потеряна — восстанавливаю',
}

interface Props {
  state: ConnectionState
}

/**
 * Индикатор «пианино на связи». У каждого состояния своя форма значка
 * (круг, пунктир, квадрат, треугольник…), а не только цвет — различимо и в оттенках серого.
 */
function ConnectionStatus({ state }: Props) {
  return (
    <section className={`status status--${state}`} aria-live="polite">
      <span className="status__icon" aria-hidden="true" />
      <span className="status__title">{STATUS_TITLE[state]}</span>
    </section>
  )
}

export default ConnectionStatus

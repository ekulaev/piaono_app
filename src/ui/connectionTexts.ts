import type { MessageKey } from '../i18n'
import type { ConnectionState } from '../midi/types'

/** Ключ короткого названия состояния — рядом со значком, в верхней панели и в «Настройках». */
export const STATUS_TITLE_KEY: Record<ConnectionState, MessageKey> = {
  unsupported: 'status.unsupported',
  'permission-denied': 'status.permission-denied',
  unavailable: 'status.unavailable',
  connecting: 'status.connecting',
  'no-device': 'status.no-device',
  connected: 'status.connected',
  lost: 'status.lost',
}

/**
 * Рамка состояния: у каждого состояния своя форма значка (круг, пунктир, квадрат,
 * треугольник…) и свой цвет рамки — различимо и в оттенках серого.
 */
export const statusClass = (state: ConnectionState) => `status status--${state}`

import type { ConnectionState } from '../midi/types'

/** Короткое название состояния — рядом со значком, в верхней панели и в «Настройках». */
export const STATUS_TITLE: Record<ConnectionState, string> = {
  unsupported: 'Этот браузер не умеет работать с пианино',
  'permission-denied': 'Доступ к пианино запрещён',
  unavailable: 'Пианино занято',
  connecting: 'Подключаемся…',
  'no-device': 'Пианино не подключено',
  connected: 'Пианино на связи',
  lost: 'Связь потеряна — восстанавливаю',
}

/**
 * Рамка состояния: у каждого состояния своя форма значка (круг, пунктир, квадрат,
 * треугольник…) и свой цвет рамки — различимо и в оттенках серого.
 */
export const statusClass = (state: ConnectionState) => `status status--${state}`

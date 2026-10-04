import { useEffect, useRef } from 'react'
import type { MenuState, ModeSettings } from '../../engine/modes/modeMenu'
import { MODES, modeInfo, type ModeId } from '../../engine/modes/modes'
import type { RhythmSettings } from '../../engine/rhythm/settings'
import type { SequenceSettings } from '../../engine/sequences/settings'
import RhythmSettingsForm from '../rhythm/RhythmSettingsForm'
import HintButton from '../hints/HintButton'
import { modeHintId } from '../hints/hints'
import SequenceSettingsForm from '../sequences/SequenceSettingsForm'
import WarmupSettingsForm from '../warmup/WarmupSettingsForm'
import IntervalsSettingsForm from '../solfege/IntervalsSettingsForm'
import DurationsSettingsForm from '../solfege/DurationsSettingsForm'
import type { DurationsSettings } from '../../engine/solfege/durations/settings'
import type { IntervalsSettings } from '../../engine/solfege/intervals/settings'
import type { WarmupSettings } from '../../engine/warmup/settings'
import './ModeMenu.css'
import { useT } from '../i18n/useI18n'

interface Props {
  menu: MenuState
  activeMode: ModeId
  onChoose: (modeId: ModeId) => void
  /** Изменение настройки на экране режима (меняет только черновик). */
  onEditDraft: (draft: ModeSettings) => void
  onBack: () => void
  onClose: () => void
  /** «Выбрать»: сделать режим активным, не запуская. */
  onSelect: () => void
  /** «Старт»: сделать режим активным и сразу запустить. */
  onStart: () => void
  /** Сколько белых клавиш видно на клавиатуре главного экрана; null — клавиатуры нет. */
  keyboardCapacity: number | null
  /** Нечем играть: «Старт» отключена, «Выбрать» работает (C-APP-5, OB-6). */
  startDisabled: boolean
}

/**
 * Меню режимов у правого края поверх главного экрана. Появляется сразу, без анимации.
 * Прозрачная подложка на весь экран ловит касание вне меню: оно только закрывает меню
 * и не доходит до клавиатуры и кнопок под ним.
 */
function ModeMenu(props: Props) {
  // Панель монтируется только при открытом меню: так фокус и Esc живут ровно столько же,
  // сколько само меню, а после закрытия фокус возвращается туда, где был.
  return props.menu.screen === 'closed' ? null : <OpenMenu {...props} />
}

function OpenMenu({
  menu,
  activeMode,
  onChoose,
  onEditDraft,
  onBack,
  onClose,
  onSelect,
  onStart,
  keyboardCapacity,
  startDisabled,
}: Props) {
  const t = useT()
  const panelRef = useRef<HTMLDivElement>(null)

  // Фокус клавиатуры — в меню (первая кнопка экрана), а после закрытия — туда, где был.
  // Порядок важен: сначала запомнить, где был фокус, потом перенести его в меню.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    return () => previous?.focus()
  }, [])
  // Только при смене экрана: правка настроек не должна уводить фокус с нажатой кнопки.
  const screenKey = menu.screen === 'mode' ? `mode:${menu.modeId}` : menu.screen
  useEffect(() => {
    panelRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus()
  }, [screenKey])

  // Esc закрывает меню с любого экрана.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const closeButton = (
    <button type="button" className="button mode-menu__close" onClick={onClose}>
      <span aria-hidden="true">×</span> {t('common.close')}
    </button>
  )

  return (
    <>
      <div
        className="mode-menu__backdrop"
        // Касание вне меню целиком достаётся подложке: клавиши под ней не нажимаются.
        // Закрываем по click, а не по pointerdown: иначе подложка исчезала бы до конца
        // касания, и click доставался бы кнопке под ней — «Режим» открывал меню снова.
        onPointerDown={(event) => {
          event.preventDefault()
          event.stopPropagation()
        }}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className="mode-menu"
        role="dialog"
        aria-modal="true"
        aria-label={t('modes.title')}
      >
        {menu.screen !== 'mode' ? (
          <>
            <header className="mode-menu__header">
              <h2 className="mode-menu__title">{t('modes.title')}</h2>
              {closeButton}
            </header>
            <ul className="mode-menu__list">
              {MODES.map((mode, index) => {
                const active = mode.id === activeMode
                return (
                  <li key={mode.id}>
                    <button
                      type="button"
                      className={`mode-item${active ? ' mode-item--active' : ''}`}
                      aria-pressed={active}
                      data-autofocus={index === 0 ? '' : undefined}
                      onClick={() => onChoose(mode.id)}
                    >
                      <span>{t(`mode.${mode.id}`)}</span>
                      {active && <span className="mode-item__mark">{t('modes.selected')}</span>}
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        ) : (
          <>
            <header className="mode-menu__header">
              <button type="button" className="button" data-autofocus="" onClick={onBack}>
                <span aria-hidden="true">←</span> {t('header.back')}
              </button>
              {/* «?» — сразу после названия: как играть в этом режиме (C-APP-2, OB-10). */}
              <div className="mode-menu__heading">
                <h2 className="mode-menu__title">{t(`mode.${menu.modeId}`)}</h2>
                <HintButton id={modeHintId(menu.modeId)} placement="inline" />
              </div>
              {closeButton}
            </header>
            {/* Если настройки не влезут по высоте, прокручивается только эта область. */}
            <div className="mode-menu__settings">
              {menu.modeId === 'rhythm' && menu.draft ? (
                <RhythmSettingsForm
                  settings={menu.draft as RhythmSettings}
                  onChange={onEditDraft}
                />
              ) : menu.modeId === 'warmup' && menu.draft ? (
                <WarmupSettingsForm
                  settings={menu.draft as WarmupSettings}
                  onChange={onEditDraft}
                  capacity={keyboardCapacity}
                />
              ) : menu.modeId === 'intervals' && menu.draft ? (
                <IntervalsSettingsForm
                  settings={menu.draft as IntervalsSettings}
                  onChange={onEditDraft}
                />
              ) : menu.modeId === 'durations' && menu.draft ? (
                <DurationsSettingsForm
                  settings={menu.draft as DurationsSettings}
                  onChange={onEditDraft}
                />
              ) : menu.draft ? (
                <SequenceSettingsForm
                  settings={menu.draft as SequenceSettings}
                  onChange={onEditDraft}
                  variant={menu.modeId === 'contour' ? 'contour' : 'sequences'}
                />
              ) : (
                !modeInfo(menu.modeId).hasSettings && (
                  <p className="mode-menu__empty">{t('modes.noSettings')}</p>
                )
              )}
            </div>
            <footer className="mode-menu__actions">
              <button type="button" className="button" onClick={onSelect}>
                {t('modes.select')}
              </button>
              <button
                type="button"
                className="button button--primary"
                onClick={startDisabled ? undefined : onStart}
                aria-disabled={startDisabled}
              >
                {t('main.start')}
              </button>
            </footer>
          </>
        )}
      </div>
    </>
  )
}

export default ModeMenu

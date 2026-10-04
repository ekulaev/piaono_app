import { TASKS_LIMITS, type IntervalsSettings } from '../../engine/solfege/intervals/settings'
import { ChoiceGroup, Stepper, Toggle } from '../controls/Controls'
import AutoAdvanceIcon from '../sequences/AutoAdvanceIcon'
import { useT } from '../i18n/useI18n'

interface Props {
  settings: IntervalsSettings
  onChange: (settings: IntervalsSettings) => void
}

/**
 * Настройки «Интервалов» на экране режима (C-SOL-2, «Настройки»; меняют только черновик).
 * Флажка авто-сдвига нет: в режиме он обязательный (OB-9).
 */
function IntervalsSettingsForm({ settings, onChange }: Props) {
  const t = useT()
  const set = <K extends keyof IntervalsSettings>(key: K, value: IntervalsSettings[K]) =>
    onChange({ ...settings, [key]: value })

  return (
    <div className="sequence-settings">
      <ChoiceGroup
        label={t('intervalsform.variant')}
        value={settings.variant}
        onChange={(value) => set('variant', value)}
        options={[
          { value: 'play', title: t('intervalsform.variant.play') },
          { value: 'name', title: t('intervalsform.variant.name') },
          { value: 'both', title: t('intervalsform.variant.both') },
        ]}
      />
      <Stepper
        label={t('solfegeform.tasks')}
        value={settings.tasks}
        {...TASKS_LIMITS}
        onChange={(value) => set('tasks', value)}
      />
      <Toggle
        label={t('modeControl.autoAdvance')}
        checked={settings.autoAdvance}
        onChange={(value) => set('autoAdvance', value)}
        icon={<AutoAdvanceIcon />}
      />
    </div>
  )
}

export default IntervalsSettingsForm

import { TASKS_LIMITS } from '../../engine/solfege/intervals/settings'
import type { DurationsSettings } from '../../engine/solfege/durations/settings'
import { ChoiceGroup, Stepper, Toggle } from '../controls/Controls'
import AutoAdvanceIcon from '../sequences/AutoAdvanceIcon'
import { useT } from '../i18n/useI18n'

interface Props {
  settings: DurationsSettings
  onChange: (settings: DurationsSettings) => void
}

/**
 * Настройки «Длительностей» на экране режима (C-SOL-3, «Настройки»; меняют только черновик).
 * Флажка авто-сдвига нет: клавиатура в режиме сама не сдвигается (OB-8).
 */
function DurationsSettingsForm({ settings, onChange }: Props) {
  const t = useT()
  const set = <K extends keyof DurationsSettings>(key: K, value: DurationsSettings[K]) =>
    onChange({ ...settings, [key]: value })

  return (
    <div className="sequence-settings">
      <ChoiceGroup
        label={t('durationsform.kinds')}
        value={settings.kinds}
        onChange={(value) => set('kinds', value)}
        options={[
          { value: 'notes', title: t('durationsform.kinds.notes') },
          { value: 'rests', title: t('durationsform.kinds.rests') },
          { value: 'both', title: t('durationsform.kinds.both') },
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

export default DurationsSettingsForm

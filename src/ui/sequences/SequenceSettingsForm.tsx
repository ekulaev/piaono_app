import {
  NOTES_PER_STEP_LIMITS,
  SEQUENCES_LIMITS,
  type SequenceSettings,
} from '../../engine/sequences/settings'
import { ChoiceGroup, Stepper, Toggle } from '../controls/Controls'
import AutoAdvanceIcon from './AutoAdvanceIcon'

interface Props {
  settings: SequenceSettings
  onChange: (settings: SequenceSettings) => void
}

/** Настройки режима «Последовательности» на экране режима (меняют только черновик). */
function SequenceSettingsForm({ settings, onChange }: Props) {
  const set = <K extends keyof SequenceSettings>(key: K, value: SequenceSettings[K]) =>
    onChange({ ...settings, [key]: value })

  return (
    <div className="sequence-settings">
      <ChoiceGroup
        label="Ключ"
        value={settings.clef}
        onChange={(value) => set('clef', value)}
        options={[
          { value: 'treble', title: 'Скрипичный' },
          { value: 'bass', title: 'Басовый' },
          { value: 'both', title: 'Оба' },
        ]}
      />
      <ChoiceGroup
        label="Диапазон"
        value={settings.range}
        onChange={(value) => set('range', value)}
        options={[
          { value: 'position', title: 'Позиция' },
          { value: 'octave', title: 'Октава' },
          { value: 'staff', title: 'Весь стан' },
        ]}
      />
      <Stepper
        label="Последовательностей в сессии"
        value={settings.sequences}
        {...SEQUENCES_LIMITS}
        onChange={(value) => set('sequences', value)}
      />
      <Stepper
        label="Нот в шаге"
        value={settings.notesPerStep}
        {...NOTES_PER_STEP_LIMITS}
        onChange={(value) => set('notesPerStep', value)}
      />
      <Toggle
        label="Переключать автоматически"
        checked={settings.autoAdvance}
        onChange={(value) => set('autoAdvance', value)}
        icon={<AutoAdvanceIcon />}
      />
    </div>
  )
}

export default SequenceSettingsForm

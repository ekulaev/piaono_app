import { INTERVAL_NAMES, MAX_INTERVAL, widestFitting } from '../../engine/sequences/anchors'
import { RANGES } from '../../engine/sequences/generate'
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

/** Пояснение под настройками, которые действуют только для шагов из одной ноты. */
const SINGLE_NOTES_ONLY = 'Только для шагов из одной ноты'

/**
 * «В этом диапазоне — не больше …», если выбранный предел шире диапазона. Число белых клавиш
 * у скрипичного и басового диапазона одно, поэтому достаточно скрипичного.
 */
function intervalNote(settings: SequenceSettings): string | undefined {
  const { low, high } = RANGES[settings.range].treble
  const widest = widestFitting(low, high, settings.intervals)
  return widest < MAX_INTERVAL[settings.intervals]
    ? `В этом диапазоне — не больше ${INTERVAL_NAMES[widest]}`
    : undefined
}

/** Настройки режима «Последовательности» на экране режима (меняют только черновик). */
function SequenceSettingsForm({ settings, onChange }: Props) {
  const set = <K extends keyof SequenceSettings>(key: K, value: SequenceSettings[K]) =>
    onChange({ ...settings, [key]: value })
  // Подсказки и интервалы — только для шагов из одной ноты (C-STF-3, OB-8).
  const chords = settings.notesPerStep > 1

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
      <ChoiceGroup
        label="Интервалы"
        value={settings.intervals}
        onChange={(value) => set('intervals', value)}
        options={[
          { value: 'third', title: 'До терции' },
          { value: 'fifth', title: 'До квинты' },
          { value: 'octave', title: 'До октавы' },
        ]}
        disabled={chords}
        note={chords ? SINGLE_NOTES_ONLY : intervalNote(settings)}
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
        label="Подсказки"
        checked={settings.hints}
        onChange={(value) => set('hints', value)}
        disabled={chords}
        note={chords ? SINGLE_NOTES_ONLY : undefined}
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

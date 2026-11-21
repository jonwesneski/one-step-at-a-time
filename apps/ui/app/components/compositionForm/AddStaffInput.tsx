import { Select } from '@/design-system';
import type { VocalType } from '@one-step-at-a-time/web-components';
import { VOICES } from '@one-step-at-a-time/web-components';
import { useCompositionFormSession } from './CompositionFormSessionContext';
import type { NewStaff } from './staffSettingsHelpers';

interface AddStaffInputProps {
  measureId: string;
}

const VOCAL_PREFIX = 'vocal:';

function parseNewStaff(value: string): NewStaff | null {
  if (value === 'treble' || value === 'bass' || value === 'guitar-tab') {
    return { type: value };
  }
  if (value.startsWith(VOCAL_PREFIX)) {
    return {
      type: 'vocal',
      voiceType: value.slice(VOCAL_PREFIX.length) as VocalType,
    };
  }
  return null;
}

export function AddStaffInput({ measureId }: AddStaffInputProps) {
  const { addStaff } = useCompositionFormSession();

  return (
    <Select
      value=""
      onChange={(e) => {
        const newStaff = parseNewStaff(e.target.value);
        if (newStaff) {
          addStaff(measureId, newStaff);
        }
      }}
    >
      <option value="" disabled>
        Add staff...
      </option>
      <option value="treble">Treble</option>
      <option value="bass">Bass</option>
      <optgroup label="Vocal">
        {VOICES.map((voice) => (
          <option key={voice} value={`${VOCAL_PREFIX}${voice}`}>
            {voice.charAt(0).toUpperCase() + voice.slice(1)}
          </option>
        ))}
      </optgroup>
      <option value="guitar-tab">Guitar tab</option>
    </Select>
  );
}

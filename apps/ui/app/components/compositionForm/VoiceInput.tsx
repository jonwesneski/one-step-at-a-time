import { Button } from '@/design-system';
import { useFormContext } from 'react-hook-form';
import { useCompositionFormSession } from './CompositionFormSessionContext';
import type { CompositionFormValues } from './types';

interface VoiceInputProps {
  staffId: string;
}

// Mirrors voiceHelpers.ts's own MAX_VOICES cap (and the library's) — surfaced
// visibly here (a disabled button) rather than left to a silently-ignored
// click.
const MAX_VOICES = 3;

export function VoiceInput({ staffId }: VoiceInputProps) {
  const { watch } = useFormContext<CompositionFormValues>();
  const staff = watch(`stavesById.${staffId}`);
  const { addVoice, removeVoice } = useCompositionFormSession();

  function handleRemove(voiceId: string, index: number) {
    const entryCount = staff.voicesById[voiceId].entryIds.length;
    if (entryCount > 0) {
      const noun = entryCount === 1 ? 'entry' : 'entries';
      const confirmed = window.confirm(
        `Voice ${
          index + 1
        } has ${entryCount} ${noun}. Remove it and its ${noun}?`
      );
      if (!confirmed) {
        return;
      }
    }
    removeVoice(staffId, voiceId);
  }

  return (
    <div className="flex flex-col gap-2 p-3">
      <div className="flex flex-col gap-1.5">
        {staff.voiceOrder.map((voiceId, index) => (
          <div
            key={voiceId}
            className="flex items-center justify-between gap-2"
          >
            <span className="text-sm text-zinc-700">Voice {index + 1}</span>
            <Button
              type="button"
              variant="secondary"
              disabled={staff.voiceOrder.length <= 1}
              onClick={() => handleRemove(voiceId, index)}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="secondary"
        disabled={staff.voiceOrder.length >= MAX_VOICES}
        onClick={() => addVoice(staffId)}
      >
        Add Voice
      </Button>
    </div>
  );
}

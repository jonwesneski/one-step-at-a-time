import { Checkbox, Select } from '@/design-system';
import type {
  DurationType,
  Note,
  Octave,
} from '@one-step-at-a-time/web-components';
import { isBeamableDuration } from './beamGroupHelpers';
import { useCompositionFormSession } from './CompositionFormSessionContext';
import {
  ChordNoteRows,
  DurationSelect,
  MarkingsFields,
  OctaveSelect,
  OptionalSelect,
  PitchSelect,
} from './entryControls';
import type { PitchedEntry } from './types';
import { REST_STAFF_SIDE_OPTIONS } from './types';

interface EntryEditInputProps {
  entry: PitchedEntry;
  durationOptions: readonly DurationType[];
  // Voice context for the "Move to Voice" control — null/empty when it
  // couldn't be resolved (shouldn't happen for a real entry, but keeps this
  // component from assuming its caller always finds one).
  staffId: string | null;
  voiceOrder: readonly string[];
  currentVoiceId: string | null;
  canShareDynamic: boolean;
  canTakeLoco: boolean;
}

const labelClass = 'text-xs font-medium text-zinc-500';

export function EntryEditInput({
  entry,
  durationOptions,
  staffId,
  voiceOrder,
  currentVoiceId,
  canShareDynamic,
  canTakeLoco,
}: EntryEditInputProps) {
  const { updateEntry, moveEntryToVoice } = useCompositionFormSession();

  return (
    <div
      className="flex flex-col gap-2 p-3"
      onClick={(e) => e.stopPropagation()}
    >
      {entry.type === 'note' && (
        <div className="flex gap-2">
          <label className="flex flex-1 flex-col gap-0.5">
            <span className={labelClass}>Pitch</span>
            <PitchSelect
              value={entry.value}
              onChange={(value: Note) => updateEntry({ ...entry, value })}
            />
          </label>
          <label className="flex flex-col gap-0.5">
            <span className={labelClass}>Octave</span>
            <OctaveSelect
              value={entry.octave}
              onChange={(octave: Octave | null) =>
                updateEntry({ ...entry, octave })
              }
            />
          </label>
        </div>
      )}

      {entry.type === 'chord' && (
        <div className="flex flex-col gap-0.5">
          <span className={labelClass}>Notes</span>
          <ChordNoteRows
            notes={entry.notes}
            onChange={(notes) => updateEntry({ ...entry, notes })}
          />
        </div>
      )}

      <label className="flex flex-col gap-0.5">
        <span className={labelClass}>Duration</span>
        <DurationSelect
          value={entry.duration}
          options={durationOptions}
          onChange={(duration: DurationType) =>
            updateEntry({ ...entry, duration })
          }
        />
      </label>
      {entry.type !== 'rest' &&
        entry.beamGroupId &&
        isBeamableDuration(entry.duration) && (
          <div className="text-xs text-zinc-400">
            Part of a cross-staff beam — a quarter or longer leaves it.
          </div>
        )}

      {entry.type !== 'rest' && (
        <MarkingsFields
          markings={entry}
          onChange={(patch) => updateEntry({ ...entry, ...patch })}
          canShareDynamic={canShareDynamic}
          canTakeLoco={canTakeLoco}
          showStemDirection={!entry.beamGroupId}
        />
      )}

      {entry.type === 'rest' && entry.beamGroupId && (
        <OptionalSelect
          label="Position against the beam"
          options={REST_STAFF_SIDE_OPTIONS}
          value={entry.restStaffSide}
          onChange={(restStaffSide) => updateEntry({ ...entry, restStaffSide })}
          noneLabel="auto"
        />
      )}

      {entry.type === 'rest' && (
        <Checkbox
          label="Hidden (spacer)"
          checked={entry.hidden ?? false}
          onChange={(e) => updateEntry({ ...entry, hidden: e.target.checked })}
        />
      )}

      {staffId && currentVoiceId && voiceOrder.length > 1 && (
        <label className="flex flex-col gap-0.5">
          <span className={labelClass}>Voice</span>
          <Select
            value={currentVoiceId}
            onChange={(e) =>
              moveEntryToVoice(
                staffId,
                entry.id,
                currentVoiceId,
                e.target.value
              )
            }
          >
            {voiceOrder.map((voiceId, index) => (
              <option key={voiceId} value={voiceId}>
                Voice {index + 1}
              </option>
            ))}
          </Select>
        </label>
      )}
    </div>
  );
}

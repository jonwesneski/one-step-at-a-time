import { Button, Select } from '@/design-system';
import type {
  DurationType,
  GuitarFret,
} from '@one-step-at-a-time/web-components';
import { useState } from 'react';
import { useCompositionFormSession } from './CompositionFormSessionContext';
import { DurationSelect } from './entryControls';
import { durationFits, fittingDurations } from './measureCapacityHelpers';
import type { DraftMusicEntry, GuitarNoteEntry } from './types';

const labelClass = 'text-xs font-medium text-zinc-500';
const FRETS: GuitarFret[] = ['x', ...Array.from({ length: 25 }, (_, i) => i)];
const STRINGS = [1, 2, 3, 4, 5, 6];

function FretStringFields({
  fret,
  string,
  onChange,
}: {
  fret: GuitarFret;
  string: number;
  onChange: (patch: Partial<Pick<GuitarNoteEntry, 'fret' | 'string'>>) => void;
}) {
  return (
    <div className="flex gap-2">
      <label className="flex flex-1 flex-col gap-0.5">
        <span className={labelClass}>String (1 = highest)</span>
        <Select
          value={String(string)}
          onChange={(e) => onChange({ string: Number(e.target.value) })}
        >
          {STRINGS.map((s) => (
            <option key={s} value={String(s)}>
              {s}
            </option>
          ))}
        </Select>
      </label>
      <label className="flex flex-1 flex-col gap-0.5">
        <span className={labelClass}>Fret</span>
        <Select
          value={String(fret)}
          onChange={(e) =>
            onChange({
              fret: e.target.value === 'x' ? 'x' : Number(e.target.value),
            })
          }
        >
          {FRETS.map((f) => (
            <option key={String(f)} value={String(f)}>
              {f === 'x' ? 'x (muted)' : f}
            </option>
          ))}
        </Select>
      </label>
    </div>
  );
}

export function AddGuitarNoteInput({
  onAdd,
  remainingBeats,
}: {
  onAdd: (entry: DraftMusicEntry) => void;
  remainingBeats: number;
}) {
  const [fret, setFret] = useState<GuitarFret>(0);
  const [string, setString] = useState(1);
  const [duration, setDuration] = useState<DurationType>('quarter');

  return (
    <div
      className="flex flex-col gap-2 p-3"
      onClick={(e) => e.stopPropagation()}
    >
      <FretStringFields
        fret={fret}
        string={string}
        onChange={(patch) => {
          if (patch.fret !== undefined) {
            setFret(patch.fret);
          }
          if (patch.string !== undefined) {
            setString(patch.string);
          }
        }}
      />
      <DurationSelect
        value={duration}
        options={fittingDurations(remainingBeats, duration)}
        onChange={setDuration}
      />
      <Button
        type="button"
        disabled={!durationFits(duration, remainingBeats)}
        onClick={() => onAdd({ type: 'guitar-note', fret, string, duration })}
      >
        Add
      </Button>
    </div>
  );
}

export function GuitarNoteEditInput({
  entry,
  durationOptions,
}: {
  entry: GuitarNoteEntry;
  durationOptions: readonly DurationType[];
}) {
  const { updateEntry, deleteSelected } = useCompositionFormSession();

  return (
    <div
      className="flex flex-col gap-2 p-3"
      onClick={(e) => e.stopPropagation()}
    >
      <FretStringFields
        fret={entry.fret}
        string={entry.string}
        onChange={(patch) => updateEntry({ ...entry, ...patch })}
      />
      <DurationSelect
        value={entry.duration}
        options={durationOptions}
        onChange={(duration) => updateEntry({ ...entry, duration })}
      />
      <Button type="button" variant="secondary" onClick={deleteSelected}>
        Remove
      </Button>
    </div>
  );
}

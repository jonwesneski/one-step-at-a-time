import { Button, Checkbox, Select } from '@/design-system';
import type {
  DurationType,
  Note,
  Octave,
} from '@one-step-at-a-time/web-components';
import {
  ARTICULATIONS,
  DURATIONS,
  DYNAMICS,
  NOTES,
  OCTAVES,
  STRESSES,
} from '@one-step-at-a-time/web-components';
import type { ChordNote, EntryMarkings } from './types';
import { STEM_DIRECTION_OPTIONS } from './types';

// Shared pitch / octave / duration / chord-note controls used by the Add* panels
// (AddNoteInput / AddChordInput / AddRestInput) and by EntryEditInput.

export function PitchSelect({
  value,
  onChange,
  className,
}: {
  value: Note;
  onChange: (value: Note) => void;
  className?: string;
}) {
  return (
    <Select
      className={className}
      value={value}
      onChange={(e) => onChange(e.target.value as Note)}
    >
      {NOTES.map((n) => (
        <option key={n} value={n}>
          {n}
        </option>
      ))}
    </Select>
  );
}

const CLEF_DEFAULT = 'clef';

export function OctaveSelect({
  value,
  onChange,
  className,
}: {
  value: Octave | null | undefined;
  onChange: (value: Octave | null) => void;
  className?: string;
}) {
  return (
    <Select
      className={className}
      value={value ?? CLEF_DEFAULT}
      onChange={(e) =>
        onChange(
          e.target.value === CLEF_DEFAULT
            ? null
            : (Number(e.target.value) as Octave)
        )
      }
    >
      <option value={CLEF_DEFAULT}>clef default</option>
      {OCTAVES.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </Select>
  );
}

export function DurationSelect({
  value,
  onChange,
  options = DURATIONS,
}: {
  value: DurationType;
  onChange: (value: DurationType) => void;
  options?: readonly DurationType[];
}) {
  return (
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value as DurationType)}
    >
      {options.map((d) => (
        <option key={d} value={d}>
          {d}
        </option>
      ))}
    </Select>
  );
}

const NONE = 'none';

export function OptionalSelect<T extends string>({
  label,
  options,
  value,
  onChange,
  noneLabel = 'none',
}: {
  label: string;
  options: readonly T[];
  value: T | null | undefined;
  onChange: (value: T | null) => void;
  noneLabel?: string;
}) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-zinc-500">{label}</span>
      <Select
        value={value ?? NONE}
        onChange={(e) =>
          onChange(e.target.value === NONE ? null : (e.target.value as T))
        }
      >
        <option value={NONE}>{noneLabel}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </Select>
    </label>
  );
}

// dynamic / articulation / stress / stem — the marks shared by notes and
// chords. Edits are merged onto the entry by the caller. `canShareDynamic`
// offers the both-hands toggle; `showStemDirection` is false where the
// ancestor measure owns the stem (a cross-staff beam member).
export function MarkingsFields({
  markings,
  onChange,
  canShareDynamic = false,
  showStemDirection = true,
  canTakeLoco = false,
}: {
  markings: EntryMarkings;
  onChange: (patch: EntryMarkings) => void;
  canShareDynamic?: boolean;
  showStemDirection?: boolean;
  canTakeLoco?: boolean;
}) {
  return (
    <>
      <OptionalSelect
        label="Dynamic"
        options={DYNAMICS}
        value={markings.dynamic}
        onChange={(dynamic) => onChange({ dynamic })}
      />
      {(canShareDynamic || markings.dynamicShared) && (
        <Checkbox
          label="Shared between hands"
          checked={markings.dynamicShared ?? false}
          onChange={(e) => onChange({ dynamicShared: e.target.checked })}
        />
      )}
      <OptionalSelect
        label="Articulation"
        options={ARTICULATIONS}
        value={markings.articulation}
        onChange={(articulation) => onChange({ articulation })}
      />
      <OptionalSelect
        label="Stress"
        options={STRESSES}
        value={markings.stress}
        onChange={(stress) => onChange({ stress })}
      />
      {showStemDirection && (
        <OptionalSelect
          label="Stem"
          options={STEM_DIRECTION_OPTIONS}
          value={markings.stemDirection}
          onChange={(stemDirection) => onChange({ stemDirection })}
          noneLabel="auto"
        />
      )}
      {canTakeLoco && (
        <Checkbox
          label="(loco) reminder"
          checked={markings.loco ?? false}
          onChange={(e) => onChange({ loco: e.target.checked })}
        />
      )}
    </>
  );
}

export function ChordNoteRows({
  notes,
  onChange,
}: {
  notes: ChordNote[];
  onChange: (notes: ChordNote[]) => void;
}) {
  const setNote = (index: number, next: Partial<ChordNote>) => {
    onChange(notes.map((n, i) => (i === index ? { ...n, ...next } : n)));
  };

  return (
    <div className="flex flex-col gap-2">
      {notes.map((note, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <PitchSelect
            className="flex-1"
            value={note.value}
            onChange={(value) => setNote(i, { value })}
          />
          <OctaveSelect
            value={note.octave}
            onChange={(octave) => setNote(i, { octave })}
          />
          {notes.length > 1 && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => onChange(notes.filter((_, idx) => idx !== i))}
            >
              −
            </Button>
          )}
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        onClick={() => onChange([...notes, { value: 'C' }])}
      >
        + Add Note
      </Button>
    </div>
  );
}

import { Button, Checkbox, Select } from '@/design-system';
import type {
  AccidentalType,
  Note,
  Octave,
  TrillContinuationMode,
  TrillFinishSlur,
  TrillLineMode,
} from '@one-step-at-a-time/web-components';
import {
  ACCIDENTAL_TYPES,
  NOTES,
  TRILL_CONTINUATION_MODES,
  TRILL_FINISH_SLURS,
  TRILL_LINE_MODES,
} from '@one-step-at-a-time/web-components';
import { useCompositionFormSession } from './CompositionFormSessionContext';
import { OctaveSelect, OptionalSelect, PitchSelect } from './entryControls';
import type { ChordEntry, NoteEntry, TrillMarking } from './types';

const labelClass = 'text-xs font-medium text-zinc-500';
const DEFAULT = '';

type TrillFinish = NonNullable<TrillMarking['finish']>;

// A trill sign on the entry it starts from. Its wavy line runs through the
// entry's own tie chain, so a trill is set once, not on every tied note.
export function TrillInput({ entry }: { entry: NoteEntry | ChordEntry }) {
  const { updateEntry } = useCompositionFormSession();
  const trill = entry.trill ?? null;

  if (!trill) {
    return (
      <div className="p-3" onClick={(e) => e.stopPropagation()}>
        <Button
          type="button"
          onClick={() => updateEntry({ ...entry, trill: {} })}
        >
          Add trill
        </Button>
      </div>
    );
  }

  const patch = (next: Partial<TrillMarking>) =>
    updateEntry({ ...entry, trill: { ...trill, ...next } });
  const finish = trill.finish ?? null;
  const patchFinish = (next: Partial<TrillFinish> | null) =>
    patch({ finish: next === null ? null : { notes: [], ...finish, ...next } });

  return (
    <div
      className="flex flex-col gap-2 p-3"
      onClick={(e) => e.stopPropagation()}
    >
      <label className="flex flex-col gap-0.5">
        <span className={labelClass}>Wavy line</span>
        <Select
          value={trill.line ?? DEFAULT}
          onChange={(e) =>
            patch({
              line: (e.target.value || null) as TrillLineMode | null,
            })
          }
        >
          <option value={DEFAULT}>default (auto)</option>
          {TRILL_LINE_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {mode}
            </option>
          ))}
        </Select>
      </label>

      <Checkbox
        label="End notch here"
        checked={trill.stop ?? false}
        onChange={(e) => patch({ stop: e.target.checked })}
      />

      <label className="flex flex-col gap-0.5">
        <span className={labelClass}>Trilling note (optional)</span>
        <Select
          value={trill.note ?? DEFAULT}
          onChange={(e) =>
            patch({ note: (e.target.value || null) as Note | null })
          }
        >
          <option value={DEFAULT}>upper neighbour</option>
          {NOTES.map((pitch) => (
            <option key={pitch} value={pitch}>
              {pitch}
            </option>
          ))}
        </Select>
      </label>

      {!trill.note && (
        <OptionalSelect<AccidentalType>
          label="Trilling note's accidental"
          options={ACCIDENTAL_TYPES}
          value={trill.accidental}
          noneLabel="from the key"
          onChange={(accidental) => patch({ accidental })}
        />
      )}

      <OptionalSelect<TrillContinuationMode>
        label="After a system break"
        options={TRILL_CONTINUATION_MODES}
        value={trill.continuation}
        noneLabel="default (bracketed)"
        onChange={(continuation) => patch({ continuation })}
      />

      <div className="flex flex-col gap-1.5">
        <span className={labelClass}>Closing notes</span>
        {(finish?.notes ?? []).map((note, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <PitchSelect
              className="flex-1"
              value={note}
              onChange={(value: Note) =>
                patchFinish({
                  notes: (finish?.notes ?? []).map((n, idx) =>
                    idx === i ? value : n
                  ),
                })
              }
            />
            <OctaveSelect
              value={finish?.octaves?.[i] ?? null}
              onChange={(octave: Octave | null) =>
                patchFinish({
                  octaves: (finish?.notes ?? []).map((_, idx) =>
                    idx === i ? octave : finish?.octaves?.[idx] ?? null
                  ),
                })
              }
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                patchFinish({
                  notes: (finish?.notes ?? []).filter((_, idx) => idx !== i),
                  octaves: finish?.octaves?.filter((_, idx) => idx !== i),
                })
              }
            >
              −
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            patchFinish({ notes: [...(finish?.notes ?? []), 'C'] })
          }
        >
          + Add closing note
        </Button>
        {finish && finish.notes.length > 0 && (
          <OptionalSelect<TrillFinishSlur>
            label="Closing notes' slur"
            options={TRILL_FINISH_SLURS}
            value={finish.slur}
            noneLabel="default (to-main)"
            onChange={(slur) => patchFinish({ slur })}
          />
        )}
      </div>

      <Button
        type="button"
        variant="secondary"
        onClick={() => updateEntry({ ...entry, trill: null })}
      >
        Remove trill
      </Button>
    </div>
  );
}
